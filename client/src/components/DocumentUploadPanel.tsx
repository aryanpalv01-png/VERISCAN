import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FileCheck2,
  FileUp,
  LockKeyhole,
  RotateCcw,
  ScanSearch,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { DocumentKind, detectDocumentType, documentTypeLabels } from "@/lib/veriscan";

const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 10 * 1024 * 1024;

export function DocumentUploadPanel({
  onFile,
  compact = false,
  disabled = false,
}: {
  onFile: (file: File, documentType?: DocumentKind) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentKind>("other");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Clean up camera stream and preview object URL
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (stagedPreviewUrl && stagedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(stagedPreviewUrl);
      }
    };
  }, [cameraStream, stagedPreviewUrl]);

  const handleSelectFile = (file?: File) => {
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload a PDF, JPG, PNG, or WEBP document.");
      return;
    }
    if (file.size > maxFileSize) {
      setError("File exceeds 10 MB limit. Please select a smaller document.");
      return;
    }
    setError("");

    // Auto-detect document type
    const detectedType = detectDocumentType(file.name);
    setSelectedDocType(detectedType);

    // Create preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setStagedPreviewUrl(url);
    } else {
      setStagedPreviewUrl(null);
    }
    setStagedFile(file);
  };

  const handleCancelStaged = () => {
    if (stagedPreviewUrl && stagedPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleConfirmUpload = () => {
    if (!stagedFile) return;
    onFile(stagedFile, selectedDocType);
  };

  const startCamera = async () => {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera hardware is not accessible on this device or browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError(`Camera error: ${err?.message || "Permission was not granted."}`);
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture video frame.");
          return;
        }
        const file = new File([blob], `camera_scan_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopCamera();
        handleSelectFile(file);
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <div className={`upload-panel ${compact ? "upload-panel-compact" : ""}`}>
      {/* 1. Live Camera Viewfinder Modal/Inline Stage */}
      {isCameraActive ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-saffron/50 bg-[#0A192F] p-5 text-center shadow-xl">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-saffron">
              <Camera className="h-4 w-4 text-saffron" />
              <span>Align Document Inside Border</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-lg p-0 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mx-auto aspect-[1.45/1] max-w-[520px] overflow-hidden rounded-xl border border-white/20 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {/* Target Alignment Reticle */}
            <div className="pointer-events-none absolute inset-4 rounded-lg border border-white/40">
              <div className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-saffron" />
              <div className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-saffron" />
              <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-saffron" />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-saffron" />
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-[11px] font-medium text-white/90 drop-shadow">
              Hold camera steady in good lighting
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={capturePhoto}
              className="bg-saffron text-slate-950 hover:bg-saffron/90 font-bold text-xs h-10 px-6 shadow-sm"
            >
              <Camera className="mr-2 h-4 w-4" /> Capture Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              className="border-white/20 bg-white/5 text-white hover:bg-white/15 text-xs h-10"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : stagedFile ? (
        /* 2. Staged File Confirmation with Cancel Option */
        <div className="rounded-2xl p-4 sm:p-5 border border-slate-200/80 bg-white text-slate-900 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                STAGED
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {t("staged_payload")}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelStaged}
              className="text-rose-600 hover:bg-rose-50 text-xs h-8 px-2.5 rounded-lg"
            >
              <X className="mr-1 h-3.5 w-3.5" /> {t("discard")}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-[110px_1fr] items-center">
            {stagedPreviewUrl ? (
              <div className="aspect-[1.2/1] w-full max-w-[140px] sm:max-w-none mx-auto sm:mx-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <img
                  src={stagedPreviewUrl}
                  alt="Selected Document"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-[1.2/1] w-full max-w-[140px] sm:max-w-none mx-auto sm:mx-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500">
                <FileUp className="h-6 w-6 text-indigo-600" />
              </div>
            )}

            <div className="space-y-2 text-center sm:text-left">
              <p className="text-xs font-bold text-slate-900 truncate max-w-[320px] mx-auto sm:mx-0">
                {stagedFile.name}
              </p>
              <p className="text-[11px] text-slate-500">
                Size: {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB · Type: {stagedFile.type || "binary"}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-slate-600">Document Type:</span>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value as DocumentKind)}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.entries(documentTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2.5 w-full">
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={handleConfirmUpload}
                  className="w-full sm:w-auto h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 rounded-xl cursor-pointer shadow-xs"
                >
                  <ScanSearch className="mr-1.5 h-4 w-4" />
                  {disabled ? "Executing…" : t("execute_screening")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelStaged}
                  disabled={disabled}
                  className="w-full sm:w-auto h-9 border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold text-xs px-4 rounded-xl cursor-pointer"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("discard")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Default Upload Dropzone with Choose File & Camera Scan */
        <div
          className={`upload-dropzone rounded-2xl border-2 border-dashed border-indigo-200 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-500 transition-all ${
            isDragging ? "!border-indigo-600 !bg-indigo-50" : ""
          } ${disabled ? "pointer-events-none opacity-60" : ""}`}
          onDragEnter={(event) => {
            if (disabled) return;
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleSelectFile(event.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => handleSelectFile(event.target.files?.[0])}
          />
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-xs">
            <FileUp className="h-5 w-5" strokeWidth={2} />
          </div>

          <div className="max-w-md text-center mt-3 px-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {t("dropzone_title")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("dropzone_subtitle")}
            </p>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full max-w-sm sm:max-w-none mx-auto px-2">
            <Button
              type="button"
              disabled={disabled}
              className="w-full sm:w-auto h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 rounded-xl cursor-pointer shadow-xs"
              onClick={() => inputRef.current?.click()}
            >
              <ScanSearch className="mr-1.5 h-4 w-4" />
              {disabled ? "Ingesting…" : t("select_file")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="w-full sm:w-auto h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
              onClick={startCamera}
            >
              <Camera className="mr-1.5 h-4 w-4 text-indigo-600" />
              {t("optical_camera")}
            </Button>
          </div>

          <p className="mt-3 text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
            {t("upload_limits")}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="h-3 w-3 text-indigo-600" /> {t("client_enclave")}
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-emerald-600" /> {t("zero_disk")}
            </span>
          </div>

          {/* Forensic Benchmark Specimen Chips */}
          <div className="mt-4 border-t border-slate-200/80 pt-3 w-full text-center">
            <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold mb-2">
              {t("load_specimen")}:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                { id: "doc-aadhaar-valid", label: "Genuine Aadhaar", tone: "verified" },
                { id: "doc-aadhaar-forged", label: "Verhoeff Mismatch", tone: "forged" },
                { id: "doc-pan-forged", label: "Invalid PAN Format", tone: "forged" },
                { id: "doc-photoshop-spliced", label: "Spliced Marksheet", tone: "forged" },
              ].map((sample) => (
                <a
                  key={sample.id}
                  href={`/report/${sample.id}`}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    sample.tone === "verified"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {sample.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p
          className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium"
          role="alert"
        >
          Error: {error}
        </p>
      )}
    </div>
  );
}
