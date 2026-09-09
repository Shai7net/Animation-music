import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Layers } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RetroViz Studio Uncaught Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRecover = () => {
    // Clear potentially corrupted cached state
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected graphics or audio error occurred';

      return (
        <div className="h-screen w-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-6 select-none">
          <div className="max-w-lg w-full bg-[#121215] border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-950/40 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black tracking-tight text-white">
                מצב שחזור מערכת | Recovery Engine
              </h2>
              <p className="text-xs text-gray-400">
                זוהתה שגיאה גרפית או הפרעה במעבד. המערכת מנעה מסך לבן ושומרת על יציבות.
              </p>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-start font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto break-all">
              {errorMessage}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRecover}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>שחזר והפעל מחדש | Reload Studio</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Layers size={14} />
                <span>נסה להמשיך | Try Resume</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
