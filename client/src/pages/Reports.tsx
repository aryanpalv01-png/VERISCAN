import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocuments } from "@/lib/scanStore";
import { calculateAggregatedConfidenceScore, formatDate, formatDocumentType, statusMeta, DocumentStatus } from "@/lib/veriscan";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  LockKeyhole,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

export default function Reports() {
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const scansQuery = trpc.scans.list.useQuery(undefined, { retry: false, enabled: Boolean(user) });

  const documents = useMemo(() => {
    const localDocs = getPreviewDocuments(userIdentifier);
    let serverDocs: any[] = [];
    if (scansQuery.data && Array.isArray(scansQuery.data) && scansQuery.data.length > 0) {
      serverDocs = (scansQuery.data as any[]).map((doc) => {
        const checks = Array.isArray(doc.checks) ? doc.checks : [];
        const score = checks.length > 0
          ? calculateAggregatedConfidenceScore(checks, doc.confidenceScore)
          : (doc.confidenceScore ?? 0);

        return {
          id: String(doc.id),
          filename: doc.originalFilename || doc.fileName || doc.filename || "Document",
          documentType: doc.documentType || "other",
          type: (doc.documentType as any) || "other",
          status: (doc.status as any) || "verified",
          score,
          uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
          reference: doc.referenceCode || (doc.sha256Hash ? doc.sha256Hash.slice(0, 16).toUpperCase() : `VS-IN-${doc.id}`),
          fileSize: typeof doc.fileSize === "number" ? `${Math.max(0.1, doc.fileSize / 1024 / 1024).toFixed(1)} MB` : (doc.fileSize || "1.0 MB"),
          mimeType: doc.mimeType || "application/pdf",
          checks,
          extractedFields: doc.extractedFields,
          comparisonFindings: doc.comparisonFindings,
        };
      });
    }

    if (!user) return localDocs;

    const combined = [...serverDocs];
    const seenIds = new Set(serverDocs.map((d) => String(d.id)));
    const seenRefs = new Set(serverDocs.map((d) => String(d.reference)));
    for (const local of localDocs) {
      if (!seenIds.has(String(local.id)) && !seenRefs.has(String(local.reference))) {
        combined.push(local);
        seenIds.add(String(local.id));
      }
    }
    return combined;
  }, [user, scansQuery.data, userIdentifier]);

  const verified = documents.filter((document) => document.status === "verified").length;
  const review = documents.filter((document) => document.status === "needs_review").length;
  const forged = documents.filter((document) => document.status === "likely_forged").length;

  if (!user) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-5">
        <PageHeader
          categoryHindi="सत्यापन रिपोर्ट सारांश"
          categoryEnglish="Verdict Dossiers · Official Summary"
          title="Forensic Verdict Ledgers"
          subtitle="Restricted access for authenticated compliance officers."
        />
        <div className="terminal-panel p-8 sm:p-12 text-center border border-[#3A3D45] bg-[#26282D]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 mb-4">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
            Restricted Verdict Archive
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Forensic analysis dossiers, tamper certificates, and disposition records are restricted to authenticated personnel.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button className="bg-[#FF9933] text-slate-950 hover:bg-[#E68524] font-bold px-5 h-9 rounded-xs cursor-pointer shadow-xs">
                Sign In to View Dossiers
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="border-[#3A3D45] bg-[#181A1D] text-slate-200 hover:border-[#FF9933] hover:text-white px-4 h-9 rounded-xs cursor-pointer">
                Register Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Top Banner */}
      <PageHeader
        categoryHindi="सत्यापन रिपोर्ट सारांश"
        categoryEnglish="Verdict Dossiers · Official Summary"
        title="Forensic Verdict Ledgers"
        subtitle={
          <>
            Evidentiary breakdown of document screening outcomes for vault: <span className="text-white font-semibold">{user?.email || "Authorized Officer"}</span>
          </>
        }
        accountBadge={user?.email ? `Vault: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button
              size="sm"
              className="h-8 gap-1.5 border border-[#FF9933] bg-[#FF9933] text-slate-950 hover:bg-[#E68524] font-mono text-[11px] font-bold cursor-pointer shadow-xs"
            >
              <FileCheck2 className="h-3.5 w-3.5" /> New Verification
            </Button>
          </Link>
        }
      />

      {/* 3 Verdict Metric Cards */}
      <div className="grid gap-3 md:grid-cols-3 font-mono">
        <VerdictCard
          icon={<CheckCircle2 className="h-4 w-4 text-[#138808]" />}
          status="verified"
          count={verified}
          label="Genuine / Verified"
          body="No material visual, typographic, or mathematical anomalies detected"
        />
        <VerdictCard
          icon={<CircleAlert className="h-4 w-4 text-[#FF9933]" />}
          status="needs_review"
          count={review}
          label="Human Review Required"
          body="Inconclusive indicators or typography boundary variations"
        />
        <VerdictCard
          icon={<ShieldAlert className="h-4 w-4 text-rose-400" />}
          status="likely_forged"
          count={forged}
          label="Likely Tampered"
          body="Copy-move clone detected, OCR mismatch, or ELA recompression"
        />
      </div>

      <section className="terminal-panel font-mono text-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-[#3A3D45] p-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-normal">
              Dossier Records ({documents.length})
            </span>
            <h2 className="font-serif text-base font-bold text-white mt-0.5">
              Inspect Individual Forensic Reports
            </h2>
          </div>
          <Link
            href="/history"
            className="inline-flex items-center text-[11px] font-bold text-[#FF9933] hover:text-white gap-1 transition-colors"
          >
            Search Archive <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="dossier-table w-full text-left">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Document File</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Confidence</th>
                  <th className="py-2.5 px-3">Verdict</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const isVerified = doc.status === "verified";
                  const isForged = doc.status === "likely_forged";

                  return (
                    <tr key={doc.id} className="hover:bg-[#1C1E22] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#FF9933]">{doc.reference}</td>
                      <td className="py-2.5 px-3 font-bold text-white max-w-xs truncate">{doc.filename}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 uppercase">{formatDocumentType(doc.type)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">{formatDate(doc.uploadedAt)}</td>
                      <td className="py-2.5 px-3 text-right font-serif text-sm font-bold">
                        <span className={isVerified ? "text-[#138808]" : isForged ? "text-rose-400" : "text-[#FF9933]"}>
                          {doc.score}
                        </span>
                        <span className="font-sans text-[10px] text-slate-500"> / 100</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={
                            isVerified
                              ? "command-badge command-badge-verified"
                              : isForged
                              ? "command-badge command-badge-forged"
                              : "command-badge command-badge-review"
                          }
                        >
                          {statusMeta[doc.status as DocumentStatus]?.label || "Unknown"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/report/${doc.id}`}
                          className="inline-flex items-center gap-1 border border-[#3A3D45] bg-[#1C1E22] px-2.5 py-1 text-[11px] text-white hover:border-[#FF9933] hover:bg-[#26282D] transition-colors"
                        >
                          View Dossier <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 p-4">
            <EmptyState
              icon={<Sparkles className="h-6 w-6 text-[#FF9933]" />}
              title="No Reports Generated"
              description="Screen your first document to populate this integrity ledger."
              actionLabel="Screen Document"
              actionHref="/verify"
            />
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 border border-[#3A3D45] bg-[#1C1E22] p-3 font-mono text-[11px] text-slate-400">
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[#FF9933]" />
        <span>All forensic dossiers are compiled via cryptographic preflight, computer vision (OpenCV/ELA), and localized neural inference under strict session isolation.</span>
      </div>
    </div>
  );
}

function VerdictCard({
  icon,
  status,
  count,
  label,
  body,
}: {
  icon: React.ReactNode;
  status: "verified" | "needs_review" | "likely_forged";
  count: number;
  label: string;
  body: string;
}) {
  const borderTone =
    status === "verified"
      ? "border-[#138808]/50 bg-[#1C1E22]"
      : status === "needs_review"
      ? "border-[#FF9933]/50 bg-[#1C1E22]"
      : "border-rose-500/50 bg-[#1C1E22]";

  return (
    <div className={`terminal-panel p-4 border ${borderTone}`}>
      <div className="flex items-center justify-between border-b border-[#3A3D45] pb-2">
        <span className="flex h-7 w-7 items-center justify-center border border-[#3A3D45] bg-[#26282D]">
          {icon}
        </span>
        <span className="font-serif text-2xl font-bold text-white">{String(count).padStart(2, "0")}</span>
      </div>
      <p className="mt-3 font-mono text-xs font-bold text-white">{label}</p>
      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}
