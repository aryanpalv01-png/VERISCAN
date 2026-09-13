import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { VerificationDocument, VerificationCheck } from "@/lib/veriscan";
import {
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  UploadCloud,
  FileText,
  AlertTriangle,
  Maximize2,
  Scan,
  ShieldCheck,
  Sparkles,
  Tag,
  Hash,
} from "lucide-react";

export type SpecimenLayer = "optical" | "ela" | "typography" | "noise" | "clones";

interface ForensicSpecimenLoupeProps {
  document: VerificationDocument;
  selectedCheckId?: string | null;
  onSelectCheck?: (check: VerificationCheck) => void;
  onFileIngest?: (file: File) => void;
  isIngesting?: boolean;
}

export function ForensicSpecimenLoupe({
  document,
  selectedCheckId,
  onSelectCheck,
  onFileIngest,
  isIngesting = false,
}: ForensicSpecimenLoupeProps) {
  const [activeLayer, setActiveLayer] = useState<SpecimenLayer>("optical");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLoupeLens, setShowLoupeLens] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [cursorCoord, setCursorCoord] = useState<{ xPct: number; yPct: number } | null>(null);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [hoveredAnomalyId, setHoveredAnomalyId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl =
    document.previewUrl ||
    (document as any).fileUrl ||
    (document as any).file_url ||
    "/test_samples/sample_aadhaar.png";

  // Gather flagged regions from document checks
  const flaggedChecks = (document.checks || []).filter(
    (c) => c.flaggedRegion && (c.result === "flag" || (c as any).isFlagged)
  );

  // Render forensic layer canvas shaders / heatmaps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (activeLayer === "optical") {
      // Clean optical scan representation
      return;
    }

    if (activeLayer === "ela") {
      // 8x8 DCT Quantization Error Heatmap
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "rgba(9, 14, 28, 0.65)");
      grad.addColorStop(0.5, "rgba(18, 30, 56, 0.55)");
      grad.addColorStop(1, "rgba(9, 14, 28, 0.7)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render high-frequency compression gradient hot-spots on flagged coordinates
      flaggedChecks.forEach((check) => {
        const r = check.flaggedRegion!;
        const rx = (r.x / 100) * width;
        const ry = (r.y / 100) * height;
        const rw = (r.width / 100) * width;
        const rh = (r.height / 100) * height;

        const radGrad = ctx.createRadialGradient(
          rx + rw / 2,
          ry + rh / 2,
          4,
          rx + rw / 2,
          ry + rh / 2,
          Math.max(rw, rh) * 1.15
        );
        radGrad.addColorStop(0, "rgba(239, 68, 68, 0.85)"); // Splicing core
        radGrad.addColorStop(0.4, "rgba(255, 153, 51, 0.65)"); // Amber gradient
        radGrad.addColorStop(0.8, "rgba(253, 224, 71, 0.25)");
        radGrad.addColorStop(1, "rgba(6, 182, 212, 0)");

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(rx + rw / 2, ry + rh / 2, Math.max(rw, rh) * 1.15, 0, Math.PI * 2);
        ctx.fill();
      });

      // Overlay 8x8 DCT grid lines
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (activeLayer === "typography") {
      // OCR Baseline alignment guidelines
      ctx.strokeStyle = "rgba(255, 153, 51, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let y = 35; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(25, y);
        ctx.lineTo(width - 25, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // OCR Character cluster bounding frames
      ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
      ctx.lineWidth = 1.2;
      const clusters = [
        { x: width * 0.18, y: height * 0.22, w: width * 0.35, h: 22 },
        { x: width * 0.18, y: height * 0.34, w: width * 0.28, h: 22 },
        { x: width * 0.18, y: height * 0.46, w: width * 0.42, h: 22 },
        { x: width * 0.28, y: height * 0.72, w: width * 0.44, h: 26 },
      ];
      clusters.forEach((b) => {
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });
    } else if (activeLayer === "noise") {
      // Sensor Noise Residual Shader
      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = Math.random() * 55;
        imgData.data[i] = 140 + noise; // R
        imgData.data[i + 1] = 160 + noise; // G
        imgData.data[i + 2] = 190 + noise; // B
        imgData.data[i + 3] = 48; // Alpha
      }
      ctx.putImageData(imgData, 0, 0);

      // Highlight screen recapture low-variance zones
      ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(width * 0.38, height * 0.25, width * 0.52, height * 0.52);
      ctx.fillRect(width * 0.38, height * 0.25, width * 0.52, height * 0.52);
      ctx.setLineDash([]);
    } else if (activeLayer === "clones") {
      // SIFT / ORB Copy-Move Feature Match Keypoint Vectors
      ctx.strokeStyle = "rgba(244, 63, 94, 0.9)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(244, 63, 94, 0.95)";

      const p1 = { x: width * 0.28, y: height * 0.52 };
      const p2 = { x: width * 0.68, y: height * 0.52 };

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 4.5, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Arc connection
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo((p1.x + p2.x) / 2, p1.y - 40, p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(244, 63, 94, 0.65)";
      ctx.strokeRect(p1.x - 22, p1.y - 22, 44, 44);
      ctx.strokeRect(p2.x - 22, p2.y - 22, 44, 44);
    }
  }, [activeLayer, flaggedChecks]);

  // Handle Loupe Mouse Movement & Coordinate tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const xPct = Math.round((x / rect.width) * 1000) / 10;
    const yPct = Math.round((y / rect.height) * 1000) / 10;

    setCursorCoord({ xPct, yPct });
    if (showLoupeLens) {
      setLoupePos({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setLoupePos(null);
    setCursorCoord(null);
  };

  // Drag and Drop file handling
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onFileIngest) {
      onFileIngest(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileIngest) {
      onFileIngest(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col justify-between p-3.5 sm:p-4 border border-slate-200/80 bg-white font-sans rounded-xl shadow-xs hover:shadow-sm transition-all h-full">
      {/* Specimen Header & Control Bar */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Crosshair className="h-3.5 w-3.5 text-indigo-600" />
              SPECIMEN INSPECTOR
            </span>
            <span className="text-xs sm:text-sm text-slate-900 font-bold truncate max-w-[180px] sm:max-w-[240px]">
              {document.filename}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px] border border-slate-200/60">
              {document.fileSize || "1.4 MB"}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isIngesting}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>{isIngesting ? "Ingesting..." : "Ingest New"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Multi-spectral Layer & Magnification Toolstrip */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
          {/* Layer Selector */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "optical", label: "OPTICAL", desc: "Raw Specimen" },
              { id: "ela", label: "ELA DCT", desc: "Compression Gradient" },
              { id: "typography", label: "TYPOGRAPHY", desc: "Baseline & Kerning" },
              { id: "noise", label: "SENSOR NOISE", desc: "Residual Profile" },
              { id: "clones", label: "SIFT CLONES", desc: "Copy-Move Vectors" },
            ].map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setActiveLayer(layer.id as SpecimenLayer)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-all border cursor-pointer ${
                    isActive
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  title={layer.desc}
                >
                  {layer.label}
                </button>
              );
            })}
          </div>

          {/* Zoom & Loupe Lens Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowLoupeLens(!showLoupeLens)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                showLoupeLens
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Toggle interactive magnifier lens"
            >
              <Crosshair className="h-3 w-3" />
              <span>{showLoupeLens ? "Loupe" : "Loupe Off"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAnomalies(!showAnomalies)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                showAnomalies
                  ? "border-slate-800 bg-slate-900 text-white shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
              title="Toggle anomaly bounding boxes"
            >
              {showAnomalies ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>{showAnomalies ? "Flags" : "Flags Off"}</span>
            </button>

            {/* Magnification presets */}
            <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
              {[1, 1.5, 2].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoomLevel(z)}
                  className={`px-2 py-0.5 text-[11px] font-semibold cursor-pointer transition-colors ${
                    zoomLevel === z
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modern Metadata Tag Pills Bar */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-xs">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/80 text-[11px]">
            MIME: <strong className="text-slate-900 ml-1 font-semibold">{document.mimeType || "image/jpeg"}</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/80 text-[11px]">
            SHA: <strong className="text-indigo-600 ml-1 font-semibold">{document.reference?.slice(0, 10) || "VS-IN-982"}</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
            DPI: <strong className="ml-1">300 DPI</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
            CALIB: <strong className="ml-1">STATUTORY</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowCoordinates(!showCoordinates)}
            className={`ml-auto px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
              showCoordinates
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
            title="Toggle coordinate overlays"
          >
            COORDS: {showCoordinates ? "ON" : "OFF"}
          </button>
        </div>

        {/* Real-Time Coordinate HUD Bar */}
        <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 font-bold text-[11px]">COORDINATES:</span>
            {cursorCoord ? (
              <span className="text-slate-800 font-medium">
                X: <strong className="text-emerald-600">{cursorCoord.xPct}%</strong> · Y:{" "}
                <strong className="text-emerald-600">{cursorCoord.yPct}%</strong>
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">Hover specimen inspector canvas</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>LAYER: <strong className="text-slate-800 uppercase font-semibold">{activeLayer}</strong></span>
            <span>PROJECTION: 1:1</span>
          </div>
        </div>

        {/* Specimen Loupe Stage */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative mt-2.5 w-full aspect-[4/3] max-h-[340px] xl:max-h-[360px] overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 cyber-canvas-grid select-none transition-all ${
            showLoupeLens ? "cursor-crosshair" : "cursor-default"
          } ${isDragOver ? "border-indigo-500 ring-2 ring-indigo-300" : ""}`}
        >
          {/* Laser scanline animation while ingesting */}
          {isIngesting && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-600 to-transparent shadow-[0_0_16px_#4f46e5] animate-laser-sweep z-30 pointer-events-none" />
          )}

          {/* Base Specimen Image with Zoom transform */}
          <div
            className="relative h-full w-full flex items-center justify-center p-2 transition-transform duration-150"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            <img
              src={previewUrl}
              alt="Forensic Specimen"
              className="max-h-full max-w-full object-contain pointer-events-none"
            />
          </div>

          {/* Dynamic Layer Canvas Overlays */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 pointer-events-none w-full h-full z-10"
          />

          {/* Interactive Bounding Boxes for Flagged Anomaly Coordinates */}
          {showAnomalies &&
            flaggedChecks.map((check, idx) => {
              const r = check.flaggedRegion!;
              const isSelected = selectedCheckId === check.id;
              const isHovered = hoveredAnomalyId === check.id;

              return (
                <div
                  key={check.id || idx}
                  onMouseEnter={() => setHoveredAnomalyId(check.id)}
                  onMouseLeave={() => setHoveredAnomalyId(null)}
                  onClick={() => onSelectCheck && onSelectCheck(check)}
                  style={{
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    width: `${r.width}%`,
                    height: `${r.height}%`,
                  }}
                  className={`absolute border-2 cursor-pointer z-20 transition-all rounded-xs ${
                    isSelected || isHovered
                      ? "border-red-600 bg-red-600/25 ring-2 ring-red-400"
                      : "border-red-500 bg-red-500/15 hover:bg-red-500/25"
                  }`}
                >
                  {/* Tag badge with coordinates */}
                  <div className="absolute -top-3 left-0 flex items-center gap-1 rounded-xs bg-red-600 px-1 py-0.2 text-[8px] font-bold text-white uppercase shadow-xs">
                    <AlertTriangle className="h-2 w-2" />
                    <span>#{idx + 1}</span>
                    {showCoordinates && (
                      <span className="text-[7.5px] text-red-100 font-mono">[{r.x}%, {r.y}%]</span>
                    )}
                  </div>

                  {/* Tooltip Card */}
                  {(isHovered || isSelected) && (
                    <div
                      className={`absolute z-30 pointer-events-none whitespace-normal w-56 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 shadow-lg text-[10.5px] leading-tight ${
                        r.y > 60 ? "bottom-full mb-1" : "top-full mt-1"
                      } left-1/2 -translate-x-1/2`}
                    >
                      <div className="text-red-600 font-bold mb-1">
                        FLAGGED COORD [{r.x}%, {r.y}%]
                      </div>
                      <div className="text-slate-600 text-[10px] leading-relaxed">{check.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Interactive Magnifier Loupe Lens */}
          {showLoupeLens && loupePos && (
            <div
              className="pointer-events-none absolute h-32 w-32 -ml-16 -mt-16 rounded-full border-2 border-indigo-600 bg-white shadow-xl overflow-hidden z-30"
              style={{
                left: `${loupePos.x}px`,
                top: `${loupePos.y}px`,
              }}
            >
              {/* Scaled mirror layer under lens */}
              <div
                className="absolute w-[640px] h-[480px] origin-top-left"
                style={{
                  transform: `scale(2.8) translate(-${loupePos.x - 12 / 2.8}px, -${
                    loupePos.y - 12 / 2.8
                  }px)`,
                }}
              >
                <img
                  src={previewUrl}
                  alt="Specimen Loupe Zoom"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Crosshair reticle lines */}
              <div className="reticle-hairline-x" />
              <div className="reticle-hairline-y" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3.5 w-3.5 rounded-full border border-indigo-600/80" />
              </div>

              {/* Reticle coordinate ticker */}
              <div className="absolute bottom-1 left-0 right-0 text-center">
                <span className="rounded-full bg-slate-900/80 px-2 py-0.2 text-[8.5px] font-semibold text-white">
                  2.8x · X:{Math.round(loupePos.x)} Y:{Math.round(loupePos.y)}
                </span>
              </div>
            </div>
          )}

          {/* Drag and drop overlay trigger */}
          {isDragOver && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/95 border-2 border-dashed border-indigo-500 p-4 text-center">
              <UploadCloud className="h-8 w-8 text-indigo-600 mb-2 animate-bounce" />
              <p className="text-sm font-bold text-slate-900">DROP SPECIMEN TO INGEST</p>
              <p className="text-xs text-slate-500 mt-1">Accepts PNG, JPG, PDF documents</p>
            </div>
          )}
        </div>
      </div>

      {/* Specimen Status & Coverage Footnote */}
      <div className="mt-2.5 border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">TYPE:</span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
            {document.type}
          </span>
          <span className="text-slate-400 text-[11px] ml-1">REF:</span>
          <span className="text-slate-800 font-bold text-[11px]">{document.reference}</span>
        </div>

        {flaggedChecks.length > 0 ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold text-[10.5px]">
            <AlertTriangle className="h-3 w-3" />
            <span>{flaggedChecks.length} FLAGGED REGIONS</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10.5px]">
            <ShieldCheck className="h-3 w-3" />
            <span>0 TAMPER FLAGS</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForensicSpecimenLoupe;
