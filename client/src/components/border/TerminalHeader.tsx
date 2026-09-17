import React, { useEffect, useState } from "react";
import { Shield, Radio, Clock, UserCheck, Activity, Building2 } from "lucide-react";

interface TerminalHeaderProps {
  stationId?: string;
  officerId?: string;
  backendOnline?: boolean;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  stationId = "CP-DEL-04",
  officerId = "OFFICER-7749",
  backendOnline = true,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-GB", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding & Station Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                VERISCAN DEFENSE OS
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-medium">
                ICAO DOC 9303 COMPLIANT
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Border Checkpoint & Document Screening Terminal
            </h1>
          </div>
        </div>

        {/* Operational Telemetry Indicators */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Station Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-medium">STATION:</span>
            <span className="font-bold text-slate-900">{stationId}</span>
          </div>

          {/* Officer ID */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-400 font-medium">OPERATOR:</span>
            <span className="font-bold text-slate-900">{officerId}</span>
          </div>

          {/* Engine Status */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium ${
              backendOnline
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="font-bold">
              {backendOnline ? "ENGINE READY" : "OFFLINE"}
            </span>
          </div>

          {/* Live UTC Clock */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold tabular-nums text-slate-900">
              {timeStr || "--:--:--"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
