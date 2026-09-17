import { useLocation } from "wouter";
import { GovMasthead } from "@/components/common/GovMasthead";
import { Button } from "@/components/ui/button";
import { analyzeDocumentFile, detectDocumentType } from "@/lib/veriscan";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BorderVerificationResponse,
  verifyBorderDocument,
} from "@/lib/borderApi";
import {
  ArrowRight,
  UploadCloud,
  ChevronRight,
  Crosshair,
  Activity,
  LogIn,
  UserPlus,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Sparkles,
  Layers,
  Lock,
  Search,
  Fingerprint,
  FileCheck,
  Cpu,
  BadgeAlert,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import { useRef, useState } from "react";
import { writeLocalScan } from "@/lib/scanStore";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

export default function Home() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const { t, language } = useI18n();
  const [isUploading, setIsUploading] = useState(false);

  // Active specimen tab for the Methodology interactive comparator
  const [activeSpecimenTab, setActiveSpecimenTab] = useState<"genuine" | "forged">("genuine");

  // Live Border Terminal State
  const [terminalFile, setTerminalFile] = useState<File | null>(null);
  const [terminalDocType, setTerminalDocType] = useState<string>("National ID");
  const [terminalLoading, setTerminalLoading] = useState<boolean>(false);
  const [terminalResult, setTerminalResult] = useState<BorderVerificationResponse | null>({
    status: "success",
    document_type: "National ID",
    trust_score: 96,
    verdict: "CLEAR_ENTRY",
    tier_a_override: false,
    modules_breakdown: {
      module_1_ocr: { extracted_snippet: "UIDAI AADHAAR · RAHUL SHARMA · DOB: 12/08/1992" },
      module_2_validation: {
        valid: true,
        checksum_parity: "VERIFIED (Verhoeff Dihedral Matrix Matched)",
        compliance: "Statutory UIDAI Standard Verified",
      },
      module_3_tampering: {
        tampered: false,
        compression_anomaly_score: 3.8,
        sharpness_variance: 118.4,
        forensic_status: "PRISTINE PIXEL INTEGRITY",
      },
      module_4_face_verification: {
        match_score: "98.4%",
        liveness_check: "Passed (Live 3D Depth Matrix)",
      },
    },
  });
  const [previewImage, setPreviewImage] = useState<string | null>("/test_samples/sample_aadhaar.png");
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>("aadhaar_rahul_sharma");

  // Execute screening for uploaded file or current terminal state
  const handleExecuteScreening = async (fileToScreen?: File, classToUse?: string) => {
    const activeFile = fileToScreen || terminalFile;
    const activeClass = classToUse || terminalDocType;

    if (!activeFile) {
      toast.error("Please upload or select a document specimen to screen.");
      return;
    }

    setTerminalLoading(true);
    try {
      const data = await verifyBorderDocument(activeFile, activeClass);
      setTerminalResult(data);
      if (data.verdict === "CLEAR_ENTRY") {
        toast.success("Forensic Screening: Genuine Profile Verified", {
          description: "All statutory cryptographic signatures, checksums, and pixel matrices passed.",
        });
      } else {
        toast.error("Forensic Screening: Anomaly Flagged", {
          description: "Hold for inspection. Potential splicing, flat screen recompression, or checksum failure detected.",
        });
      }
    } catch (err: any) {
      console.error("Terminal screening error:", err);
      toast.error("Screening calculation error", {
        description: err.message || "Failed to analyze document telemetry.",
      });
    } finally {
      setTerminalLoading(false);
    }
  };

  // Quick Specimen Launcher
  const handleLaunchSpecimen = async (specimenId: string) => {
    setSelectedSpecimenId(specimenId);
    setTerminalFile(null);

    if (specimenId === "aadhaar_rahul_sharma") {
      setActiveSpecimenTab("genuine");
      setTerminalDocType("National ID");
      setPreviewImage("/test_samples/sample_aadhaar.png");
      setTerminalResult({
        status: "success",
        document_type: "National ID",
        trust_score: 96,
        verdict: "CLEAR_ENTRY",
        tier_a_override: false,
        modules_breakdown: {
          module_1_ocr: { extracted_snippet: "UIDAI AADHAAR · RAHUL SHARMA · DOB: 12/08/1992" },
          module_2_validation: {
            valid: true,
            checksum_parity: "VERIFIED (Verhoeff Dihedral Matrix Matched)",
            compliance: "Statutory UIDAI Standard Verified",
          },
          module_3_tampering: {
            tampered: false,
            compression_anomaly_score: 3.8,
            sharpness_variance: 118.4,
            forensic_status: "PRISTINE PIXEL INTEGRITY",
          },
          module_4_face_verification: {
            match_score: "98.4%",
            liveness_check: "Passed (Live 3D Depth Matrix)",
          },
        },
      });
      toast.success("Loaded Genuine Aadhaar Specimen", { description: "Cryptographic signature & Verhoeff matrix verified." });
    } else if (specimenId === "pan_rohit_patel") {
      setActiveSpecimenTab("genuine");
      setTerminalDocType("PAN Card");
      setPreviewImage("/test_samples/sample_pan.png");
      setTerminalResult({
        status: "success",
        document_type: "PAN Card",
        trust_score: 95,
        verdict: "CLEAR_ENTRY",
        tier_a_override: false,
        modules_breakdown: {
          module_1_ocr: { extracted_snippet: "INCOME TAX DEPARTMENT · ROHIT PATEL · PAN: ABCDE1234F" },
          module_2_validation: {
            valid: true,
            checksum_parity: "VERIFIED (Alphanumeric 5-4-1 Tax Matrix Matched)",
            compliance: "NSDL / Tax Authority Compliant",
          },
          module_3_tampering: {
            tampered: false,
            compression_anomaly_score: 4.1,
            sharpness_variance: 114.2,
            forensic_status: "PRISTINE PIXEL INTEGRITY",
          },
          module_4_face_verification: {
            match_score: "96.5%",
            liveness_check: "Passed (Live 3D Depth Matrix)",
          },
        },
      });
      toast.success("Loaded Clean PAN Specimen", { description: "Statutory tax structure & font baselines verified." });
    } else if (specimenId === "passport_standard") {
      setActiveSpecimenTab("genuine");
      setTerminalDocType("Passport");
      setPreviewImage("/test_samples/sample_aadhaar.png");
      setTerminalResult({
        status: "success",
        document_type: "Passport",
        trust_score: 96,
        verdict: "CLEAR_ENTRY",
        tier_a_override: false,
        modules_breakdown: {
          module_1_ocr: { extracted_snippet: "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10" },
          module_2_validation: {
            valid: true,
            checksum_parity: "VERIFIED (7-3-1 Weight Matrix Matched)",
            compliance: "ICAO 9303 TD3 Standard Validated",
          },
          module_3_tampering: {
            tampered: false,
            compression_anomaly_score: 3.9,
            sharpness_variance: 122.1,
            forensic_status: "PRISTINE PIXEL INTEGRITY",
          },
          module_4_face_verification: {
            match_score: "97.8%",
            liveness_check: "Passed (Live 3D Depth Matrix)",
          },
        },
      });
      toast.success("Loaded ICAO 9303 Passport Specimen", { description: "7-3-1 MRZ weight matrix validated." });
    } else if (specimenId === "aadhaar_tampered_priya") {
      setActiveSpecimenTab("forged");
      setTerminalDocType("National ID");
      setPreviewImage("/test_samples/sample_aadhaar.png");
      setTerminalResult({
        status: "success",
        document_type: "National ID",
        trust_score: 22,
        verdict: "HOLD_FOR_MANUAL_INSPECTION",
        tier_a_override: true,
        tier_a_failure_reason: "CRITICAL_TIER_A: Spliced demographic digits failed Verhoeff checksum parity.",
        modules_breakdown: {
          module_1_ocr: { extracted_snippet: "UIDAI AADHAAR · ANOMALOUS KERNING · 9182 3412 8891" },
          module_2_validation: {
            valid: false,
            checksum_parity: "PARITY_FAIL_SPLICED_DIGITS",
            compliance: "Non-Compliant Checksum Sequence (Tier A Veto)",
          },
          module_3_tampering: {
            tampered: true,
            compression_anomaly_score: 24.8,
            sharpness_variance: 16.2,
            forensic_status: "HIGH FORGERY CONFIDENCE (8x8 DCT Compression Discontinuity)",
          },
          module_4_face_verification: {
            match_score: "42.0%",
            liveness_check: "Failed (Synthetic Replay / Flat Screen)",
          },
        },
      });
      toast.error("Loaded Tampered Specimen", { description: "Splicing & Checksum Anomaly Detected (Tier A Veto)" });
    }
  };

  // Direct Ingest Button Handler (Hero banner)
  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTerminalFile(file);
      setSelectedSpecimenId(null);
      setPreviewImage(URL.createObjectURL(file));
      setIsUploading(true);

      try {
        const detectedKind = detectDocumentType(file.name);
        const mappedClass = detectedKind === "passport" ? "Passport" : detectedKind === "pan" ? "PAN Card" : detectedKind === "driving_license" ? "Driving License" : "National ID";
        setTerminalDocType(mappedClass);

        // Run border screening
        await handleExecuteScreening(file, mappedClass);

        // Also save to local scan history for the logged in user
        const doc = await analyzeDocumentFile(file, detectedKind);
        writeLocalScan(doc, user?.email || "guest");

        toast.info("Forensic Dossier Ready", {
          description: `Score: ${doc.score}/100 · ${doc.status === "likely_forged" ? "Likely Forged" : doc.status === "needs_review" ? "Needs Review" : "Verified"}.`,
          action: {
            label: "Open Full Report",
            onClick: () => setLocation(`/report/${doc.id}`),
          },
        });
      } catch (err: any) {
        console.error("Specimen intake error:", err);
        toast.error("Ingestion failed", {
          description: err.message || "Failed to analyze specimen file.",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Official Government Masthead with Language Switcher */}
      <GovMasthead theme="light" />

      {/* Main Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-base shadow-xs">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  VeriScan
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  SIH-2026
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {user?.email || t("officer")}
                </span>
                <Button
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all gap-1.5 h-8 px-3.5 cursor-pointer"
                >
                  <span>{t("nav_dashboard")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await logout();
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 h-8 px-2.5 rounded-lg gap-1 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("sign_out")}</span>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/auth/login")}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg gap-1.5 h-8 px-3 cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{t("login")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/auth/register")}
                  className="text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg shadow-xs gap-1.5 h-8 px-3 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{t("register")}</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all gap-1.5 h-8 px-3.5 cursor-pointer"
                >
                  <span>{t("nav_dashboard")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden pt-10 pb-10 sm:pt-14 sm:pb-12 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              {/* Live Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{t("hero_badge")}</span>
              </div>

              {/* Multilingual Headline */}
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                {t("hero_title")}
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
                {t("hero_subtitle")}
              </p>

              {/* Action Triggers */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setLocation("/dashboard")}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all gap-2 cursor-pointer"
                >
                  <span>{t("btn_open_workspace")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-5 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4 text-indigo-600" />
                  <span>{isUploading ? t("btn_analyzing") : t("btn_ingest_file")}</span>
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleHeroFileUpload}
                />
              </div>

              {/* Officer Portal Gateway */}
              <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>{t("officer_portal")}</span>
                  </div>
                  {isAuthenticated ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      {t("signed_in_as")} {user?.email || t("officer")}
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/auth/login")}
                        className="h-7 px-2.5 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:bg-slate-100 rounded-lg gap-1 cursor-pointer"
                      >
                        <LogIn className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{t("login")}</span>
                      </Button>
                      <span className="text-slate-200">|</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/auth/register")}
                        className="h-7 px-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 rounded-lg gap-1 cursor-pointer shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{t("register")}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hero Footer / Institutional Trust Ribbon */}
            <div className="mt-8 pt-6 border-t border-slate-200/80 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-xs">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="font-semibold leading-tight">{t("hero_footer_zero_disk")}</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-xs">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Lock className="h-4 w-4" />
                  </div>
                  <span className="font-semibold leading-tight">{t("hero_footer_sha")}</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-xs">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span className="font-semibold leading-tight">{t("hero_footer_standards")}</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-xs">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <span className="font-semibold leading-tight">{t("hero_footer_iso")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forensic Methodology Section: Differentiating Real vs. Fake Documents */}
        <section className="py-14 sm:py-18 bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs mb-3">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>{t("methodology_badge")}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {t("methodology_title")}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                {t("methodology_subtitle")}
              </p>
            </div>

            {/* 6 Core Pillars Side-by-Side Comparison Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pillar 1: ELA */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700">
                      <Search className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {t("pillar_1_name")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                      <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("methodology_real_title")}</span>
                      </div>
                      <p className="text-emerald-900/90 leading-relaxed">
                        {t("pillar_1_real")}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                      <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{t("methodology_fake_title")}</span>
                      </div>
                      <p className="text-rose-900/90 leading-relaxed">
                        {t("pillar_1_fake")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Typography */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {t("pillar_2_name")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                      <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("methodology_real_title")}</span>
                      </div>
                      <p className="text-emerald-900/90 leading-relaxed">
                        {t("pillar_2_real")}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                      <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{t("methodology_fake_title")}</span>
                      </div>
                      <p className="text-rose-900/90 leading-relaxed">
                        {t("pillar_2_fake")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Mathematical Checksums */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-purple-100/80 text-purple-700">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {t("pillar_3_name")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                      <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("methodology_real_title")}</span>
                      </div>
                      <p className="text-emerald-900/90 leading-relaxed">
                        {t("pillar_3_real")}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                      <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{t("methodology_fake_title")}</span>
                      </div>
                      <p className="text-rose-900/90 leading-relaxed">
                        {t("pillar_3_fake")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 4: PKI & QR Signatures */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700">
                      <Lock className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {t("pillar_4_name")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                      <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("methodology_real_title")}</span>
                      </div>
                      <p className="text-emerald-900/90 leading-relaxed">
                        {t("pillar_4_real")}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                      <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{t("methodology_fake_title")}</span>
                      </div>
                      <p className="text-rose-900/90 leading-relaxed">
                        {t("pillar_4_fake")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 5: Sensor Noise & Anti-Spoofing */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-teal-100/80 text-teal-700">
                      <Fingerprint className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {t("pillar_5_name")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                      <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("methodology_real_title")}</span>
                      </div>
                      <p className="text-emerald-900/90 leading-relaxed">
                        {t("pillar_5_real")}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                      <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{t("methodology_fake_title")}</span>
                      </div>
                      <p className="text-rose-900/90 leading-relaxed">
                        {t("pillar_5_fake")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 6: Template Matching */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-rose-100/80 text-rose-700">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {t("pillar_6_name")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                      <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("methodology_real_title")}</span>
                      </div>
                      <p className="text-emerald-900/90 leading-relaxed">
                        {t("pillar_6_real")}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                      <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{t("methodology_fake_title")}</span>
                      </div>
                      <p className="text-rose-900/90 leading-relaxed">
                        {t("pillar_6_fake")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Forensic Loupe & Comparator */}
            <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-slate-200/80 bg-slate-50 p-5 sm:p-7 shadow-sm">
              <div className="text-center max-w-2xl mx-auto mb-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {t("specimen_title")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t("specimen_subtitle")}
                </p>

                {/* Profile Toggle Switch */}
                <div className="mt-4 inline-flex items-center rounded-xl bg-slate-200/80 p-1 border border-slate-300/60 text-xs">
                  <button
                    onClick={() => {
                      setActiveSpecimenTab("genuine");
                      handleLaunchSpecimen("aadhaar_rahul_sharma");
                    }}
                    className={`px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      activeSpecimenTab === "genuine"
                        ? "bg-white text-emerald-800 shadow-xs border border-emerald-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("tab_genuine")}
                  </button>
                  <button
                    onClick={() => {
                      setActiveSpecimenTab("forged");
                      handleLaunchSpecimen("aadhaar_tampered_priya");
                    }}
                    className={`px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      activeSpecimenTab === "forged"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("tab_forged")}
                  </button>
                </div>
              </div>

              {/* Specimen Inspection Matrix */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t("diagnostic_summary")}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      activeSpecimenTab === "genuine"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {activeSpecimenTab === "genuine"
                      ? t("specimen_status_genuine")
                      : t("specimen_status_forged")}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wider mb-1">
                      Pixel Compression Analysis (ELA)
                    </span>
                    <span className={`font-bold ${activeSpecimenTab === "genuine" ? "text-emerald-700" : "text-rose-700"}`}>
                      {activeSpecimenTab === "genuine"
                        ? "Uniform 8×8 DCT Error (Mean error 3.8 / Peak Anomaly 1.1x) · Pristine"
                        : "High Forgery Discontinuity (Mean error 24.8 / Peak Anomaly 3.4x) · Spliced"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wider mb-1">
                      Statutory Checksum Parity
                    </span>
                    <span className={`font-bold ${activeSpecimenTab === "genuine" ? "text-emerald-700" : "text-rose-700"}`}>
                      {activeSpecimenTab === "genuine"
                        ? "Verhoeff Dihedral Permutation D5 Matched · Valid State ID"
                        : "PARITY_FAIL_SPLICED_DIGITS · Tier A Non-Negotiable Hard Veto"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wider mb-1">
                      Cryptographic Issuer Signature
                    </span>
                    <span className={`font-bold ${activeSpecimenTab === "genuine" ? "text-emerald-700" : "text-rose-700"}`}>
                      {activeSpecimenTab === "genuine"
                        ? "2048-bit RSA Digital Signature Authenticated against Official Public Key"
                        : "Cryptographic Digest Mismatch · Unsigned or Forged QR Structure"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wider mb-1">
                      Micro-Typography & Sensor Noise
                    </span>
                    <span className={`font-bold ${activeSpecimenTab === "genuine" ? "text-emerald-700" : "text-rose-700"}`}>
                      {activeSpecimenTab === "genuine"
                        ? "Continuous Optical Sensor Noise & Authentic Print Baselines Verified"
                        : "Flat Digital Synthetic Canvas / Font Kerning Jitter Detected"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Quick Specimen Demonstrator:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLaunchSpecimen("pan_rohit_patel")}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 bg-white hover:border-indigo-300 text-slate-700 cursor-pointer transition"
                    >
                      PAN Card (Clean)
                    </button>
                    <button
                      onClick={() => handleLaunchSpecimen("passport_standard")}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 bg-white hover:border-indigo-300 text-slate-700 cursor-pointer transition"
                    >
                      Passport (ICAO)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Multilingual Institutional Global Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-xs">
                V
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block leading-none">
                  {t("footer_brand")}
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  {t("footer_node")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setLocation("/dashboard")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {t("nav_dashboard")}
              </button>
              <button
                onClick={() => setLocation("/border")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {t("nav_border")}
              </button>
              <button
                onClick={() => setLocation("/verify")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {t("nav_verify")}
              </button>
              <button
                onClick={() => setLocation("/history")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {t("nav_history")}
              </button>
              <button
                onClick={() => setLocation("/settings")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {t("nav_settings")}
              </button>
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 text-center sm:text-left">
            <span>{t("footer_desc")}</span>
            <span className="font-mono text-[10px] text-slate-500">
              {t("footer_privacy")}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
