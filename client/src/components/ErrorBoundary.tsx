import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[70vh] p-4 sm:p-8 bg-slate-50">
          <div className="flex flex-col items-center w-full max-w-lg p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              Specimen Ingestion or Rendering Recovery
            </h2>
            <p className="text-xs text-slate-500 mb-4 max-w-sm">
              An unexpected issue occurred while parsing this document or telemetry state. Your active command center and previous records remain safe.
            </p>

            {this.state.error?.message && (
              <div className="p-3 w-full rounded-xl bg-slate-50 border border-slate-200 text-left mb-5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Diagnostics</span>
                <p className="text-xs font-mono text-slate-700 truncate">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/dashboard";
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold",
                  "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs transition-colors"
                )}
              >
                <RotateCcw size={14} />
                Return to Command Center
              </button>

              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold",
                  "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                )}
              >
                Retry Operation
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
