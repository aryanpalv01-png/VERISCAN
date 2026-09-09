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
    <div className="terminal-panel p-4 sm:p-5">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-[#3A3D45] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="command-badge bg-[#FF9933]/15 text-[#FFB057] border-[#FF9933]/40 flex items-center gap-1.5 font-bold">
              <Crosshair className="h-3 w-3 text-[#FF9933]" />
              Forensic Specimen Loupe
            </span>
            {showAnomalies && (
              activeAnomalies.length > 0 ? (
                <span className="command-badge bg-rose-950/60 text-rose-300 border-rose-800/60">
                  {activeAnomalies.length} Flagged {activeAnomalies.length === 1 ? "Zone" : "Zones"}
                </span>
              ) : (
                <span className="command-badge bg-emerald-950/60 text-emerald-300 border-emerald-800/60 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  0 Flagged Zones · Clean Specimen
                </span>
              )
            )}
          </div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-white mt-1 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setShowAnomalies((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 border border-[#FF9933] bg-[#FF9933]/15 hover:bg-[#FF9933]/25 text-white font-mono font-semibold px-3 py-1.5 text-xs transition-colors cursor-pointer select-none"
        >
          {showAnomalies ? (
            <>
              <EyeOff className="h-3.5 w-3.5 text-[#FF9933]" />
              <span>Hide Tamper Zones</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 text-[#FF9933]" />
              <span>Show Tamper Zones</span>
            </>
          )}
        </button>
      </div>

      {/* Coordinate Readout Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-[#3A3D45] bg-[#1C1E22] px-3 py-1.5 font-mono text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-[#FF9933] font-bold">Coordinate HUD:</span>
          {hoveredOrSelected ? (
            <span className="text-white">
              Zone #{hoveredOrSelected.id} · x: <strong className="text-[#138808]">{hoveredOrSelected.x_pct}%</strong>, y: <strong className="text-[#138808]">{hoveredOrSelected.y_pct}%</strong>, w: {hoveredOrSelected.width_pct}%, h: {hoveredOrSelected.height_pct}%
            </span>
          ) : (
            <span>Hover zone to inspect coordinates</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">
          Projection: 1:1 Canonical
        </div>
      </div>

      {/* Document Image inside relative container */}
      <div className="relative w-full overflow-hidden border border-[#3A3D45] bg-[#151719] select-none">
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
                <div className="absolute -top-3 -left-1 flex items-center justify-center h-4 px-1 border border-rose-700 bg-rose-600 text-white font-mono text-[9px] font-bold">
                  #{a.id}
                </div>

                {/* Hover Tooltip */}
                <div
                  className={`absolute z-30 pointer-events-none whitespace-nowrap border border-[#3A3D45] bg-[#1C1E22] text-[#FAF7F0] font-mono text-[11px] px-2.5 py-1 transition-all duration-150 ${
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
          <div className="mt-3 border border-[#3A3D45] bg-[#1C1E22] p-3">
            <div className="font-mono text-[10px] font-bold text-[#A09D95] uppercase tracking-wider mb-2">
              Flagged Coordinates Matrix
            </div>
            <div className="space-y-1.5">
              {activeAnomalies.map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveAnomalyId(item.id)}
                  onMouseLeave={() => setActiveAnomalyId(null)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border font-mono text-xs transition-colors cursor-pointer ${
                    activeAnomalyId === item.id
                      ? "border-rose-500 bg-rose-950/30 text-white"
                      : "border-[#3A3D45] bg-[#26282D] text-slate-300 hover:border-[#FF9933]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="command-badge bg-rose-950/60 text-rose-300 border-rose-800/60 text-[10px]">
                      Zone #{item.id}
                    </span>
                    <span className="text-[11px] text-white">{item.reason}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    x: <strong className="text-[#FF9933]">{item.x_pct}%</strong> y: <strong className="text-[#FF9933]">{item.y_pct}%</strong> [w:{item.width_pct}% h:{item.height_pct}%]
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 border border-[#3A3D45] bg-[#1C1E22] p-3">
            <div className="flex items-center gap-2.5 p-2.5 border border-emerald-800/40 bg-emerald-950/20 text-emerald-300 font-mono text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>No tampering anomalies localized across 11 forensic inspection layers. Specimen geometry, font baselines, and raster compression are authentic.</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default AnomalyViewer;
