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
        <div className="rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80 bg-white shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 mb-4 shadow-xs">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Restricted Verification Ledger
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Historical screening archives, SHA-256 integrity digests, and tamper audit logs are restricted to authenticated personnel.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs px-5 h-9 rounded-xl shadow-xs cursor-pointer">
                Sign In to View Ledger
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-4 h-9 rounded-xl text-xs font-semibold cursor-pointer">
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
            Immutable screening records recorded under vault (<span className="text-slate-900 font-semibold">{user?.email || "Authorized Officer"}</span>).
          </>
        }
        accountBadge={user?.email ? `Ledger: ${user.email}` : undefined}
        actions={
          <Link href="/verify">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              <FileSearch className="h-3.5 w-3.5" /> Screen Document
            </Button>
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search scan history</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by filename, reference, or document type..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5">
              <Filter className="h-3.5 w-3.5 text-indigo-600" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "all" | DocumentStatus)}
                className="h-8 bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="verified">Status: Verified</option>
                <option value="needs_review">Status: Needs Review</option>
                <option value="likely_forged">Status: Likely Forged</option>
              </select>
            </label>
            <label className="rounded-lg border border-slate-200 bg-white px-2.5">
              <select
                value={type}
                onChange={(event) => setType(event.target.value as "all" | DocumentKind)}
                className="h-8 w-full bg-transparent text-xs text-slate-700 focus:outline-none sm:w-auto cursor-pointer"
              >
                <option value="all">Type: All Credentials</option>
                <option value="aadhaar">Type: Aadhaar (UIDAI)</option>
                <option value="pan">Type: PAN (Income Tax)</option>
                <option value="passport">Type: Passport (ICAO)</option>
                <option value="marksheet">Type: Educational Certificate</option>
                <option value="bank_statement">Type: Financial Statement</option>
                <option value="other">Type: Other</option>
              </select>
            </label>
          </div>
        </div>
        {hasFilters && (
          <button
            className="mt-2.5 inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 gap-1 font-semibold cursor-pointer"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setType("all");
            }}
          >
            Clear active filters
          </button>
        )}
      </div>

      {/* History Ledger Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {filtered.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => {
                const isVerified = doc.status === "verified";
                const isForged = doc.status === "likely_forged";

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-indigo-600">{doc.reference}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs truncate">{doc.filename}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 uppercase">{formatDocumentType(doc.type)}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">{formatDate(doc.uploadedAt)}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={isVerified ? "text-emerald-600" : isForged ? "text-rose-600" : "text-amber-600"}>
                        {doc.score}
                      </span>
                      <span className="text-[10px] text-slate-400"> / 100</span>
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
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:text-indigo-700 shadow-xs transition-colors"
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
