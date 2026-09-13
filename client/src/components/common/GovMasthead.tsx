import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/contexts/I18nContext";

interface GovMastheadProps {
  theme?: "dark" | "light";
  compact?: boolean;
}

export function GovMasthead({ compact = false }: GovMastheadProps) {
  const { t } = useI18n();

  return (
    <div className="w-full shrink-0 select-none">
      {/* Official 3px Indian Tricolor Ribbon */}
      <div className="tiranga-stripe" />

      {/* Official Masthead Text Bar */}
      <div className="px-3 sm:px-4 py-1.5 text-[11px] font-mono transition-colors bg-[#0a0a0c] text-[#D1CEC7] border-b border-white/10">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-2">
          {/* Left: National Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex items-center gap-1.5 font-bold tracking-tight text-[#FF9933] shrink-0">
              <span>🇮🇳</span>
              <span>भारत सरकार</span>
            </span>
            <span className="text-[#3A3D45] hidden sm:inline">|</span>
            <span className="font-semibold tracking-tight text-white hidden sm:inline truncate">
              {t("govt_of_india")}
            </span>
            {!compact && (
              <>
                <span className="hidden text-[#3A3D45] lg:inline">|</span>
                <span className="hidden text-slate-400 lg:inline text-[10.5px] truncate">
                  {t("meity")}
                </span>
              </>
            )}
          </div>

          {/* Right: Telemetry & Multilingual Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-[10.5px] shrink-0">
            <span className="hidden items-center gap-1 text-[#138808] font-semibold md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" /> {t("digital_india")}
            </span>
            <span className="text-[#3A3D45] hidden md:inline">|</span>
            <span className="command-badge bg-[#FF9933]/15 text-[#FFB057] border-[#FF9933]/40 font-bold hidden sm:inline-flex">
              {t("satyam_eva_jayate")}
            </span>
            <LanguageSwitcher compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );
}
