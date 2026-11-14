import React from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  GraduationCap,
  Wallet,
  User,
  LogOut,
  Sliders,
  ShieldCheck,
  Sparkles,
  Users,
  Sun,
  Moon,
  Monitor,
  Bell,
  UserCircle2,
} from 'lucide-react';
import { GradeLevel } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ setActiveTab }) => {
  const {
    currentUser,
    requestLogout,
    setIsLoginModalOpen,
    activeGrade,
    setActiveGrade,
    setIsAdminPanelOpen,
    settings,
    updateSettings,
    unreadBroadcastCount,
    setIsNotificationModalOpen,
    markBroadcastsAsRead,
  } = usePlatform();

  const gradeLabels: Record<GradeLevel | 'all', string> = {
    all: 'جميع الصفوف',
    sec1: 'الصف الأول الثانوي',
    sec2: 'الصف الثاني الثانوي',
    sec3: 'الصف الثالث الثانوي',
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isSecretary = currentUser?.role === 'secretary';
  const isStudent = currentUser?.role === 'student';

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
      return <Sun className="w-5 h-5 text-amber-400" />;
    }
    if (settings.themeMode === 'system') {
      return <Monitor className="w-5 h-5 text-cyan-400" />;
    }
    return <Moon className="w-5 h-5 text-cyan-300" />;
  };

  const getThemeTitle = () => {
    if (settings.themeMode === 'light') return 'الوضع الفاتح (اضغط للتبديل)';
    if (settings.themeMode === 'system') return 'تلقائي حسب جهازك (اضغط للتبديل)';
    return 'الوضع الداكن (اضغط للتبديل)';
  };

  return (
    <header className="relative z-20 w-full bg-transparent transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-center justify-between gap-4 flex-nowrap">
          {/* Brand & Teacher Circle Lockup (Unboxed / Standalone) */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3.5 shrink-0 text-right cursor-pointer bg-transparent border-0 p-0"
          >
            <div className="relative group shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.35)] bg-slate-900">
                <img
                  src="/assets/aistudio/FB_IMG_1793743497996_a470a9e3.jpg"
                  alt="مستر عمرو السيد"
                  className="w-full h-full object-cover object-top scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span
                className="absolute -bottom-1 -left-1 bg-cyan-500 text-[#080e1e] p-0.5 rounded-full ring-2 ring-[#070d1e]"
                title="الكيمياء"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-2 flex-nowrap">
                <h1 className="text-lg md:text-xl font-extrabold text-white tracking-wide whitespace-nowrap">
                  الكيمياء مع مستر عمرو السيد
                </h1>
                {isAdmin ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 whitespace-nowrap shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>المشرف العام</span>
                  </span>
                ) : isSecretary ? (
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1 whitespace-nowrap shrink-0">
                    <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>سكرتارية المنصة</span>
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-cyan-400/90 font-medium whitespace-nowrap">
                المنصة التعليمية الرسمية لمادة الكيمياء للثانوية العامة والأزهرية
              </span>
            </div>
          </button>

          {/* Standalone Unboxed Controls Scrolling Naturally With Header */}
          <div className="flex items-center gap-3.5 shrink-0 flex-nowrap">
            {/* Notification Bell in Small Rectangle */}
            <button
              type="button"
              onClick={() => {
                setIsNotificationModalOpen(true);
                markBroadcastsAsRead();
              }}
              title="إشعارات ورسائل المنصة"
              aria-label="إشعارات ورسائل المنصة"
              className="relative p-2 rounded-lg bg-[#0b1429] border border-cyan-800/50 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-400 transition-all cursor-pointer flex items-center justify-center group shrink-0"
            >
              <Bell className="w-5 h-5 text-cyan-300 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
              {unreadBroadcastCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center shadow-md tabular-nums">
                  {unreadBroadcastCount}
                </span>
              )}
            </button>

            {/* Wallet Balance in Yellow Box */}
            {currentUser && !isAdmin && !isSecretary && (
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                title="رصيد المحفظة - اضغط للشحن"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 border border-yellow-300 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
              >
                <Wallet className="w-4 h-4 text-slate-950 shrink-0" />
                <span className="tabular-nums text-slate-950">{currentUser.walletBalance} ج.م</span>
                <span className="text-xs text-emerald-800 font-black">+</span>
              </button>
            )}

            {/* Theme Switcher Icon in Small Rectangle */}
            <button
              type="button"
              onClick={cycleTheme}
              title={getThemeTitle()}
              aria-label={getThemeTitle()}
              className="px-2.5 py-1.5 rounded-lg bg-[#0b1429] border border-cyan-800/50 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {getThemeIcon()}
              <span className="text-xs font-semibold hidden xl:inline text-slate-300 whitespace-nowrap">
                {settings.themeMode === 'light' ? 'فاتح' : settings.themeMode === 'system' ? 'تلقائي' : 'داكن'}
              </span>
            </button>

            {/* Grade Indicator / Selector in Green Rectangle */}
            {isStudent ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 border border-emerald-400/60 text-white text-xs font-bold whitespace-nowrap shrink-0 shadow-sm">
                <GraduationCap className="w-4 h-4 text-white shrink-0" />
                <span>{gradeLabels[currentUser.grade] || 'الصف الثالث الثانوي'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 border border-emerald-400/60 text-white text-xs whitespace-nowrap shrink-0 shadow-sm">
                <GraduationCap className="w-4 h-4 text-white shrink-0" />
                <select
                  value={activeGrade}
                  onChange={(e) => setActiveGrade(e.target.value as GradeLevel | 'all')}
                  aria-label="اختيار الصف الدراسي"
                  className="bg-transparent border-0 text-white font-bold focus:outline-none cursor-pointer py-0.5 whitespace-nowrap"
                >
                  <option value="all" className="bg-[#0b1329] text-white">جميع الصفوف الدراسية</option>
                  <option value="sec3" className="bg-[#0b1329] text-white">الصف الثالث الثانوي (2026)</option>
                  <option value="sec2" className="bg-[#0b1329] text-white">الصف الثاني الثانوي</option>
                  <option value="sec1" className="bg-[#0b1329] text-white">الصف الأول الثانوي</option>
                </select>
              </div>
            )}

            {/* Standalone Role Actions */}
            {isAdmin || isSecretary ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="flex items-center gap-1.5 py-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 bg-transparent border-0"
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>لوحة التحكم</span>
                </button>
                <button
                  type="button"
                  onClick={requestLogout}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 border border-red-400/60 text-white transition-colors cursor-pointer shrink-0 text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  <LogOut className="w-4 h-4 text-white shrink-0" />
                  <span className="hidden lg:inline text-white">خروج</span>
                </button>
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('student_profile')}
                  title="الانتقال إلى حسابي"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-400/60 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                >
                  <UserCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span className="text-xs font-bold text-white whitespace-nowrap">{currentUser.name}</span>
                </button>
                <button
                  type="button"
                  onClick={requestLogout}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 border border-red-400/60 text-white transition-colors cursor-pointer shrink-0 text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  <LogOut className="w-4 h-4 text-white shrink-0" />
                  <span className="hidden lg:inline text-white">خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 py-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 bg-transparent border-0"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
