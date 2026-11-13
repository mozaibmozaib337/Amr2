import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="تثبيت المنصة كتطبيق على جهازك"
        className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-extrabold shadow-md shadow-cyan-600/25 transition-all cursor-pointer ${
          compact ? 'px-2.5' : 'px-3.5 py-2.5'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        {!compact && <span className="whitespace-nowrap">تثبيت التطبيق (PWA)</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        title="إضافة المنصة للشاشة الرئيسية كتطبيق"
        className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#060b18] border border-cyan-700/50 hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-all cursor-pointer ${
          compact ? 'px-2.5' : 'px-3.5 py-2.5'
        }`}
      >
        <Smartphone className="w-4 h-4 shrink-0 text-cyan-400" />
        {!compact && <span className="whitespace-nowrap">تثبيت على الهاتف كتطبيق</span>}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#091224] border border-cyan-700/50 p-6 shadow-2xl space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400 shrink-0" />
                <h3 className="text-base font-extrabold text-white">تثبيت منصة الكيمياء على هاتفك</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="إغلاق"
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p className="flex items-start gap-2">
                  <Share className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                  <span>1. اضغط على أيقونة <strong>المشاركة (Share)</strong> في شريط متصفح Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <PlusSquare className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                  <span>2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> ثم اضغط <strong>إضافة</strong>.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>1. افتح قائمة المتصفح (النقاط الثلاث ⋮ في Chrome أو Edge).</p>
                <p>2. اختر <strong>تثبيت التطبيق (Install App)</strong> أو <strong>الإضافة إلى الشاشة الرئيسية</strong> لتعمل المنصة كتطبيق مستقل.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold cursor-pointer transition-colors"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
