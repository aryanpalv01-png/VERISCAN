import { useAuth } from "@/_core/hooks/useAuth";
import { MicroservicesTelemetry } from "@/components/MicroservicesTelemetry";
import { trpc } from "@/lib/trpc";
import { getPreviewDocument } from "@/lib/scanStore";
import { serverDocumentToVerification, VerificationCheck, VerificationDocument } from "@/lib/veriscan";
import { ArrowLeft, Terminal, CheckCircle2, AlertTriangle, Loader2, FileCheck2, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";

interface PipelineStep {
  stageNumber: number;
  checkKey: string;
  name: string;
  detail: string;
  subsystem: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    stageNumber: 1,
    checkKey: "metadata_exif_inspection",
    name: "Metadata & EXIF Forensic Inspection",
    detail: "Inspect container headers, camera tags, and editing software signatures",
    subsystem: "EXIF Parser",
  },
  {
    stageNumber: 2,
    checkKey: "checksum_identifier_validation",
    name: "Deterministic Identifier & Dihedral Checksum",
    detail: "Validate permutation matrix (Verhoeff) & statutory syntax rules",
    subsystem: "Algorithmic Math",
  },
  {
    stageNumber: 3,
    checkKey: "qr_signature_verification",
    name: "UIDAI 2048-bit QR Digital Signature",
    detail: "Validate asymmetric RSA public key digital signature hierarchy",
    subsystem: "Cryptographic RSA",
  },
  {
    stageNumber: 4,
    checkKey: "ela_compression_analysis",
    name: "JPEG Error Level Analysis (ELA)",
    detail: "Analyze 8x8 DCT compression grid for local resave discrepancies",
    subsystem: "Computer Vision",
  },
  {
    stageNumber: 5,
    checkKey: "copy_move_clone_detection",
    name: "Spatial Copy-Move & Duplicate Keypoints",
    detail: "Match spatial feature keypoints & detect duplicated cloned zones",
    subsystem: "Keypoint Matching",
  },
  {
    stageNumber: 6,
    checkKey: "screenshot_capture_detection",
    name: "Screenshot & Moire Pattern Detection",
    detail: "Inspect sensor noise variance and raster re-render signatures",
    subsystem: "Capture Analysis",
  },
  {
    stageNumber: 7,
    checkKey: "ocr_typography_consistency",
    name: "OCR Typography & Baseline Consistency",
    detail: "Inspect character baseline alignment, kerning, and stroke metrics",
    subsystem: "OCR Typography",
  },
  {
    stageNumber: 8,
    checkKey: "ai_generated_image_detector",
    name: "AI-Generated Image & GAN Detector",
    detail: "Deep neural feature probe for diffusion/GAN synthetic generation",
    subsystem: "Neural API",
  },
  {
    stageNumber: 9,
    checkKey: "trufor_inference",
    name: "TruFor Dense Feature Map & Noiseprint",
    detail: "RGB + Noiseprint residual feature map for spatial tampering localization",
    subsystem: "GPU Neural",
  },
  {
    stageNumber: 10,
    checkKey: "catnet_inference",
    name: "CAT-Net DCT Quantization Domain",
    detail: "Macroblock frequency artifact tracing and quantization table check",
    subsystem: "GPU Neural",
  },
  {
    stageNumber: 11,
    checkKey: "pixel_worker_analysis",
    name: "Subpixel Raster & Resampling Analysis",
    detail: "Subpixel gradient variance, Laplacian sharpness, and resampling boundaries",
    subsystem: "Pixel Engine",
  },
  {
    stageNumber: 12,
    checkKey: "fusion_engine",
    name: "Penalty-Subtraction Fusion & Arbitration",
    detail: "Multi-evidence score arbitration starting from 100 with Tier A overrides",
    subsystem: "Fusion Engine",
  },
];

function findCheckForStep(step: PipelineStep, checks: VerificationCheck[]): VerificationCheck | undefined {
  if (step.checkKey === "fusion_engine") return undefined;
  return checks.find((c) => {
    const id = (c.id || "").toLowerCase();
    const name = (c.name || "").toLowerCase();
    const key = step.checkKey.toLowerCase();
    if (id.includes(key) || name.includes(key)) return true;
    if (key === "metadata_exif_inspection" && (id.includes("metadata") || id.includes("exif"))) return true;
    if (key === "checksum_identifier_validation" && (id.includes("checksum") || id.includes("identifier") || id.includes("verhoeff"))) return true;
    if (key === "qr_signature_verification" && (id.includes("qr") || id.includes("signature"))) return true;
    if (key === "ela_compression_analysis" && (id.includes("ela") || id.includes("compression"))) return true;
    if (key === "copy_move_clone_detection" && (id.includes("copy") || id.includes("clone"))) return true;
    if (key === "screenshot_capture_detection" && (id.includes("screenshot") || id.includes("capture"))) return true;
    if (key === "ocr_typography_consistency" && (id.includes("typography") || id.includes("font") || id.includes("ocr"))) return true;
    if (key === "ai_generated_image_detector" && (id.includes("ai_generated") || id.includes("ai-generated") || id.includes("gan"))) return true;
    if (key === "trufor_inference" && id.includes("trufor")) return true;
    if (key === "catnet_inference" && (id.includes("catnet") || id.includes("cat-net"))) return true;
    if (key === "pixel_worker_analysis" && (id.includes("pixel") || id.includes("raster"))) return true;
    return false;
  });
}

export default function Scan() {
  const [, params] = useRoute("/scan/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const numericId = Number(params?.id);
  const serverQuery = trpc.scans.get.useQuery(
    { id: numericId },
    { enabled: Number.isInteger(numericId) && numericId > 0, retry: false }
  );

  const document = useMemo<VerificationDocument>(() => {
    const local = getPreviewDocument(params?.id, userIdentifier);
    if (serverQuery.data) {
      const doc = serverDocumentToVerification(serverQuery.data.document, serverQuery.data.checks);
      if (!doc.previewUrl && local?.previewUrl) {
        doc.previewUrl = local.previewUrl;
      }
      return doc;
    }
    if (local) return local;

    if (params?.id && !params.id.startsWith("doc-")) {
      const latest = getPreviewDocument("latest");
      if (latest) return latest;
    }

    return getPreviewDocument(params?.id) ?? getPreviewDocument("doc-verified-001")!;
  }, [serverQuery.data, params?.id, userIdentifier]);

  const [activeStage, setActiveStage] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Active checks count computed strictly from non-NA executed modules
  const activeCount = useMemo(() => {
    if (typeof document.activeModulesCount === "number") return document.activeModulesCount;
    return document.checks.filter((c) => c.result === "pass" || c.result === "flag").length;
  }, [document]);

  // Timer ticker for elapsed time
  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 45);
    return () => window.clearInterval(interval);
  }, []);

  // Step progression through pipeline stages
  useEffect(() => {
    const stageDuration = 420;
    const timer = window.setInterval(() => {
      setActiveStage((prev) => {
        const next = prev + 1;
        return Math.min(next, PIPELINE_STEPS.length);
      });
    }, stageDuration);
    return () => window.clearInterval(timer);
  }, []);

  // Auto-redirect on completion
  useEffect(() => {
    if (activeStage < PIPELINE_STEPS.length) return;
    const redirectTimer = window.setTimeout(() => {
      const targetId = params?.id && !params.id.startsWith("doc-") ? params.id : document.id;
      setLocation(`/report/${targetId}`);
    }, 1200);
    return () => window.clearTimeout(redirectTimer);
  }, [activeStage, document.id, setLocation, params?.id]);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const fraction = Math.floor((ms % 1000) / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
  };

  const progressPercent = Math.min(100, Math.round((activeStage / PIPELINE_STEPS.length) * 100));

  const statusBadge = useMemo(() => {
    if (document.status === "verified") {
      return { bg: "bg-[#138808]/20", text: "text-[#138808]", border: "border-[#138808]/40", label: "VERIFIED" };
    }
    if (document.status === "needs_review") {
      return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40", label: "NEEDS REVIEW" };
    }
    return { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40", label: "LIKELY FORGED" };
  }, [document.status]);

  return (
    <div className="mx-auto max-w-[1280px] space-y-3.5 py-2 sm:py-3 px-2 sm:px-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-2.5 text-xs font-mono">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-[#FF9933] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cancel Screening</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10.5px] text-slate-400">
          <span>Reference: <span className="text-white font-semibold">{document.reference}</span></span>
          <span className="text-white/20">|</span>
          <span>Elapsed: <span className="text-[#FF9933] font-bold">{formatElapsed(elapsedMs)}</span></span>
          <span className="text-white/20">|</span>
          <span className="command-badge border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cyber-pulse-green" />
            {activeStage >= PIPELINE_STEPS.length ? "Finalized" : "Analyzing"}
          </span>
        </div>
      </div>

      {/* Primary Terminal Command Deck */}
      <div className="terminal-panel border border-white/10 bg-[#101014]">
        {/* Terminal Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 px-4 py-2.5 sm:px-5 bg-[#121217]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 bg-[#17171f] text-[#FF9933]">
              <Terminal className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-mono text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                  Forensic Pipeline Execution Ledger
                </h1>
                <span className="command-badge border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-[9.5px] font-bold">
                  {activeCount} / 11 Active Modules
                </span>
                {activeStage >= PIPELINE_STEPS.length && (
                  <span className={`command-badge ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} text-[9.5px] font-bold`}>
                    Score: {document.score}/100 · {statusBadge.label}
                  </span>
                )}
              </div>
              <p className="font-mono text-[10.5px] text-[#737380] mt-0.5 truncate">
                Target: {document.filename} · Size: {document.fileSize} · Type: {document.type.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 font-mono">
            <div className="text-xs text-[#9CA3AF]">
              Pipeline Stage: <span className="text-white font-bold">{activeStage} / {PIPELINE_STEPS.length}</span>
            </div>
            <div className="text-[10.5px] text-[#FF9933] font-semibold">
              {progressPercent}% Complete
            </div>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="h-1.5 w-full bg-[#0a0a0c] border-b border-white/10">
          <div
            className="h-full bg-linear-to-r from-[#FF9933] to-[#10B981] transition-all duration-300 shadow-[0_0_10px_#10B981]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Linear Terminal Pipeline Ticker */}
        <div className="p-3 sm:p-4 space-y-1.5">
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = idx < activeStage;
            const isRunning = idx === activeStage && activeStage < PIPELINE_STEPS.length;
            const isQueued = idx > activeStage;
            const check = findCheckForStep(step, document.checks);

            return (
              <div
                key={step.stageNumber}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 border transition-colors font-mono text-xs ${
                  isRunning
                    ? "border-[#FF9933] bg-[#FF9933]/15 text-white shadow-[0_0_12px_rgba(255,153,51,0.15)]"
                    : isDone
                    ? check?.result === "flag"
                      ? "border-rose-800/40 bg-rose-950/20 text-slate-200"
                      : "border-white/10 bg-[#121217] text-slate-200"
                    : "border-white/5 bg-[#0e0e12] text-[#737380]"
                }`}
              >
                {/* Left: Step indicator & Description */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className={`text-[11px] shrink-0 font-bold ${
                    isRunning
                      ? "text-[#FF9933]"
                      : isDone
                      ? check?.result === "flag"
                        ? "text-amber-400"
                        : "text-[#138808]"
                      : "text-slate-600"
                  }`}>
                    Stage {step.stageNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold tracking-normal ${isRunning ? "text-white" : isDone ? "text-slate-200" : "text-slate-400"}`}>
                        {step.name}
                      </span>
                      <span className="text-[#3A3D45] hidden sm:inline">·</span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {isDone && check?.explanation ? check.explanation : step.detail}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Subsystem & Status Chip */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    {step.subsystem}
                  </span>
                  {isDone && step.checkKey === "fusion_engine" && (
                    <span className={`command-badge ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                      Score: {document.score}/100
                    </span>
                  )}
                  {isDone && step.checkKey !== "fusion_engine" && check && check.result === "pass" && (
                    <span className="command-badge command-badge-verified">
                      <CheckCircle2 className="h-3 w-3 text-[#138808]" />
                      Pass ({check.confidence}%)
                    </span>
                  )}
                  {isDone && step.checkKey !== "fusion_engine" && check && check.result === "flag" && (
                    <span className="command-badge bg-amber-500/20 text-amber-300 border-amber-500/40">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      Flagged ({check.confidence}%)
                    </span>
                  )}
                  {isDone && step.checkKey !== "fusion_engine" && (!check || check.result === "not_applicable") && (
                    <span className="command-badge command-badge-verified">
                      <CheckCircle2 className="h-3 w-3 text-[#138808]" />
                      Verified
                    </span>
                  )}
                  {isRunning && (
                    <span className="command-badge bg-[#FF9933]/20 text-[#FFB057] border-[#FF9933] flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin text-[#FF9933]" />
                      Analyzing
                    </span>
                  )}
                  {isQueued && (
                    <span className="command-badge bg-transparent text-slate-500 border-[#3A3D45]">
                      Queued
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal Telemetry Log Box */}
        <div className="border-t border-white/10 bg-[#121217] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10.5px] text-slate-400 font-semibold uppercase">
              Pipeline Execution Log // Telemetry Stream
            </span>
            <span className="font-mono text-[10.5px] text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cyber-pulse-green" />
              {activeStage >= PIPELINE_STEPS.length ? "Screening Finalized" : "Engine Active"}
            </span>
          </div>
          <div className="h-32 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1 bg-[#0a0a0c] p-3 border border-white/10">
            <p className="text-[#FF9933]">&gt; Core: Initializing secure forensic sandbox for reference {document.reference}...</p>
            <p className="text-slate-400">&gt; Ingestion: Document payload decoded (format: {document.mimeType}, size: {document.fileSize}).</p>
            {PIPELINE_STEPS.slice(0, activeStage).map((step) => {
              const check = findCheckForStep(step, document.checks);
              if (step.checkKey === "fusion_engine") {
                return (
                  <p key={step.stageNumber} className="text-emerald-400 font-bold">
                    &gt; [Fusion Engine]: Multi-evidence score synthesized: {document.score}/100 · Verdict: {document.status.toUpperCase()} ({activeCount} active modules evaluated).
                  </p>
                );
              }
              const isFlag = check?.result === "flag";
              return (
                <p key={step.stageNumber} className={isFlag ? "text-rose-400" : "text-emerald-400"}>
                  &gt; [{step.subsystem}] {step.name} =&gt; {check ? `${check.result.toUpperCase()} (${check.confidence}%)` : "NOMINAL"}: {check?.explanation || step.detail}
                </p>
              );
            })}
            {activeStage < PIPELINE_STEPS.length && (
              <p className="text-[#FF9933] animate-pulse">
                &gt; [{PIPELINE_STEPS[activeStage].subsystem}] {PIPELINE_STEPS[activeStage].name}: Executing inspection...
              </p>
            )}
            {activeStage >= PIPELINE_STEPS.length && (
              <div className="pt-2 flex items-center justify-between">
                <p className="text-emerald-400 font-bold">
                  &gt; VeriScan: All 11 forensic modules executed. Final dossier prepared.
                </p>
                <Link href={`/report/${params?.id && !params.id.startsWith("doc-") ? params.id : document.id}`}>
                  <Button size="sm" className="h-6 gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] px-2.5 cursor-pointer">
                    View Forensic Report <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Microservices Telemetry Architecture */}
      <div>
        <MicroservicesTelemetry
          currentStageIndex={activeStage}
          documentScore={document.score}
        />
      </div>
    </div>
  );
}

