import React from "react";
import { BorderVerificationResponse } from "../../lib/borderApi";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Cpu,
} from "lucide-react";

interface OfficerDecisionPanelProps {
  telemetry: BorderVerificationResponse | null;
}

export const OfficerDecisionPanel: React.FC<OfficerDecisionPanelProps> = ({
  telemetry,
}) => {
  if (!telemetry) return null;

  const { verdict, trust_score, document_type, modules_breakdown } = telemetry;
  const isClear = verdict === "CLEAR_ENTRY";

  const handleDownloadAuditJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(telemetry, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `VERISCAN_AUDIT_${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintManifest = () => {
    window.print();
  };

  return (
    <div
      className={`rounded-2xl p-6 border-2 transition-all shadow-sm ${
        isClear
          ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
          : "bg-rose-50/80 border-rose-300 text-rose-950"
      }`}
    >
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-black/5 pb-5">
        <div className="flex items-center space-x-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isClear
                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                : "bg-rose-100 text-rose-700 border-rose-300"
            }`}
          >
            {isClear ? (
              <Unlock className="w-7 h-7" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  isClear
                    ? "bg-emerald-200/60 text-emerald-900 border border-emerald-300"
                    : "bg-rose-200/60 text-rose-900 border border-rose-300"
                }`}
              >
                OFFICER DIRECTIVE • {document_type.toUpperCase()}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                  isClear
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {verdict}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 mt-1">
              {isClear
                ? "CLEAR ENTRY — RELEASE E-GATE TURNSTILE"
                : "HOLD FOR MANUAL INSPECTION — SECURITY ALERT"}
            </h2>
          </div>
        </div>

        {/* Risk Gauge Radial Score */}
        <div className="flex items-center space-x-4 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-xs">
          <div className="text-right font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              COMPOSITE TRUST SCORE
            </div>
            <div className="text-xs text-slate-400">
              {trust_score >= 75 ? "Clearance Threshold Met" : "Below Safety Threshold"}
            </div>
          </div>
          <div
            className={`w-14 h-14 rounded-full border-3 flex items-center justify-center font-mono text-xl font-black ${
              trust_score >= 75
                ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                : "border-rose-500 text-rose-700 bg-rose-50"
            }`}
          >
            {trust_score}
          </div>
        </div>
      </div>

      {/* Summary Bullet Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-2.5 flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>FORENSIC FINDINGS</span>
          </div>
          <ul className="space-y-2 text-xs font-mono text-slate-700">
            <li className="flex items-center space-x-2">
              {modules_breakdown.module_2_validation.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>Parity Check: {modules_breakdown.module_2_validation.checksum_parity}</span>
            </li>
            <li className="flex items-center space-x-2">
              {!modules_breakdown.module_3_tampering.tampered ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                Pixel Integrity: {modules_breakdown.module_3_tampering.forensic_status || (!modules_breakdown.module_3_tampering.tampered ? "PRISTINE PIXEL INTEGRITY" : "HIGH FORGERY CONFIDENCE")} (Anomaly: {modules_breakdown.module_3_tampering.compression_anomaly_score})
              </span>
            </li>
            <li className="flex items-center space-x-2">
              {parseFloat(modules_breakdown.module_4_face_verification.match_score) >= 70 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                Biometrics: {modules_breakdown.module_4_face_verification.match_score} ({modules_breakdown.module_4_face_verification.liveness_check})
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-2.5 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>OPERATIONAL DIRECTIVE</span>
          </div>
          <p className="text-xs text-slate-700 font-mono leading-relaxed">
            {isClear
              ? `All deterministic verification gates passed. ${document_type} security structure verified, compression consistency within baseline, and biometric match confirmed. Passenger is authorized for automated clearance.`
              : `Security threshold violated. Escort passenger to the secondary inspection counter for manual ${document_type} physical examination and biometric rescan.`}
          </p>
        </div>
      </div>

      {/* 3.1.5 Multi-Class Forensic CNN Intelligence Telemetry */}
      {modules_breakdown?.module_3_tampering?.cnn_forensics && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center text-purple-700">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                MULTI-CLASS FORENSIC CNN CLASSIFIER
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {modules_breakdown.module_3_tampering.cnn_forensics.model_architecture || "MobileNetV3-Lite (ONNX CPU)"}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-2">
              <span>LATENCY: <strong className="text-slate-800">{modules_breakdown.module_3_tampering.cnn_forensics.inference_latency_ms}ms</strong></span>
              <span className="text-slate-300">•</span>
              <span>CONFIDENCE: <strong className="text-slate-800">{(modules_breakdown.module_3_tampering.cnn_forensics.model_confidence * 100).toFixed(1)}%</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {/* Predicted Class Indicator */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold mb-1">
                PREDICTED TAMPER CLASSIFICATION
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-md border ${
                  modules_breakdown.module_3_tampering.cnn_forensics.predicted_type === "PRISTINE_REAL"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : modules_breakdown.module_3_tampering.cnn_forensics.predicted_type === "PHOTO_REPLACEMENT"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : modules_breakdown.module_3_tampering.cnn_forensics.predicted_type === "TEXT_TAMPERING"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : modules_breakdown.module_3_tampering.cnn_forensics.predicted_type === "STAMP_OR_SEAL_ANOMALY"
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : "bg-blue-100 text-blue-800 border-blue-300"
                }`}>
                  {modules_breakdown.module_3_tampering.cnn_forensics.predicted_type}
                </span>
              </div>
            </div>

            {/* Tamper Probability Meter */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-semibold mb-1">
                <span>TAMPER PROBABILITY</span>
                <span className="font-bold text-slate-900">
                  {(modules_breakdown.module_3_tampering.cnn_forensics.tamper_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    modules_breakdown.module_3_tampering.cnn_forensics.tamper_probability > 0.5
                      ? "bg-rose-500"
                      : modules_breakdown.module_3_tampering.cnn_forensics.tamper_probability > 0.2
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, modules_breakdown.module_3_tampering.cnn_forensics.tamper_probability * 100)}%` }}
                />
              </div>
            </div>

            {/* Forensic Status */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-center">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                NEURAL INTEGRITY EVALUATION
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-1 flex items-center space-x-1.5">
                {modules_breakdown.module_3_tampering.cnn_forensics.tamper_detected ? (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>
                  {modules_breakdown.module_3_tampering.cnn_forensics.tamper_detected
                    ? "Manipulation Signature Detected"
                    : "Microstructure Verified Clean"}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Class Distribution Spectrum */}
          {modules_breakdown.module_3_tampering.cnn_forensics.class_probabilities && (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold mb-2">
                5-CLASS NEURAL FORENSIC DISTRIBUTION (CPU-OPTIMIZED INFERENCE)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[10px]">
                {Object.entries(modules_breakdown.module_3_tampering.cnn_forensics.class_probabilities).map(([cName, cProb]) => (
                  <div key={cName} className="bg-white border border-slate-200 p-2 rounded flex flex-col justify-between">
                    <span className="text-slate-500 truncate text-[9px]" title={cName}>{cName}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-slate-800">{(Number(cProb) * 100).toFixed(1)}%</span>
                      <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden ml-1">
                        <div className={`h-full ${cName === 'PRISTINE_REAL' ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${Number(cProb) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-black/5 font-mono text-xs">
        <div className="text-slate-600 font-medium">
          STATION: CP-DEL-04 • OPERATOR: OFFICER-7749 • STATUS: DETERMINISTIC VERIFIED
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleDownloadAuditJson}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer font-medium"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>EXPORT AUDIT JSON</span>
          </button>

          <button
            type="button"
            onClick={handlePrintManifest}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer font-medium"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>PRINT MANIFEST</span>
          </button>
        </div>
      </div>
    </div>
  );
};
