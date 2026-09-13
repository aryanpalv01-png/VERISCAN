import { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  Database,
  ExternalLink,
  FastForward,
  Globe,
  Radio,
  Server,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Workflow
} from "lucide-react";

interface MicroservicesTelemetryProps {
  currentStageIndex?: number;
  documentScore?: number;
  compact?: boolean;
}

export function MicroservicesTelemetry({
  currentStageIndex = 6,
  documentScore = 94,
  compact = false,
}: MicroservicesTelemetryProps) {
  const [pulseIndex, setPulseIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % 9);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const nodes = [
    {
      id: "client",
      title: "1. Client App",
      category: "Frontend",
      status: "online",
      latency: "12ms",
      desc: "Drag-and-drop secure upload with client-side file preflight validation.",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      id: "storage",
      title: "2. Supabase Storage",
      category: "Private Bucket",
      status: "online",
      latency: "45ms",
      desc: "Stores document binary encrypted with Row-Level Security reference.",
      icon: <Database className="h-4 w-4" />,
    },
    {
      id: "webhook",
      title: "3. Supabase Webhook",
      category: "Event Trigger",
      status: "active",
      latency: "18ms",
      desc: "Fires secure HTTP POST event notification on INSERT into public.documents.",
      icon: <Radio className="h-4 w-4" />,
    },
    {
      id: "dispatcher",
      title: "4. Flow Dispatcher (n8n)",
      category: "Orchestration Layer",
      status: "active",
      latency: "22ms",
      desc: "Downloads document bytes and fans out parallel execution across 3 processing branches.",
      icon: <Workflow className="h-4 w-4" />,
    },
    {
      id: "fast_service",
      title: "5. Fast Check Service",
      category: "Fast Branch",
      status: "online",
      latency: "68ms",
      desc: "Pure-logic & CV modules: Verhoeff checksum, QR signature, EXIF, ELA, typography, clone, screenshot, subpixel.",
      icon: <FastForward className="h-4 w-4" />,
    },
    {
      id: "gpu_models",
      title: "6. GPU AI Models",
      category: "GPU Branch",
      status: "online",
      latency: "180ms",
      desc: "Self-hosted deep-learning inference: TruFor tampering localization & CAT-Net DCT compression.",
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      id: "hf_api",
      title: "7. External AI API",
      category: "API Branch",
      status: "online",
      latency: "140ms",
      desc: "Hugging Face inference: Organika/sdxl-detector synthetic image probability.",
      icon: <Server className="h-4 w-4" />,
    },
    {
      id: "fusion",
      title: "8. Score Fusion Engine",
      category: "Consolidation",
      status: "active",
      latency: "8ms",
      desc: "Weighted Bayesian evidence synthesis with deterministic hard-fail overrides.",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: "db",
      title: "9. Supabase DB",
      category: "Postgres Realtime",
      status: "synced",
      latency: "24ms",
      desc: "Persists final confidence score and emits Realtime Sync back to Client App.",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs text-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-xs">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Distributed Architecture Telemetry
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                LIVE MESH
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Multi-Branch Orchestration Layer · Fast, GPU & External Verification Pipelines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>STATUS:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> ALL 9 NODES NOMINAL
          </span>
        </div>
      </div>

      {/* Interactive Microservices Architecture Grid */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
        {nodes.map((node, index) => {
          const isPulsing = pulseIndex === index;
          const isSelected = selectedNode === node.id;

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(isSelected ? null : node.id)}
              className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                  : isPulsing
                  ? "border-indigo-300 bg-indigo-50/20"
                  : "border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                      isPulsing || isSelected
                        ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {node.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {node.category}
                    </p>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {node.title}
                    </h4>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                  {node.latency}
                </span>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                {node.desc}
              </p>

              {/* Data packet flow indicator */}
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10.5px]">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isPulsing ? "bg-indigo-600 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {node.status.toUpperCase()}
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline">
                  Inspect
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Expanded Detail Drawer */}
      {selectedNode && (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-xs">
          {(() => {
            const active = nodes.find((n) => n.id === selectedNode)!;
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{active.title}</span>
                    <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px] font-semibold">
                      {active.category}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600 text-xs">{active.desc}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="self-end sm:self-center text-slate-500 hover:text-slate-900 font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
