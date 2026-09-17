import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { fileToBase64, readLocalScans, writeLocalScan } from "@/lib/scanStore";
import {
  analyzeDocumentFile,
  analyzeDocumentDirectly,
  calculateAggregatedConfidenceScore,
  detectDocumentType,
  DocumentKind,
  formatDate,
  formatDocumentType,
  demoDocuments,
  statusMeta,
  VerificationDocument,
  VerificationCheck,
  DocumentStatus,
  formatCheckName,
  getCheckCategory,
} from "@/lib/veriscan";
import { ForensicSpecimenLoupe } from "@/components/ForensicSpecimenLoupe";
import {
  ForensicParametersTable,
  ForensicParamDefinition,
} from "@/components/ForensicParametersTable";

import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UploadCloud,
  FileCheck2,
  LockKeyhole,
  CheckCircle2,
  Crosshair,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

function CircularScoreGauge({ score, size = 42 }: { score: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    clamped >= 80 ? "#059669" : clamped >= 50 ? "#d97706" : "#dc2626";

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
        <span className="text-[11px] font-extrabold text-slate-900 leading-none">{clamped}</span>
        <span className="text-[7.5px] text-slate-400 font-semibold leading-none mt-0.5">%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";

  const [localScans, setLocalScans] = useState<VerificationDocument[]>(() =>
    readLocalScans(userIdentifier)
  );
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(true);

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
      toast.success("Specimen Ingested", {
        description: `Verified ${activeCount}/11 modules with score ${newDoc.score}/100`,
      });
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
        checks.length > 0
          ? calculateAggregatedConfidenceScore(checks, doc.confidenceScore)
          : (doc.confidenceScore ?? 0);

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

  const handleSelectCheck = (check: VerificationCheck) => {
    setSelectedCheckId(check.id);
  };

  const handleSelectParam = (
    param: ForensicParamDefinition,
    matched?: VerificationCheck
  ) => {
    if (matched) {
      setSelectedCheckId(matched.id);
    } else {
      setSelectedCheckId(param.id);
    }
  };

  // Active document telemetry helpers
  const isVerified = activeDocument.status === "verified";
  const isForged = activeDocument.status === "likely_forged";

  return (
    <div className="mx-auto w-full space-y-3 font-sans">
      {/* Command Header: Minimalist Top Nav (Zero Fluff, Zero Explanatory Text) */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
        {/* Left: Live System Health Indicator & Active Project Target */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-extrabold text-slate-900 tracking-tight text-sm">
              VeriScan // SIH-2026
            </span>
          </div>

          <span className="hidden sm:inline text-slate-300">|</span>

          {/* Active Specimen Chip */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-slate-900 truncate max-w-[180px] lg:max-w-[240px]">
              {activeDocument.filename}
            </span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono">
              {activeDocument.reference}
            </span>
          </div>
        </div>

        {/* Center: Live Bayesian Integrity Score & Verdict */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isVerified
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : isForged
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            )}
            <span>{statusMeta[activeDocument.status as DocumentStatus]?.label || "Verified Genuine"}</span>
          </span>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <CircularScoreGauge score={activeDocument.score} size={36} />
            <div className="hidden md:block text-left">
              <div className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">Score</div>
              <div className="text-xs font-extrabold text-slate-900 leading-none">
                {activeDocument.score}/100
              </div>
            </div>
          </div>
        </div>

        {/* Right: Rapid File-Drop Zone Button & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={createScan.isPending || isAnalyzing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 text-xs shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>{createScan.isPending || isAnalyzing ? "Analyzing Specimen..." : "+ Ingest Specimen"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileIngest(e.target.files[0]);
              }
            }}
          />

          <Link href={`/report/${activeDocument.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 text-xs font-semibold gap-1 px-2.5 rounded-lg shadow-xs"
            >
              <span>Dossier</span>
              <ExternalLink className="h-3 w-3 text-indigo-600" />
            </Button>
          </Link>
        </div>
      </header>

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

      {/* Main Forensic Workspace: Strict Asymmetric 12-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 xl:h-[calc(100vh-148px)] xl:overflow-hidden">
        {/* Columns 1-5: Interactive Document Specimen Inspector */}
        <div className="xl:col-span-5 h-full flex flex-col justify-between overflow-hidden">
          {/* Mobile/Tablet Accordion Drawer Trigger (<1200px) */}
          <div className="xl:hidden mb-2">
            <button
              type="button"
              onClick={() => setIsMobileInspectorOpen(!isMobileInspectorOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-xs"
            >
              <span className="flex items-center gap-1.5">
                <Crosshair className="h-3.5 w-3.5 text-indigo-600" />
                <span>Document Specimen Inspector</span>
              </span>
              <span className="text-indigo-600 text-[11px] font-semibold">
                {isMobileInspectorOpen ? "Collapse Drawer ▲" : "Expand Drawer ▼"}
              </span>
            </button>
          </div>

          <div className={`${isMobileInspectorOpen ? "block" : "hidden xl:block"} h-full`}>
            <ForensicSpecimenLoupe
              document={activeDocument}
              selectedCheckId={selectedCheckId}
              onSelectCheck={handleSelectCheck}
              onFileIngest={handleFileIngest}
              isIngesting={createScan.isPending || isAnalyzing}
            />
          </div>
        </div>

        {/* Columns 6-12: High-Density Forensic Telemetry Matrix (All 11 Checks) */}
        <div className="xl:col-span-7 h-full flex flex-col justify-between overflow-hidden">
          <ForensicParametersTable
            document={activeDocument}
            selectedCheckId={selectedCheckId}
            onSelectParam={handleSelectParam}
          />
        </div>
      </div>

      {/* Bottom Specimen Switcher Ledger */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-800 font-bold text-xs uppercase tracking-wide">
              Specimen Ledger ({allDocuments.length})
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Select record to inspect live telemetry
            </span>
          </div>

          <Link
            href="/history"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            <span>Audit Trail</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
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
                  setSelectedCheckId(null);
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
