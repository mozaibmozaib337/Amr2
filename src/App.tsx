import React, { useState, useEffect } from 'react';
import { PlatformProvider } from './context/PlatformContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { LecturesSection } from './components/LecturesSection';
import { FilesSection } from './components/FilesSection';
import { ExamsSection } from './components/ExamsSection';
import { HomeworkSection } from './components/HomeworkSection';
import { WalletSection } from './components/WalletSection';
import { LeaderboardSection } from './components/LeaderboardSection';
import { SupportSection } from './components/SupportSection';
import { LoginModal } from './components/LoginModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { CourseAccessModal } from './components/CourseAccessModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { NotificationModal } from './components/NotificationModal';
import { GeminiTeacherDashboard } from './components/GeminiTeacherDashboard';
import { Footer } from './components/Footer';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header with Quick Theme and Profile */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Navigation (Matching ahmed-elgohary.com/userprofile/home) */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'home' && <HomeDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'gemini_ai' && <GeminiTeacherDashboard />}
        {activeTab === 'lectures' && <LecturesSection />}
        {activeTab === 'files' && <FilesSection />}
        {activeTab === 'exams' && <ExamsSection />}
        {activeTab === 'homework' && <HomeworkSection />}
        {activeTab === 'wallet' && <WalletSection />}
        {activeTab === 'leaderboard' && <LeaderboardSection />}
        {activeTab === 'support' && <SupportSection />}
      </main>

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
