import React, { useEffect, useState } from 'react';
import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const BANNER_DISMISSED_KEY = 'amr_pwa_install_banner_dismissed_v1';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isInstalled) {
      setIsDismissed(true);
      return;
    }
    try {
      const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }
  }, [isInstalled]);

  if (isInstalled || isDismissed) {
    return null;
  }

  // Show banner when native beforeinstallprompt is ready OR on iOS Safari (first visit)
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage error
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    const accepted = await install();
    if (accepted) {
      handleDismiss();
    }
  };

  return (
    <>
      <div
        data-keep-dark="true"
        className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:end-4 sm:max-w-md z-[80] rounded-2xl bg-[#092e4a]/95 backdrop-blur-md border border-cyan-400/50 shadow-2xl p-3.5 text-white animate-splash-in"
        style={{
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="تطبيق المنصة"
              className="w-11 h-11 rounded-xl object-cover border border-cyan-300/60 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                تثبيت منصة مستر عمرو السيد
              </p>
              <p className="text-[11px] text-cyan-200 truncate">
                {isIOS
                  ? 'أضف المنصة للشاشة الرئيسية كتطبيق مستقل'
                  : 'افتح المنصة مباشرة من الشاشة الرئيسية بدون متصفح'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>تثبيت التطبيق</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="إغلاق لافتة التثبيت"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSInstructions && (
        <div
          data-keep-dark="true"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#092e4a] border border-cyan-400/50 p-6 shadow-2xl space-y-4 text-right text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-300 shrink-0" />
                <h3 className="text-base font-extrabold">تثبيت التطبيق على iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                aria-label="إغلاق"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-100 leading-relaxed">
              <p className="flex items-start gap-2.5">
                <Share className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
                <span>
                  1. اضغط على زر <strong>مشاركة (Share)</strong> في شريط متصفح Safari.
                </span>
              </p>
              <p className="flex items-start gap-2.5">
                <PlusSquare className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
                <span>
                  2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> ثم اضغط <strong>إضافة</strong>.
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSInstructions(false);
                handleDismiss();
              }}
              className="w-full min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-black cursor-pointer transition-colors"
            >
              تم، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
