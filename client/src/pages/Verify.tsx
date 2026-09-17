import { useAuth } from "@/_core/hooks/useAuth";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { trpc } from "@/lib/trpc";
import { fileToBase64, writeLocalScan } from "@/lib/scanStore";
import {
  analyzeDocumentFile,
  detectDocumentType,
  DocumentKind,
  formatCheckName,
  getCheckCategory,
  VerificationDocument,
} from "@/lib/veriscan";

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

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const createScan = trpc.scans.create.useMutation({
    onSuccess: async (result) => {
      await utils.scans.list.invalidate();
      setLocation(`/report/${result.id}`);
    },
    onError: async (error) => {
      console.warn("tRPC scan creation fallback to direct forensic analysis:", error);
      if (currentFileRef.current) {
        try {
          const scan = await analyzeDocumentFile(currentFileRef.current);
          writeLocalScan(scan, userIdentifier);
          setLocation(`/report/${scan.id}`);
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

  const handleFile = async (file: File, documentType?: DocumentKind) => {
    setUploadError("");
    setIsAnalyzing(true);
    currentFileRef.current = file;
    const docType = documentType || detectDocumentType(file.name);

    try {
      // 1. Direct Real Pipeline Ingestion via multipart/form-data
      const analyzedDoc = await analyzeDocumentFile(file, docType);
      writeLocalScan(analyzedDoc, userIdentifier);
      toast.success("Specimen Analyzed", {
        description: `Verified ${analyzedDoc.activeModulesCount || 11} modules with score ${analyzedDoc.score}/100`,
      });
      setLocation(`/report/${analyzedDoc.id}`);

      // 2. Sync to server database if available
      try {
        const contentBase64 = await fileToBase64(file);
        createScan.mutate({
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          fileSize: file.size,
          documentType: docType,
          contentBase64,
        });
      } catch {
        // Local scan is already active
      }
    } catch (err: any) {
      console.error("Direct specimen analysis error:", err);
      setUploadError(err.message || "Failed to process document");
      toast.error("Analysis Error", { description: err.message || "Pipeline execution failed." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-3.5 py-2 sm:py-3 px-2 sm:px-4">
      {/* Top Command Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-2.5 text-xs font-sans">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Command Center</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-500">
          <span>OPERATOR: <span className="text-slate-900 font-semibold">{user?.email || "SESSION"}</span></span>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ingestion Active
          </span>
        </div>
      </div>

      {/* Main Forensic Intake Grid: Left Upload, Right 11-Engine Preflight Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: Specimen Intake Dropzone */}
        <div className="w-full space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs text-slate-900">
            <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Target Specimen Ingestion Node
                </h2>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Ready
              </span>
            </div>

            <DocumentUploadPanel disabled={createScan.isPending || isAnalyzing} onFile={handleFile} />

            {uploadError && (
              <p
                className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium"
                role="alert"
              >
                Ingestion fault: {uploadError}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: 11 Forensic Pipeline Inspection Engines Preflight */}
        <div className="w-full space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs text-slate-900">
            <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Forensic Pipeline Engines (11 Active)
                </h2>
              </div>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                Autonomous Pipeline
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
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
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10.5px] font-bold text-indigo-600 shrink-0 w-5 text-center">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-[11.5px] truncate">
                        {engine.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {engine.desc}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {engine.sub}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
              <span>FUSION EVALUATION ENGINE</span>
              <span className="text-emerald-700 font-bold">100/100 READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
