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
      return <Sun className="w-4 h-4 text-amber-400" />;
    }
    if (settings.themeMode === 'system') {
      return <Monitor className="w-4 h-4 text-cyan-400" />;
    }
    return <Moon className="w-4 h-4 text-cyan-300" />;
  };

  const getThemeTitle = () => {
    if (settings.themeMode === 'light') return 'الوضع الفاتح (اضغط للتبديل)';
    if (settings.themeMode === 'system') return 'تلقائي حسب جهازك (اضغط للتبديل)';
    return 'الوضع الداكن (اضغط للتبديل)';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080e1e]/95 backdrop-blur-md border-b border-cyan-900/30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 flex-nowrap">
          {/* Brand & Teacher Lockup */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3.5 shrink-0 text-right cursor-pointer"
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
                className="absolute -bottom-1 -left-1 bg-cyan-500 text-[#080e1e] p-0.5 rounded-full ring-2 ring-[#080e1e]"
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
                  <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap shrink-0">
                    <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                    المشرف العام
                  </span>
                ) : isSecretary ? (
                  <span className="text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap shrink-0">
                    <Users className="w-3 h-3 text-blue-400 shrink-0" />
                    سكرتارية المنصة
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-cyan-400/90 font-medium whitespace-nowrap">
                المنصة التعليمية الرسمية لمادة الكيمياء للثانوية العامة والأزهرية
              </span>
            </div>
          </button>

          {/* Left Controls (in RTL): Notifications + Wallet Next to It, Theme Switcher, Grade Indicator/Selector, Admin/Student Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {/* Notification Bell with Counter */}
            <button
              type="button"
              onClick={() => {
                setIsNotificationModalOpen(true);
                markBroadcastsAsRead();
              }}
              title="إشعارات ورسائل المنصة"
              aria-label="إشعارات ورسائل المنصة"
              className="relative min-h-[40px] p-2 rounded-xl bg-[#0d172e] border border-cyan-900/40 hover:border-cyan-500/50 text-slate-200 transition-all cursor-pointer flex items-center justify-center group shrink-0"
            >
              <Bell className="w-4 h-4 text-cyan-300 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
              {unreadBroadcastCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-600 border-2 border-[#080e1e] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse shadow-md tabular-nums">
                  {unreadBroadcastCount}
                </span>
              )}
            </button>

            {/* Wallet Balance Capsule Directly Next to Notifications */}
            {currentUser && !isAdmin && !isSecretary && (
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                title="رصيد المحفظة - اضغط للشحن"
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 border border-cyan-700/40 hover:border-cyan-500/60 text-cyan-300 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Wallet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="tabular-nums">{currentUser.walletBalance} ج.م</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-400/15 px-1.5 py-0.2 rounded font-extrabold">+</span>
              </button>
            )}

            {/* Quick Theme Switcher Button */}
            <button
              type="button"
              onClick={cycleTheme}
              title={getThemeTitle()}
              aria-label={getThemeTitle()}
              className="min-h-[40px] p-2 rounded-xl bg-[#0d172e] border border-cyan-900/40 hover:border-cyan-500/50 text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {getThemeIcon()}
              <span className="text-[11px] font-semibold hidden xl:inline text-slate-300 whitespace-nowrap">
                {settings.themeMode === 'light' ? 'فاتح' : settings.themeMode === 'system' ? 'تلقائي' : 'داكن'}
              </span>
            </button>

            {/* Grade Indicator: Locked for logged-in Students (NO "جميع الصفوف الدراسية"); Selector for Admin / Secretary / Guests */}
            {isStudent ? (
              <div className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 bg-[#0d172e] border border-cyan-800/60 rounded-xl text-cyan-300 text-xs font-bold shadow-sm whitespace-nowrap shrink-0">
                <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{gradeLabels[currentUser.grade] || 'الصف الثالث الثانوي'}</span>
              </div>
            ) : (
              <div className="min-h-[40px] flex items-center bg-[#0d172e] border border-cyan-900/40 rounded-xl p-1 text-xs whitespace-nowrap shrink-0">
                <GraduationCap className="w-4 h-4 text-cyan-400 mx-2 shrink-0" />
                <select
                  value={activeGrade}
                  onChange={(e) => setActiveGrade(e.target.value as GradeLevel | 'all')}
                  aria-label="اختيار الصف الدراسي"
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer py-1 pe-2 whitespace-nowrap"
                >
                  <option value="all" className="bg-[#0b1329] text-white">جميع الصفوف الدراسية</option>
                  <option value="sec3" className="bg-[#0b1329] text-white">الصف الثالث الثانوي (2026)</option>
                  <option value="sec2" className="bg-[#0b1329] text-white">الصف الثاني الثانوي</option>
                  <option value="sec1" className="bg-[#0b1329] text-white">الصف الأول الثانوي</option>
                </select>
              </div>
            )}

            {/* Role Actions */}
            {isAdmin || isSecretary ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="min-h-[40px] flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>لوحة التحكم</span>
                </button>
                <button
                  type="button"
                  onClick={requestLogout}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl border border-slate-700/60 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">خروج</span>
                </button>
              </div>
            ) : currentUser ? (
              /* Student logged in: Profile Quick Access + Logout with confirmation (NO Control Panel) */
              <div className="flex items-center gap-2 ps-2 border-s border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('student_profile')}
                  title="الانتقال إلى حسابي"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0d172e] hover:border-cyan-500/50 border border-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <UserCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs font-bold text-white leading-tight whitespace-nowrap">{currentUser.name}</p>
                    <p className="text-[10px] text-cyan-400 whitespace-nowrap">حسابي</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={requestLogout}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="min-h-[40px] px-3 py-2 bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-300 rounded-xl border border-slate-700/50 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">خروج</span>
                </button>
              </div>
            ) : (
              /* Guest / Not logged in */
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="min-h-[40px] flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-600/25 cursor-pointer whitespace-nowrap shrink-0"
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
