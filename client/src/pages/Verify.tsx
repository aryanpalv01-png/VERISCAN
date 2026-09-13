import { useAuth } from "@/_core/hooks/useAuth";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { trpc } from "@/lib/trpc";
import { fileToBase64, writeLocalScan } from "@/lib/scanStore";
import { analyzeDocumentDirectly, formatCheckName, getCheckCategory, VerificationDocument } from "@/lib/veriscan";

import {
  ArrowLeft,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Verify() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const [uploadError, setUploadError] = useState("");
  const currentFileRef = useRef<File | null>(null);
  const utils = trpc.useUtils();

  const createScan = trpc.scans.create.useMutation({
    onSuccess: async (result) => {
      await utils.scans.list.invalidate();
      setLocation(`/scan/${result.id}`);
    },
    onError: async (error) => {
      console.warn("tRPC scan creation fallback to direct forensic analysis:", error);
      if (currentFileRef.current) {
        try {
          const scan = await analyzeDocumentDirectly(currentFileRef.current);
          writeLocalScan(scan, userIdentifier);
          setLocation(`/scan/${scan.id}`);
          return;
        } catch (directErr: any) {
          console.error("Direct forensic analysis error:", directErr);
          setUploadError(directErr.message || error.message || "Upload processing error");
          toast.error("Document analysis error", {
            description: directErr.message || error.message || "Pipeline execution failed.",
          });
        }
      }
    },
  });

  const handleFile = async (file: File) => {
    setUploadError("");
    currentFileRef.current = file;
    const docType = file.name.toLowerCase().includes("aadhaar")
      ? "aadhaar"
      : file.name.toLowerCase().includes("pan")
      ? "pan"
      : file.name.toLowerCase().includes("passport")
      ? "passport"
      : "other";

    let previewUrl: string | undefined;
    try {
      const contentBase64 = await fileToBase64(file);
      previewUrl = `data:${file.type || "image/jpeg"};base64,${contentBase64}`;
      createScan.mutate(
        {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: docType,
          contentBase64,
        },
        {
          onSuccess: (result: any) => {
            const checksList = (result.checks || []).map((c: any, index: number) => ({
              id: String(c.id || index + 1),
              name: formatCheckName(c.checkName),
              shortName: formatCheckName(c.checkName),
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
            const activeCount = typeof result.activeModulesCount === "number"
              ? result.activeModulesCount
              : checksList.filter((c: any) => c.result === "pass" || c.result === "flag").length;
            const newDoc: VerificationDocument = {
              id: String(result.id),
              filename: file.name,
              type: docType,
              uploadedAt: new Date().toISOString(),
              status: result.status,
              score: result.confidenceScore ?? result.score ?? 0,
              activeModulesCount: activeCount,
              fileSize: `${Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB`,
              mimeType: file.type || "image/jpeg",
              reference: result.referenceCode,
              previewUrl,
              checks: checksList,
              extractedFields: result.extractedFields,
              comparisonFindings: result.comparisonFindings,
              providerHealth: result.providerHealth,
              summary: result.summary,
            };
            writeLocalScan(newDoc, userIdentifier);
            setLocation(`/scan/${result.id}`);
          },

        }
      );
    } catch {
      try {
        const scan = await analyzeDocumentDirectly(file);
        writeLocalScan(scan, userIdentifier);
        setLocation(`/scan/${scan.id}`);
      } catch (directErr: any) {
        setUploadError(directErr.message || "Failed to process document");
      }
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-3.5 py-2 sm:py-3 px-2 sm:px-4">
      {/* Top Command Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-2.5 text-xs font-mono">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-[#FF9933] transition-colors text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Command Center</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10.5px] text-slate-400">
          <span>OPERATOR VAULT: <span className="text-white font-semibold">{user?.email || "SESSION"}</span></span>
          <span className="text-white/20">|</span>
          <span className="command-badge border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cyber-pulse-green" />
            Air-Gapped Ingestion Active
          </span>
        </div>
      </div>

      {/* Main Forensic Intake Grid: Left Upload, Right 11-Engine Preflight Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
        {/* Left Column: Specimen Intake Dropzone */}
        <div className="w-full space-y-3">
          <div className="terminal-panel p-3.5 sm:p-4 border border-white/10 bg-[#101014]">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#FF9933]" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Target Specimen Ingestion Node
                </h2>
              </div>
              <span className="command-badge border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-[9.5px] font-bold">
                Ready
              </span>
            </div>

            <DocumentUploadPanel disabled={createScan.isPending} onFile={handleFile} />

            {uploadError && (
              <p
                className="mt-3 border border-rose-500/50 bg-rose-950/30 p-2 font-mono text-xs text-rose-300"
                role="alert"
              >
                Ingestion fault: {uploadError}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: 11 Forensic Pipeline Inspection Engines Preflight */}
        <div className="w-full space-y-3">
          <div className="terminal-panel p-3.5 sm:p-4 border border-white/10 bg-[#101014]">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Forensic Pipeline Engines (11 Active)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#FF9933] font-semibold">
                Autonomous Pipeline
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {[
                { name: "Metadata & EXIF Inspection", sub: "EXIF Parser", desc: "Software tags, device fingerprints, timestamps" },
                { name: "Verhoeff Dihedral Checksum", sub: "Algorithmic Math", desc: "Permutation group D5 matrix validation" },
                { name: "UIDAI QR Digital Signature", sub: "Cryptographic RSA", desc: "2048-bit asymmetric RSA public key envelope" },
                { name: "JPEG Error Level Analysis", sub: "Computer Vision", desc: "8x8 DCT resave frequency delta" },
                { name: "Spatial Copy-Move / Clone", sub: "Keypoint Matching", desc: "SIFT/ORB spatial duplication detection" },
                { name: "Screenshot & Moiré Noise", sub: "Sensor Analysis", desc: "Sensor variance and screen raster scanlines" },
                { name: "OCR Typography Consistency", sub: "OCR Font Engine", desc: "Font glyph, baseline, and kerning metrics" },
                { name: "AI-Generated Image / GAN", sub: "Neural Classifier", desc: "Diffusion & GAN synthetic artifact probe" },
                { name: "TruFor Dense Feature Map", sub: "GPU Neural", desc: "RGB + Noiseprint spatial tampering localization" },
                { name: "CAT-Net DCT Quantization", sub: "GPU Neural", desc: "Frequency-domain compression discrepancy" },
                { name: "Subpixel Raster Analysis", sub: "Pixel Worker", desc: "Laplacian edge sharpness & resampling boundaries" },
              ].map((engine, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 border border-white/5 bg-[#121217] hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold text-[#FF9933] shrink-0 w-4 text-center">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 text-[11px] truncate">
                        {engine.name}
                      </div>
                      <div className="text-[9.5px] text-[#737380] truncate">
                        {engine.desc}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[9px] text-[#9CA3AF] hidden sm:inline">
                      {engine.sub}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cyber-pulse-green" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#737380]">
              <span>PENALTY-SUBTRACTION FUSION ENGINE</span>
              <span className="text-emerald-400 font-bold">100/100 INITIALIZED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
