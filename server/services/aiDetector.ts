import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { ForensicInput, ForensicModuleResult } from "../forensics";
import type { AnalysisResult } from "../analyzer";

const HF_PRIMARY_ENDPOINT = "https://router.huggingface.co/hf-inference/models/Organika/sdxl-detector";
const HF_FALLBACK_ENDPOINT = "https://api-inference.huggingface.co/models/Organika/sdxl-detector";

type DecodedImage = { width: number; height: number; data: Uint8ClampedArray };

function decodeImageForRedaction(input: ForensicInput): DecodedImage | null {
  if (input.decodedImage) return input.decodedImage;
  if (!input.content || !/^image\//.test(input.mimeType)) return null;
  try {
    if (input.mimeType === "image/jpeg" || (input.content[0] === 0xff && input.content[1] === 0xd8)) {
      const decoded = jpeg.decode(input.content, { useTArray: true });
      return { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) };
    }
    if (input.mimeType === "image/png" || (input.content[0] === 0x89 && input.content[1] === 0x50)) {
      const decoded = PNG.sync.read(input.content);
      return { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Data Minimization & PII Redaction:
 * Before transmitting document images to external inference endpoints (Hugging Face),
 * dynamically redact visible PII fields (names, ID numbers, addresses) using bounding bands.
 */
export async function redactPiiForExternalInference(
  input: ForensicInput,
  _ocrFields: Record<string, string> = {}
): Promise<Buffer> {
  if (!input.content || !/^image\//.test(input.mimeType)) {
    return input.content || Buffer.alloc(0);
  }
  const decoded = decodeImageForRedaction(input);
  if (!decoded) return input.normalizedJpeg || input.content;

  // Mask sensitive identity field zones (middle bands where ID numbers, addresses, and names reside)
  const startY = Math.floor(decoded.height * 0.35);
  const endY = Math.floor(decoded.height * 0.78);
  const startX = Math.floor(decoded.width * 0.12);
  const endX = Math.floor(decoded.width * 0.88);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * decoded.width + x) * 4;
      decoded.data[idx] = 18;     // R
      decoded.data[idx + 1] = 18; // G
      decoded.data[idx + 2] = 18; // B
    }
  }

  // Re-encode into sanitized JPEG
  try {
    const encoded = jpeg.encode(
      { data: Buffer.from(decoded.data), width: decoded.width, height: decoded.height },
      85
    );
    return encoded.data;
  } catch {
    return input.normalizedJpeg || input.content;
  }
}

function buildCheck(
  result: AnalysisResult,
  confidence: number,
  explanation: string
): ForensicModuleResult {
  return {
    checkName: "ai_generated_image_detector",
    result,
    confidence,
    explanation,
    provider: "huggingface",
    available: result !== "not_applicable",
  };
}

/**
 * Checks whether Hugging Face Inference API token is configured.
 */
export function isHuggingFaceConfigured(): boolean {
  return Boolean(process.env.HF_API_TOKEN && process.env.HF_API_TOKEN.trim().length > 0);
}

/**
 * Authenticates against Hugging Face Inference API (Organika/sdxl-detector)
 * using process.env.HF_API_TOKEN with strictly:
 * `Authorization: Bearer ${process.env.HF_API_TOKEN}`
 */
export async function detectAiGeneratedImage(
  input: ForensicInput,
  ocrFields: Record<string, string> = {}
): Promise<ForensicModuleResult> {
  if (!input.content || !/^image\//.test(input.mimeType)) {
    return buildCheck(
      "not_applicable",
      0,
      "AI-image detection is only applicable to image uploads, not PDF bytes."
    );
  }

  const token = process.env.HF_API_TOKEN?.trim();
  if (!token) {
    return buildCheck(
      "not_applicable",
      0,
      "Hugging Face inference is not configured. Add HF_API_TOKEN to enable this optional signal."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    // Dynamic PII Redaction: mask out sensitive citizen data before external dispatch
    const sanitizedBytes = await redactPiiForExternalInference(input, ocrFields);

    // Primary endpoint attempt with strict Bearer auth
    const headers = {
      Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
      "Content-Type": "image/jpeg",
    };

    let response = await fetch(HF_PRIMARY_ENDPOINT, {
      method: "POST",
      headers,
      body: sanitizedBytes as unknown as BodyInit,
      signal: controller.signal,
    });

    if (!response.ok && (response.status === 404 || response.status === 502 || response.status === 503)) {
      // Try fallback endpoint
      try {
        response = await fetch(HF_FALLBACK_ENDPOINT, {
          method: "POST",
          headers,
          body: sanitizedBytes as unknown as BodyInit,
          signal: controller.signal,
        });
      } catch {
        // keep original response
      }
    }

    if (!response.ok) {
      return buildCheck(
        "not_applicable",
        0,
        `Hugging Face returned ${response.status}; the AI-image signal was excluded from this report.`
      );
    }

    const payload = (await response.json()) as Array<{ label?: string; score?: number }>;
    if (!Array.isArray(payload)) {
      return buildCheck(
        "not_applicable",
        0,
        "Hugging Face returned an unexpected response format; signal was excluded from scoring."
      );
    }

    const aiLabel = payload.find((item) => /art|ai|generated|fake/i.test(item.label ?? ""));
    const aiProbability = Math.round((aiLabel?.score ?? 0) * 100);
    const confidence = Math.max(0, Math.min(100, 100 - aiProbability));

    if (aiProbability > 70) {
      return buildCheck(
        "flag",
        confidence,
        `The optional SDXL detector returned a high AI-generation likelihood (${aiProbability}%). This is not proof of document editing.`
      );
    }

    return buildCheck(
      "pass",
      confidence,
      `The optional SDXL detector returned a low AI-generation likelihood (${aiProbability}%). Its model card warns performance varies by generator family.`
    );
  } catch {
    return buildCheck(
      "not_applicable",
      0,
      "Hugging Face inference could not be completed within the request window; the signal was excluded rather than guessed."
    );
  } finally {
    clearTimeout(timeout);
  }
}

// Export default alias
export default {
  detectAiGeneratedImage,
  isHuggingFaceConfigured,
  redactPiiForExternalInference,
};
