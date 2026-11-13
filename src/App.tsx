import React, { useState } from 'react';
import { PlatformProvider, usePlatform, ADMIN_EMAIL } from './context/PlatformContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
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
import { LoginModal } from './components/LoginModal';
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

function MainApp() {
  const { currentUser } = usePlatform();
  const [activeTab, setActiveTab] = useState('home');
  const [openedCourseId, setOpenedCourseId] = useState<string | null>(null);

  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleSelectTab = (tab: string) => {
    setOpenedCourseId(null);
    setActiveTab(tab);
  };

  const handleOpenCourseFromHome = (courseId: string) => {
    setOpenedCourseId(courseId);
    setActiveTab('lectures');
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Compact Single-Row Mobile Header (Visible on phones < 768px) */}
      <MobileHeader activeTab={activeTab} setActiveTab={handleSelectTab} />

      {/* Top Desktop Header & Comprehensive Navigation: Visible ONLY for Teacher (Admin) and Secretary */}
      {isAdminOrSec && (
        <>
          <div className="hidden md:block">
            <Header activeTab={activeTab} setActiveTab={handleSelectTab} />
          </div>
          <Navigation activeTab={activeTab} setActiveTab={handleSelectTab} />
        </>
      )}

      {/* Workspace Shell: Collapsible Right Sidebar (Desktop) + Slide-over Drawer (Mobile) + Main Content */}
      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <StudentSidebar activeTab={activeTab} onSelectTab={handleSelectTab} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
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
          {activeTab === 'my_courses' && (
            <LecturesSection
              onlyEnrolled={true}
              setActiveTab={handleSelectTab}
              openedCourseId={openedCourseId}
              setOpenedCourseId={setOpenedCourseId}
            />
          )}
          {activeTab === 'files' && <FilesSection />}
          {activeTab === 'exams' && <ExamsSection />}
          {activeTab === 'homework' && <HomeworkSection />}
          {activeTab === 'student_profile' && <StudentProfileSection setActiveTab={handleSelectTab} />}
          {activeTab === 'top_rankings' && <TopRankingsDirectorySection />}
          {activeTab === 'student_data' && (
            isAdminOrSec ? (
              <StudentDirectorySection />
            ) : (
              <HomeDashboard setActiveTab={handleSelectTab} onOpenCourse={handleOpenCourseFromHome} />
            )
          )}
          {activeTab === 'wallet' && <WalletSection />}
          {activeTab === 'leaderboard' && <LeaderboardSection />}
          {activeTab === 'support' && <SupportSection />}
        </main>
      </div>

      {/* Modals & Embedded Viewers */}
      <LoginModal />
      <NotificationModal />
      <AdminPanelModal />
      <CourseAccessModal />
      <VideoPlayerModal />
      <DocumentViewerModal />

      {/* Footer */}
      <Footer />
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
