import React from 'react';
import { Bell, Sun, Moon, Monitor, Wallet, LogIn, Sliders, LogOut } from 'lucide-react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';

interface MobileHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ setActiveTab }) => {
  const {
    currentUser,
    requestLogout,
    setIsLoginModalOpen,
    setIsAdminPanelOpen,
    settings,
    updateSettings,
    unreadBroadcastCount,
    setIsNotificationModalOpen,
    markBroadcastsAsRead,
  } = usePlatform();

  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const cycleTheme = () => {
    if (settings.themeMode === 'dark') {
      updateSettings({ themeMode: 'light' });
    } else if (settings.themeMode === 'light') {
      updateSettings({ themeMode: 'system' });
    } else {
      updateSettings({ themeMode: 'dark' });
    }
  };

  const getThemeIcon = () => {
    if (settings.themeMode === 'light') {
      return <Sun className="w-4 h-4 text-amber-400" />;
    }
    if (settings.themeMode === 'system') {
      return <Monitor className="w-4 h-4 text-cyan-400" />;
    }
    return <Moon className="w-4 h-4 text-cyan-300" />;
  };

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 w-full bg-[#080e1e]/95 backdrop-blur-md border-b border-cyan-900/35 px-2.5">
      <div className="h-full grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
        {/* Start (Right in RTL): Notifications + Wallet (when student) + Theme Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsNotificationModalOpen(true);
              markBroadcastsAsRead();
            }}
            aria-label="الإشعارات"
            className="relative w-10 h-10 rounded-xl bg-[#0d172e] border border-cyan-900/40 text-slate-200 flex items-center justify-center cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Bell className="w-4 h-4 text-cyan-300" />
            {unreadBroadcastCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center tabular-nums">
                {unreadBroadcastCount}
              </span>
            )}
          </button>

          {currentUser && !isAdminOrSec && (
            <button
              type="button"
              onClick={() => setActiveTab('wallet')}
              aria-label="رصيد المحفظة"
              className="h-10 px-2.5 rounded-xl bg-cyan-950/75 border border-cyan-600/50 text-cyan-300 text-xs font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
            >
              <Wallet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{currentUser.walletBalance} ج.م</span>
            </button>
          )}

          <button
            type="button"
            onClick={cycleTheme}
            aria-label="تبديل المظهر الفاتح والداكن"
            className="w-10 h-10 rounded-xl bg-[#0d172e] border border-cyan-900/40 text-slate-200 flex items-center justify-center cursor-pointer shrink-0 whitespace-nowrap"
          >
            {getThemeIcon()}
          </button>
        </div>

        {/* Center: Brand Logo / Title (Strictly single line) */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center justify-center gap-1.5 min-w-0 cursor-pointer whitespace-nowrap"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden border border-cyan-400/80 shrink-0 bg-slate-900">
            <img
              src="/assets/aistudio/FB_IMG_1793743497996_a470a9e3.jpg"
              alt="مستر عمرو السيد"
              className="w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[12px] font-extrabold text-white truncate whitespace-nowrap">
            الكيمياء · مستر عمرو
          </span>
        </button>

        {/* End (Left in RTL): Admin Control / Student Account + Logout Confirmation / Login CTA */}
        <div className="flex items-center justify-end gap-1 shrink-0">
          {isAdminOrSec ? (
            <>
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(true)}
                className="min-h-[40px] px-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 shadow-md"
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>التحكم</span>
              </button>
              <button
                type="button"
                onClick={requestLogout}
                aria-label="تسجيل الخروج"
                className="w-10 h-10 rounded-xl bg-[#0d172e] border border-slate-700/70 text-red-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : currentUser ? (
            <button
              type="button"
              onClick={requestLogout}
              aria-label="تسجيل الخروج"
              className="min-h-[40px] px-2.5 rounded-xl bg-[#0d172e] border border-red-800/50 text-red-300 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>خروج</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="min-h-[40px] px-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-md"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>دخول</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
