import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 max-w-lg mx-auto my-20 glass rounded-3xl border border-rose-500/20 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto opacity-80" />
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Something went wrong</h2>
          <p className="text-xs text-zinc-400 font-mono bg-black/40 p-3 rounded-xl overflow-x-auto text-left leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-primary hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <RefreshCw className="w-4 h-4" /> Reload Console
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
