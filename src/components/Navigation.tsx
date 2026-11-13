import {
  LayoutDashboard,
  PlaySquare,
  FileCheck2,
  BookCheck,
  FolderOpen,
  Wallet,
  Trophy,
  Headphones,
  Sliders,
  Bot,
  Sparkles,
  ClipboardList,
  Medal,
} from 'lucide-react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, setIsAdminPanelOpen, lectures, homeworks, exams, files } = usePlatform();
  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  const navItems = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: LayoutDashboard,
    },
    ...(isAdminOrSec
      ? [
          {
            id: 'gemini_ai',
            label: '🤖 جيمناي الذكي الحقيقي',
            icon: Bot,
            isSpecial: true,
          },
        ]
      : []),
    {
      id: 'lectures',
      label: 'المحاضرات والكورسات',
      icon: PlaySquare,
    },
    {
      id: 'files',
      label: 'الملفات والمذكرات',
      icon: FolderOpen,
    },
    {
      id: 'exams',
      label: 'الامتحانات الإلكترونية',
      icon: FileCheck2,
    },
    {
      id: 'homework',
      label: 'الواجبات والشيتات',
      icon: BookCheck,
    },
    {
      id: 'top_rankings',
      label: 'أوائل الشيتات والامتحانات',
      icon: Medal,
    },
    ...(isAdminOrSec
      ? [
          {
            id: 'student_data',
            label: 'بيانات الطالب والتقارير',
            icon: ClipboardList,
          },
        ]
      : []),
    {
      id: 'wallet',
      label: 'محفظتي وكود الشحن',
      icon: Wallet,
    },
    {
      id: 'leaderboard',
      label: 'لوحة الشرف',
      icon: Trophy,
    },
    {
      id: 'support',
      label: 'الدعم الفني',
      icon: Headphones,
    },
  ];

  return (
    <div className="bg-[#0a1224] border-b border-cyan-950/40 sticky top-[73px] z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-2 gap-1 md:gap-2">
          
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? item.isSpecial
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : item.isSpecial
                      ? 'text-amber-400/90 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? (item.isSpecial ? 'text-amber-400' : 'text-cyan-400') : (item.isSpecial ? 'text-amber-400' : 'text-slate-400')}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Admin Control Link if logged in as Admin or Secretary */}
          {isAdminOrSec && (
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/30 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 me-1"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>لوحة التحكم والإدارة +</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
