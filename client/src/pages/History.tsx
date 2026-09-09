import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getPreviewDocuments } from "@/lib/scanStore";
import {
  calculateAggregatedConfidenceScore,
  DocumentStatus,
  DocumentKind,
  formatDate,
  formatDocumentType,
  statusMeta,
} from "@/lib/veriscan";
import {
  ArrowRight,
  FileSearch,
  Filter,
  Search,
  X,
  LockKeyhole,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function History() {
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DocumentStatus>("all");
  const [type, setType] = useState<"all" | DocumentKind>("all");
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

  const filtered = useMemo(() => {
    return documents.filter((document) => {
      const matchesQuery = `${document.filename} ${document.reference} ${formatDocumentType(
        document.type
      )}`.toLowerCase().includes(query.toLowerCase());
      return (
        matchesQuery &&
        (status === "all" || document.status === status) &&
        (type === "all" || document.type === type)
      );
    });
  }, [documents, query, status, type]);

  const hasFilters = Boolean(query || status !== "all" || type !== "all");

  // Authentication Access Control Guard
  if (!user) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-5">
        <PageHeader
          categoryHindi="राष्ट्रीय अभिलेख"
          categoryEnglish="Audit Ledger · Official Records"
          title="Forensic Audit Ledger"
          subtitle="Restricted access for authenticated compliance officers."
        />
        <div className="terminal-panel p-8 sm:p-12 text-center border border-[#3A3D45] bg-[#26282D]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 mb-4">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
            Restricted Verification Ledger
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Historical screening archives, SHA-256 integrity digests, and tamper audit logs are restricted to authenticated personnel.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button className="bg-[#FF9933] text-slate-950 hover:bg-[#E68524] font-bold px-5 h-9 rounded-xs cursor-pointer shadow-xs">
                Sign In to View Ledger
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
        categoryHindi="राष्ट्रीय अभिलेख"
        categoryEnglish="Audit Ledger · Official Records"
        title="Forensic Audit Ledger"
        subtitle={
          <>
            Immutable screening records recorded under vault (<span className="text-white font-semibold">{user?.email || "Authorized Officer"}</span>).
          </>
        }
        accountBadge={user?.email ? `Ledger: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button
              size="sm"
              className="h-8 gap-1.5 border border-[#FF9933] bg-[#FF9933] text-slate-950 hover:bg-[#E68524] font-mono text-[11px] font-bold cursor-pointer"
            >
              <FileSearch className="h-3.5 w-3.5" /> Screen Document
            </Button>
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="terminal-panel p-4 font-mono text-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search scan history</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by filename, SHA-256 hash, or document type..."
              className="h-8 w-full border border-[#3A3D45] bg-[#1C1E22] pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-[#FF9933] focus:outline-none transition-colors"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-1.5 border border-[#3A3D45] bg-[#1C1E22] px-2">
              <Filter className="h-3.5 w-3.5 text-[#FF9933]" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "all" | DocumentStatus)}
                className="h-8 bg-transparent text-xs text-white focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#26282D]">Status: All</option>
                <option value="verified" className="bg-[#26282D]">Status: Verified</option>
                <option value="needs_review" className="bg-[#26282D]">Status: Needs Review</option>
                <option value="likely_forged" className="bg-[#26282D]">Status: Likely Forged</option>
              </select>
            </label>
            <label className="border border-[#3A3D45] bg-[#1C1E22] px-2">
              <select
                value={type}
                onChange={(event) => setType(event.target.value as "all" | DocumentKind)}
                className="h-8 w-full bg-transparent text-xs text-white focus:outline-none sm:w-auto font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#26282D]">Type: All Credentials</option>
                <option value="aadhaar" className="bg-[#26282D]">Type: Aadhaar (UIDAI)</option>
                <option value="pan" className="bg-[#26282D]">Type: PAN (Income Tax)</option>
                <option value="passport" className="bg-[#26282D]">Type: Passport (ICAO)</option>
                <option value="marksheet" className="bg-[#26282D]">Type: Educational Certificate</option>
                <option value="bank_statement" className="bg-[#26282D]">Type: Financial Statement</option>
                <option value="other" className="bg-[#26282D]">Type: Other</option>
              </select>
            </label>
          </div>
        </div>
        {hasFilters && (
          <button
            className="mt-2.5 inline-flex items-center text-[11px] text-[#FF9933] hover:text-white gap-1 transition-colors cursor-pointer"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setType("all");
            }}
          >
            <X className="h-3 w-3" /> Reset Filters
          </button>
        )}
      </div>

      {/* Table or Empty State */}
      <div className="terminal-panel overflow-x-auto font-mono">
        {filtered.length > 0 ? (
          <table className="dossier-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Document</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Confidence</th>
                <th className="py-2.5 px-3">Verdict</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
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
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<Search className="h-6 w-6 text-[#FF9933]" />}
              title={documents.length === 0 ? "Ledger Empty" : "No Matching Records"}
              description={
                documents.length === 0
                  ? "Screen documents to generate cryptographic audit trails."
                  : "No screening records matched your current search filters."
              }
              actionLabel={documents.length === 0 ? "Screen Document" : undefined}
              actionHref={documents.length === 0 ? "/verify" : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
