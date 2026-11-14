import React from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const LogoutConfirmModal: React.FC = () => {
  const { isLogoutConfirmOpen, setIsLogoutConfirmOpen, logout, currentUser } = usePlatform();

  if (!isLogoutConfirmOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
      onClick={() => setIsLogoutConfirmOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#0b1429] border border-cyan-800/50 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 id="logout-confirm-title" className="text-lg font-extrabold text-white">
                تأكيد تسجيل الخروج
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentUser ? `الحساب الحالي: ${currentUser.name}` : 'حماية من الضغط بالخطأ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(false)}
            aria-label="إغلاق النافذة"
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed bg-[#060b18] border border-slate-800 rounded-2xl p-4">
          هل أنت متأكد من رغبتك في تسجيل الخروج من المنصة؟ اضغط على{' '}
          <strong className="text-white">موافق</strong> للمتابعة أو{' '}
          <strong className="text-cyan-400">إلغاء</strong> للاستمرار داخل حسابك.
        </p>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(false)}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold cursor-pointer transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>موافق، تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
