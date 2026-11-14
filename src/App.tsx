import React, { useEffect, useState } from 'react';
import { Lock, LogIn, Home as HomeIcon } from 'lucide-react';
import { PlatformProvider, usePlatform, ADMIN_EMAIL } from './context/PlatformContext';
import { Header } from './components/Header';
import { StudentSidebar } from './components/StudentSidebar';
import { HomeDashboard } from './components/HomeDashboard';
import { LecturesSection } from './components/LecturesSection';
import { FilesSection } from './components/FilesSection';
import { ExamsSection } from './components/ExamsSection';
import { HomeworkSection } from './components/HomeworkSection';
import { WalletSection } from './components/WalletSection';
import { LeaderboardSection } from './components/LeaderboardSection';
import { SupportSection } from './components/SupportSection';
import { StudentProfileSection } from './components/StudentProfileSection';
import { LoginPage } from './components/LoginPage';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { CourseAccessModal } from './components/CourseAccessModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { NotificationModal } from './components/NotificationModal';
import { GeminiTeacherDashboard } from './components/GeminiTeacherDashboard';
import { TopRankingsDirectorySection } from './components/TopRankingsDirectorySection';
import { StudentDirectorySection } from './components/StudentDirectorySection';
import { MobileHeader } from './components/MobileHeader';
import { Footer } from './components/Footer';

const PROTECTED_EDUCATIONAL_TABS = new Set([
  'my_courses',
  'files',
  'exams',
  'homework',
  'top_rankings',
  'leaderboard',
  'student_profile',
  'wallet',
]);

function MainApp() {
  const { currentUser, currentPath, isLoginModalOpen, navigate } = usePlatform();
  const [activeTab, setActiveTab] = useState('home');
  const [openedCourseId, setOpenedCourseId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!currentUser && PROTECTED_EDUCATIONAL_TABS.has(activeTab)) {
      setOpenedCourseId(null);
      setActiveTab('home');
    }
  }, [currentUser, activeTab]);

  const isAuthPage =
    currentPath === '/login' || currentPath === '/register' || isLoginModalOpen;

  if (isAuthPage) {
    return (
      <LoginPage
        onNavigateHome={() => {
          setOpenedCourseId(null);
          setActiveTab('home');
        }}
        onAuthSuccess={() => {
          setOpenedCourseId(null);
          setActiveTab('home');
        }}
      />
    );
  }

  const handleSelectTab = (tab: string) => {
    if (!currentUser && PROTECTED_EDUCATIONAL_TABS.has(tab)) {
      navigate('/login');
      return;
    }
    setOpenedCourseId(null);
    setActiveTab(tab);
  };

  const handleOpenCourseFromHome = (courseId: string) => {
    setOpenedCourseId(courseId);
    setActiveTab('lectures');
  };

  const isBlockedForGuest = !currentUser && PROTECTED_EDUCATIONAL_TABS.has(activeTab);

  return (
    <div className="min-h-dvh w-full overflow-x-clip font-sans selection:bg-cyan-500 selection:text-white">
      {/* Fixed Right Collapsible Sidebar (Desktop/Tablet) + Mobile Drawer */}
      <StudentSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Scrolling Page Column (Header + Main + Footer all scroll together naturally) */}
      <div
        className={`min-h-dvh flex-1 min-w-0 flex flex-col transition-[padding] duration-200 ${
          isSidebarCollapsed ? 'md:ps-[78px]' : 'md:ps-64'
        }`}
      >
        {/* Compact Single-Row Mobile Header (Scrolls away naturally) */}
        <MobileHeader activeTab={activeTab} setActiveTab={handleSelectTab} />

        {/* Unboxed Top Desktop Header (Scrolls away naturally) */}
        <div className="hidden md:block">
          <Header activeTab={activeTab} setActiveTab={handleSelectTab} />
        </div>

        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {isBlockedForGuest ? (
            <div className="max-w-lg mx-auto my-12 p-7 rounded-3xl bg-[#091224] border border-cyan-800/50 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-white">تسجيل الدخول مطلوب للوصول للمحتوى التعليمي</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                لا يمكن الدخول إلى الملفات أو الامتحانات أو الواجبات أو لوحة الشرف أو المحفظة إلا بعد تسجيل الدخول بحسابك على المنصة.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول / إنشاء حساب طالب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HomeIcon className="w-4 h-4" />
                  <span>العودة للصفحة الرئيسية</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeDashboard
                  setActiveTab={handleSelectTab}
                  onOpenCourse={handleOpenCourseFromHome}
                />
              )}
              {activeTab === 'gemini_ai' && (
                isAdminOrSec ? (
                  <GeminiTeacherDashboard />
                ) : (
                  <HomeDashboard setActiveTab={handleSelectTab} onOpenCourse={handleOpenCourseFromHome} />
                )
              )}
              {activeTab === 'lectures' && (
                <LecturesSection
                  onlyEnrolled={false}
                  setActiveTab={handleSelectTab}
                  openedCourseId={openedCourseId}
                  setOpenedCourseId={setOpenedCourseId}
                />
              )}
              {activeTab === 'my_courses' && currentUser && (
                <LecturesSection
                  onlyEnrolled={true}
                  setActiveTab={handleSelectTab}
                  openedCourseId={openedCourseId}
                  setOpenedCourseId={setOpenedCourseId}
                />
              )}
              {activeTab === 'files' && currentUser && <FilesSection />}
              {activeTab === 'exams' && currentUser && <ExamsSection />}
              {activeTab === 'homework' && currentUser && <HomeworkSection />}
              {activeTab === 'student_profile' && currentUser && <StudentProfileSection setActiveTab={handleSelectTab} />}
              {activeTab === 'top_rankings' && currentUser && <TopRankingsDirectorySection />}
              {activeTab === 'student_data' && (
                isAdminOrSec ? (
                  <StudentDirectorySection />
                ) : (
                  <HomeDashboard setActiveTab={handleSelectTab} onOpenCourse={handleOpenCourseFromHome} />
                )
              )}
              {activeTab === 'wallet' && currentUser && <WalletSection />}
              {activeTab === 'leaderboard' && currentUser && <LeaderboardSection />}
              {activeTab === 'support' && <SupportSection />}
            </>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Modals & Embedded Viewers */}
      <LogoutConfirmModal />
      <NotificationModal />
      <AdminPanelModal />
      <CourseAccessModal />
      <VideoPlayerModal />
      <DocumentViewerModal />
    </div>
  );
}

export default function App() {
  return (
    <PlatformProvider>
      <MainApp />
    </PlatformProvider>
  );
}
