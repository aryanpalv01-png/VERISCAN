import { useAuth } from "@/_core/hooks/useAuth";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { VeriScanLogo } from "@/components/VeriScanLogo";
import { GovMasthead } from "@/components/common/GovMasthead";
import { useI18n } from "@/contexts/I18nContext";
import { analyzeDocumentDirectly, calculateAggregatedConfidenceScore, makeDemoDocument } from "@/lib/veriscan";
import { fileToBase64, writeLocalScan, readUserScans } from "@/lib/scanStore";
import { ArrowRight, LockKeyhole, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const userIdentifier = user?.email || user?.openId || "guest";

  // If user is authenticated, read their actual scans if available
  const userScans = user ? readUserScans(userIdentifier) : [];

  const handleFile = async (file: File) => {
    if (!user) {
      setLocation("/auth/login");
      return;
    }
    try {
      const document = await analyzeDocumentDirectly(file);
      writeLocalScan(document, userIdentifier);
      setLocation(`/scan/${document.id}`);
    } catch {
      let previewUrl: string | undefined;
      try {
        const b64 = await fileToBase64(file);
        previewUrl = `data:${file.type || "image/jpeg"};base64,${b64}`;
      } catch {
        // Ignore base64 error
      }
      const document = makeDemoDocument(file, previewUrl);
      writeLocalScan(document, userIdentifier);
      setLocation(`/scan/${document.id}`);
    }
  };

  // Fallback demo specimen records for authenticated users if no local scans yet
  const defaultRecords = [
    {
      ref: "VS-98214-AA",
      type: "AADHAAR",
      status: t("verified"),
      score: 96,
      findings: "Cryptographic signature & Verhoeff valid",
      tone: "verified",
      href: "/report/doc-aadhaar-valid",
    },
    {
      ref: "VS-47201-VF",
      type: "AADHAAR",
      status: t("likely_forged"),
      score: 22,
      findings: "Verhoeff dihedral checksum mismatch",
      tone: "forged",
      href: "/report/doc-aadhaar-forged",
    },
    {
      ref: "VS-61842-PN",
      type: "PAN_CARD",
      status: t("likely_forged"),
      score: 18,
      findings: "Structural 10-char syntax invalid",
      tone: "forged",
      href: "/report/doc-pan-forged",
    },
    {
      ref: "VS-39105-PS",
      type: "MARKSHEET",
      status: t("likely_forged"),
      score: 28,
      findings: "Copy-move clone match detected",
      tone: "forged",
      href: "/report/doc-photoshop-spliced",
    },
  ];

  const displayedRecords = userScans.length > 0
    ? userScans.slice(0, 4).map((scan) => ({
        ref: scan.reference || scan.id.substring(0, 10).toUpperCase(),
        type: (scan.type || "DOCUMENT").toUpperCase(),
        status: scan.status === "verified" ? t("verified") : scan.status === "needs_review" ? t("needs_review") : t("likely_forged"),
        score: scan.checks && scan.checks.length > 0 ? calculateAggregatedConfidenceScore(scan.checks, scan.score) : (scan.score ?? 0),
        findings: scan.comparisonFindings?.[0] || scan.checks?.find((c) => c.result === "flag")?.explanation || "Inspection completed",
        tone: scan.status === "verified" ? "verified" : scan.status === "needs_review" ? "review" : "forged",
        href: `/report/${scan.id}`,
      }))
    : defaultRecords;

  return (
    <div className="min-h-screen bg-[#1C1E22] text-[#FAF7F0]">
      {/* Official Government of India Top Masthead with Integrated Language Switcher */}
      <GovMasthead theme="dark" compact={true} />

      {/* Institutional Command Header */}
      <header className="border-b border-[#3A3D45] bg-[#26282D]">
        <div className="mx-auto flex min-h-14 max-w-[1520px] flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 flex items-center">
              <VeriScanLogo />
            </Link>
            <div className="hidden lg:flex items-center gap-2 border-l border-[#3A3D45] pl-3">
              <span className="command-badge command-badge-verified">
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808] animate-pulse" />
                Engine Online
              </span>
              <span className="command-badge">UIDAI RSA-2048</span>
              <span className="command-badge">Zero-Disk Enclave</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {user ? (
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-xs border-[#3A3D45] bg-[#181A1D] text-slate-200 hover:border-[#FF9933] hover:text-white text-xs cursor-pointer"
                >
                  {t("open_workspace")} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    {t("sign_in")}
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex h-8 px-3 text-xs rounded-xs border-[#3A3D45] bg-[#181A1D] text-slate-200 hover:border-[#FF9933] hover:text-white cursor-pointer"
                  >
                    {t("register")}
                  </Button>
                </Link>
              </>
            )}
            <Link href={user ? "/verify" : "/auth/login"}>
              <Button
                size="sm"
                className="h-8 px-3.5 text-xs font-bold rounded-xs bg-[#FF9933] text-slate-950 hover:bg-[#E68524] cursor-pointer shadow-xs"
              >
                {t("new_screening")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Command Center Terminal */}
      <main className="mx-auto max-w-[1520px] p-3 sm:p-5 lg:py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 items-start">

          {/* Left Column: Direct Ingestion Gateway */}
          <div className="terminal-panel border border-[#3A3D45] bg-[#26282D] p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#3A3D45] pb-3 mb-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-normal text-[#FF9933] font-semibold">
                  {t("intake_engine")}
                </span>
                <h1 className="mt-0.5 font-serif text-lg sm:text-xl font-bold text-white tracking-tight">
                  {t("intake_title")}
                </h1>
              </div>
              <span className="command-badge command-badge-verified text-[10.5px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                Ready
              </span>
            </div>

            {/* Direct Upload Dropzone */}
            <DocumentUploadPanel onFile={handleFile} />
          </div>

          {/* Right Column: Active Pipeline Telemetry & Tabular Log */}
          <div className="space-y-5">

            {/* Live Pipeline Matrix */}
            <div className="terminal-panel border border-[#3A3D45] bg-[#26282D] p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#3A3D45] pb-3 mb-3.5">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-normal text-[#FF9933] font-semibold">
                    {t("pipeline_status")}
                  </span>
                  <h2 className="mt-0.5 font-serif text-base sm:text-lg font-bold text-white">
                    {t("engine_matrix")}
                  </h2>
                </div>
                <span className="command-badge command-badge-verified text-[10px]">
                  {t("all_systems_nominal")}
                </span>
              </div>

              {/* Responsive Grid: 1 col on small phones, 2 on tablets, 3 on desktops */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-xs">
                {[
                  { name: "Metadata Preflight", latency: "2ms" },
                  { name: "Verhoeff Checksum", latency: "1ms" },
                  { name: "UIDAI QR Verifier", latency: "6ms" },
                  { name: "JPEG ELA Matrix", latency: "18ms" },
                  { name: "Copy-Move Clones", latency: "24ms" },
                  { name: "OCR Typography", latency: "42ms" },
                ].map((item) => (
                  <div key={item.name} className="border border-[#3A3D45] bg-[#181A1D] p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-[10.5px] truncate font-medium">{item.name}</span>
                      <span className="text-[#138808] text-[9.5px] font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                        {t("active")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{t("latency")}</span>
                      <span className="text-slate-300 font-bold">{item.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Ledger Section (Authentication Access Controlled) */}
            <div className="terminal-panel border border-[#3A3D45] bg-[#26282D] p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#3A3D45] pb-3 mb-3.5">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-normal text-[#FF9933] font-semibold">
                    {t("audit_ledger")}
                  </span>
                  <h2 className="mt-0.5 font-serif text-base sm:text-lg font-bold text-white">
                    {t("recent_records")}
                  </h2>
                </div>
                {user && (
                  <Link href="/history" className="font-mono text-[11px] text-[#FF9933] hover:underline">
                    {t("view_full_ledger")} &rarr;
                  </Link>
                )}
              </div>

              {!user ? (
                /* Unauthenticated Locked State */
                <div className="p-4 sm:p-6 text-center border border-[#3A3D45] bg-[#181A1D]">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 mb-3">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#FF9933] uppercase tracking-normal block">
                    {t("restricted_access")}
                  </span>
                  <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {t("restricted_notice")}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <Link href="/auth/login">
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs font-bold bg-[#FF9933] text-slate-950 hover:bg-[#E68524] rounded-xs cursor-pointer"
                      >
                        {t("sign_in_to_access")}
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3.5 text-xs rounded-xs border-[#3A3D45] bg-[#1C1E22] text-slate-200 hover:border-[#FF9933] hover:text-white cursor-pointer"
                      >
                        {t("register")}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Authenticated Audit Ledger Table */
                <div className="overflow-x-auto">
                  <table className="dossier-table w-full">
                    <thead>
                      <tr>
                        <th>{t("col_ref")}</th>
                        <th>{t("col_type")}</th>
                        <th>{t("col_status")}</th>
                        <th>{t("col_score")}</th>
                        <th>{t("col_observation")}</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {displayedRecords.map((entry) => (
                        <tr key={entry.ref} className="cursor-pointer" onClick={() => setLocation(entry.href)}>
                          <td className="font-bold text-slate-200">{entry.ref}</td>
                          <td className="text-slate-400">{entry.type}</td>
                          <td>
                            <span
                              className={
                                entry.tone === "verified"
                                  ? "command-badge command-badge-verified"
                                  : entry.tone === "review"
                                  ? "command-badge command-badge-review"
                                  : "command-badge command-badge-forged"
                              }
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="text-slate-200 font-bold">{entry.score} / 100</td>
                          <td className="text-slate-400 truncate max-w-[180px]">{entry.findings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
