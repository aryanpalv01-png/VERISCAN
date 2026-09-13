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

const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 10 * 1024 * 1024;

export function DocumentUploadPanel({
  onFile,
  compact = false,
  disabled = false,
}: {
  onFile: (file: File) => void;
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
    onFile(stagedFile);
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
        <div className="terminal-panel p-4 sm:p-5 border border-white/10 bg-[#101014] text-[#FAF7F0]">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="command-badge border-emerald-500/40 bg-emerald-950/40 text-emerald-400 font-bold text-[10px]">
                STAGED
              </span>
              <span className="font-mono text-xs font-semibold text-slate-300">
                {t("staged_payload")}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelStaged}
              className="text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 text-xs font-mono h-8 px-2.5"
            >
              <X className="mr-1 h-3.5 w-3.5" /> {t("discard")}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-[110px_1fr] items-center">
            {stagedPreviewUrl ? (
              <div className="aspect-[1.2/1] w-full max-w-[140px] sm:max-w-none mx-auto sm:mx-0 overflow-hidden border border-white/10 bg-[#0a0a0c] flex items-center justify-center">
                <img
                  src={stagedPreviewUrl}
                  alt="Selected Document"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-[1.2/1] w-full max-w-[140px] sm:max-w-none mx-auto sm:mx-0 border border-white/10 bg-[#0a0a0c] flex items-center justify-center text-slate-500">
                <FileUp className="h-6 w-6 text-[#FF9933]" />
              </div>
            )}

            <div className="space-y-2 text-center sm:text-left">
              <p className="font-mono text-xs font-bold text-white truncate max-w-[320px] mx-auto sm:mx-0">
                {stagedFile.name}
              </p>
              <p className="font-mono text-[11px] text-slate-400">
                Payload: {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB · Type: {stagedFile.type || "binary"}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2.5 w-full">
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={handleConfirmUpload}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] bg-[#FF9933] hover:bg-[#E68524] text-slate-950 font-mono font-bold text-xs px-5 rounded-xs cursor-pointer shadow-xs"
                >
                  <ScanSearch className="mr-1.5 h-4 w-4" />
                  {disabled ? "Executing…" : t("execute_screening")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelStaged}
                  disabled={disabled}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] border-white/10 bg-[#121217] text-slate-400 hover:text-white font-mono text-xs px-4 rounded-xs cursor-pointer"
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
          className={`upload-dropzone border border-white/10 bg-[#101014] ${isDragging ? "!border-[#FF9933] !bg-[#17171f]" : ""} ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
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
          <div className="flex h-10 w-10 items-center justify-center border border-[#FF9933] bg-[#181A1D] text-[#FF9933]">
            <FileUp className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <div className="max-w-md text-center mt-3 px-2">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight">
              {t("dropzone_title")}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-400 leading-relaxed">
              {t("dropzone_subtitle")}
            </p>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full max-w-sm sm:max-w-none mx-auto px-2">
            <Button
              type="button"
              disabled={disabled}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] bg-[#FF9933] hover:bg-[#E68524] text-slate-950 font-mono font-bold text-xs px-5 rounded-xs cursor-pointer shadow-xs"
              onClick={() => inputRef.current?.click()}
            >
              <ScanSearch className="mr-1.5 h-4 w-4" />
              {disabled ? "Ingesting…" : t("select_file")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] border-white/10 bg-[#121217] text-slate-300 hover:border-[#FF9933] hover:text-[#FF9933] font-mono text-xs px-4 rounded-xs transition-colors cursor-pointer"
              onClick={startCamera}
            >
              <Camera className="mr-1.5 h-4 w-4 text-[#FF9933]" />
              {t("optical_camera")}
            </Button>
          </div>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-normal text-[#737380]">
            {t("upload_limits")}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="h-3 w-3 text-[#FF9933]" /> {t("client_enclave")}
            </span>
            <span className="text-white/10">|</span>
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-emerald-400" /> {t("zero_disk")}
            </span>
          </div>

          {/* Forensic Benchmark Specimen Chips */}
          <div className="mt-4 border-t border-white/10 pt-3 w-full text-center">
            <p className="font-mono text-[10px] uppercase tracking-normal text-[#737380] mb-2">
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
                  className={`font-mono text-[10.5px] px-2.5 py-1 min-h-[30px] flex items-center border rounded-xs transition-all ${
                    sample.tone === "verified"
                      ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40"
                      : "border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/40"
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
          className="mt-2 border border-rose-900/60 bg-rose-950/40 px-3 py-2 font-mono text-xs text-rose-400"
          role="alert"
        >
          Error: {error}
        </p>
      )}
    </div>
  );
}
