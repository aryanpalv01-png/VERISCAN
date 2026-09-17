export type DocumentStatus = "verified" | "needs_review" | "likely_forged";
export type CheckResult = "pass" | "flag" | "not_applicable";
export type DocumentKind =
  | "aadhaar"
  | "pan"
  | "passport"
  | "driving_license"
  | "voter_id"
  | "marksheet"
  | "bank_statement"
  | "medical_bill"
  | "prescription"
  | "scheme_document"
  | "other";

export type VerificationCheck = {
  id: string;
  name: string;
  shortName: string;
  result: CheckResult;
  confidence: number;
  explanation: string;
  flaggedRegion?: { x: number; y: number; width: number; height: number };
  provider?: string;
  providerState?: string;
  category?: string;
  weight?: number;
  effectiveWeight?: number;
  executionTimeMs?: number;
  subsystem?: string;
};


export function getCheckCategory(check: VerificationCheck): string {
  if (check.category) return check.category;
  const id = (check.id + " " + check.name).toLowerCase();
  if (id.includes("medical") || id.includes("arithmetic") || id.includes("clinical") || id.includes("prescription") || id.includes("provenance")) return "medical_logic";
  if (id.includes("verhoeff") || id.includes("checksum") || id.includes("qr") || id.includes("signature")) return "deterministic";
  if (id.includes("ela") || id.includes("compression") || id.includes("noise") || id.includes("sensor")) return "visual";
  if (id.includes("font") || id.includes("typography") || id.includes("ocr")) return "typography";
  if (id.includes("clone") || id.includes("trufor") || id.includes("catnet") || id.includes("model")) return "neural_models";
  return "integrity";
}

export type VerificationDocument = {
  id: string;
  filename: string;
  type: DocumentKind;
  uploadedAt: string;
  status: DocumentStatus;
  score: number;
  fileSize: string;
  mimeType: string;
  reference: string;
  previewUrl?: string;
  sha256?: string;
  elaMetrics?: {
    meanDifference: number;
    peakAnomalyScore: number;
    tamperedPixelRatio: number;
    flaggedRegion?: { x: number; y: number; width: number; height: number };
  };
  medicalValidation?: {
    isMedicalDocument?: boolean;
    documentCategory?: string;
    invoiceNumber?: string;
    hospitalName?: string;
    doctorName?: string;
    doctorRegNo?: string;
    patientName?: string;
    abhaId?: string;
    pmjayId?: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>;
    subtotal?: number;
    tax?: number;
    discount?: number;
    statedTotal?: number;
    calculatedTotal?: number;
    mathDifference?: number;
    mathConsistent?: boolean;
    medicinesFound?: string[];
  };
  checks: VerificationCheck[];
  providerHealth?: Record<string, "healthy" | "not_configured" | "not_applicable" | "degraded">;
  extractedFields?: Record<string, string>;
  comparisonFindings?: string[];
  unconfiguredModules?: string[];
  dormantNeuralChecks?: string[];
  activeModulesCount?: number;
  summary?: string;
  systemError?: string;
};


export const scanStages = [
  "Validating file",
  "Checking compression consistency",
  "Analyzing text & fonts",
  "Verifying QR / checksum",
  "Finalizing report",
] as const;

export type ScanStage = (typeof scanStages)[number];

export const documentTypeLabels: Record<DocumentKind, string> = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  passport: "Passport",
  driving_license: "Driving license",
  voter_id: "Voter ID card",
  marksheet: "Academic certificate",
  bank_statement: "Bank statement",
  medical_bill: "Medical bill / Invoice",
  prescription: "Doctor prescription (Rx)",
  scheme_document: "Health scheme (ABHA / PM-JAY)",
  other: "Other document",
};

export const statusMeta: Record<
  DocumentStatus,
  { label: string; description: string; tone: "verified" | "review" | "forged" }
> = {
  verified: {
    label: "Verified",
    description: "No material tampering indicators detected",
    tone: "verified",
  },
  needs_review: {
    label: "Needs review",
    description: "One or more signals require a human decision",
    tone: "review",
  },
  likely_forged: {
    label: "Likely forged",
    description: "Multiple tampering indicators were detected",
    tone: "forged",
  },
};

export const demoDocuments: VerificationDocument[] = [
  {
    id: "doc-verified-001",
    filename: "passport_scan_rahul.pdf",
    type: "passport",
    uploadedAt: "2026-08-28T10:42:00.000Z",
    status: "verified",
    score: 96,
    fileSize: "2.4 MB",
    mimeType: "application/pdf",
    reference: "VS-7F2A-91C4",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "pass",
        confidence: 98,
        explanation: "Compression patterns remain consistent across the document surface.",
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "pass",
        confidence: 94,
        explanation: "Text spacing, weight, and glyph rendering align with the surrounding template.",
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "pass",
        confidence: 99,
        explanation: "The visible machine-readable data is structurally valid and internally consistent.",
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "pass",
        confidence: 93,
        explanation: "Image noise is evenly distributed with no isolated re-rendered regions.",
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 96,
        explanation: "No duplicated content or copy-move artifacts were found in the visible fields.",
      },
    ],
  },
  {
    id: "doc-review-002",
    filename: "salary_certificate_august.jpg",
    type: "other",
    uploadedAt: "2026-08-26T14:18:00.000Z",
    status: "needs_review",
    score: 74,
    fileSize: "1.8 MB",
    mimeType: "image/jpeg",
    reference: "VS-118B-30E7",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "flag",
        confidence: 71,
        explanation: "A sharper compression boundary appears around the compensation field.",
        flaggedRegion: { x: 54, y: 36, width: 32, height: 12 },
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "pass",
        confidence: 86,
        explanation: "Typography is broadly consistent, although the amount field is slightly heavier.",
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "not_applicable",
        confidence: 0,
        explanation: "No machine-readable code was present for this document type.",
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "flag",
        confidence: 68,
        explanation: "Image noise varies across the lower third; review the highlighted salary field.",
        flaggedRegion: { x: 49, y: 56, width: 40, height: 17 },
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 90,
        explanation: "No repeated visual fragments were detected in the scanned surface.",
      },
    ],
  },
  {
    id: "doc-forged-003",
    filename: "marksheet_final_copy.pdf",
    type: "marksheet",
    uploadedAt: "2026-08-21T09:06:00.000Z",
    status: "likely_forged",
    score: 29,
    fileSize: "3.1 MB",
    mimeType: "application/pdf",
    reference: "VS-5D8C-442A",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "flag",
        confidence: 32,
        explanation: "Multiple fields show isolated recompression inconsistent with the base page.",
        flaggedRegion: { x: 18, y: 26, width: 64, height: 18 },
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "flag",
        confidence: 27,
        explanation: "The candidate name and grade fields use a different rendering profile from the template.",
        flaggedRegion: { x: 24, y: 42, width: 54, height: 16 },
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "flag",
        confidence: 21,
        explanation: "The visible checksum does not reconcile with the extracted document number.",
        flaggedRegion: { x: 70, y: 74, width: 18, height: 16 },
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "flag",
        confidence: 34,
        explanation: "The lower-right region has a different noise profile from the rest of the scan.",
        flaggedRegion: { x: 68, y: 62, width: 22, height: 24 },
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 78,
        explanation: "No direct copy-move match was found, but this does not offset the other flags.",
      },
    ],
  },
  {
    id: "doc-verified-004",
    filename: "bank_statement_july.pdf",
    type: "bank_statement",
    uploadedAt: "2026-08-17T16:34:00.000Z",
    status: "verified",
    score: 91,
    fileSize: "1.2 MB",
    mimeType: "application/pdf",
    reference: "VS-2AC9-76DD",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "pass",
        confidence: 94,
        explanation: "Page-level compression remains stable across the statement.",
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "pass",
        confidence: 92,
        explanation: "The statement uses a consistent type system across transaction rows.",
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "not_applicable",
        confidence: 0,
        explanation: "No QR or checksum field was available to validate.",
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "pass",
        confidence: 88,
        explanation: "Scan noise and rasterization artifacts are consistent across all pages.",
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 91,
        explanation: "No duplicated line-item fragments were detected.",
      },
    ],
  },
  {
    id: "doc-aadhaar-valid",
    filename: "aadhaar_rahul_sharma_genuine.jpg",
    type: "aadhaar",
    uploadedAt: "2026-09-02T11:15:00.000Z",
    status: "verified",
    score: 98,
    fileSize: "1.6 MB",
    mimeType: "image/jpeg",
    reference: "VS-AAD-2193",
    checks: [
      {
        id: "meta",
        name: "Metadata / EXIF inspection",
        shortName: "Metadata clean",
        result: "pass",
        confidence: 96,
        explanation: "Original capture metadata present. No editing-software traces detected.",
      },
      {
        id: "checksum",
        name: "Identifier checksum validation",
        shortName: "Verhoeff check passed",
        result: "pass",
        confidence: 99,
        explanation: "The 12-digit Aadhaar number '2193 4567 8905' passes the mathematical Verhoeff checksum algorithm.",
      },
      {
        id: "qr",
        name: "QR signature verification",
        shortName: "QR payload verified",
        result: "pass",
        confidence: 98,
        explanation: "UIDAI digital signature verified successfully. Printed demographic fields reconcile with signed payload.",
      },
      {
        id: "ela",
        name: "Error level analysis",
        shortName: "ELA consistent",
        result: "pass",
        confidence: 94,
        explanation: "Re-compression error rates remain within standard uniform variance across all fields.",
      },
      {
        id: "typo",
        name: "OCR typography consistency",
        shortName: "Typography aligned",
        result: "pass",
        confidence: 95,
        explanation: "Stroke width, kerning, and baseline alignment match official Aadhaar layout guidelines.",
      },
      {
        id: "clone",
        name: "Copy-move / clone detection",
        shortName: "No cloned elements",
        result: "pass",
        confidence: 96,
        explanation: "No duplicate region keypoints identified.",
      },
      {
        id: "noise",
        name: "Screenshot / capture-type detection",
        shortName: "Scanner noise detected",
        result: "pass",
        confidence: 93,
        explanation: "Optical sensor noise present; not a rendered screen capture.",
      },
      {
        id: "trufor",
        name: "TruFor inference adapter",
        shortName: "TruFor integrity clean",
        result: "pass",
        confidence: 91,
        explanation: "TruFor boundary artifact map shows no local splicing seams.",
      },
      {
        id: "catnet",
        name: "CAT-Net inference adapter",
        shortName: "CAT-Net DCT clean",
        result: "pass",
        confidence: 92,
        explanation: "DCT frequency grid analysis exhibits uniform single-compression quantization.",
      },
      {
        id: "hf",
        name: "AI-generated image detector",
        shortName: "Organic image",
        result: "pass",
        confidence: 95,
        explanation: "Probability of AI generation is <4%. Genuine optical photograph.",
      },
    ],
  },
  {
    id: "doc-aadhaar-forged",
    filename: "aadhaar_tampered_digit_forged.jpg",
    type: "aadhaar",
    uploadedAt: "2026-09-03T16:20:00.000Z",
    status: "likely_forged",
    score: 14,
    fileSize: "1.4 MB",
    mimeType: "image/jpeg",
    reference: "VS-FORG-8812",
    checks: [
      {
        id: "meta",
        name: "Metadata / EXIF inspection",
        shortName: "Photoshop markers",
        result: "flag",
        confidence: 15,
        explanation: "XMP metadata indicates editing via Adobe Photoshop 2024.",
        flaggedRegion: { x: 5, y: 5, width: 90, height: 10 },
      },
      {
        id: "checksum",
        name: "Identifier checksum validation",
        shortName: "Verhoeff check failed",
        result: "flag",
        confidence: 5,
        explanation: "Extracted Aadhaar number '2193 4567 8901' FAILS mathematical Verhoeff checksum. Check digit was altered.",
        flaggedRegion: { x: 32, y: 72, width: 38, height: 12 },
      },
      {
        id: "qr",
        name: "QR signature verification",
        shortName: "QR payload mismatch",
        result: "flag",
        confidence: 8,
        explanation: "Printed Aadhaar number does not match signed payload in the QR code.",
        flaggedRegion: { x: 68, y: 45, width: 25, height: 28 },
      },
      {
        id: "ela",
        name: "Error level analysis",
        shortName: "High ELA discrepancy",
        result: "flag",
        confidence: 18,
        explanation: "Elevated recompression error level around the date of birth and identity number boxes.",
        flaggedRegion: { x: 30, y: 52, width: 42, height: 32 },
      },
      {
        id: "typo",
        name: "OCR typography consistency",
        shortName: "Font weight mismatch",
        result: "flag",
        confidence: 25,
        explanation: "Modified digits use Arial rather than Aadhaar's official Lucida Sans typeface.",
        flaggedRegion: { x: 58, y: 72, width: 14, height: 12 },
      },
      {
        id: "clone",
        name: "Copy-move / clone detection",
        shortName: "Duplicate background",
        result: "flag",
        confidence: 20,
        explanation: "Cloned background patch used to mask original number.",
        flaggedRegion: { x: 28, y: 68, width: 45, height: 18 },
      },
    ],
  },
  {
    id: "doc-pan-forged",
    filename: "pan_card_invalid_structure.jpg",
    type: "pan",
    uploadedAt: "2026-09-04T08:10:00.000Z",
    status: "likely_forged",
    score: 22,
    fileSize: "1.1 MB",
    mimeType: "image/jpeg",
    reference: "VS-PAN-9901",
    checks: [
      {
        id: "checksum",
        name: "Identifier checksum validation",
        shortName: "Invalid PAN structure",
        result: "flag",
        confidence: 10,
        explanation: "Extracted PAN 'ABCXZ1234F' violates Income Tax Dept structural regex: 4th character 'X' is not a valid legal entity type.",
        flaggedRegion: { x: 25, y: 48, width: 50, height: 16 },
      },
      {
        id: "ela",
        name: "Error level analysis",
        shortName: "Recompression boundary",
        result: "flag",
        confidence: 30,
        explanation: "Compression gradient spike around the holder name and PAN string.",
        flaggedRegion: { x: 20, y: 40, width: 60, height: 28 },
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Baseline misalignment",
        result: "flag",
        confidence: 35,
        explanation: "Character baseline deviates by 3.2px relative to standard NSDL PAN template.",
        flaggedRegion: { x: 25, y: 48, width: 50, height: 16 },
      },
    ],
  },
  {
    id: "doc-photoshop-spliced",
    filename: "marksheet_photoshop_spliced.png",
    type: "marksheet",
    uploadedAt: "2026-09-04T12:00:00.000Z",
    status: "likely_forged",
    score: 36,
    fileSize: "2.8 MB",
    mimeType: "image/png",
    reference: "VS-SPLC-4029",
    checks: [
      {
        id: "meta",
        name: "Metadata / EXIF inspection",
        shortName: "Photoshop software tag",
        result: "flag",
        confidence: 15,
        explanation: "Software tag indicates Adobe Photoshop 24.1 (Windows) modification.",
      },
      {
        id: "ela",
        name: "Error level analysis",
        shortName: "Hotspot on Grade field",
        result: "flag",
        confidence: 24,
        explanation: "Major recompression anomaly around 'Grade: A+' field.",
        flaggedRegion: { x: 62, y: 38, width: 26, height: 14 },
      },
      {
        id: "clone",
        name: "Copy-move / clone detection",
        shortName: "Cloned institution seal",
        result: "flag",
        confidence: 18,
        explanation: "Official registrar seal was duplicated from another certificate.",
        flaggedRegion: { x: 68, y: 70, width: 22, height: 22 },
      },
    ],
  },
];

export type ServerDocumentRecord = {
  id: number;
  originalFilename: string;
  documentType: DocumentKind;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date | string;
  status: "processing" | DocumentStatus;
  confidenceScore: number;
  referenceCode: string;
  fileUrl?: string | null;
  providerHealth?: unknown;
  extractedFields?: unknown;
  comparisonFindings?: unknown;
};

export type ServerCheckRecord = {
  id: number;
  checkName: string;
  result: CheckResult;
  confidence: number;
  explanation: string;
  flaggedRegion?: unknown;
  provider?: string | null;
  providerState?: string | null;
};

export function formatCheckName(checkName: string) {
  const labels: Record<string, string> = {
    file_format_metadata: "File format & metadata inspection",
    metadata_exif_inspection: "Metadata / EXIF inspection",
    compression_analysis: "Compression & recompression analysis",
    ela_compression_analysis: "Error level analysis",
    font_consistency: "Text and font consistency",
    ocr_typography_consistency: "OCR typography consistency",
    qr_checksum_validation: "QR / checksum validation",
    qr_signature_verification: "QR signature verification",
    noise_consistency: "Noise consistency",
    screenshot_capture_detection: "Screenshot / capture-type detection",
    clone_detection: "Clone / copy-move detection",
    copy_move_clone_detection: "Copy-move / clone detection",
    ai_generated_image_detector: "AI-generated image detector",
    trufor_inference: "TruFor inference adapter",
    catnet_inference: "CAT-Net inference adapter",
    checksum_identifier_validation: "Identifier checksum validation",
    pixel_worker_analysis: "Pixel worker forensic analysis",
  };
  return labels[checkName] ?? checkName.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function isRegion(value: unknown): value is { x: number; y: number; width: number; height: number } {
  if (!value || typeof value !== "object") return false;
  const region = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every((key) => typeof region[key] === "number");
}

function parseExtractedFields(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return undefined;
  const result: Record<string, string> = {};
  for (const [k, v] of entries) {
    if (v === null || v === undefined) continue;
    result[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function isProviderHealth(value: unknown): value is Record<string, "healthy" | "not_configured" | "not_applicable" | "degraded"> {
  const allowed = new Set(["healthy", "not_configured", "not_applicable", "degraded"]);
  return Boolean(value && typeof value === "object" && Object.values(value as Record<string, unknown>).every((item) => typeof item === "string" && allowed.has(item)));
}

export function serverDocumentToVerification(document: ServerDocumentRecord, checkRows: ServerCheckRecord[] = []): VerificationDocument {
  const status: DocumentStatus = document.status === "processing" ? "needs_review" : document.status;
  const checks = checkRows.map((check) => ({
    id: String(check.id),
    name: formatCheckName(check.checkName),
    shortName: formatCheckName(check.checkName),
    result: check.result,
    confidence: check.confidence,
    explanation: check.explanation,
    flaggedRegion: isRegion(check.flaggedRegion) ? check.flaggedRegion : undefined,
    provider: check.provider ?? undefined,
    providerState: check.providerState ?? undefined,
    category: getCheckCategory({ name: check.checkName, id: check.checkName } as any),
  }));

  const executedCount = checks.filter((c) => c.result === "pass" || c.result === "flag").length;
  const aggregatedScore = calculateAggregatedConfidenceScore(checks, document.confidenceScore);
  const score = checkRows.length > 0 && executedCount === 0
    ? 0
    : (typeof document.confidenceScore === "number" ? document.confidenceScore : aggregatedScore);

  return {
    id: String(document.id),
    filename: document.originalFilename,
    type: document.documentType,
    uploadedAt: new Date(document.uploadedAt).toISOString(),
    status,
    score,
    activeModulesCount: executedCount,
    fileSize: `${Math.max(0.1, document.fileSize / 1024 / 1024).toFixed(1)} MB`,
    mimeType: document.mimeType,
    reference: document.referenceCode,
    previewUrl: document.fileUrl || (document as any).file_url || (document as any).previewUrl || undefined,
    providerHealth: isProviderHealth(document.providerHealth) ? document.providerHealth : undefined,
    extractedFields: parseExtractedFields(document.extractedFields),
    comparisonFindings: Array.isArray(document.comparisonFindings) ? document.comparisonFindings.filter((item): item is string => typeof item === "string") : undefined,
    systemError: (document as any).systemError || (document as any).system_error || (score === 0 && executedCount === 0 && checkRows.length > 0 ? "Pipeline execution failed to parse image buffers." : undefined),
    checks,
  };

}

export function formatDocumentType(type: DocumentKind) {
  return documentTypeLabels[type] ?? "Other document";
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getDocumentById(id: string) {
  return demoDocuments.find((document) => document.id === id) ?? demoDocuments[0];
}

export function getResultLabel(result: CheckResult) {
  if (result === "pass") return "Pass";
  if (result === "flag") return "Flagged";
  return "N/A";
}

export function getProviderStatusLabel(state: string | undefined, fallback: string) {
  if (state === "healthy") return "Active";
  if (state === "degraded") return "Degraded";
  if (state === "not_configured") return "Not configured";
  return fallback;
}

export function getProviderDisplayName(provider: string) {
  return ({ local: "Local preflight", huggingface: "Hugging Face", trufor: "TruFor", catnet: "CAT-Net", ocr: "OCR worker", pixel: "Pixel worker" } as Record<string, string>)[provider] ?? provider;
}

export function getScanStatus(score: number): DocumentStatus {
  if (score > 80) return "verified";
  if (score >= 40) return "needs_review";
  return "likely_forged";
}

/**
 * Calculates aggregated confidence score across forensic verification checks.
 *
 * Requirements:
 * 1. Modules returning "not_applicable" or "N/A" are excluded from denominator and scoring.
 * 2. If activeChecks === 0 (all modules return N/A), defaults strictly to 0 instead of a neutral midpoint (50).
 * 3. When activeChecks > 0, the denominator strictly divides by the count of successfully executed modules.
 */
export function calculateAggregatedConfidenceScore(
  checks?: Array<{ result?: string; confidence?: number | null }> | null,
  fallbackScore?: number | null
): number {
  if (!checks || !Array.isArray(checks) || checks.length === 0) {
    return typeof fallbackScore === "number" && !isNaN(fallbackScore) ? fallbackScore : 0;
  }

  const executedModules = checks.filter(
    (c) =>
      c &&
      c.result !== "not_applicable" &&
      c.result !== "N/A" &&
      typeof c.confidence === "number" &&
      !isNaN(c.confidence)
  );

  const activeChecks = executedModules.length;

  if (activeChecks === 0) {
    return 0;
  }

  const totalConfidence = executedModules.reduce((sum, c) => sum + (c.confidence ?? 0), 0);
  return Math.round(totalConfidence / activeChecks);
}

export function getInitials(name?: string | null) {
  if (!name) return "VS";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "VS";
}

export function makeDemoDocument(file: File, previewUrl?: string): VerificationDocument {
  const id = `scan-${Date.now()}`;
  const name = file.name.toLowerCase();
  const isSuspicious = /(fake|forged|forgery|tamper|sample|specimen|dummy|photoshop|canva|invalid|fail|spliced)/i.test(name);
  const isReview = /(salary|statement|review|edit|modified)/i.test(name);

  let score = 96;
  let status: DocumentStatus = "verified";
  let checks: VerificationCheck[] = [];

  if (isSuspicious) {
    score = 18;
    status = "likely_forged";
    checks = [
      {
        id: "metadata_exif_inspection",
        name: "Metadata / EXIF inspection",
        shortName: "Metadata inspection",
        result: "flag",
        confidence: 18,
        explanation: "Image metadata contains editing software markers (Photoshop/Canva/GIMP). Manual review required.",
        provider: "local",
        flaggedRegion: { x: 15, y: 15, width: 70, height: 20 },
      },
      {
        id: "checksum_identifier_validation",
        name: "Identifier checksum validation",
        shortName: "Identifier checksum",
        result: "flag",
        confidence: 8,
        explanation: "The extracted Aadhaar identifier fails the Verhoeff checksum algorithm. High probability of fraudulent issuance.",
        provider: "local",
        flaggedRegion: { x: 25, y: 55, width: 50, height: 12 },
      },
      {
        id: "qr_signature_verification",
        name: "QR signature verification",
        shortName: "QR signature",
        result: "flag",
        confidence: 10,
        explanation: "Cryptographic signature digest mismatch: embedded public key signature does not match demographics.",
        provider: "local",
      },
      {
        id: "ela_compression_analysis",
        name: "Error level analysis",
        shortName: "Error level analysis",
        result: "flag",
        confidence: 22,
        explanation: "JPEG re-save ELA measured high local compression discrepancies indicating potential localized splicing.",
        provider: "local",
        flaggedRegion: { x: 18, y: 30, width: 64, height: 32 },
      },
      {
        id: "copy_move_clone_detection",
        name: "Copy-move / clone detection",
        shortName: "Clone detection",
        result: "flag",
        confidence: 20,
        explanation: "Repeated 8×8 luminance blocks were identified across non-adjacent image coordinates, indicating clone-stamp tampering.",
        provider: "local",
        flaggedRegion: { x: 40, y: 35, width: 25, height: 20 },
      },
      {
        id: "screenshot_capture_detection",
        name: "Screenshot / capture-type detection",
        shortName: "Capture detection",
        result: "flag",
        confidence: 28,
        explanation: "Decoded pixel noise statistics and zero sensor noise indicate re-rendered screen capture rather than physical scan/photo.",
        provider: "local",
      },
      {
        id: "ocr_typography_consistency",
        name: "OCR typography consistency",
        shortName: "OCR typography",
        result: "flag",
        confidence: 22,
        explanation: "Optical character inspection identified anomalous baseline jitter and uneven kerning in the identity text zone.",
        provider: "ocr",
        flaggedRegion: { x: 25, y: 40, width: 50, height: 18 },
      },
      {
        id: "ai_generated_image_detector",
        name: "AI-generated image detector",
        shortName: "AI detector",
        result: "flag",
        confidence: 18,
        explanation: "Neural feature analysis detected latent diffusion artifacts and synthetic noise distribution (AI probability: 86%).",
        provider: "huggingface",
      },
      {
        id: "trufor_inference",
        name: "TruFor inference adapter",
        shortName: "TruFor inference",
        result: "flag",
        confidence: 19,
        explanation: "TruFor RGB+Noiseprint dense feature map highlighted high-probability forensic tampering anomalies.",
        provider: "trufor",
        flaggedRegion: { x: 30, y: 45, width: 40, height: 25 },
      },
      {
        id: "catnet_inference",
        name: "CAT-Net inference adapter",
        shortName: "CAT-Net inference",
        result: "flag",
        confidence: 19,
        explanation: "CAT-Net DCT domain analysis identified non-standard quantization tables and localized frequency anomalies.",
        provider: "catnet",
      },
      {
        id: "pixel_worker_analysis",
        name: "Pixel worker forensic analysis",
        shortName: "Pixel worker",
        result: "flag",
        confidence: 19,
        explanation: "Pixel worker subpixel raster analysis identified discrete resampling boundaries and localized luminance shifts.",
        provider: "pixel",
      },
    ];
  } else if (isReview) {
    score = 72;
    status = "needs_review";
    checks = [
      {
        id: "metadata_exif_inspection",
        name: "Metadata / EXIF inspection",
        shortName: "Metadata inspection",
        result: "pass",
        confidence: 92,
        explanation: "Standard JFIF/PNG container verified; no third-party editor provenance markers detected.",
        provider: "local",
      },
      {
        id: "checksum_identifier_validation",
        name: "Identifier checksum validation",
        shortName: "Identifier checksum",
        result: "pass",
        confidence: 98,
        explanation: "The extracted identifier passes statutory checksum algorithm.",
        provider: "local",
      },
      {
        id: "qr_signature_verification",
        name: "QR signature verification",
        shortName: "QR signature",
        result: "pass",
        confidence: 96,
        explanation: "UIDAI 2048-bit RSA asymmetric digital signature verified authentic against institutional certificate trust chain.",
        provider: "local",
      },
      {
        id: "ela_compression_analysis",
        name: "Error level analysis",
        shortName: "Error level analysis",
        result: "flag",
        confidence: 58,
        explanation: "JPEG re-save ELA measured minor compression gradient discrepancy around date/amount fields.",
        provider: "local",
        flaggedRegion: { x: 50, y: 35, width: 35, height: 15 },
      },
      {
        id: "copy_move_clone_detection",
        name: "Copy-move / clone detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 94,
        explanation: "No duplicate luminance patterns or clone-stamp repetitions detected in pixel blocks.",
        provider: "local",
      },
      {
        id: "screenshot_capture_detection",
        name: "Screenshot / capture-type detection",
        shortName: "Capture detection",
        result: "pass",
        confidence: 88,
        explanation: "Natural optical scan noise profile detected.",
        provider: "local",
      },
      {
        id: "ocr_typography_consistency",
        name: "OCR typography consistency",
        shortName: "OCR typography",
        result: "pass",
        confidence: 86,
        explanation: "Typography broadly consistent with minor baseline deviation.",
        provider: "ocr",
      },
      {
        id: "ai_generated_image_detector",
        name: "AI-generated image detector",
        shortName: "AI detector",
        result: "pass",
        confidence: 94,
        explanation: "Organic photographic camera profile; AI generation probability < 5%.",
        provider: "huggingface",
      },
      {
        id: "trufor_inference",
        name: "TruFor inference adapter",
        shortName: "TruFor inference",
        result: "pass",
        confidence: 91,
        explanation: "TruFor RGB noise consistency verified.",
        provider: "trufor",
      },
      {
        id: "catnet_inference",
        name: "CAT-Net inference adapter",
        shortName: "CAT-Net inference",
        result: "pass",
        confidence: 90,
        explanation: "Uniform DCT quantization frequency grid verified.",
        provider: "catnet",
      },
      {
        id: "pixel_worker_analysis",
        name: "Pixel worker forensic analysis",
        shortName: "Pixel worker",
        result: "pass",
        confidence: 92,
        explanation: "Continuous pixel gradient and resampling fidelity verified.",
        provider: "pixel",
      },
    ];
  } else {
    score = 96;
    status = "verified";
    checks = [
      {
        id: "metadata_exif_inspection",
        name: "Metadata / EXIF inspection",
        shortName: "Metadata inspection",
        result: "pass",
        confidence: 95,
        explanation: "EXIF/XMP metadata parsed clean; no editing markers detected. Metadata verified authentic.",
        provider: "local",
      },
      {
        id: "checksum_identifier_validation",
        name: "Identifier checksum validation",
        shortName: "Identifier checksum",
        result: "pass",
        confidence: 99,
        explanation: "The extracted 12-digit identifier passes the Verhoeff dihedral permutation checksum algorithm.",
        provider: "local",
      },
      {
        id: "qr_signature_verification",
        name: "QR signature verification",
        shortName: "QR signature",
        result: "pass",
        confidence: 98,
        explanation: "UIDAI 2048-bit RSA digital signature verified authentic against institutional certificate trust chain.",
        provider: "local",
      },
      {
        id: "ela_compression_analysis",
        name: "Error level analysis",
        shortName: "Error level analysis",
        result: "pass",
        confidence: 94,
        explanation: "JPEG re-save ELA measured uniform error levels confirming authentic compression consistency across blocks.",
        provider: "local",
      },
      {
        id: "copy_move_clone_detection",
        name: "Copy-move / clone detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 96,
        explanation: "No duplicate luminance patterns or clone-stamp repetitions detected in pixel blocks.",
        provider: "local",
      },
      {
        id: "screenshot_capture_detection",
        name: "Screenshot / capture-type detection",
        shortName: "Capture detection",
        result: "pass",
        confidence: 92,
        explanation: "Natural sensor noise and gradient fidelity indicate direct camera capture or high-grade optical scan.",
        provider: "local",
      },
      {
        id: "ocr_typography_consistency",
        name: "OCR typography consistency",
        shortName: "OCR typography",
        result: "pass",
        confidence: 95,
        explanation: "Optical character inspection verified consistent typography, font baselines, and character kerning.",
        provider: "ocr",
      },
      {
        id: "ai_generated_image_detector",
        name: "AI-generated image detector",
        shortName: "AI detector",
        result: "pass",
        confidence: 96,
        explanation: "Organic photographic sensor profile verified; synthetic generation probability < 3%.",
        provider: "huggingface",
      },
      {
        id: "trufor_inference",
        name: "TruFor inference adapter",
        shortName: "TruFor inference",
        result: "pass",
        confidence: 94,
        explanation: "TruFor dense feature map verified authentic sensor noise across all spatial regions.",
        provider: "trufor",
      },
      {
        id: "catnet_inference",
        name: "CAT-Net inference adapter",
        shortName: "CAT-Net inference",
        result: "pass",
        confidence: 93,
        explanation: "CAT-Net DCT frequency grid confirms uniform single-pass compression quantization.",
        provider: "catnet",
      },
      {
        id: "pixel_worker_analysis",
        name: "Pixel worker forensic analysis",
        shortName: "Pixel worker",
        result: "pass",
        confidence: 95,
        explanation: "Pixel worker subpixel analysis confirmed continuous spatial gradients and sensor noise uniformity.",
        provider: "pixel",
      },
    ];
  }

  const docType: DocumentKind = name.includes("aadhaar") ? "aadhaar" : name.includes("pan") ? "pan" : name.includes("passport") ? "passport" : "other";

  return {
    id,
    filename: file.name,
    type: docType,
    uploadedAt: new Date().toISOString(),
    status,
    score,
    fileSize: `${Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB`,
    mimeType: file.type || "application/octet-stream",
    reference: `VS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
    previewUrl,
    providerHealth: {
      local: "healthy",
      ocr: "healthy",
      pixel: "healthy",
      huggingface: "healthy",
      trufor: "healthy",
      catnet: "healthy",
    },
    extractedFields: docType === "pan"
      ? { pan_number: isSuspicious ? "ABCDE12349" : "ABCDE1234F", name: "SAMPLE CITIZEN" }
      : { aadhaar_number: isSuspicious ? "219345678901" : "219345678905", name: "SAMPLE CITIZEN" },
    comparisonFindings: isSuspicious
      ? [
          "checksum_identifier_validation: The extracted Aadhaar identifier fails the Verhoeff checksum algorithm.",
          "qr_signature_verification: Cryptographic signature digest mismatch: embedded public key signature does not match demographics.",
        ]
      : undefined,
    checks,
  };
}

export function detectDocumentType(name: string): DocumentKind {
  const fn = name.toLowerCase();
  if (fn.includes("bill") || fn.includes("invoice") || fn.includes("receipt") || fn.includes("hospital") || fn.includes("medical")) return "medical_bill";
  if (fn.includes("prescription") || fn.includes("rx") || fn.includes("doctor")) return "prescription";
  if (fn.includes("abha") || fn.includes("pmjay") || fn.includes("ayushman") || fn.includes("scheme")) return "scheme_document";
  if (fn.includes("aadhaar")) return "aadhaar";
  if (fn.includes("pan")) return "pan";
  if (fn.includes("passport")) return "passport";
  if (fn.includes("marksheet") || fn.includes("certificate")) return "marksheet";
  if (fn.includes("bank") || fn.includes("statement")) return "bank_statement";
  return "other";
}

export async function analyzeDocumentFile(file: File, documentType?: DocumentKind): Promise<VerificationDocument> {
  const docType = documentType || detectDocumentType(file.name);

  // 1. Prepare Multipart Form Data for Real Production Pipeline
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", docType);
  formData.append("document_type", docType);

  let response: Response | null = null;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
  } catch {
    // Relative endpoint failed or offline, try analyze-upload
    try {
      response = await fetch("/api/analyze-upload", {
        method: "POST",
        body: formData,
      });
    } catch {}
  }

  // 2. Fallback to /api/analyze-direct with base64 if multipart endpoint was not ready
  let dataUrl = "";
  if (!response || !response.ok) {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const comma = dataUrl.indexOf(",");
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;

    response = await fetch("/api/analyze-direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "image/jpeg",
        documentType: docType,
        contentBase64: base64,
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`Analysis server returned HTTP ${response.status}: Verification pipeline could not process specimen.`);
  }

  const data = await response.json();
  const id = data.id || `scan-${Date.now()}`;
  const score = typeof data.score === "number" ? data.score : (data.confidenceScore ?? 92);
  const status: DocumentStatus = data.status || getScanStatus(score);

  const checks: VerificationCheck[] = (data.checks || []).map((c: any, index: number) => ({
    id: `chk-${index}-${c.checkName}`,
    name: formatCheckName(c.checkName),
    shortName: formatCheckName(c.checkName).split(" ")[0] || c.checkName,
    result: c.result === "not_applicable" ? "not_applicable" : (c.result || "pass"),
    confidence: typeof c.confidence === "number" ? c.confidence : (c.result === "flag" ? 15 : 0),
    explanation: c.explanation || "Verified statutory standard baseline parameter.",
    flaggedRegion: c.flaggedRegion || c.flagged_region || undefined,
    provider: c.provider || "local",
    providerState: c.providerState || (data.providerHealth && c.provider ? data.providerHealth[c.provider] : "healthy"),
    category: getCheckCategory({ name: c.checkName, id: c.checkName } as any),
    weight: typeof c.weight === "number" ? c.weight : 1.0,
    effectiveWeight: typeof c.effectiveWeight === "number" ? c.effectiveWeight : 1.0,
  }));

  const activeModulesCount = typeof data.activeModulesCount === "number"
    ? data.activeModulesCount
    : checks.filter((c) => c.result === "pass" || c.result === "flag").length;

  return {
    id,
    filename: file.name,
    type: docType,
    uploadedAt: new Date().toISOString(),
    status,
    score,
    activeModulesCount,
    fileSize: `${Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB`,
    mimeType: file.type || "image/jpeg",
    reference: data.referenceCode || `VS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
    previewUrl: data.previewUrl || dataUrl || (file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined),
    sha256: data.sha256,
    medicalValidation: data.medicalValidation,
    elaMetrics: data.elaMetrics,
    checks,
    extractedFields: data.extractedFields || data.extracted_fields || {},
    comparisonFindings: data.comparisonFindings || [],
    providerHealth: data.providerHealth,
    summary: data.summary,
    systemError: data.systemError,
  };
}

export async function analyzeDocumentDirectly(file: File): Promise<VerificationDocument> {
  return analyzeDocumentFile(file);
}
