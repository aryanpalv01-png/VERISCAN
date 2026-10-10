import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CinematicDocumentScanner3D } from "./CinematicDocumentScanner3D";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  Search,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Fingerprint,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import {
  analyzeDocumentFile,
  detectDocumentType,
  VerificationDocument,
} from "@/lib/veriscan";
import { writeLocalScan } from "@/lib/scanStore";
import { useAuth } from "@/_core/hooks/useAuth";

gsap.registerPlugin(ScrollTrigger);

export function CinematicScrollHero() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();

  const trackRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase container refs for GSAP animation
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);

  // 3D Canvas Scroll Progress (0.0 to 1.0)
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSpecimenType, setActiveSpecimenType] = useState<"genuine" | "forged">("genuine");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [quickResult, setQuickResult] = useState<VerificationDocument | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Create GSAP ScrollTrigger timeline with smooth scrub
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (self) => {
          setScrollProgress(self.progress);
        },
      },
    });

    // Initial state: Phase 1 visible, others hidden and shifted down
    gsap.set(phase1Ref.current, { opacity: 1, y: 0, pointerEvents: "auto" });
    gsap.set(phase2Ref.current, { opacity: 0, y: 45, pointerEvents: "none" });
    gsap.set(phase3Ref.current, { opacity: 0, y: 45, pointerEvents: "none" });
    gsap.set(phase4Ref.current, { opacity: 0, y: 45, pointerEvents: "none" });

    // Timeline choreographing strict non-overlapping card transitions
    // Keyframes normalized from 0 to 100:
    tl
      // Phase 1 Fades Out (0 -> 22)
      .to(
        phase1Ref.current,
        {
          opacity: 0,
          y: -40,
          pointerEvents: "none",
          duration: 22,
          ease: "power2.inOut",
        },
        0
      )

      // Phase 2 Enters (22 -> 30) and Holds until 48
      .to(
        phase2Ref.current,
        {
          opacity: 1,
          y: 0,
          pointerEvents: "auto",
          duration: 8,
          ease: "power2.out",
        },
        22
      )
      // Phase 2 Exits (48 -> 55)
      .to(
        phase2Ref.current,
        {
          opacity: 0,
          y: -40,
          pointerEvents: "none",
          duration: 7,
          ease: "power2.in",
        },
        48
      )

      // Phase 3 Enters (55 -> 62) and Holds until 78
      .to(
        phase3Ref.current,
        {
          opacity: 1,
          y: 0,
          pointerEvents: "auto",
          duration: 7,
          ease: "power2.out",
        },
        55
      )
      // Phase 3 Exits (78 -> 85)
      .to(
        phase3Ref.current,
        {
          opacity: 0,
          y: -40,
          pointerEvents: "none",
          duration: 7,
          ease: "power2.in",
        },
        78
      )

      // Phase 4 Enters (85 -> 95) and Stays Active at the end
      .to(
        phase4Ref.current,
        {
          opacity: 1,
          y: 0,
          pointerEvents: "auto",
          duration: 10,
          ease: "power2.out",
        },
        85
      );

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === track) st.kill();
      });
      tl.kill();
    };
  }, []);

  // Quick Specimen Simulator
  const handleLaunchSpecimen = (type: "aadhaar_clean" | "pan_clean" | "passport_icao" | "aadhaar_tampered") => {
    if (type === "aadhaar_tampered") {
      setActiveSpecimenType("forged");
      setQuickResult({
        id: "demo-tampered",
        filename: "aadhaar_spliced_scan.jpg",
        type: "aadhaar",
        uploadedAt: new Date().toISOString(),
        status: "likely_forged",
        score: 18,
        fileSize: "1.4 MB",
        mimeType: "image/jpeg",
        reference: "VS-CRIT-9921",
        summary: "CRITICAL: Spliced demographic digits failed Verhoeff parity (Tier A Veto). ELA discontinuity 24.8.",
        checks: [
          {
            id: "verhoeff",
            name: "Verhoeff Dihedral Checksum",
            shortName: "Verhoeff",
            result: "flag",
            confidence: 99,
            explanation: "Dihedral group D5 permutation mismatch. Digits spliced.",
          },
          {
            id: "ela",
            name: "Error Level Analysis",
            shortName: "ELA",
            result: "flag",
            confidence: 94,
            explanation: "Localized 8x8 DCT recompression variance detected.",
          },
        ],
      });
      toast.error("Loaded Tampered Specimen: Splicing Anomaly Detected!", {
        description: "Verhoeff Dihedral Parity Failed · ELA Discontinuity Δ = 24.8",
      });
    } else {
      setActiveSpecimenType("genuine");
      const name = type === "pan_clean" ? "pan_tax_clean.jpg" : type === "passport_icao" ? "passport_icao_td3.jpg" : "aadhaar_verified_uidai.jpg";
      const docType = type === "pan_clean" ? "pan" : type === "passport_icao" ? "passport" : "aadhaar";
      setQuickResult({
        id: "demo-verified",
        filename: name,
        type: docType,
        uploadedAt: new Date().toISOString(),
        status: "verified",
        score: 96,
        fileSize: "1.1 MB",
        mimeType: "image/jpeg",
        reference: "VS-AUTH-7740",
        summary: "Pristine document integrity. All statutory checksums, micro-fonts, and 2048-bit RSA digital signatures verified.",
        checks: [
          {
            id: "signature",
            name: "Cryptographic RSA Signature",
            shortName: "RSA-2048",
            result: "pass",
            confidence: 100,
            explanation: "Sovereign public key digest verified.",
          },
          {
            id: "ela",
            name: "Pixel Compression Uniformity",
            shortName: "ELA",
            result: "pass",
            confidence: 98,
            explanation: "Uniform optical sensor baselines across all 8x8 blocks.",
          },
        ],
      });
      toast.success("Loaded Authentic Specimen: Clean Verification", {
        description: "100% Cryptographic Match · All Statutory Rules Passed.",
      });
    }
  };

  // Direct File Ingestion Handler
  const handleIngestFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessingFile(true);
      try {
        const detectedType = detectDocumentType(file.name);
        const analyzed = await analyzeDocumentFile(file, detectedType);
        writeLocalScan(analyzed, user?.email || "guest");
        setQuickResult(analyzed);
        setActiveSpecimenType(analyzed.status === "verified" ? "genuine" : "forged");

        if (analyzed.status === "verified") {
          toast.success("Document Verified Clean!", {
            description: `Score: ${analyzed.score}/100 · Genuine Sovereign Structure.`,
            action: {
              label: "Open Full Report",
              onClick: () => setLocation(`/report/${analyzed.id}`),
            },
          });
        } else {
          toast.error("Document Anomaly Flagged!", {
            description: `Score: ${analyzed.score}/100 · Potential Alteration Detected.`,
            action: {
              label: "Open Full Report",
              onClick: () => setLocation(`/report/${analyzed.id}`),
            },
          });
        }
      } catch (err: any) {
        console.error("Direct ingestion error:", err);
        toast.error("Ingestion failed", { description: err.message || "Could not analyze document." });
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative w-full bg-[#060913] text-white"
      style={{ height: "360vh" }}
    >
      {/* Sticky Full-Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* 1. Background 3D Cinematic Canvas */}
        <CinematicDocumentScanner3D
          progress={scrollProgress}
          activeSpecimenType={activeSpecimenType}
        />

        {/* Ambient Dark Vignette & Dynamic Top Ribbon */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 40%, rgba(6, 9, 19, 0.75) 100%)",
            zIndex: 1,
          }}
        />

        {/* 2. Scroll Progress Timeline HUD Indicator */}
        <div
          className="absolute top-20 right-6 sm:right-10 flex flex-col items-end gap-2 text-xs font-mono tracking-widest text-indigo-300/80 pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase text-[11px] font-bold text-slate-300">
              3D FORENSIC TELEMETRY
            </span>
          </div>
          <div className="w-32 h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">
            PHASE {scrollProgress < 0.28 ? "1/4: SPECIMEN" : scrollProgress < 0.6 ? "2/4: OPTICAL ELA" : scrollProgress < 0.85 ? "3/4: MULTI-LAYER" : "4/4: VERIFICATION"}
          </span>
        </div>

        {/* =========================================================================
            3. CINEMATIC NARRATIVE OVERLAY CARDS (STRICT ZERO OVERLAP VIA GSAP TIMELINE)
           ========================================================================= */}

        {/* --- PHASE 1: HERO & INSTITUTIONAL SOVEREIGN PLATFORM --- */}
        <div
          ref={phase1Ref}
          className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: 5 }}
        >
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/80 p-6 sm:p-10 text-center shadow-2xl backdrop-blur-2xl pointer-events-auto">
            {/* Top Security Ribbons */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                SOVEREIGN INSTITUTIONAL SPECIFICATION
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                SMART INDIA HACKATHON 2026
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Institutional Document Forensics & AI Integrity Platform
            </h1>

            {/* Subtitle */}
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Detects forged IDs, spliced demographic entries, flat-screen replays, and unauthorized alterations through real-time mathematical checksums, error level analysis, and 2048-bit RSA verification.
            </p>

            {/* Interactive CTA Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setLocation("/dashboard")}
                className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg hover:shadow-indigo-500/30 transition-all gap-2 cursor-pointer"
              >
                <span>{t("btn_open_workspace")}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                disabled={isProcessingFile}
                onClick={() => fileInputRef.current?.click()}
                className="h-11 px-5 rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm backdrop-blur-md gap-2 cursor-pointer"
              >
                <UploadCloud className="h-4 w-4 text-cyan-400" />
                <span>{isProcessingFile ? "Analyzing Document..." : t("btn_ingest_file")}</span>
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={() => setLocation("/border")}
                className="h-11 px-4 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>Live Border Terminal</span>
              </Button>
            </div>

            {/* Micro Scroll Hint */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
              <span className="animate-bounce">↓</span>
              <span>SCROLL DOWN TO INITIATE 3D FORENSIC SCANNER SLICING</span>
            </div>
          </div>
        </div>

        {/* --- PHASE 2: OPTICAL & 8X8 DCT ERROR LEVEL SLICING --- */}
        <div
          ref={phase2Ref}
          className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: 5 }}
        >
          <div className="w-full max-w-2xl rounded-3xl border border-indigo-500/30 bg-slate-950/85 p-6 sm:p-8 text-left shadow-2xl backdrop-blur-2xl pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase block">
                    STAGE 01 // OPTICAL INTEGRITY
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    8×8 DCT Error Level Analysis & Splicing Radar
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/40">
                Δ COMPRESSION MAP
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              When documents are altered in editors like Photoshop or Canva, modified text blocks and spliced photographs exhibit different JPEG recompression quantization artifacts than the genuine background substrate.
            </p>

            {/* Live Metrics Grid */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300">
                <span className="block text-[10px] text-emerald-400/80 uppercase font-bold mb-1">
                  GENUINE SPECIMEN BASELINE
                </span>
                <span className="text-sm font-bold block text-white">Mean Error: Δ = 3.8</span>
                <span className="text-[11px] text-emerald-400">Uniform optical sensor noise verified</span>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300">
                <span className="block text-[10px] text-rose-400/80 uppercase font-bold mb-1">
                  SPLICED ALTERATION SIGNATURE
                </span>
                <span className="text-sm font-bold block text-white">Peak Anomaly: Δ = 24.8</span>
                <span className="text-[11px] text-rose-400">High forgery discontinuity flagged</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="h-4 w-4 text-cyan-400" />
                <span>Micro-typography baseline & kerning variance</span>
              </span>
              <span className="text-indigo-400 font-mono">CONTINUE SCROLLING ↓</span>
            </div>
          </div>
        </div>

        {/* --- PHASE 3: MULTI-LAYER CHECKSUMS & LOGICAL DECONSTRUCTION --- */}
        <div
          ref={phase3Ref}
          className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: 5 }}
        >
          <div className="w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-slate-950/85 p-6 sm:p-8 text-left shadow-2xl backdrop-blur-2xl pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block">
                    STAGE 02 // LOGICAL DECONSTRUCTION
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Mathematical Checksums & Sovereign Syntax
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/40">
                TIER-A OVERRIDE
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every official sovereign credential embeds non-negotiable mathematical checksum sequences. Any manual digit splicing immediately collapses the permutation group, triggering an irrevocable Tier A system veto.
            </p>

            {/* Verification Pillars List */}
            <div className="mt-5 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-bold">Verhoeff Dihedral Matrix (D5)</span>
                </div>
                <span className="text-emerald-400 font-bold">Aadhaar (12-Digit Strict Parity)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-bold">ICAO 9303 Weight Matrix (7-3-1)</span>
                </div>
                <span className="text-emerald-400 font-bold">Passport TD3 MRZ Checksums</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-bold">ISO 3166-1 Sovereign Whitelist</span>
                </div>
                <span className="text-emerald-400 font-bold">Vetoes Unrecognized Micro-Nations</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-emerald-400" />
                <span>Deterministic Zero-Hallucination Guardrails</span>
              </span>
              <span className="text-cyan-400 font-mono">CONTINUE SCROLLING ↓</span>
            </div>
          </div>
        </div>

        {/* --- PHASE 4: DECISION ENGINE & LIVE INTERACTIVE WORKBENCH --- */}
        <div
          ref={phase4Ref}
          className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: 5 }}
        >
          <div className="w-full max-w-3xl rounded-3xl border border-emerald-500/40 bg-slate-950/90 p-6 sm:p-8 text-left shadow-2xl backdrop-blur-2xl pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">
                    STAGE 03 // LIVE VERIFICATION WORKBENCH
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Instant Evidentiary Decision Terminal
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/40">
                11 MODULE ENGINE
              </span>
            </div>

            {/* Quick Specimen Demonstrator Strip */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                1-Click Instant Demonstrator Specimens:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleLaunchSpecimen("aadhaar_clean")}
                  className="p-2.5 rounded-xl border border-white/15 bg-white/5 hover:border-emerald-400/60 hover:bg-emerald-500/10 text-left transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">CLEAN</span>
                  <span className="text-xs font-bold text-white block">Aadhaar (UIDAI)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchSpecimen("pan_clean")}
                  className="p-2.5 rounded-xl border border-white/15 bg-white/5 hover:border-emerald-400/60 hover:bg-emerald-500/10 text-left transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">CLEAN</span>
                  <span className="text-xs font-bold text-white block">PAN Card (ITD)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchSpecimen("passport_icao")}
                  className="p-2.5 rounded-xl border border-white/15 bg-white/5 hover:border-emerald-400/60 hover:bg-emerald-500/10 text-left transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">CLEAN</span>
                  <span className="text-xs font-bold text-white block">Passport (ICAO)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchSpecimen("aadhaar_tampered")}
                  className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:border-rose-400 text-left transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-rose-400 font-bold block uppercase">ALTERED</span>
                  <span className="text-xs font-bold text-white block">Spliced Specimen</span>
                </button>
              </div>
            </div>

            {/* Quick Result Summary Panel (When a specimen or file is active) */}
            {quickResult && (
              <div
                className={`mt-4 p-4 rounded-2xl border text-xs ${
                  quickResult.status === "verified"
                    ? "border-emerald-500/40 bg-emerald-950/40"
                    : "border-rose-500/40 bg-rose-950/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {quickResult.filename}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      Score: {quickResult.score}/100
                    </span>
                  </div>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] uppercase ${
                      quickResult.status === "verified"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {quickResult.status === "verified" ? "CLEAR ENTRY (AUTHENTIC)" : "HOLD FOR INSPECTION (TAMPERED)"}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{quickResult.summary}</p>
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    REF: {quickResult.reference}
                  </span>
                  <button
                    onClick={() => setLocation(`/report/${quickResult.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    <span>View Full Telemetry Dossier</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Ingestion Dropzone & Open Workspace Actions */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="h-9 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>{isProcessingFile ? "Analyzing File..." : "Screen Custom Specimen (PDF/IMG)"}</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleIngestFile}
                />
              </div>

              <Button
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-1.5 cursor-pointer ml-auto"
              >
                <span>Enter Institutional Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
