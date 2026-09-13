import { useLocation } from "wouter";
import { GovMasthead } from "@/components/common/GovMasthead";
import { Button } from "@/components/ui/button";
import { demoDocuments } from "@/lib/veriscan";
import { useAuth } from "@/_core/hooks/useAuth";
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
} from "lucide-react";
import { useRef } from "react";
import { writeLocalScan } from "@/lib/scanStore";

export default function Home() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, logout } = useAuth();

  const handleLaunchSpecimen = (docId: string) => {
    const doc = demoDocuments.find((d) => d.id === docId);
    if (doc) {
      writeLocalScan(doc, user?.email || "guest");
    }
    setLocation("/dashboard");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Official Government Masthead */}
      <GovMasthead theme="light" />

      {/* Main Clean Navigation Bar */}
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
        <div className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24">
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
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setLocation("/dashboard")}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all gap-2"
                >
                  <span>Open Forensic Command Center</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-5 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs gap-2"
                >
                  <UploadCloud className="h-4 w-4 text-indigo-600" />
                  <span>Ingest Specimen</span>
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Quick Specimen Launch Row */}
              <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Quick Test Specimen:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleLaunchSpecimen("aadhaar_rahul_sharma")}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Aadhaar (Genuine)
                  </button>
                  <button
                    onClick={() => handleLaunchSpecimen("pan_rohit_patel")}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    PAN (Clean)
                  </button>
                  <button
                    onClick={() => handleLaunchSpecimen("aadhaar_tampered_priya")}
                    className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Tampered Specimen
                  </button>
                </div>
              </div>

              {/* Direct Authentication Gateway */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>Officer Portal:</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/auth/login")}
                    className="h-8 px-3 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:bg-slate-100 rounded-lg gap-1.5 cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Login</span>
                  </Button>
                  <span className="text-slate-200">|</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/auth/register")}
                    className="h-8 px-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 rounded-lg gap-1.5 cursor-pointer shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Register Account</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Metric Telemetry Cards (Pure Numbers, No Verbose Paragraphs) */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
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

            {/* Interactive Specimen Live Architecture Showcase Preview */}
            <div className="mt-10 max-w-5xl mx-auto rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live Evaluation Surface
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 gap-1 p-0 h-auto"
                >
                  <span>Open Full Dashboard</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Split Layout Preview Mockup */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Specimen Canvas Preview */}
                <div className="md:col-span-5 rounded-xl border border-slate-200/80 bg-slate-50 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Crosshair className="h-3 w-3 text-indigo-600" />
                      <span>Document Specimen Inspector</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      OPTICAL · 2.8x
                    </span>
                  </div>

                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                    <img
                      src="/test_samples/sample_aadhaar.png"
                      alt="Sample Specimen"
                      className="max-h-full max-w-full object-contain p-2"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                      VERIFIED 98/100
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-500">
                    <span>COORDS: X:48.2% · Y:32.4%</span>
                    <span className="font-semibold text-indigo-600">300 DPI STATUTORY</span>
                  </div>
                </div>

                {/* 11-Check Telemetry Matrix Preview */}
                <div className="md:col-span-7 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-emerald-600" />
                      <span>11/11 Active Telemetry Parameters</span>
                    </span>
                    <span className="text-emerald-700 font-bold">ALL PASS</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {[
                      { code: "01. EXIF", name: "Container Metadata Provenance", conf: "95%", status: "PASS" },
                      { code: "02. ID_CHK", name: "Verhoeff Dihedral Permutation", conf: "99%", status: "PASS" },
                      { code: "03. QR_RSA", name: "UIDAI 2048-bit Digital Signature", conf: "98%", status: "PASS" },
                      { code: "04. ELA_DCT", name: "8x8 DCT Compression Gradient", conf: "92%", status: "PASS" },
                      { code: "05. SIFT", name: "Copy-Move Spatial Clone Probe", conf: "94%", status: "PASS" },
                      { code: "06. NOISE", name: "Sensor Noise & Moiré Analysis", conf: "96%", status: "PASS" },
                    ].map((row) => (
                      <div
                        key={row.code}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200/60 text-[11.5px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 w-16">{row.code}</span>
                          <span className="text-slate-700 truncate max-w-[180px] sm:max-w-[240px]">
                            {row.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">{row.conf}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">+ 5 More Neural & Subpixel Engines</span>
                    <Button
                      size="sm"
                      onClick={() => setLocation("/dashboard")}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3"
                    >
                      Inspect Live
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">VeriScan // SIH-2026</span>
            <span>·</span>
            <span>Evidentiary Document Screening Node</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => setLocation("/verify")}
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              Verify
            </button>
            <button
              onClick={() => setLocation("/history")}
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              Audit Trail
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
