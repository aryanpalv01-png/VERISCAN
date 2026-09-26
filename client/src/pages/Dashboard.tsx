import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { fileToBase64, readLocalScans, writeLocalScan } from "@/lib/scanStore";
import {
  analyzeDocumentFile,
  calculateAggregatedConfidenceScore,
  detectDocumentType,
  DocumentKind,
  demoDocuments,
  VerificationDocument,
  VerificationCheck,
  formatCheckName,
  getCheckCategory,
} from "@/lib/veriscan";
import {
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const userIdentifier = user?.email || user?.openId || "guest";

  const [localScans, setLocalScans] = useState<VerificationDocument[]>(() =>
    readLocalScans(userIdentifier)
  );
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | undefined>(undefined);

  const scansQuery = trpc.scans.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const createScan = trpc.scans.create.useMutation({
    onSuccess: async (result: any) => {
      await utils.scans.list.invalidate();
      const checksList = (result.checks || []).map((c: any, index: number) => ({
        id: String(c.id || index + 1),
        name: formatCheckName(c.checkName),
        shortName: formatCheckName(c.checkName).split(" ")[0] || c.checkName,
        result: c.result,
        confidence: c.confidence,
        explanation: c.explanation,
        flaggedRegion: c.flaggedRegion || c.flagged_region || undefined,
        provider: c.provider,
        providerState: result.providerHealth?.[c.provider] || "healthy",
        category: getCheckCategory({ name: c.checkName, id: c.checkName } as any),
        weight: c.weight,
        effectiveWeight: c.effectiveWeight,
      }));

      const activeCount =
        typeof result.activeModulesCount === "number"
          ? result.activeModulesCount
          : checksList.filter((c: any) => c.result === "pass" || c.result === "flag").length;

      let previewUrl: string | undefined;
      if (currentFileRef.current) {
        try {
          const b64 = await fileToBase64(currentFileRef.current);
          previewUrl = `data:${currentFileRef.current.type || "image/jpeg"};base64,${b64}`;
        } catch {
          // ignore
        }
      }

      const newDoc: VerificationDocument = {
        id: String(result.id),
        filename: currentFileRef.current?.name || "Document",
        type: (result.documentType as any) || "other",
        uploadedAt: new Date().toISOString(),
        status: result.status,
        score: result.confidenceScore ?? result.score ?? 0,
        activeModulesCount: activeCount,
        fileSize: currentFileRef.current
          ? `${Math.max(0.1, currentFileRef.current.size / 1024 / 1024).toFixed(1)} MB`
          : "1.2 MB",
        mimeType: currentFileRef.current?.type || "image/jpeg",
        reference: result.referenceCode || `VS-${result.id}`,
        previewUrl,
        checks: checksList,
        extractedFields: result.extractedFields,
        comparisonFindings: result.comparisonFindings,
        providerHealth: result.providerHealth,
        summary: result.summary,
      };

      writeLocalScan(newDoc, userIdentifier);
      setLocalScans(readLocalScans(userIdentifier));
      setSelectedDocId(newDoc.id);
      toast.success("Specimen checked");
    },
    onError: async (error) => {
      if (currentFileRef.current) {
        let previewUrl: string | undefined;
        try {
          const b64 = await fileToBase64(currentFileRef.current);
          previewUrl = `data:${currentFileRef.current.type || "image/jpeg"};base64,${b64}`;
        } catch {
          // ignore
        }

        try {
          const fallback = await analyzeDocumentFile(currentFileRef.current);
          writeLocalScan(fallback, userIdentifier);
          setLocalScans(readLocalScans(userIdentifier));
          setSelectedDocId(fallback.id);
          return;
        } catch (pipelineErr: any) {
          setUploadError(pipelineErr.message || error.message || "Upload processing error");
          toast.error("Upload error", { description: pipelineErr.message || error.message });
          return;
        }
      }
      setUploadError(error.message || "Upload processing error");
      toast.error("Upload error", { description: error.message });
    },
  });

  const serverDocuments = useMemo(() => {
    if (!scansQuery.data || !Array.isArray(scansQuery.data)) return [];
    return (scansQuery.data as any[]).map((doc) => {
      const checks = Array.isArray(doc.checks) ? doc.checks : [];
      const score =
        typeof doc.confidenceScore === "number"
          ? doc.confidenceScore
          : typeof doc.score === "number"
          ? doc.score
          : checks.length > 0
          ? calculateAggregatedConfidenceScore(checks, doc.confidenceScore ?? doc.score)
          : 0;

      return {
        id: String(doc.id),
        filename: doc.fileName || "Document",
        documentType: doc.documentType || "other",
        type: (doc.documentType as any) || "other",
        status: (doc.status as any) || "verified",
        score,
        uploadedAt: doc.createdAt
          ? new Date(doc.createdAt).toISOString()
          : new Date().toISOString(),
        reference: doc.sha256Hash
          ? doc.sha256Hash.slice(0, 16).toUpperCase()
          : `VS-IN-${doc.id}`,
        fileSize: `${Math.round((doc.fileSize ?? 102400) / 1024)} KB`,
        mimeType: doc.mimeType || "application/pdf",
        checks,
      };
    });
  }, [scansQuery.data]);

  // Combined documents list prioritizing fresh local/server scans, then rich demo specimens
  const allDocuments: VerificationDocument[] = useMemo(() => {
    const list: VerificationDocument[] = [];
    if (serverDocuments.length > 0) {
      list.push(...serverDocuments);
    }
    if (localScans.length > 0) {
      localScans.forEach((l) => {
        if (!list.some((existing) => existing.id === l.id)) {
          list.push(l);
        }
      });
    }
    if (list.length === 0) {
      return demoDocuments;
    }
    return list;
  }, [serverDocuments, localScans]);

  // Active specimen selected for the split view
  const activeDocument: VerificationDocument = useMemo(() => {
    if (selectedDocId) {
      const found = allDocuments.find((d) => d.id === selectedDocId);
      if (found) return found;
    }
    return allDocuments[0] || demoDocuments[0];
  }, [selectedDocId, allDocuments]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setLocalScans(readLocalScans(userIdentifier));
    const refresh = () => setLocalScans(readLocalScans(userIdentifier));
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [userIdentifier]);

  const handleFileIngest = async (file: File, documentType?: DocumentKind) => {
    setUploadError("");
    setIsAnalyzing(true);
    currentFileRef.current = file;

    const docType = documentType || detectDocumentType(file.name);

    try {
      // 1. Direct Real Execution via multipart/form-data to /api/analyze
      const analyzedDoc = await analyzeDocumentFile(file, docType);
      writeLocalScan(analyzedDoc, userIdentifier);
      setLocalScans(readLocalScans(userIdentifier));
      setSelectedDocId(analyzedDoc.id);

      toast.success("Specimen Analyzed", {
        description: `Verified ${analyzedDoc.activeModulesCount || 11} modules with score ${analyzedDoc.score}/100`,
      });

      // 2. Synchronize to server database if available
      try {
        const contentBase64 = await fileToBase64(file);
        createScan.mutate({
          fileName: file.name,
          documentType: docType,
          fileSize: file.size,
          mimeType: file.type || "image/jpeg",
          contentBase64,
        });
      } catch {
        // Local state is already active and rendered
      }
    } catch (err: any) {
      console.error("Direct specimen analysis error:", err);
      setUploadError(err.message || "Forensic analysis failed. Please provide a valid specimen.");
      toast.error("Analysis Error", { description: err.message || "Failed to process specimen." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Active document telemetry helpers
  const isVerified = activeDocument.status === "verified";
  const coreChecks = [
    {
      label: t("check_ocr"),
      matches: (check: VerificationCheck) => /ocr|text extraction/.test(`${check.id ?? ""} ${check.name ?? ""} ${(check as any).checkName ?? ""}`.toLowerCase()),
    },
    {
      label: activeDocument.type === "passport" ? t("check_checksum") : t("check_id_checksum"),
      matches: (check: VerificationCheck) => /checksum|verhoeff|identifier|icao/.test(`${check.id ?? ""} ${check.name ?? ""} ${(check as any).checkName ?? ""}`.toLowerCase()),
    },
    {
      label: t("check_ela"),
      matches: (check: VerificationCheck) => /\bela\b|compression/.test(`${check.id ?? ""} ${check.name ?? ""} ${(check as any).checkName ?? ""}`.toLowerCase()),
    },
  ].map((definition) => ({
    ...definition,
    result: activeDocument.checks?.find(definition.matches)?.result,
  }));

  return (
    <div className="mx-auto w-full space-y-3 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.[0]) handleFileIngest(event.target.files[0]);
        }}
      />

      {uploadError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center justify-between"
          role="alert"
        >
          <span>Error processing specimen: {uploadError}</span>
          <button
            onClick={() => setUploadError("")}
            className="text-red-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="verification-summary-title">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h1 id="verification-summary-title" className="text-base font-semibold text-slate-900">{t("summary_title")}</h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">{t("specimen_id")}: {activeDocument.reference || activeDocument.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isVerified ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
              activeDocument.status === "likely_forged" ? "border-rose-200 bg-rose-50 text-rose-800" :
              "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              {activeDocument.status === "verified" ? t("verified") : activeDocument.status === "likely_forged" ? t("likely_forged") : t("needs_review")}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={createScan.isPending || isAnalyzing}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-700 px-3 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {createScan.isPending || isAnalyzing ? t("verifying_specimen") : t("verify_specimen_action")}
            </button>
          </div>
        </header>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <div>
            <h2 className="text-xs font-semibold uppercase text-slate-500">{t("core_checks")}</h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {coreChecks.map((check) => (
                <li key={check.label} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-medium text-slate-700">{check.label}</span>
                  <span className={`shrink-0 text-xs font-semibold ${
                    check.result === "pass" ? "text-emerald-700" :
                    check.result === "flag" ? "text-rose-700" : "text-slate-500"
                  }`}>
                    {check.result === "pass" ? t("check_passed") : check.result === "flag" ? t("check_flagged") : t("check_unavailable")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`flex flex-col justify-center rounded-md border p-4 ${
            isVerified ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
          }`}>
            <span className="text-[11px] font-semibold uppercase text-slate-500">{t("system_directive")}</span>
            <strong className={`mt-1 text-base ${isVerified ? "text-emerald-900" : "text-rose-900"}`}>
              {isVerified ? t("directive_clear") : t("directive_hold")}
            </strong>
            <span className="mt-2 text-xs text-slate-600">{activeDocument.filename}</span>
          </div>
        </div>

      </section>

      {/* Bottom Specimen Switcher Ledger */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-800 font-bold text-xs uppercase tracking-wide">
              {t("recent_specimens")} ({allDocuments.length})
            </span>
          </div>
        </div>

        {/* Horizontal Specimen Chip Strip */}
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 text-xs">
          {allDocuments.slice(0, 8).map((doc) => {
            const isSelected = doc.id === activeDocument.id;
            const docVerified = doc.status === "verified";
            const docForged = doc.status === "likely_forged";

            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setSelectedDocId(doc.id);
                }}
                className={`shrink-0 flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-400"
                    : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-[10px] ${
                    docVerified
                      ? "bg-emerald-100 text-emerald-800"
                      : docForged
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {doc.score}
                </div>

                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-900 truncate max-w-[120px]">
                      {doc.reference}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">
                      {doc.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {doc.filename}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
