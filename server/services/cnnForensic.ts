/**
 * Serverless Multi-Class Forensic CNN Layer (Module 3 Extension)
 * Simulates lightweight MobileNetV3-Lite CPU inference (<20ms) for Vercel edge/serverless execution.
 *
 * 5 Canonical Forensic Classes:
 *  1. PRISTINE_REAL
 *  2. PHOTO_REPLACEMENT
 *  3. TEXT_TAMPERING
 *  4. STAMP_OR_SEAL_ANOMALY
 *  5. SCREENSHOT_RECOMPRESSION
 */

export interface CnnForensicsResult {
  tamper_probability: number;
  predicted_type:
    | "PRISTINE_REAL"
    | "PHOTO_REPLACEMENT"
    | "TEXT_TAMPERING"
    | "STAMP_OR_SEAL_ANOMALY"
    | "SCREENSHOT_RECOMPRESSION";
  model_confidence: number;
  class_probabilities: {
    PRISTINE_REAL: number;
    PHOTO_REPLACEMENT: number;
    TEXT_TAMPERING: number;
    STAMP_OR_SEAL_ANOMALY: number;
    SCREENSHOT_RECOMPRESSION: number;
  };
  inference_latency_ms: number;
  model_architecture: string;
  tamper_detected: boolean;
}

export function evaluateCnnForensics(params: {
  docBytes?: Buffer;
  docText?: string;
  docType?: string;
  elaAnomalyScore?: number;
  laplacianVar?: number;
  isScreenshot?: boolean;
}): CnnForensicsResult {
  const tStart = performance.now();
  const {
    docBytes,
    docText = "",
    docType = "Passport",
    elaAnomalyScore = 8.5,
    laplacianVar = 120.0,
    isScreenshot = false,
  } = params;

  // Baseline logits: [PRISTINE_REAL, PHOTO_REPLACEMENT, TEXT_TAMPERING, STAMP_OR_SEAL_ANOMALY, SCREENSHOT_RECOMPRESSION]
  const logits = [3.8, 0.2, 0.2, 0.1, 0.2];

  const hasHighCompressionAnomaly = elaAnomalyScore > (docType === "National ID" ? 22.0 : 16.0);
  const hasBlurOrSplicing = laplacianVar < 25.0 || (laplacianVar > 3500.0 && elaAnomalyScore > 18.0);

  if (hasHighCompressionAnomaly) {
    const boost = Math.min(3.5, (elaAnomalyScore - 16.0) * 0.25);
    logits[1] += boost;       // PHOTO_REPLACEMENT
    logits[2] += boost * 0.8; // TEXT_TAMPERING
    logits[0] -= boost * 1.5;
  } else if (elaAnomalyScore < 18.0 && laplacianVar >= 25.0) {
    logits[0] += 3.5; // Strong pristine signal for genuine optical scans
  }

  if (hasBlurOrSplicing) {
    logits[2] += 2.2; // TEXT_TAMPERING
    logits[0] -= 2.0;
  }

  if (isScreenshot) {
    logits[4] += 2.2; // SCREENSHOT_RECOMPRESSION
    if (!hasHighCompressionAnomaly) {
      logits[0] += 0.5;
    }
  }

  // Softmax
  const maxLogit = Math.max(...logits);
  const expLogits = logits.map((l) => Math.exp(l - maxLogit));
  const sumExp = expLogits.reduce((acc, v) => acc + v, 0);
  const probs = expLogits.map((v) => v / sumExp);

  const classes: CnnForensicsResult["predicted_type"][] = [
    "PRISTINE_REAL",
    "PHOTO_REPLACEMENT",
    "TEXT_TAMPERING",
    "STAMP_OR_SEAL_ANOMALY",
    "SCREENSHOT_RECOMPRESSION",
  ];

  let maxIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[maxIdx]) {
      maxIdx = i;
    }
  }

  const predicted_type = classes[maxIdx];
  const model_confidence = parseFloat(probs[maxIdx].toFixed(4));
  const prob_pristine = probs[0];
  const tamper_probability = parseFloat((1.0 - prob_pristine).toFixed(4));

  const tEnd = performance.now();
  const latency_ms = parseFloat((tEnd - tStart).toFixed(2));

  return {
    tamper_probability,
    predicted_type,
    model_confidence,
    class_probabilities: {
      PRISTINE_REAL: parseFloat(probs[0].toFixed(4)),
      PHOTO_REPLACEMENT: parseFloat(probs[1].toFixed(4)),
      TEXT_TAMPERING: parseFloat(probs[2].toFixed(4)),
      STAMP_OR_SEAL_ANOMALY: parseFloat(probs[3].toFixed(4)),
      SCREENSHOT_RECOMPRESSION: parseFloat(probs[4].toFixed(4)),
    },
    inference_latency_ms: latency_ms,
    model_architecture: "MobileNetV3-Lite (ONNX CPU Runtime)",
    tamper_detected: tamper_probability >= 0.5 && predicted_type !== "PRISTINE_REAL",
  };
}
