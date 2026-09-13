import { ReactNode } from "react";

interface PageHeaderProps {
  categoryHindi?: string;
  categoryEnglish: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  accountBadge?: string;
}

export function PageHeader({
  categoryHindi,
  categoryEnglish,
  title,
  subtitle,
  actions,
  accountBadge,
}: PageHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              {categoryHindi ? `${categoryHindi} · ` : ""}
              {categoryEnglish}
            </span>
            {accountBadge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {accountBadge}
              </span>
            )}
          </div>

          <h1 className="mt-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>

          {subtitle && (
            <div className="mt-1 text-xs leading-relaxed text-slate-600">
              {subtitle}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center text-xs">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
