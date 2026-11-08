import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-4">
          <div className="bg-[#0b1429] border border-cyan-800/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            
            <h2 className="text-lg font-bold text-white">منصة مستر عمرو السيد في الكيمياء</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              حدث تحديث في الجلسة أو اتصال المنصة. اضغط أدناه للاستمرار بشكل طبيعي.
            </p>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تشغيل المنصة ⚡</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
