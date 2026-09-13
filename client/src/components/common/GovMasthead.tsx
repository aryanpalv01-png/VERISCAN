import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/contexts/I18nContext";

interface GovMastheadProps {
  theme?: "dark" | "light";
  compact?: boolean;
}

export function GovMasthead({ compact = false, theme = "light" }: GovMastheadProps) {
  const { t } = useI18n();
  const isLight = theme === "light";

  return (
    <div className="w-full shrink-0 select-none">
      {/* Official 3px Indian Tricolor Ribbon */}
      <div className="tiranga-stripe" />

      {/* Official Masthead Text Bar */}
      <div className="px-3 sm:px-4 py-1.5 text-[11px] transition-colors bg-white text-slate-600 border-b border-slate-200/80">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-2 font-medium">
          {/* Left: National Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex items-center gap-1.5 font-bold tracking-tight text-amber-600 shrink-0">
              <span>🇮🇳</span>
              <span>भारत सरकार</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="font-semibold tracking-tight hidden sm:inline truncate text-slate-900">
              {t("govt_of_india")}
            </span>
            {!compact && (
              <>
                <span className="text-slate-300 hidden lg:inline">|</span>
                <span className="hidden text-slate-500 lg:inline text-[10.5px] truncate">
                  {t("meity")}
                </span>
              </>
            )}
          </div>

          {/* Right: Telemetry & Multilingual Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-[10.5px] shrink-0">
            <span className="hidden items-center gap-1 text-emerald-600 font-semibold md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("digital_india")}
            </span>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-bold text-[10px] hidden sm:inline-flex">
              {t("satyam_eva_jayate")}
            </span>
            <LanguageSwitcher compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );
}
