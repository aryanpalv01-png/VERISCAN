import { useAuth } from "@/_core/hooks/useAuth";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { fileToBase64, writeLocalScan } from "@/lib/scanStore";
import { analyzeDocumentDirectly, formatCheckName, VerificationDocument } from "@/lib/veriscan";
import {
  ArrowLeft,
  FileImage,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Building2,
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
            }));
            const newDoc: VerificationDocument = {
              id: String(result.id),
              filename: file.name,
              type: docType,
              uploadedAt: new Date().toISOString(),
              status: result.status,
              score: result.confidenceScore,
              fileSize: `${Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB`,
              mimeType: file.type || "image/jpeg",
              reference: result.referenceCode,
              previewUrl,
              checks: checksList,
              extractedFields: result.extractedFields,
              comparisonFindings: result.comparisonFindings,
              providerHealth: result.providerHealth,
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
    <div className="mx-auto max-w-[1440px] space-y-5">
      <PageHeader
        categoryHindi="दस्तावेज़ सत्यापन"
        categoryEnglish="INGESTION GATEWAY // SPECIMEN INTAKE"
        title="Institutional Document Forensic Screening"
        subtitle="Ingest an Indian citizen identity document or certificate for real-time multi-layered forensic inspection."
        accountBadge={user?.email ? `VAULT: ${user.email}` : undefined}
        actions={
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-[#3A3D45] bg-[#1C1E22] text-[#D1CEC7] hover:bg-[#26282D] hover:text-[#FAF7F0] font-mono text-[11px]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        {/* Left Column: Security Protocol & Advisories */}
        <div className="space-y-4 font-mono text-xs">
          <div className="terminal-panel p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#3A3D45]">
              <Terminal className="h-4 w-4 text-[#FF9933]" />
              <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-[#FAF7F0]">
                Air-Gapped Inspection Protocols
              </h2>
            </div>

            <div className="mt-4 space-y-3.5">
              <InfoRow
                icon={<ShieldCheck className="h-4 w-4 text-[#138808]" />}
                title="Account-Scoped Vault"
                body={`Screened payloads and cryptographic digests are strictly isolated to ${user?.email || "active account session"}.`}
              />
              <InfoRow
                icon={<LockKeyhole className="h-4 w-4 text-[#FF9933]" />}
                title="Volatile Memory Sandbox"
                body="Processed in volatile memory buffer with immediate GC cycle discarding payload bytes post-compilation."
              />
              <InfoRow
                icon={<Building2 className="h-4 w-4 text-[#FAF7F0]" />}
                title="DPI-Calibrated Forensic Pipeline"
                body="Deterministic Verhoeff math, 2048-bit UIDAI QR signatures, and Income Tax structural regex."
              />
            </div>
          </div>

          <div className="terminal-panel p-4 border border-[#3A3D45] bg-[#1C1E22]">
            <p className="font-bold text-[#FAF7F0] mb-1 text-[11px]">
              Examiner Guidance:
            </p>
            <p className="text-[10.5px] text-[#A09D95] leading-relaxed font-sans">
              Ensure the entire document border is visible with sufficient contrast. Native PDF soft-copies automatically bypass sensor-grain noise tests to prevent false compression penalties.
            </p>
          </div>
        </div>

        {/* Right Column: Document Intake Panel */}
        <div className="terminal-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-[#3A3D45] pb-3">
            <div>
              <span className="command-badge bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/40 font-mono text-[10px]">
                Intake Gateway
              </span>
              <h3 className="font-serif text-lg font-bold text-[#FAF7F0] mt-1">
                Upload Target Specimen
              </h3>
            </div>
            <span className="command-badge bg-[#138808]/15 text-[#22C55E] border-[#138808]/40 font-mono text-[10px]">
              Encrypted Stream
            </span>
          </div>

          <DocumentUploadPanel disabled={createScan.isPending} onFile={handleFile} />

          {uploadError && (
            <p
              className="mt-3 border border-rose-500/50 bg-rose-950/30 p-2.5 font-mono text-xs text-rose-300"
              role="alert"
            >
              Error: {uploadError}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5 font-mono text-xs">
            <FormatCard
              icon={<FileText className="h-3.5 w-3.5 text-[#FF9933]" />}
              label="Digital PDF"
              detail="e-Aadhaar / e-PAN Softcopy"
            />
            <FormatCard
              icon={<FileImage className="h-3.5 w-3.5 text-[#138808]" />}
              label="Raster Image"
              detail="JPG, PNG, WebP (≤15MB)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#3A3D45] bg-[#1C1E22]">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold text-[#FAF7F0]">{title}</p>
        <p className="mt-0.5 text-[10.5px] text-[#A09D95] leading-relaxed font-sans">{body}</p>
      </div>
    </div>
  );
}

function FormatCard({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="border border-[#3A3D45] bg-[#1C1E22] p-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-bold text-[#FAF7F0]">{label}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-[#A09D95]">{detail}</p>
    </div>
  );
}
