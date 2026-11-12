import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  Sparkles,
  PlayCircle,
  FileCheck2,
  BookCheck,
  Wallet,
  Lock,
  Unlock,
  ArrowLeft,
  GraduationCap,
  PlusCircle,
  Sliders,
  Gift,
  Flame,
  Award,
  Users,
  Trophy,
} from 'lucide-react';
import { PerformanceAnalyticsSection } from './PerformanceAnalyticsSection';
import { ExamRankingsSection } from './ExamRankingsSection';
import { StudentActivityTracker } from './StudentActivityTracker';

interface HomeDashboardProps {
  setActiveTab: (tab: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ setActiveTab }) => {
  const {
    currentUser,
    activeGrade,
    lectures,
    exams,
    homeworks,
    setSelectedCourseForDetails,
    hasAccessToLecture,
    setIsLoginModalOpen,
    setIsAdminPanelOpen,
  } = usePlatform();

  const [courseFilter, setCourseFilter] = useState<'all' | 'free' | 'paid'>('all');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'secretary';

  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;
  const gradeLectures = lectures.filter((lec) => {
    if (studentGrade === 'all') return true;
    return lec.grade === studentGrade;
  });

  const freeLectures = gradeLectures.filter((l) => l.isFree || l.price === 0);
  const paidLectures = gradeLectures.filter((l) => !l.isFree && l.price > 0);

  const displayedLectures =
    courseFilter === 'free'
      ? freeLectures
      : courseFilter === 'paid'
      ? paidLectures
      : gradeLectures;

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1b3d] via-[#091530] to-[#070e22] border border-cyan-800/40 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 justify-between">
          
          <div className="flex-1 text-center md:text-right space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-xs font-semibold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>البوابة الرسمية والوحيدة لمادة الكيمياء</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              الكيمياء مع مستر <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">عمرو السيد</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              منصة تعليمية متكاملة لطلاب المرحلة الثانوية. محاضرات مجانية ومدفوعة، متابعة لحظية للحضور والدرجات، تفنيد الأوائل، وامتحانات إلكترونية دقيقة.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={() => setActiveTab('lectures')}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-cyan-600/25 flex items-center gap-2 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>تصفح الكورسات والمحاضرات</span>
              </button>

              <button
                onClick={() => setActiveTab('exams')}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-600/25 flex items-center gap-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>الامتحانات وبنك الأسئلة</span>
              </button>

              <button
                onClick={() => setActiveTab('top_rankings')}
                className="px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-bold text-xs sm:text-sm rounded-xl border border-indigo-500/40 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>أوائل الشيتات والامتحانات</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('student_data')}
                    className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold text-xs sm:text-sm rounded-xl border border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>بيانات الطالب والتقارير الشاملة</span>
                  </button>

                  <button
                    onClick={() => setIsAdminPanelOpen(true)}
                    className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm rounded-xl border border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>لوحة تحكم المعلم والإدارة</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Teacher Image Avatar in Glowing Podium */}
          <div className="relative shrink-0">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-cyan-400/80 shadow-[0_0_35px_rgba(6,182,212,0.4)] bg-[#070d1e]">
              <img
                src="/assets/aistudio/image_5a8c23d0_ad0df768.jpg"
                alt="مستر عمرو السيد"
                className="w-full h-full object-cover object-top scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-[11px] font-bold rounded-full shadow-lg border border-cyan-300/40 text-center">
              Mr. Amr El-Sayed
            </div>
          </div>

        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('lectures')}
          className="p-4 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">المحاضرات</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-2 font-mono">{lectures.length}</p>
          <p className="text-[11px] text-cyan-400/80 mt-0.5">{freeLectures.length} مجانية | {paidLectures.length} مدفوعة</p>
        </div>

        <div
          onClick={() => setActiveTab('exams')}
          className="p-4 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">الامتحانات</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-2 font-mono">{exams.length}</p>
          <p className="text-[11px] text-blue-400/80 mt-0.5">تصحيح إلكتروني وتفنيد الأوائل</p>
        </div>

        <div
          onClick={() => setActiveTab('homework')}
          className="p-4 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">الواجبات والشيتات</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
              <BookCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-2 font-mono">{homeworks.length}</p>
          <p className="text-[11px] text-indigo-400/80 mt-0.5">تدريبات ومتابعة مستمرة</p>
        </div>

        <div
          onClick={() => setActiveTab('wallet')}
          className="p-4 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">المحفظة</span>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-2 font-mono">
            {currentUser ? `${currentUser.walletBalance} ج.م` : '0 ج.م'}
          </p>
          <p className="text-[11px] text-teal-400/80 mt-0.5">شحن وتفعيل فوري</p>
        </div>
      </div>

      {/* 1. PERSONAL STUDENT PROGRESS & PERFORMANCE ANALYTICS */}
      <PerformanceAnalyticsSection />

      {/* 2. FEATURED COURSES SECTION (قسم الكورسات المجانية وقسم الكورسات المدفوعة) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-400" />
              <span>الكورسات والمحاضرات (المجانية والمدفوعة)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              الكورسات المجانية مفتوحة لجميع الطلاب فوراً، والكورسات المدفوعة تتطلب تصريحاً أو اشتراكاً.
            </p>
          </div>

          {/* Toggle between All / Free / Paid */}
          <div className="flex items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setCourseFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                courseFilter === 'all'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setCourseFilter('free')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                courseFilter === 'free'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>المجانية</span>
            </button>
            <button
              onClick={() => setCourseFilter('paid')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                courseFilter === 'paid'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>المدفوعة</span>
            </button>
          </div>
        </div>

        {displayedLectures.length === 0 ? (
          <div className="p-8 sm:p-12 bg-[#091224] border border-slate-800/80 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">لا توجد محاضرات في هذا القسم حالياً</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              سيقوم مستر عمرو السيد بإضافة كورسات ومحاضرات جديدة قريباً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedLectures.map((lec) => {
              const isUnlocked = hasAccessToLecture(lec.id);
              const isFreeCourse = lec.isFree || lec.price === 0;

              return (
                <div
                  key={lec.id}
                  onClick={() => setSelectedCourseForDetails(lec)}
                  className={`bg-[#091224] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg cursor-pointer group ${
                    isFreeCourse
                      ? 'border-emerald-900/60 hover:border-emerald-500/60 hover:shadow-emerald-900/20'
                      : 'border-slate-800/80 hover:border-cyan-500/50 hover:shadow-cyan-900/20'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
                        {lec.chapterTitle}
                      </span>
                      
                      <div className="flex items-center gap-1 text-xs">
                        {isFreeCourse ? (
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                            <Gift className="w-3.5 h-3.5" />
                            مجاني للجميع
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                            <Unlock className="w-3.5 h-3.5" />
                            مفتوح لك
                          </span>
                        ) : (
                          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                            <Lock className="w-3.5 h-3.5" />
                            مدفوع ({lec.price} ج.م)
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                      {lec.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {lec.description || 'اضغط لمشاهدة تفاصيل ووصف هذا الكورس والدخول.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-white font-mono">
                      {isFreeCourse ? (
                        <span className="text-emerald-400 font-bold">مجاني 100%</span>
                      ) : (
                        `${lec.price} ج.م`
                      )}
                    </span>
                    <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold flex items-center gap-1">
                      <span>عرض وصف الكورس</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
