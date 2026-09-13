import React, { useState } from "react";
import { AlertTriangle, Eye, EyeOff, ShieldAlert, ShieldCheck, Crosshair } from "lucide-react";

export interface AnomalyItem {
  id: number | string;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  reason: string;
}

export interface AnomalyViewerProps {
  imageUrl?: string;
  anomalies?: AnomalyItem[];
  title?: string;
}

const DEFAULT_SAMPLE_ANOMALIES: AnomalyItem[] = [
  {
    id: 1,
    x_pct: 18,
    y_pct: 32,
    width_pct: 28,
    height_pct: 7,
    reason: "Font thickness & kerning mismatch in Aadhaar / PAN Name field",
  },
  {
    id: 2,
    x_pct: 22,
    y_pct: 44,
    width_pct: 22,
    height_pct: 6,
    reason: "Digital copy-paste splicing artifact detected around Date of Birth",
  },
  {
    id: 3,
    x_pct: 68,
    y_pct: 26,
    width_pct: 24,
    height_pct: 35,
    reason: "Face photo boundary compression discontinuity (Deepfake / Inpainting)",
  },
];

export function AnomalyViewer({
  imageUrl,
  anomalies = DEFAULT_SAMPLE_ANOMALIES,
  title = "Document Anomaly & Tamper Inspection",
}: AnomalyViewerProps) {
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [activeAnomalyId, setActiveAnomalyId] = useState<string | number | null>(null);

  const activeAnomalies = anomalies !== undefined ? anomalies : DEFAULT_SAMPLE_ANOMALIES;
  const hoveredOrSelected = activeAnomalies.find((a) => a.id === activeAnomalyId);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Crosshair className="h-3 w-3 text-indigo-600" />
              Specimen Loupe
            </span>
            {showAnomalies && (
              activeAnomalies.length > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {activeAnomalies.length} Flagged {activeAnomalies.length === 1 ? "Zone" : "Zones"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Clean Specimen
                </span>
              )
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setShowAnomalies((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 text-xs rounded-xl transition-colors cursor-pointer select-none shadow-xs"
        >
          {showAnomalies ? (
            <>
              <EyeOff className="h-3.5 w-3.5 text-slate-500" />
              <span>Hide Tamper Zones</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
              <span>Show Tamper Zones</span>
            </>
          )}
        </button>
      </div>

      {/* Coordinate Readout Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600 font-bold">Coordinate HUD:</span>
          {hoveredOrSelected ? (
            <span className="text-slate-900 font-medium">
              Zone #{hoveredOrSelected.id} · x: <strong className="text-emerald-700">{hoveredOrSelected.x_pct}%</strong>, y: <strong className="text-emerald-700">{hoveredOrSelected.y_pct}%</strong>, w: {hoveredOrSelected.width_pct}%, h: {hoveredOrSelected.height_pct}%
            </span>
          ) : (
            <span>Hover zone to inspect coordinates</span>
          )}
        </div>
        <div className="text-[10px] text-slate-400">
          Projection: 1:1 Canonical
        </div>
      </div>

      {/* Document Image inside relative container */}
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 select-none">
        <img
          src={imageUrl || "/test_samples/sample_aadhaar.png"}
          alt="Forensic Visualizer Canvas"
          className="w-full h-auto object-contain block max-h-[580px] mx-auto"
          loading="eager"
        />

        {/* Interactive Bounding Boxes */}
        {showAnomalies &&
          activeAnomalies.map((a) => {
            const isHoveredOrActive = activeAnomalyId === a.id;
            return (
              <div
                key={a.id}
                onMouseEnter={() => setActiveAnomalyId(a.id)}
                onMouseLeave={() => setActiveAnomalyId(null)}
                onClick={() => setActiveAnomalyId(isHoveredOrActive ? null : a.id)}
                style={{
                  left: `${a.x_pct}%`,
                  top: `${a.y_pct}%`,
                  width: `${a.width_pct}%`,
                  height: `${a.height_pct}%`,
                }}
                className={`absolute border-2 cursor-crosshair group transition-all duration-150 ${
                  isHoveredOrActive
                    ? "border-rose-500 bg-rose-500/35 ring-1 ring-rose-400"
                    : "border-rose-500/80 bg-rose-500/20 hover:bg-rose-500/30"
                }`}
              >
                {/* Visual anchor tag */}
                <div className="absolute -top-3 -left-1 flex items-center justify-center h-4 px-1 rounded-xs bg-rose-600 text-white font-mono text-[9px] font-bold">
                  #{a.id}
                </div>

                {/* Hover Tooltip */}
                <div
                  className={`absolute z-30 pointer-events-none whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 text-white text-xs px-2.5 py-1 shadow-md transition-all duration-150 ${
                    a.y_pct > 65 ? "bottom-full mb-2" : "top-full mt-2"
                  } left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold">⚠️ [{a.x_pct}%, {a.y_pct}%]</span>
                    <span>{a.reason}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Flagged Coordinates Breakdown Table */}
      {showAnomalies && (
        activeAnomalies.length > 0 ? (
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Flagged Coordinates Matrix
            </div>
            <div className="space-y-1.5">
              {activeAnomalies.map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveAnomalyId(item.id)}
                  onMouseLeave={() => setActiveAnomalyId(null)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    activeAnomalyId === item.id
                      ? "border-rose-300 bg-rose-50 text-slate-900"
                      : "border-slate-200/80 bg-slate-50 text-slate-700 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Zone #{item.id}
                    </span>
                    <span className="text-[11.5px] font-medium text-slate-900">{item.reason}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 font-mono">
                    x: <strong className="text-indigo-600">{item.x_pct}%</strong> y: <strong className="text-indigo-600">{item.y_pct}%</strong> [w:{item.width_pct}% h:{item.height_pct}%]
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>No tampering anomalies localized across 11 forensic inspection layers. Specimen geometry, font baselines, and raster compression are authentic.</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default AnomalyViewer;
