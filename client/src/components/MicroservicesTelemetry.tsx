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
    <div className="terminal-panel p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3A3D45] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-[#3A3D45] bg-[#1C1E22] text-[#FF9933]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-bold text-[#FAF7F0]">
                Microservices Distributed Architecture Telemetry
              </h3>
              <span className="command-badge bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/40">
                LIVE MESH
              </span>
            </div>
            <p className="font-mono text-[10.5px] text-[#A09D95]">
              n8n Orchestration Layer · Fast, GPU & External API Inference Branches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#A09D95]">
          <span>TOPOLOGY STATUS:</span>
          <span className="command-badge bg-[#138808]/15 text-[#22C55E] border-[#138808]/40 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> ALL 9 NODES NOMINAL
          </span>
        </div>
      </div>

      {/* Interactive Microservices Architecture Grid / Diagram */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
        {nodes.map((node, index) => {
          const isPulsing = pulseIndex === index;
          const isSelected = selectedNode === node.id;

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(isSelected ? null : node.id)}
              className={`group relative border p-3 transition-all cursor-pointer ${
                isSelected
                  ? "border-[#FF9933] bg-[#FF9933]/10"
                  : isPulsing
                  ? "border-[#FF9933]/70 bg-[#1C1E22]"
                  : "border-[#3A3D45] bg-[#1C1E22] hover:border-[#FF9933]/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center border transition-colors ${
                      isPulsing || isSelected
                        ? "border-[#FF9933] bg-[#FF9933]/20 text-[#FAF7F0]"
                        : "border-[#3A3D45] bg-[#26282D] text-[#A09D95]"
                    }`}
                  >
                    {node.icon}
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] font-bold text-[#A09D95] uppercase">
                      {node.category}
                    </p>
                    <h4 className="font-mono text-xs font-bold text-[#FAF7F0] leading-tight">
                      {node.title}
                    </h4>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-[#FF9933] bg-[#26282D] px-1.5 py-0.5 border border-[#3A3D45]">
                  {node.latency}
                </span>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-[#A09D95] line-clamp-2">
                {node.desc}
              </p>

              {/* Data packet flow indicator */}
              <div className="mt-2.5 flex items-center justify-between border-t border-[#3A3D45] pt-1.5 font-mono text-[10px]">
                <span className="flex items-center gap-1.5 text-[#A09D95]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isPulsing ? "bg-[#FF9933] animate-pulse" : "bg-[#138808]"
                    }`}
                  />
                  {node.status.toUpperCase()}
                </span>
                <span className="text-[10px] text-[#FF9933] font-semibold group-hover:underline">
                  Inspect
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Expanded Detail Drawer */}
      {selectedNode && (
        <div className="mt-3 border border-[#FF9933] bg-[#1C1E22] p-3.5 text-xs">
          {(() => {
            const active = nodes.find((n) => n.id === selectedNode)!;
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#FAF7F0] text-xs">{active.title}</span>
                    <span className="bg-[#26282D] text-[#FF9933] px-2 py-0.5 border border-[#3A3D45] text-[10px]">
                      {active.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[#A09D95] font-sans text-xs">{active.desc}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="self-end sm:self-center text-[#A09D95] hover:text-[#FAF7F0] font-bold text-xs"
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
