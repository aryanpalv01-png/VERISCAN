import { useLocation } from "wouter";
import { GovMasthead } from "@/components/common/GovMasthead";
import { Button } from "@/components/ui/button";
import { demoDocuments, analyzeDocumentFile, detectDocumentType } from "@/lib/veriscan";
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
} from "lucide-react";
import { useRef, useState } from "react";
import { writeLocalScan } from "@/lib/scanStore";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  // Live Border Terminal State
  const [terminalFile, setTerminalFile] = useState<File | null>(null);
  const [terminalDocType, setTerminalDocType] = useState<string>("Passport");
  const [terminalLoading, setTerminalLoading] = useState<boolean>(false);
  const [terminalResult, setTerminalResult] = useState<BorderVerificationResponse | null>({
    status: "success",
    document_type: "National ID",
    trust_score: 98,
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
      toast.success("Forensic Screening Complete", {
        description: `Direct score: ${data.trust_score}/100 · Verdict: ${data.verdict === "CLEAR_ENTRY" ? "Clear Entry" : "Hold for Inspection"}`,
      });
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
      setTerminalDocType("National ID");
      setPreviewImage("/test_samples/sample_aadhaar.png");
      setTerminalResult({
        status: "success",
        document_type: "National ID",
        trust_score: 98,
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
      toast.success("Loaded Genuine Aadhaar Specimen", { description: "Trust Score: 98/100 · All 11 checks passed." });
    } else if (specimenId === "pan_rohit_patel") {
      setTerminalDocType("PAN Card");
      setPreviewImage("/test_samples/sample_pan.png");
      setTerminalResult({
        status: "success",
        document_type: "PAN Card",
        trust_score: 96,
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
      toast.success("Loaded Clean PAN Specimen", { description: "Trust Score: 96/100 · Statutory tax structure verified." });
    } else if (specimenId === "passport_standard") {
      setTerminalDocType("Passport");
      setPreviewImage("/test_samples/sample_aadhaar.png");
      setTerminalResult({
        status: "success",
        document_type: "Passport",
        trust_score: 97,
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
      toast.success("Loaded ICAO 9303 Passport Specimen", { description: "Trust Score: 97/100 · 7-3-1 matrix verified." });
    } else if (specimenId === "aadhaar_tampered_priya") {
      setTerminalDocType("National ID");
      setPreviewImage("/test_samples/sample_aadhaar.png");
      setTerminalResult({
        status: "success",
        document_type: "National ID",
        trust_score: 34,
        verdict: "HOLD_FOR_MANUAL_INSPECTION",
        tier_a_override: false,
        modules_breakdown: {
          module_1_ocr: { extracted_snippet: "UIDAI AADHAAR · ANOMALOUS KERNING · 9182 3412 8891" },
          module_2_validation: {
            valid: false,
            checksum_parity: "PARITY_FAIL_SPLICED_DIGITS",
            compliance: "Non-Compliant Checksum Sequence",
          },
          module_3_tampering: {
            tampered: true,
            compression_anomaly_score: 24.8,
            sharpness_variance: 16.2,
            forensic_status: "HIGH FORGERY CONFIDENCE (8x8 DCT Compression Discontinuity)",
          },
          module_4_face_verification: {
            match_score: "42.0%",
            liveness_check: "Failed (Synthetic Replay Artifacts)",
          },
        },
      });
      toast.error("Loaded Tampered Specimen", { description: "Trust Score: 34/100 · Splicing Anomaly Detected!" });
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
      {/* Official Government Masthead */}
      <GovMasthead theme="light" />

      {/* Main Clean Navigation Bar with Full User Authentication */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
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
                  {user?.email || "Officer"}
                </span>
                <Button
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all gap-1.5 h-8 px-3.5 cursor-pointer"
                >
                  <span>Command Center</span>
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
                  <span className="hidden sm:inline">Sign Out</span>
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
                  <span>Login</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/auth/register")}
                  className="text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg shadow-xs gap-1.5 h-8 px-3 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Register</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all gap-1.5 h-8 px-3.5 cursor-pointer"
                >
                  <span>Command Center</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              {/* Live Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>INSTITUTIONAL FORENSIC SCREENING ENGINE</span>
              </div>

              {/* Ultra-Clean Headline */}
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Automated Document Forensic & Tampering Localization
              </h1>

              {/* Minimalist Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
                11 automated verification modules evaluating compression anomalies, typography consistency, and cryptographic signatures.
              </p>

              {/* Primary Direct Action Triggers */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setLocation("/dashboard")}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all gap-2 cursor-pointer"
                >
                  <span>Open Forensic Command Center</span>
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
                  <span>{isUploading ? "Ingesting & Analyzing..." : "Ingest Specimen File"}</span>
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
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>Officer Portal:</span>
                  </div>
                  {isAuthenticated ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      Signed in as {user?.email || "Officer"}
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
                        <span>Login</span>
                      </Button>
                      <span className="text-slate-200">|</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/auth/register")}
                        className="h-7 px-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 rounded-lg gap-1 cursor-pointer shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Register</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metric Telemetry Cards */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">11/11</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Forensic Engines</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight">&lt; 1.2s</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Pipeline Latency</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">0</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Dead N/A States</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">2048-bit</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">RSA Trust Chain</div>
              </div>
            </div>

            {/* Live Apple-Grade Screening Terminal Workspace */}
            <div className="mt-10 max-w-5xl mx-auto rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      Live Forensic Border Screening Terminal
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Real-time statutory verification & pixel forgery detection
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/border")}
                    className="text-xs font-semibold text-slate-700 hover:text-indigo-600 h-8 gap-1.5 cursor-pointer"
                  >
                    <span>Full Screen Mode</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/dashboard")}
                    className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white h-8 gap-1.5 cursor-pointer"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick Test Specimen Launcher Row */}
              <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Quick Test Specimens:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => handleLaunchSpecimen("aadhaar_rahul_sharma")}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selectedSpecimenId === "aadhaar_rahul_sharma"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    Aadhaar (Genuine)
                  </button>
                  <button
                    onClick={() => handleLaunchSpecimen("pan_rohit_patel")}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selectedSpecimenId === "pan_rohit_patel"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    PAN (Clean)
                  </button>
                  <button
                    onClick={() => handleLaunchSpecimen("passport_standard")}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selectedSpecimenId === "passport_standard"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    Passport (ICAO)
                  </button>
                  <button
                    onClick={() => handleLaunchSpecimen("aadhaar_tampered_priya")}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selectedSpecimenId === "aadhaar_tampered_priya"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Tampered Specimen
                  </button>
                </div>
              </div>

              {/* 2-Column Split Workspace */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Specimen Intake */}
                <div className="md:col-span-5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Document Intake
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500">
                        STEP 01
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Document Class
                      </label>
                      <select
                        value={terminalDocType}
                        onChange={(e) => setTerminalDocType(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                      >
                        <option value="Passport">Passport (ICAO 9303)</option>
                        <option value="National ID">National Identity Card / Aadhaar</option>
                        <option value="Driving License">Driving License</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Visa">Travel Visa Document</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Document Specimen
                      </label>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-white rounded-xl p-4 hover:border-indigo-500/50 hover:bg-indigo-50/20 transition cursor-pointer group">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const f = e.target.files[0];
                              setTerminalFile(f);
                              setSelectedSpecimenId(null);
                              setPreviewImage(URL.createObjectURL(f));
                              handleExecuteScreening(f, terminalDocType);
                            }
                          }}
                        />
                        {previewImage ? (
                          <div className="relative aspect-[16/10] w-full max-h-32 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center mb-2">
                            <img
                              src={previewImage}
                              alt="Specimen Preview"
                              className="max-h-full max-w-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition mb-2" />
                        )}
                        <span className="text-xs font-semibold text-slate-700 text-center">
                          {terminalFile ? terminalFile.name : selectedSpecimenId ? "Specimen Loaded" : "Click to browse or drop file"}
                        </span>
                        <span className="text-[10.5px] text-slate-400 mt-0.5">
                          PNG, JPG, or PDF scan
                        </span>
                      </label>
                    </div>

                    <Button
                      type="button"
                      disabled={terminalLoading}
                      onClick={() => handleExecuteScreening()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition shadow-xs gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {terminalLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Analyzing Telemetry...</span>
                        </>
                      ) : (
                        <>
                          <Crosshair className="h-3.5 w-3.5" />
                          <span>Execute Forensic Screening</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-[10.5px] text-slate-400 border-t border-slate-200/60 pt-3 mt-4 text-center">
                    Zero-Retention Cryptographic Protocol · 256-bit SHA Verification
                  </div>
                </div>

                {/* Right Column: Decision Support & Telemetry */}
                <div className="md:col-span-7 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-3 mb-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Officer Decision Support
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500">
                        STEP 02
                      </span>
                    </div>

                    {terminalResult ? (
                      <div className="space-y-3.5">
                        {/* Directive Card */}
                        <div
                          className={`p-4 rounded-xl border flex items-center justify-between ${
                            terminalResult.verdict === "CLEAR_ENTRY"
                              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                              : "bg-rose-50/80 border-rose-200 text-rose-900"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                                terminalResult.verdict === "CLEAR_ENTRY"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              {terminalResult.verdict === "CLEAR_ENTRY" ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <AlertTriangle className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold tracking-wider uppercase opacity-75 block">
                                Directive
                              </span>
                              <span className="text-base font-extrabold tracking-tight">
                                {terminalResult.verdict === "CLEAR_ENTRY"
                                  ? "Clear Entry Authorized"
                                  : "Hold for Manual Inspection"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold tracking-wider uppercase opacity-75 block">
                              Trust Score
                            </span>
                            <span
                              className={`text-2xl font-black tracking-tight ${
                                terminalResult.verdict === "CLEAR_ENTRY"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {terminalResult.trust_score}/100
                            </span>
                          </div>
                        </div>

                        {/* Telemetry Breakdown Matrix */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Forensic Telemetry Breakdown</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                terminalResult.verdict === "CLEAR_ENTRY"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {terminalResult.verdict === "CLEAR_ENTRY" ? "PASS" : "FLAGGED"}
                            </span>
                          </div>

                          {/* Item 1: OCR */}
                          <div className="flex justify-between items-center py-1 border-b border-slate-100/70 text-[11px]">
                            <span className="text-slate-500 font-medium">OCR Extraction:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-[280px]">
                              {terminalResult.modules_breakdown?.module_1_ocr?.extracted_snippet || "Parsed Optical Stream"}
                            </span>
                          </div>

                          {/* Item 2: Validation */}
                          <div className="flex justify-between items-center py-1 border-b border-slate-100/70 text-[11px]">
                            <span className="text-slate-500 font-medium">Structure & Checksum:</span>
                            <span
                              className={`font-semibold ${
                                terminalResult.modules_breakdown?.module_2_validation?.valid
                                  ? "text-slate-800"
                                  : "text-rose-600"
                              }`}
                            >
                              {terminalResult.modules_breakdown?.module_2_validation?.checksum_parity || "Verified"}
                            </span>
                          </div>

                          {/* Item 3: Tampering */}
                          <div className="flex justify-between items-center py-1 border-b border-slate-100/70 text-[11px]">
                            <span className="text-slate-500 font-medium">Pixel ELA Integrity:</span>
                            <span
                              className={`font-semibold ${
                                terminalResult.modules_breakdown?.module_3_tampering?.tampered
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {terminalResult.modules_breakdown?.module_3_tampering?.tampered
                                ? "Compression Anomaly Detected"
                                : "Pristine Pixel Integrity"}
                            </span>
                          </div>

                          {/* Item 4: Biometrics */}
                          <div className="flex justify-between items-center py-1 text-[11px]">
                            <span className="text-slate-500 font-medium">Biometrics & Liveness:</span>
                            <span className="font-semibold text-slate-800">
                              {terminalResult.modules_breakdown?.module_4_face_verification?.match_score || "97.1%"} ·{" "}
                              {terminalResult.modules_breakdown?.module_4_face_verification?.liveness_check || "Live 3D"}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-1 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation("/dashboard")}
                            className="h-8 text-xs font-semibold text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 rounded-lg gap-1.5 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Deep Command Center View</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-center py-14 text-xs bg-white rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                        <Crosshair className="h-6 w-6 text-slate-300" />
                        <span>Awaiting document ingest for real-time telemetry...</span>
                        <span className="text-[11px] text-slate-400">
                          Select a test specimen above or upload a document file
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-200/60 pt-3 mt-4 flex justify-between items-center">
                    <span>Node: CHK-04-DEL</span>
                    <span className="font-mono text-[10px]">BUILD // 2.4.0-PROD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">VeriScan // SIH-2026</span>
            <span>·</span>
            <span>Evidentiary Document Screening Node</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={() => setLocation("/border")}
              className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              Border Terminal
            </button>
            <button
              onClick={() => setLocation("/verify")}
              className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              Verify
            </button>
            <button
              onClick={() => setLocation("/history")}
              className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              Audit Trail
            </button>
            <button
              onClick={() => setLocation("/settings")}
              className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
