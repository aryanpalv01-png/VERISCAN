/**
 * VeriScan Ultra-Accuracy Forensic Screening API Client
 * Connects to FastAPI Backend at http://127.0.0.1:8000 or Serverless Gateway
 */

export const BORDER_BACKEND_URL =
  import.meta.env.VITE_BORDER_BACKEND_URL || "http://127.0.0.1:8000";

export interface Module1Ocr {
  extracted_snippet: string;
}

export interface Module2Validation {
  valid: boolean;
  checksum_parity: string;
  compliance?: string;
  reason?: string;
}

export interface CnnForensics {
  tamper_probability: number;
  predicted_type: string;
  model_confidence: number;
  class_probabilities?: Record<string, number>;
  inference_latency_ms: number;
  model_architecture?: string;
  tamper_detected?: boolean;
}

export interface Module3Tampering {
  tampered: boolean;
  compression_anomaly_score: number;
  sharpness_variance?: number;
  forensic_status: string;
  cnn_forensics?: CnnForensics;
}

export interface Module4FaceVerification {
  match_score: string;
  liveness_check: string;
}

export interface ModulesBreakdown {
  module_1_ocr: Module1Ocr;
  module_2_validation: Module2Validation;
  module_3_tampering: Module3Tampering;
  module_4_face_verification: Module4FaceVerification;
}

export interface BorderVerificationResponse {
  status: string;
  document_type: string;
  trust_score: number;
  verdict: "CLEAR_ENTRY" | "HOLD_FOR_MANUAL_INSPECTION";
  tier_a_override?: boolean;
  tier_a_failure_reason?: string;
  modules_breakdown: ModulesBreakdown;
}

async function ensureSafePayloadSize(file: File): Promise<File> {
  const isImageMime = file.type ? file.type.startsWith("image/") : false;
  const isImageExt = /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
  if ((!isImageMime && !isImageExt) || file.size <= 2.5 * 1024 * 1024) {
    return file;
  }
  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const maxDim = 1440;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function verifyBorderDocument(
  file: File,
  docType: string = "Passport"
): Promise<BorderVerificationResponse> {
  const uploadFile = await ensureSafePayloadSize(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("doc_type", docType);
  formData.append("document_type", docType);

  // 1. Try dedicated FastAPI microservice first
  try {
    const res = await fetch(`${BORDER_BACKEND_URL}/verify-border-document`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Fallback to serverless API gateway
  }

  // 2. Fallback to /api/verify-border-document (Express/Vercel serverless gateway)
  const fallbackRes = await fetch("/api/verify-border-document", {
    method: "POST",
    body: formData,
  });

  if (!fallbackRes.ok) {
    const errorText = await fallbackRes.text();
    throw new Error(`Screening Engine error (${fallbackRes.status}): ${errorText}`);
  }

  return fallbackRes.json();
}

export async function checkBackendHealth(): Promise<{ status: string }> {
  try {
    const res = await fetch(`${BORDER_BACKEND_URL}/`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return res.json();
  } catch {
    // Fallback check
  }
  const fallback = await fetch("/api/health");
  if (!fallback.ok) {
    throw new Error(`Health check failed with status ${fallback.status}`);
  }
  const data = await fallback.json();
  return {
    status: data.status || "healthy",
  };
}
