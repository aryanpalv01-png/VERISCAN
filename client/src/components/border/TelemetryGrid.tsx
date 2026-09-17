import React from "react";
import { BorderVerificationResponse } from "../../lib/borderApi";
import {
  FileCode2,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  ScanFace,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

interface TelemetryGridProps {
  telemetry: BorderVerificationResponse | null;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({ telemetry }) => {
  if (!telemetry) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-mono text-xs shadow-xs">
        <Cpu className="w-9 h-9 mx-auto mb-2.5 text-slate-300 animate-pulse" />
        NO CREDENTIAL INGESTED. UPLOAD AN IDENTITY DOCUMENT FOR LIVE OPENCV & OCR SCREENING.
      </div>
    );
  }

  const {
    module_1_ocr: m1,
    module_2_validation: m2,
    module_3_tampering: m3,
    module_4_face_verification: m4,
  } = telemetry.modules_breakdown;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* MODULE 1: OCR Extraction */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold">
                  MODULE 1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  OCR Text Extraction Engine
                </h3>
              </div>
            </div>

            <span className="font-mono text-xs px-2.5 py-1 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
              PYTESSERACT / ONNX
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 mb-3">
            <div className="text-[10px] text-slate-400 font-medium uppercase mb-1">
              PARSED TEXT SNIPPET (FIRST 100 CHARS)
            </div>
            <div className="font-semibold text-slate-900 break-words bg-white p-2.5 rounded border border-slate-200">
              {m1.extracted_snippet || "No textual data could be isolated from specimen."}
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 pt-2 border-t border-slate-100">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Optical Character Recognition executed on raw image buffer</span>
        </div>
      </div>

      {/* MODULE 2: Cryptographic Checksum Parity & Structure */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
                  MODULE 2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Checksum Parity & Layout
                </h3>
              </div>
            </div>

            <span
              className={`font-mono text-xs px-2.5 py-1 rounded-md font-bold border ${
                m2.valid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {m2.valid ? "PARITY VERIFIED" : "PARITY ERROR"}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">PARITY STATUS:</span>
              <span
                className={`font-bold ${
                  m2.valid ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {m2.checksum_parity}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">WEIGHT MATRIX:</span>
              <span className="font-semibold text-slate-800">
                {telemetry.document_type === "Passport"
                  ? "ICAO 9303 (7-3-1 Weight Matrix Check)"
                  : telemetry.document_type === "Driving License"
                  ? "ISO 18013 / SARATHI Parity & Authority Matrix"
                  : telemetry.document_type === "PAN Card"
                  ? "NSDL / Income Tax Structural Syntax Verified"
                  : "QR Code / Visual Geometry Authenticated"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 pt-2 border-t border-slate-100">
          {m2.valid ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>{m2.checksum_parity}</span>
        </div>
      </div>

      {/* MODULE 3: OpenCV Error Level Analysis & Forensic Pixel Inspection */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold">
                  MODULE 3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Forensic Pixel Deep Inspection
                </h3>
              </div>
            </div>

            <span
              className={`font-mono text-xs px-2.5 py-1 rounded-md font-bold border ${
                !m3.tampered
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {m3.forensic_status || (!m3.tampered ? "PRISTINE PIXEL INTEGRITY" : "HIGH FORGERY CONFIDENCE")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
              <div className="text-[10px] text-slate-400 font-medium">COMPRESSION ANOMALY</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {m3.compression_anomaly_score}
                <span className="text-[10px] text-slate-400 font-normal"> (Thresh: {telemetry.document_type === "National ID" ? "22.0" : "15.0"})</span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
              <div className="text-[10px] text-slate-400 font-medium">SHARPNESS VARIANCE</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {m3.sharpness_variance ?? "N/A"}
                <span className="text-[10px] text-slate-400 font-normal"> (35.0 - 1500.0)</span>
              </div>
            </div>

            {m3.cnn_forensics && (
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg col-span-2">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                  <span>CNN INFERENCE ({m3.cnn_forensics.inference_latency_ms}ms)</span>
                  <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[9px] ${
                    m3.cnn_forensics.predicted_type === 'PRISTINE_REAL'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>{m3.cnn_forensics.predicted_type}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
                  <span>Tamper Prob: <strong>{(m3.cnn_forensics.tamper_probability * 100).toFixed(1)}%</strong></span>
                  <span>Confidence: <strong>{(m3.cnn_forensics.model_confidence * 100).toFixed(1)}%</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 pt-2 border-t border-slate-100">
          {!m3.tampered ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>
            {!m3.tampered
              ? "Pristine Pixel Integrity: Edge gradients & recompression artifacts match authentic baseline"
              : "High Forgery Confidence: Discrepancy detected in compression grid or edge Laplacian gradients"}
          </span>
        </div>
      </div>

      {/* MODULE 4: Face Verification & Liveness */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <ScanFace className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-600 font-bold">
                  MODULE 4
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Biometric Face Match & Liveness
                </h3>
              </div>
            </div>

            <span
              className={`font-mono text-xs px-2.5 py-1 rounded-md font-bold border ${
                parseFloat(m4.match_score) >= 60
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {m4.match_score} MATCH
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">FACIAL MATCH CONFIDENCE:</span>
              <span className="font-bold text-slate-900">{m4.match_score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">LIVENESS / ANTI-SPOOF:</span>
              <span
                className={`font-bold ${
                  m4.liveness_check.includes("Passed")
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {m4.liveness_check}
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 pt-2 border-t border-slate-100">
          {m4.liveness_check.includes("Passed") ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>{m4.liveness_check}</span>
        </div>
      </div>
    </div>
  );
};
