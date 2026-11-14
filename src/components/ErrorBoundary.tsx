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
    console.error('[ErrorBoundary caught error]:', error.message, error.stack, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div className="min-h-dvh bg-[#050811] text-slate-100 flex items-center justify-center p-4">
          <div className="bg-[#0b1429] border border-cyan-800/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            
            <h2 className="text-lg font-bold text-white">منصة الأستاذ عمرو السيد في الكيمياء</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              حدث تنبيه في الاتصال أو واجهة المنصة. تفاصيل الخطأ موضحة بالأسفل لتسهيل المتابعة:
            </p>

            {err && (
              <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-left font-mono text-[11px] text-red-300 max-h-36 overflow-auto dir-ltr">
                <p className="font-bold text-red-200 break-words">{err.name}: {err.message}</p>
                {err.stack && (
                  <p className="text-[10px] text-slate-400 mt-1 whitespace-pre-wrap line-clamp-3">
                    {err.stack.split('\n').slice(0, 4).join('\n')}
                  </p>
                )}
              </div>
            )}

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
