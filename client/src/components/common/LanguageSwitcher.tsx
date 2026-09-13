import { useI18n, Language } from "@/contexts/I18nContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();

  const options: { code: Language; label: string; short: string }[] = [
    { code: "en", label: "English", short: "EN" },
    { code: "hi", label: "हिन्दी", short: "हिं" },
    { code: "mr", label: "मराठी", short: "मरा" },
  ];

  return (
    <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 font-sans text-[11px] select-none shadow-xs overflow-hidden">
      <div className="flex items-center px-1.5 py-0.5 text-indigo-600 border-r border-slate-200">
        <Globe className="h-3 w-3" />
      </div>
      <div className="flex items-center divide-x divide-slate-200">
        {options.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`px-2 py-0.5 transition-colors cursor-pointer font-medium ${
                isActive
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title={opt.label}
              aria-label={`Switch language to ${opt.label}`}
            >
              {compact ? opt.short : opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageSwitcher;
