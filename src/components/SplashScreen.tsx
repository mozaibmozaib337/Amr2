import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SPLASH_SESSION_KEY = 'amr_chemistry_splash_seen_v1';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const dismissedRef = useRef(false);

  const dismissSplash = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // Ignore restricted sessionStorage
    }
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      dismissSplash();
    }, 2100);

    return () => {
      clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-label="شاشة الترحيب"
      onClick={dismissSplash}
      className={`fixed inset-0 z-[100000] w-[100dvw] h-[100dvh] bg-[#0a3252] overflow-hidden select-none cursor-pointer animate-splash-in transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Full-viewport teacher portrait with face-safe positioning */}
      <img
        src="/splash-welcome.jpg"
        alt="منصة الكيمياء مع مستر عمرو السيد"
        fetchPriority="high"
        decoding="sync"
        className="w-full h-full object-cover object-[center_18%]"
      />

      {/* Top Skip Button ("تخطي") respecting mobile safe-area insets */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-start justify-end pointer-events-none"
        style={{
          paddingTop: 'max(0.875rem, env(safe-area-inset-top))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissSplash();
          }}
          aria-label="تخطي شاشة الترحيب"
          className="pointer-events-auto min-h-[44px] min-w-[44px] px-4 py-2 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
        >
          <span>تخطي</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom subtle blue gradient overlay with clear Arabic welcome message */}
      <div
        className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-[#051b2e]/95 via-[#082c4a]/80 to-transparent pt-20 pb-8 px-5 flex flex-col items-center justify-end text-center pointer-events-none"
        style={{
          paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-relaxed drop-shadow-[0_3px_12px_rgba(0,0,0,0.65)] max-w-3xl">
          مرحباً بكم في منصة الكيمياء مع مستر عمرو السيد
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-cyan-200/90 font-semibold">
          اضغط في أي مكان للمتابعة
        </p>
      </div>
    </div>
  );
};
