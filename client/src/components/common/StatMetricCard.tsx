import { ReactNode } from "react";

interface StatMetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  note: string;
  accent?: "saffron" | "green" | "review" | "navy" | "crimson";
  trend?: {
    text: string;
    positive?: boolean;
  };
}

export function StatMetricCard({
  icon,
  label,
  value,
  note,
  accent = "saffron",
  trend,
}: StatMetricCardProps) {
  const accentStyles = {
    saffron: {
      border: "border-indigo-200",
      bg: "bg-indigo-50",
      text: "text-indigo-600",
    },
    green: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    review: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    navy: {
      border: "border-slate-200",
      bg: "bg-slate-50",
      text: "text-slate-600",
    },
    crimson: {
      border: "border-rose-200",
      bg: "bg-rose-50",
      text: "text-rose-600",
    },
  }[accent];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${accentStyles.border} ${accentStyles.bg} ${accentStyles.text}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
          <p className="truncate text-slate-500 font-medium">{note}</p>
          {trend && (
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                trend.positive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
