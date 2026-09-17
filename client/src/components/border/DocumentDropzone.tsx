import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  FileCheck,
  Shield,
} from "lucide-react";

interface DocumentDropzoneProps {
  documentType: string;
  onDocumentTypeChange: (type: string) => void;
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  selectedFile: File | null;
  specimenPreviewUrl: string | null;
  onClear: () => void;
}

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  documentType,
  onDocumentTypeChange,
  onFileSelect,
  isProcessing,
  selectedFile,
  specimenPreviewUrl,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypes = [
    { id: "Auto-Detect", label: "AUTO-DETECT", spec: "Smart Classifier" },
    { id: "Passport", label: "PASSPORT", spec: "ICAO TD3" },
    { id: "National ID", label: "NATIONAL ID / AADHAAR", spec: "UIDAI / ICAO TD1" },
    { id: "Driving License", label: "DRIVING LICENSE", spec: "ISO 18013 / DL" },
    { id: "PAN Card", label: "PAN CARD", spec: "Income Tax / NSDL" },
    { id: "Voter ID", label: "VOTER ID", spec: "Election Commission / EPIC" },
    { id: "Visa", label: "VISA", spec: "ICAO TD2" },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover" || e.type === "dragenter") {
      setIsDragOver(true);
    } else if (e.type === "dragleave") {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Document Format Selector */}
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap gap-1.5">
        {docTypes.map((dt) => (
          <button
            key={dt.id}
            type="button"
            onClick={() => onDocumentTypeChange(dt.id)}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg font-mono text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
              documentType === dt.id
                ? "bg-white text-blue-700 font-bold shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>{dt.label}</span>
            <span
              className={`text-[10px] ${
                documentType === dt.id ? "text-blue-600 font-medium" : "text-slate-400"
              }`}
            >
              {dt.spec}
            </span>
          </button>
        ))}
      </div>

      {/* 2. Real Optical Specimen Ingest Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative min-h-[300px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-white ${
          isDragOver
            ? "border-blue-500 bg-blue-50/40 shadow-sm"
            : "border-slate-300 hover:border-blue-400 shadow-xs"
        }`}
      >
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px]">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
              EXECUTING REAL-TIME OPENCV & OCR SCREENING...
            </span>
            <span className="font-mono text-[11px] text-slate-500 mt-1">
              Analyzing Compression Artifacts, MRZ Integrity, and Laplacian Sharpness
            </span>
          </div>
        )}

        {specimenPreviewUrl ? (
          <div className="relative w-full h-full flex flex-col items-center">
            <div className="relative max-h-[300px] overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50 p-1">
              <img
                src={specimenPreviewUrl}
                alt="Active Document Specimen"
                className="max-h-[290px] w-auto object-contain rounded-lg block"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md font-medium truncate max-w-sm flex items-center space-x-1.5">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{selectedFile?.name || "Uploaded Document"}</span>
                <span className="text-slate-400">
                  ({selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ""})
                </span>
              </span>

              <button
                type="button"
                onClick={onClear}
                disabled={isProcessing}
                className="text-xs font-mono text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-1 rounded-md font-medium cursor-pointer transition-colors flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Replace File</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 py-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Upload Identity Credential for Live Verification
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1 max-w-md">
                Drag and drop your Passport, National ID / Aadhaar, Driving License, PAN Card, Voter ID, or Visa (JPEG, PNG, WEBP, PDF), or click to browse
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onFileSelect(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs px-6 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>SELECT CREDENTIAL FILE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
