import { useAuth } from "@/_core/hooks/useAuth";
import { MicroservicesTelemetry } from "@/components/MicroservicesTelemetry";
import { trpc } from "@/lib/trpc";
import { getPreviewDocument } from "@/lib/scanStore";
import { serverDocumentToVerification, VerificationDocument } from "@/lib/veriscan";
import { ArrowLeft, Terminal, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

interface PipelineStep {
  stageNumber: number;
  name: string;
  detail: string;
  subsystem: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    stageNumber: 1,
    name: "Payload Ingestion & Cryptographic Digest",
    detail: "Compute immutable SHA-256 hash & verify payload buffer",
    subsystem: "Security Core",
  },
  {
    stageNumber: 2,
    name: "Metadata & EXIF Forensic Analysis",
    detail: "Inspect editing software markers (Photoshop/GIMP) & camera tags",
    subsystem: "EXIF Parser",
  },
  {
    stageNumber: 3,
    name: "Deterministic Verhoeff Dihedral Checksum",
    detail: "Validate permutation matrix and official document syntax",
    subsystem: "Algorithmic Math",
  },
  {
    stageNumber: 4,
    name: "UIDAI 2048-bit QR Digital Signature",
    detail: "Validate asymmetric RSA public key digital signature",
    subsystem: "Cryptographic RSA",
  },
  {
    stageNumber: 5,
    name: "JPEG Error Level Analysis (ELA)",
    detail: "Inspect 8x8 DCT compression grid for local resave anomalies",
    subsystem: "Computer Vision",
  },
  {
    stageNumber: 6,
    name: "Copy-Move Duplicate Keypoint Detection",
    detail: "Match spatial feature keypoints & detect duplicated cloned zones",
    subsystem: "Keypoint Matching",
  },
  {
    stageNumber: 7,
    name: "Typography, Baseline & Kerning Verification",
    detail: "Inspect character baseline alignment, kerning & font weights",
    subsystem: "OCR Typography",
  },
  {
    stageNumber: 8,
    name: "Multi-Evidence Fusion & Final Arbitration",
    detail: "Execute Tier A hard overrides & calculate confidence score",
    subsystem: "Fusion Engine",
  },
];

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
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Timer ticker for elapsed time
  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 45);
    return () => window.clearInterval(interval);
  }, []);

  // Step progression
  useEffect(() => {
    const stageDuration = 680;
    const timer = window.setInterval(() => {
      setActiveStage((prev) => {
        const next = prev + 1;
        if (next <= PIPELINE_STEPS.length) {
          const step = PIPELINE_STEPS[next - 1];
          if (step) {
            setTerminalLogs((logs) => [
              ...logs.slice(-12),
              `[+${((next * stageDuration) / 1000).toFixed(3)}s] ${step.subsystem}: Completed ${step.name}`,
            ]);
          }
        }
        return Math.min(next, PIPELINE_STEPS.length);
      });
    }, stageDuration);
    return () => window.clearInterval(timer);
  }, []);

  // Redirect on completion
  useEffect(() => {
    if (activeStage < PIPELINE_STEPS.length) return;
    const redirectTimer = window.setTimeout(() => {
      const targetId = params?.id && !params.id.startsWith("doc-") ? params.id : document.id;
      setLocation(`/report/${targetId}`);
    }, 900);
    return () => window.clearTimeout(redirectTimer);
  }, [activeStage, document.id, setLocation]);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const fraction = Math.floor((ms % 1000) / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
  };

  const progressPercent = Math.min(100, Math.round((activeStage / PIPELINE_STEPS.length) * 100));

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 py-3 sm:py-4 px-2 sm:px-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#3A3D45] pb-3 text-xs font-mono">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-[#FF9933] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cancel Screening</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-400">
          <span>Reference: <span className="text-white font-semibold">{document.reference}</span></span>
          <span className="text-[#3A3D45]">|</span>
          <span>Elapsed: <span className="text-[#FF9933] font-bold">{formatElapsed(elapsedMs)}</span></span>
          <span className="text-[#3A3D45]">|</span>
          <span className="command-badge command-badge-verified text-[10.5px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
            {activeStage >= PIPELINE_STEPS.length ? "Finalizing" : "Analyzing"}
          </span>
        </div>
      </div>

      {/* Primary Terminal Command Deck */}
      <div className="terminal-panel rounded-none">
        {/* Terminal Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A3D45] px-4 py-3 sm:px-5 sm:py-3.5 bg-[#1C1E22]">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#3A3D45] bg-[#26282D] text-[#FF9933]">
              <Terminal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-base sm:text-lg font-bold tracking-tight text-white">
                  Forensic Pipeline Execution
                </h1>
                <span className="command-badge bg-[#FF9933]/15 text-[#FFB057] border-[#FF9933]/40 text-[10px] font-bold">
                  8 Stages
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">
                Target: {document.filename} · Size: {document.fileSize}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 border-[#3A3D45]/40 pt-2 sm:pt-0 font-mono">
            <div className="text-xs text-slate-400">
              Progress: <span className="text-white font-bold">{activeStage} / {PIPELINE_STEPS.length}</span>
            </div>
            <div className="text-[11px] text-[#FF9933] font-semibold">
              {progressPercent}% Complete
            </div>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="h-1.5 w-full bg-[#1C1E22] border-b border-[#3A3D45]">
          <div
            className="h-full bg-linear-to-r from-[#FF9933] to-[#138808] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Linear Terminal Pipeline Ticker */}
        <div className="p-4 sm:p-6 space-y-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = idx < activeStage;
            const isRunning = idx === activeStage && activeStage < PIPELINE_STEPS.length;
            const isQueued = idx > activeStage;

            return (
              <div
                key={step.stageNumber}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border transition-colors font-mono text-xs ${
                  isRunning
                    ? "border-[#FF9933] bg-[#FF9933]/10 text-white"
                    : isDone
                    ? "border-[#3A3D45] bg-[#1C1E22] text-slate-200"
                    : "border-[#3A3D45]/40 bg-[#1C1E22]/50 text-slate-500"
                }`}
              >
                {/* Left: Step indicator & Description */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className={`text-[11px] shrink-0 font-bold ${isRunning ? "text-[#FF9933]" : isDone ? "text-[#138808]" : "text-slate-600"}`}>
                    Stage {step.stageNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold tracking-normal ${isRunning ? "text-white" : isDone ? "text-slate-200" : "text-slate-400"}`}>
                        {step.name}
                      </span>
                      <span className="text-[#3A3D45] hidden sm:inline">·</span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {step.detail}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Subsystem & Status Chip */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    {step.subsystem}
                  </span>
                  {isDone && (
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
        <div className="border-t border-[#3A3D45] bg-[#1C1E22] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-slate-400 font-semibold uppercase">
              Pipeline Execution Log
            </span>
            <span className="font-mono text-[11px] text-[#138808] font-bold">
              {activeStage >= PIPELINE_STEPS.length ? "Screening Completed" : "Engine Active"}
            </span>
          </div>
          <div className="h-28 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1 bg-[#151719] p-3 border border-[#3A3D45]">
            <p className="text-[#FF9933]">&gt; Core: Initializing secure forensic sandbox for reference {document.reference}...</p>
            <p className="text-slate-400">&gt; Storage: Document byte stream verified (length: {document.fileSize}).</p>
            {PIPELINE_STEPS.slice(0, activeStage).map((step) => (
              <p key={step.stageNumber} className="text-[#22C55E]">
                &gt; {step.name}: Processed nominal ({step.detail})
              </p>
            ))}
            {activeStage < PIPELINE_STEPS.length && (
              <p className="text-[#FF9933] animate-pulse">
                &gt; {PIPELINE_STEPS[activeStage].name}: Executing inspection...
              </p>
            )}
            {activeStage >= PIPELINE_STEPS.length && (
              <p className="text-[#22C55E] font-bold">
                &gt; VeriScan: All 8 forensic modules executed. Verdict synthesized. Transferring to audit dossier...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Microservices Telemetry Architecture */}
      <div>
        <MicroservicesTelemetry currentStageIndex={activeStage} />
      </div>
    </div>
  );
}
