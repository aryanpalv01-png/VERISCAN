import { describe, expect, it } from "vitest";
import {
  calculateAggregatedConfidenceScore,
  getProviderDisplayName,
  getProviderStatusLabel,
  serverDocumentToVerification,
} from "./veriscan";

describe("provider health display mapping", () => {
  it("maps persisted health states to user-facing labels", () => {
    expect(getProviderStatusLabel("healthy", "Local only")).toBe("Active");
    expect(getProviderStatusLabel("degraded", "Self-hosted")).toBe("Degraded");
    expect(getProviderStatusLabel("not_configured", "Self-hosted")).toBe("Not configured");
    expect(getProviderStatusLabel(undefined, "Local only")).toBe("Local only");
  });

  it("normalizes persisted provider health for report surfaces", () => {
    const report = serverDocumentToVerification({ id: 7, originalFilename: "aadhaar.png", documentType: "aadhaar", mimeType: "image/png", fileSize: 2048, uploadedAt: new Date("2026-08-30T00:00:00Z"), status: "verified", confidenceScore: 92, referenceCode: "VS-TEST", providerHealth: { ocr: "healthy", trufor: "not_configured" }, extractedFields: { name: "Test" }, comparisonFindings: ["Example"] }, []);
    expect(report.providerHealth?.ocr).toBe("healthy");
    expect(report.providerHealth?.trufor).toBe("not_configured");
    expect(report.extractedFields?.name).toBe("Test");
    expect(report.comparisonFindings).toEqual(["Example"]);
  });

  it("correctly resolves previewUrl from fileUrl", () => {
    const report = serverDocumentToVerification({
      id: 8,
      originalFilename: "aadhaar_card.jpg",
      documentType: "aadhaar",
      mimeType: "image/jpeg",
      fileSize: 4096,
      uploadedAt: new Date("2026-09-01T00:00:00Z"),
      status: "verified",
      confidenceScore: 95,
      referenceCode: "VS-URL-TEST",
      fileUrl: "https://supabase.co/storage/v1/object/public/documents/aadhaar.jpg",
    }, []);
    expect(report.previewUrl).toBe("https://supabase.co/storage/v1/object/public/documents/aadhaar.jpg");
  });
});

describe("calculateAggregatedConfidenceScore institutional logic", () => {
  it("defaults strictly to 0 when all modules return N/A or not_applicable (activeChecks === 0)", () => {
    const checks = [
      { result: "not_applicable", confidence: 0 },
      { result: "not_applicable", confidence: 50 },
      { result: "N/A", confidence: 0 },
    ];
    // Must NOT return neutral midpoint 50
    expect(calculateAggregatedConfidenceScore(checks)).toBe(0);
  });

  it("strictly divides only by the count of successfully executed modules (activeChecks)", () => {
    const checks = [
      { result: "pass", confidence: 90 },
      { result: "flag", confidence: 30 },
      { result: "not_applicable", confidence: 0 },
      { result: "not_applicable", confidence: 50 },
    ];
    // activeChecks = 2 (pass: 90, flag: 30). (90 + 30) / 2 = 60
    expect(calculateAggregatedConfidenceScore(checks)).toBe(60);
  });

  it("handles empty checks array by defaulting to 0", () => {
    expect(calculateAggregatedConfidenceScore([])).toBe(0);
    expect(calculateAggregatedConfidenceScore(null)).toBe(0);
    expect(calculateAggregatedConfidenceScore(undefined)).toBe(0);
  });

  it("forces score to 0 in serverDocumentToVerification when all checks are not_applicable", () => {
    const report = serverDocumentToVerification(
      {
        id: 9,
        originalFilename: "unparsed.png",
        documentType: "other",
        mimeType: "image/png",
        fileSize: 1024,
        uploadedAt: new Date("2026-09-02T00:00:00Z"),
        status: "likely_forged",
        confidenceScore: 50, // Old default fallback that should be overridden
        referenceCode: "VS-NA-TEST",
      },
      [
        {
          id: 1,
          documentId: 9,
          checkName: "trufor_inference",
          result: "not_applicable",
          confidence: 0,
          explanation: "Offline",
          createdAt: new Date(),
        },
        {
          id: 2,
          documentId: 9,
          checkName: "catnet_inference",
          result: "not_applicable",
          confidence: 0,
          explanation: "Unconfigured",
          createdAt: new Date(),
        },
      ]
    );
    expect(report.score).toBe(0);
  });
});
