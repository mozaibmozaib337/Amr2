import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlaySquare,
  BookOpen,
  FileCheck2,
  BookCheck,
  FolderOpen,
  UserCircle2,
  Wallet,
  ChevronRight,
  ChevronLeft,
  LogOut,
  LogIn,
  Sparkles,
  Bell,
  Sun,
  Moon,
  Monitor,
  GraduationCap,
  Medal,
  Trophy,
  Headphones,
  Bot,
  ClipboardList,
  Sliders,
} from 'lucide-react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import { GradeLevel } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface StudentSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({ activeTab, onSelectTab }) => {
  const {
    currentUser,
    requestLogout,
    setIsLoginModalOpen,
    setIsAdminPanelOpen,
    lectures,
    hasAccessToLecture,
    activeGrade,
    setActiveGrade,
    settings,
    updateSettings,
    unreadBroadcastCount,
    setIsNotificationModalOpen,
    markBroadcastsAsRead,
  } = usePlatform();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const gradeLabels: Record<GradeLevel, string> = {
    sec1: 'الصف الأول الثانوي',
    sec2: 'الصف الثاني الثانوي',
    sec3: 'الصف الثالث الثانوي',
  };

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
      return <Sun className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (settings.themeMode === 'system') {
      return <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    return <Moon className="w-4 h-4 text-cyan-300 shrink-0" />;
  };

  const getThemeLabel = () => {
    if (settings.themeMode === 'light') return 'فاتح';
    if (settings.themeMode === 'system') return 'تلقائي';
    return 'داكن';
  };

  const myEnrolledCount = currentUser
    ? lectures.filter(
        (l) => l.grade === currentUser.grade && (l.isFree || l.price === 0 || hasAccessToLecture(l.id))
      ).length
    : 0;

  type SidebarItem = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    isSpecial?: boolean;
  };

  const sidebarItems: SidebarItem[] = isAdminOrSec
    ? [
        { id: 'home', label: 'الرئيسية', icon: LayoutDashboard },
        { id: 'gemini_ai', label: '🤖 جيمناي الذكي الحقيقي', icon: Bot, isSpecial: true },
        { id: 'lectures', label: 'المحاضرات والكورسات', icon: PlaySquare },
        { id: 'files', label: 'الملفات والمذكرات', icon: FolderOpen },
        { id: 'exams', label: 'الامتحانات الإلكترونية', icon: FileCheck2 },
        { id: 'homework', label: 'الواجبات والشيتات', icon: BookCheck },
        { id: 'top_rankings', label: 'أوائل الشيتات والامتحانات', icon: Medal },
        { id: 'student_data', label: 'بيانات الطالب والتقارير', icon: ClipboardList },
        { id: 'student_profile', label: 'حسابي', icon: UserCircle2 },
        { id: 'wallet', label: 'محفظتي وكود الشحن', icon: Wallet },
        { id: 'leaderboard', label: 'لوحة الشرف', icon: Trophy },
        { id: 'support', label: 'الدعم الفني', icon: Headphones },
      ]
    : [
        { id: 'home', label: 'الرئيسية', icon: LayoutDashboard },
        { id: 'lectures', label: 'الكورسات والمحاضرات', icon: PlaySquare },
        ...(currentUser
          ? [{ id: 'my_courses', label: 'كورساتي الحالية', icon: BookOpen, badge: myEnrolledCount }]
          : []),
        { id: 'exams', label: 'الامتحانات الإلكترونية', icon: FileCheck2 },
        { id: 'homework', label: 'الواجبات والشيتات', icon: BookCheck },
        { id: 'files', label: 'الملفات والمذكرات', icon: FolderOpen },
        { id: 'top_rankings', label: 'أوائل الشيتات والامتحانات', icon: Medal },
        { id: 'leaderboard', label: 'لوحة الشرف', icon: Trophy },
        ...(currentUser ? [{ id: 'student_profile', label: 'حسابي', icon: UserCircle2 }] : []),
        { id: 'wallet', label: 'شحن المحفظة وكود السنتر', icon: Wallet },
        { id: 'support', label: 'الدعم الفني', icon: Headphones },
      ];

  const handleMobileNavSelect = (tabId: string) => {
    onSelectTab(tabId);
    setIsMobileDrawerOpen(false);
  };

  const renderSidebarBody = (mobileMode: boolean) => {
    const collapsed = mobileMode ? false : isCollapsed;

    return (
      <>
        <div className="flex flex-col overflow-y-auto no-scrollbar">
          {/* Brand Lockup + Collapse / Minimize Arrow */}
          <div
            className={`flex items-center border-b border-slate-800/80 px-3 py-3 gap-2 ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!collapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-cyan-400/70 shrink-0 bg-slate-900">
                  <img
                    src="/assets/aistudio/FB_IMG_1793743497996_a470a9e3.jpg"
                    alt="مستر عمرو السيد"
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-white truncate">الكيمياء مع مستر عمرو</p>
                  <p className="text-[11px] font-semibold text-cyan-400 truncate">
                    {isAdminOrSec ? 'لوحة الإدارة والمعلم' : 'المنصة التعليمية الرسمية'}
                  </p>
                </div>
              </div>
            )}

            {mobileMode ? (
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="تصغير النافذة"
                className="min-h-[44px] px-3 rounded-xl bg-[#050811] border border-cyan-800/50 text-cyan-300 hover:bg-cyan-600 hover:text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
              >
                <ChevronRight className="w-4 h-4 shrink-0" />
                <span>تصغير النافذة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                title={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
                aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
                className="p-2 rounded-xl bg-[#050811] border border-cyan-800/50 text-cyan-400 hover:bg-cyan-600 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* User / Admin / Guest Card */}
          {currentUser ? (
            !collapsed ? (
              <div className="m-3 p-3.5 rounded-2xl bg-[#060b18] border border-cyan-900/40 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {currentUser.name.trim().charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-cyan-400 truncate flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isAdminOrSec
                          ? currentUser.role === 'secretary'
                            ? 'سكرتارية المنصة'
                            : 'المشرف العام'
                          : gradeLabels[currentUser.grade]}
                      </span>
                    </p>
                  </div>
                </div>

                {isAdminOrSec ? (
                  <>
                    <div className="flex items-center min-h-[40px] bg-[#091224] border border-slate-800 rounded-xl px-2 py-1 text-xs">
                      <GraduationCap className="w-4 h-4 text-cyan-400 me-1.5 shrink-0" />
                      <select
                        value={activeGrade}
                        onChange={(e) => setActiveGrade(e.target.value as GradeLevel | 'all')}
                        aria-label="تصفية الصف الدراسي"
                        className="w-full bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="all" className="bg-[#0b1329] text-white">جميع الصفوف الدراسية</option>
                        <option value="sec3" className="bg-[#0b1329] text-white">الصف الثالث الثانوي</option>
                        <option value="sec2" className="bg-[#0b1329] text-white">الصف الثاني الثانوي</option>
                        <option value="sec1" className="bg-[#0b1329] text-white">الصف الأول الثانوي</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminPanelOpen(true);
                        if (mobileMode) setIsMobileDrawerOpen(false);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>لوحة التحكم والإدارة +</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => (mobileMode ? handleMobileNavSelect('wallet') : onSelectTab('wallet'))}
                    className="w-full min-h-[44px] flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span className="text-slate-400">رصيد المحفظة:</span>
                    <span className="font-bold text-emerald-400 tabular-nums">{currentUser.walletBalance} ج.م</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="my-2.5 flex flex-col items-center gap-2">
                <div
                  title={`${currentUser.name}`}
                  className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-extrabold text-sm"
                >
                  {currentUser.name.trim().charAt(0)}
                </div>
                {isAdminOrSec && (
                  <button
                    type="button"
                    onClick={() => setIsAdminPanelOpen(true)}
                    title="لوحة التحكم والإدارة"
                    className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          ) : !collapsed ? (
            <div className="m-3 p-3.5 rounded-2xl bg-[#060b18] border border-cyan-900/40 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsLoginModalOpen(true);
                  if (mobileMode) setIsMobileDrawerOpen(false);
                }}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>تسجيل الدخول / حساب جديد</span>
              </button>

              <div className="flex items-center min-h-[44px] bg-[#091224] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <GraduationCap className="w-4 h-4 text-cyan-400 me-1.5 shrink-0" />
                <select
                  value={activeGrade}
                  onChange={(e) => setActiveGrade(e.target.value as GradeLevel | 'all')}
                  aria-label="اختيار الصف الدراسي"
                  className="w-full bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#0b1329] text-white">جميع الصفوف الدراسية</option>
                  <option value="sec3" className="bg-[#0b1329] text-white">الصف الثالث الثانوي</option>
                  <option value="sec2" className="bg-[#0b1329] text-white">الصف الثاني الثانوي</option>
                  <option value="sec1" className="bg-[#0b1329] text-white">الصف الأول الثانوي</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="my-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                title="تسجيل الدخول"
                className="w-10 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-md cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Utility Controls (Notifications + Theme Switcher) */}
          <div className={`px-3 pb-2.5 flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationModalOpen(true);
                markBroadcastsAsRead();
                if (mobileMode) setIsMobileDrawerOpen(false);
              }}
              title="إشعارات ورسائل المنصة"
              className={`relative min-h-[44px] p-2 rounded-xl bg-[#050811] border border-slate-800 hover:border-cyan-500/50 text-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                collapsed ? 'w-10 h-10 min-h-0' : 'flex-1 text-xs font-bold'
              }`}
            >
              <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
              {!collapsed && <span>الإشعارات</span>}
              {unreadBroadcastCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center tabular-nums">
                  {unreadBroadcastCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={cycleTheme}
              title={`المظهر الحالي: ${getThemeLabel()} (اضغط للتبديل)`}
              className={`min-h-[44px] p-2 rounded-xl bg-[#050811] border border-slate-800 hover:border-cyan-500/50 text-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                collapsed ? 'w-10 h-10 min-h-0' : 'flex-1 text-xs font-bold'
              }`}
            >
              {getThemeIcon()}
              {!collapsed && <span>{getThemeLabel()}</span>}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2.5 py-1 space-y-1 bg-transparent border-0" aria-label="القائمة الجانبية">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (mobileMode ? handleMobileNavSelect(item.id) : onSelectTab(item.id))}
                  title={collapsed ? item.label : undefined}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm md:text-xs font-bold transition-all cursor-pointer ${
                    collapsed ? 'justify-center min-h-0' : 'justify-between'
                  } ${
                    isActive
                      ? item.isSpecial
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-md'
                        : 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                      : item.isSpecial
                      ? 'text-amber-300 hover:bg-amber-500/15 border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : item.isSpecial ? 'text-amber-400' : 'text-cyan-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
                  </div>

                  {!collapsed && typeof item.badge === 'number' && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <PWAInstallButton compact={collapsed} />

          {currentUser ? (
            <>
              {!collapsed && currentUser.studentCode && (
                <div className="px-3 py-2 rounded-xl bg-cyan-950/30 border border-cyan-900/30 flex items-center gap-2 text-xs text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate whitespace-nowrap">كودك: {currentUser.studentCode}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  requestLogout();
                  if (mobileMode) setIsMobileDrawerOpen(false);
                }}
                title="تسجيل الخروج"
                className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-300 hover:bg-red-950/50 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer ${
                  collapsed ? 'justify-center min-h-0' : ''
                }`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">تسجيل الخروج</span>}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsLoginModalOpen(true);
                if (mobileMode) setIsMobileDrawerOpen(false);
              }}
              title="دخول الطلاب"
              className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-950/50 border border-cyan-800/40 transition-colors cursor-pointer ${
                collapsed ? 'justify-center min-h-0' : 'justify-center'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">دخول الطالب</span>}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Docked Collapsible Sidebar */}
      <aside
        aria-label="القائمة الجانبية"
        className={`hidden md:flex shrink-0 sticky top-[73px] self-start h-[calc(100dvh-73px)] bg-[#091224] border-l border-cyan-900/35 flex-col justify-between transition-all duration-200 z-30 ${
          isCollapsed ? 'w-[78px]' : 'w-64'
        }`}
      >
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Floating Square Arrow Toggle Button */}
      {!isMobileDrawerOpen && (
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="فتح القائمة الجانبية"
          title="فتح القائمة"
          className="md:hidden fixed top-[66px] right-3 z-30 w-11 h-11 rounded-xl bg-[#091224]/95 border border-cyan-500/60 text-cyan-400 shadow-lg shadow-cyan-950/60 backdrop-blur-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="قائمة التنقل الجانبية"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="fixed top-0 right-0 bottom-0 h-dvh w-[84vw] max-w-[320px] bg-[#091224] border-l border-cyan-800/50 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};
