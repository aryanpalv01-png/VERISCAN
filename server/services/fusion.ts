import type { AnalysisCheck } from "../analyzer";

export type ForensicProvider = "local" | "huggingface" | "trufor" | "catnet" | "ocr" | "pixel";
export type ForensicModuleResult = AnalysisCheck & {
  provider: ForensicProvider;
  available: boolean;
};

export type FusionVerdict = "verified" | "needs_review" | "likely_forged";

export interface FusionResult {
  score: number;
  status: FusionVerdict;
  tierAHardOverride: boolean;
  tierBCumulativePenalty: boolean;
  tierAFailures: string[];
  tierBFailures: string[];
  rawScore: number;
  penaltiesApplied: number;
  unconfiguredModules: string[];
  dormantNeuralChecks: string[];
  activeModulesCount: number;
  systemError?: string;
  summary?: string;
}

const MODULE_WEIGHTS: Record<string, number> = {
  issuer_whitelist_validation: 4.0,
  checksum_identifier_validation: 3.5,
  checksum_validation: 3.5,
  qr_signature_verification: 3.5,
  copy_move_clone_detection: 1.8,
  structural_template_matching: 2.0,
  font_stroke_consistency: 1.5,
  trufor_inference: 1.8,
  catnet_inference: 1.8,
  ocr_typography_consistency: 1.5,
  screenshot_capture_detection: 1.2,
  ela_compression_analysis: 1.0,
  ai_generated_image_detector: 1.0,
  metadata_exif_inspection: 1.0,
  pixel_worker_analysis: 1.0,
};

/**
 * Tier A Checks:
 * STRICT RULE: Tier A hard overrides apply ONLY to definitive deterministic failures:
 * - Issuer ISO 3166-1 whitelist validation
 * - Mathematical checksum failure (ICAO 9303 / Verhoeff algorithm / PAN structural regex)
 * - Cryptographic signature mismatch (UIDAI 2048-bit digital signature / issuer cert)
 * - Biometric liveness failure / presentation attack
 *
 * The fusion function returns IMMEDIATELY with capped score (max 15).
 */
export const DETERMINISTIC_TIER_A_CHECKS = new Set([
  "issuer_whitelist_validation",
  "checksum_identifier_validation",
  "checksum_validation",
  "qr_signature_verification",
  "biometric_liveness_check",
  "liveness_anti_spoofing",
]);

/**
 * Visual & Heuristic (Tier B) Checks:
 * Secondary indicators (typography, ELA resaving, screenshot capture, clone localization, TruFor/CAT-Net, pixel).
 * These modules are cumulative:
 * - A single heuristic flag lowers the score moderately.
 * - 2 or more failing simultaneously triggers a "Likely Forged" verdict (<40).
 */
export const HEURISTIC_CHECKS = new Set([
  "ela_compression_analysis",
  "ocr_typography_consistency",
  "screenshot_capture_detection",
  "copy_move_clone_detection",
  "trufor_inference",
  "catnet_inference",
  "ai_generated_image_detector",
  "pixel_worker_analysis",
]);

/**
 * Detects whether a forensic module check represents an offline, uninitialized,
 * errored, or missing-weights state (e.g. TruFor or CAT-Net returning 503, 501,
 * missing local weights, or null values).
 */
export function isModuleOfflineOrUninitialized(c: any): boolean {
  if (!c) return true;
  if (c.result === "not_applicable" || c.available === false) return true;
  if (c.result === "error") return true;
  if (c.confidence === null || c.confidence === undefined || Number.isNaN(Number(c.confidence))) return true;
  if (c.status === 503 || c.status === 501 || c.statusCode === 503 || c.statusCode === 501) return true;
  if (c.error || c.uninitialized || c.missingWeights || c.offline || c.notConfigured) return true;

  // An active check with positive confidence and available flag is executed
  if (c.available === true && typeof c.confidence === "number" && c.confidence > 0) {
    return false;
  }

  const expl = typeof c.explanation === "string" ? c.explanation.toLowerCase() : "";
  const isOfflineMention =
    expl.includes("503") ||
    expl.includes("501") ||
    expl.includes("missing weight") ||
    expl.includes("weights missing") ||
    expl.includes("missing local weight") ||
    expl.includes("checkpoint is not configured") ||
    expl.includes("missing checkpoint") ||
    expl.includes("uninitialized") ||
    expl.includes("service unavailable") ||
    expl.includes("offline") ||
    expl.includes("not configured") ||
    expl.includes("is not configured") ||
    expl.includes("missing api key") ||
    expl.includes("no third-party api key") ||
    expl.includes("add hf_api_token") ||
    expl.includes("must be exposed") ||
    expl.includes("no self-hosted") ||
    expl.includes("excluded from scoring") ||
    expl.includes("signal was excluded") ||
    expl.includes("could not be completed") ||
    expl.includes("neutral score") ||
    expl.includes("neutral fallback") ||
    expl.includes("fallback to neutral") ||
    expl.includes("dormant");

  if (isOfflineMention) return true;

  return false;
}

/**
 * Returns the effective weight of a module.
 * If a module is not applicable or unconfigured, its weight is STRICTLY 0.0.
 */
export function getEffectiveModuleWeight(checkName: string, result: string): number {
  if (result === "not_applicable") return 0;
  return MODULE_WEIGHTS[checkName] ?? 1.0;
}

/**
 * Determines whether a flagged check qualifies as a Tier A Hard Override:
 * 1. Definitive deterministic failure:
 *    - Mathematical checksum failure (Verhoeff algorithm / PAN structural regex)
 *    - Cryptographic signature mismatch (UIDAI 2048-bit digital signature / issuer cert)
 * 2. High-confidence clone / tamper localization:
 *    - Confirmed copy-move / SIFT/ORB keypoint duplicate clusters or TruFor/CAT-Net tamper localization
 */
export function isTierAFailure(c: ForensicModuleResult): boolean {
  if (c.result !== "flag") return false;

  // 1. Strict deterministic checks: Checksum/Verhoeff or QR signature
  if (DETERMINISTIC_TIER_A_CHECKS.has(c.checkName)) {
    return true;
  }

  // 2. High-confidence clone / tamper localization
  const expl = (c.explanation || "").toLowerCase();
  const isCloneOrTamper =
    c.checkName === "copy_move_clone_detection" ||
    c.checkName === "pixel_clone_worker" ||
    c.checkName === "trufor_inference" ||
    c.checkName === "catnet_inference";

  if (isCloneOrTamper) {
    const isExplicitHighConfidence =
      expl.includes("high-confidence") ||
      expl.includes("high confidence") ||
      expl.includes("confirmed clone") ||
      expl.includes("confirmed tamper") ||
      expl.includes("dense duplicate") ||
      expl.includes("sift keypoint match") ||
      expl.includes("orb keypoint match");

    // Very low integrity score (<= 20) indicates high confidence of tampering/clone
    const isVeryHighTamperConfidence = c.confidence <= 20;

    if (isExplicitHighConfidence || isVeryHighTamperConfidence) {
      return true;
    }
  }

  return false;
}

/**
 * VeriScan Institutional Score Fusion Engine:
 * Implements a robust Penalty-Subtraction Model starting from a base score of 100.
 */
export function fuseForensicChecks(checks: ForensicModuleResult[]): FusionResult {
  // 0. Handle Offline/Uninitialized Models:
  const unconfiguredModules: string[] = [];
  const dormantNeuralChecks: string[] = [];

  for (const c of checks) {
    if (isModuleOfflineOrUninitialized(c)) {
      c.result = "not_applicable";
      c.confidence = 0;
      c.available = false;
      (c as any).weight = 0.0;
      (c as any).effectiveWeight = 0.0;
      unconfiguredModules.push(c.checkName);

      const isNeural =
        (c as any).category === "neural_models" ||
        /trufor|catnet|huggingface|sdxl|ai_generated|deepfake|pixel_worker|ocr_typography/i.test(
          c.checkName + " " + (c.provider || "")
        );
      if (isNeural) {
        dormantNeuralChecks.push(c.checkName);
      }
    } else {
      const w = MODULE_WEIGHTS[c.checkName] ?? 1.0;
      (c as any).weight = w;
      (c as any).effectiveWeight = w;
    }
  }

  const active = checks.filter((item) => item.result !== "not_applicable");
  if (!active.length) {
    return {
      score: 0,
      status: "likely_forged",
      tierAHardOverride: false,
      tierBCumulativePenalty: false,
      tierAFailures: [],
      tierBFailures: [],
      rawScore: 0,
      penaltiesApplied: 100,
      unconfiguredModules,
      dormantNeuralChecks,
      activeModulesCount: 0,
      systemError: "Pipeline execution failed to parse image buffers.",
    };
  }

  // 1. Classify Failures into Tier A and Tier B
  const tierAFailures: string[] = [];
  const tierBFailures: string[] = [];

  for (const c of active) {
    if (c.result !== "flag") continue;

    if (isTierAFailure(c)) {
      tierAFailures.push(`${c.checkName}: ${c.explanation}`);
    } else {
      tierBFailures.push(`${c.checkName}: ${c.explanation}`);
    }
  }

  const isTierAFailed = tierAFailures.length > 0;
  const isCumulativeHeuristicFail = tierBFailures.length >= 2;
  const isSingleHeuristicFail = tierBFailures.length === 1;

  // HARD OVERRIDE ENFORCEMENT:
  // Return immediately with a capped score (max 15) the moment ANY Tier A check fails.
  // Do NOT include Tier A results as a weighted input into an averaging function.
  if (isTierAFailed) {
    const earlyReturnScore = 15; // Strictly max 15
    return {
      score: earlyReturnScore,
      status: "likely_forged",
      tierAHardOverride: true,
      tierBCumulativePenalty: false,
      tierAFailures,
      tierBFailures,
      rawScore: earlyReturnScore,
      penaltiesApplied: 85,
      unconfiguredModules,
      dormantNeuralChecks,
      activeModulesCount: active.length,
      summary: `Likely Forged (Score: ${earlyReturnScore}/100). Critical failure in Tier A verification (${tierAFailures.join(", ")}). Hard override early-return enforced.`,
    };
  }

  // 2. Penalty-Subtraction Model: Start from base score 100
  const BASE_SCORE = 100;
  let penaltiesApplied = 0;

  // Evaluate passing checks variance
  // Passing checks with high confidence (>= 85) incur 0 deduction.
  // Minor variances incur negligible fractional deduction.
  for (const c of active) {
    if (c.result === "pass") {
      if (c.confidence < 70) {
        penaltiesApplied += Math.round((85 - c.confidence) * 0.15);
      } else if (c.confidence < 85) {
        penaltiesApplied += Math.round((85 - c.confidence) * 0.08);
      }
    }
  }

  // 3. Deduct for Tier B Visual / Typography Anomalies (-25 to -40 points each)
  const hasStrongPasses = active.some(
    (c) => c.result === "pass" && c.confidence >= 85
  );

  if (isCumulativeHeuristicFail) {
    // 2 or more visual/typography anomalies failing simultaneously:
    // Apply substantial point deductions (-30 to -35 points per module), dropping sharply below 40.
    for (const failureStr of tierBFailures) {
      const checkName = failureStr.split(":")[0]?.trim();
      const deduction =
        checkName === "ocr_typography_consistency"
          ? 34
          : checkName === "ela_compression_analysis"
          ? 32
          : checkName === "screenshot_capture_detection"
          ? 32
          : 30;
      penaltiesApplied += deduction;
    }
  } else if (isSingleHeuristicFail) {
    // Single heuristic flag:
    const failedCheck = active.find((c) => c.result === "flag" && !isTierAFailure(c));
    const isMinorCompression =
      failedCheck?.checkName === "ela_compression_analysis" &&
      (failedCheck.confidence >= 50 ||
        failedCheck.explanation?.toLowerCase().includes("minor") ||
        failedCheck.explanation?.toLowerCase().includes("noise"));

    const isPreflightClone =
      failedCheck?.checkName === "copy_move_clone_detection" &&
      failedCheck.explanation?.toLowerCase().includes("potential duplicate patch");

    if ((isMinorCompression || isPreflightClone) && hasStrongPasses) {
      // Minor isolated compression / preflight warning on a genuine document:
      // Deduct moderate penalty (-12 to -15 points), keeping pristine score >= 85.
      const mildDeduction = isMinorCompression ? 12 : 15;
      penaltiesApplied += mildDeduction;
    } else {
      // Standalone significant visual anomaly (e.g. editing software in metadata or font style mismatch):
      // Deduct -28 to -30 points, placing document in Needs Review (65-75).
      penaltiesApplied += 30;
    }
  }

  // 4. Calculate Raw & Post-Penalty Score
  let score = Math.max(0, BASE_SCORE - penaltiesApplied);
  const rawScore = score;

  // If cumulative heuristic failure (2+ Tier B flags), guarantee score drops sharply below 40 (< 40)
  if (isCumulativeHeuristicFail) {
    score = Math.min(36, score);
  }

  // If single heuristic flag on genuine document with strong passes, protect verified status (> 80)
  if (isSingleHeuristicFail && !isTierAFailed && hasStrongPasses) {
    const failedCheck = active.find((c) => c.result === "flag" && !isTierAFailure(c));
    const isMinor =
      failedCheck?.checkName === "ela_compression_analysis" ||
      failedCheck?.explanation?.toLowerCase().includes("potential duplicate patch");
    if (isMinor) {
      score = Math.max(85, score);
    }
  }

  // Structural Template Positive-Match Layer (Requirement 3):
  // If layout doesn't match any known template above similarity threshold,
  // cap maximum possible score at 45 regardless of how clean other forensic checks appear.
  const templateFailed = active.some(
    (c) => c.checkName === "structural_template_matching" && c.result === "flag"
  );
  if (templateFailed) {
    score = Math.min(45, score);
  }

  // 6. Final Verdict Mapping
  // verified: score > 80
  // needs_review: 40 <= score <= 80
  // likely_forged: score < 40
  const status: FusionVerdict =
    score > 80 ? "verified" : score >= 40 ? "needs_review" : "likely_forged";

  const flaggedCount = tierAFailures.length + tierBFailures.length;
  const summary = isTierAFailed
    ? `Likely Forged (Score: ${score}/100). Critical failure in mathematical/integrity verification (${tierAFailures.join(", ")}).`
    : flaggedCount > 0
    ? `${status === "verified" ? "Verified" : status === "needs_review" ? "Needs Review" : "Likely Forged"} (Score: ${score}/100). ${flaggedCount} forensic check(s) flagged anomalies.`
    : `Verified (Score: ${score}/100). All active forensic checks passed without anomaly.`;

  return {
    score,
    status,
    tierAHardOverride: isTierAFailed,
    tierBCumulativePenalty: isCumulativeHeuristicFail,
    tierAFailures,
    tierBFailures,
    rawScore,
    penaltiesApplied,
    unconfiguredModules,
    dormantNeuralChecks,
    activeModulesCount: active.length,
    summary,
  };
}
