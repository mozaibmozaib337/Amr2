import React, { useMemo, useState } from 'react';
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
  Sliders,
  Gift,
  Flame,
  Users,
  Trophy,
  CheckCircle2,
  LogIn,
  Layers,
  Clock,
} from 'lucide-react';
import { PerformanceAnalyticsSection } from './PerformanceAnalyticsSection';
import { getCourseLessons, resolveCourseCover } from '../utils/courseCovers';

interface HomeDashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenCourse?: (courseId: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ setActiveTab, onOpenCourse }) => {
  const {
    currentUser,
    activeGrade,
    lectures,
    exams,
    homeworks,
    studentAccessMap,
    examSubmissions,
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

  const gradeExams = exams.filter((ex) => {
    if (studentGrade === 'all') return true;
    return ex.grade === studentGrade;
  });

  const gradeHomeworks = homeworks.filter((hw) => {
    if (studentGrade === 'all') return true;
    return hw.grade === studentGrade;
  });

  const freeLectures = gradeLectures.filter((l) => l.isFree || l.price === 0);
  const paidLectures = gradeLectures.filter((l) => !l.isFree && l.price > 0);

  const displayedLectures =
    courseFilter === 'free'
      ? freeLectures
      : courseFilter === 'paid'
      ? paidLectures
      : gradeLectures;

  // Real-Time Student Progress synced with PlatformContext (Supabase data)
  const studentProgress = useMemo(() => {
    const totalLectures = gradeLectures.length;
    const totalExams = gradeExams.length;
    const totalHomeworks = gradeHomeworks.length;
    const totalSteps = totalLectures + totalExams + totalHomeworks;

    if (!currentUser || isAdmin) {
      return {
        completedLectures: 0,
        completedExams: 0,
        completedHomeworks: 0,
        completedSteps: 0,
        totalSteps,
        totalLectures,
        totalExams,
        totalHomeworks,
        percentage: 0,
      };
    }

    const access = studentAccessMap[currentUser.id];
    const completedLectures = gradeLectures.filter(
      (l) => Boolean(access?.lectures?.[l.id]?.entered || access?.lectures?.[l.id]?.completed)
    ).length;

    const completedExams = gradeExams.filter(
      (ex) =>
        Boolean(access?.exams?.[ex.id]?.taken) ||
        examSubmissions.some(
          (sub) => sub.studentId === currentUser.id && sub.examId === ex.id && (sub.assessmentType || 'exam') === 'exam'
        )
    ).length;

    const completedHomeworks = gradeHomeworks.filter(
      (hw) =>
        Boolean(access?.homeworks?.[hw.id]?.solved) ||
        examSubmissions.some(
          (sub) => sub.studentId === currentUser.id && sub.examId === hw.id && sub.assessmentType !== 'exam'
        )
    ).length;

    const completedSteps = completedLectures + completedExams + completedHomeworks;
    const percentage = totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0;

    return {
      completedLectures,
      completedExams,
      completedHomeworks,
      completedSteps,
      totalSteps,
      totalLectures,
      totalExams,
      totalHomeworks,
      percentage,
    };
  }, [currentUser, isAdmin, gradeLectures, gradeExams, gradeHomeworks, studentAccessMap, examSubmissions]);

  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - studentProgress.percentage / 100);

  return (
    <div className="space-y-7 sm:space-y-10 animate-fade-in pb-12">
      {/* Live Student Progress Tracking Card (Top of HomeDashboard) */}
      {!isAdmin && (
        <section
          aria-label="متابعة تقدم الطالب"
          className="rounded-3xl bg-[#091224] border border-cyan-800/45 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          <div className="flex-1 w-full text-center sm:text-right space-y-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>مؤشر الإنجاز الفوري</span>
            </div>

            <h2 className="text-[20px] sm:text-2xl font-extrabold text-white leading-snug">
              {currentUser ? `مرحباً بك يا ${currentUser.name}` : 'مرحباً بك في منصة الكيمياء'}
            </h2>

            {currentUser ? (
              <>
                <p className="text-[14px] sm:text-base text-slate-300 leading-relaxed">
                  الخطوات المنجزة:{' '}
                  <strong className="text-cyan-300 font-mono tabular-nums">
                    {studentProgress.completedSteps}
                  </strong>{' '}
                  من{' '}
                  <strong className="text-white font-mono tabular-nums">
                    {studentProgress.totalSteps}
                  </strong>{' '}
                  خطوة تعليمية في منهجك
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-400 pt-1 tabular-nums">
                  <span>
                    المحاضرات:{' '}
                    <strong className="text-white">
                      {studentProgress.completedLectures}/{studentProgress.totalLectures}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    الامتحانات:{' '}
                    <strong className="text-white">
                      {studentProgress.completedExams}/{studentProgress.totalExams}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    الواجبات والشيتات:{' '}
                    <strong className="text-white">
                      {studentProgress.completedHomeworks}/{studentProgress.totalHomeworks}
                    </strong>
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[14px] sm:text-base text-slate-300 leading-relaxed">
                  سجل دخولك لمتابعة خطواتك المنجزة ونسبة إتمام المحاضرات والامتحانات والشيتات لحظة بلحظة.
                </p>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>تسجيل الدخول لبدء التتبع</span>
                </button>
              </div>
            )}
          </div>

          {/* Circular Progress Bar Ring */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                <circle
                  cx="56"
                  cy="56"
                  r={ringRadius}
                  fill="transparent"
                  stroke="rgba(148, 163, 184, 0.2)"
                  strokeWidth="9"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={ringRadius}
                  fill="transparent"
                  stroke="#06b6d4"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white font-mono tabular-nums">
                  {studentProgress.percentage}%
                </span>
                <span className="text-[11px] font-bold text-cyan-400">الإنجاز</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1b3d] via-[#091530] to-[#070e22] border border-cyan-800/40 p-5 sm:p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 justify-between">
          <div className="flex-1 text-center md:text-right space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-xs font-semibold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>البوابة الرسمية والوحيدة لمادة الكيمياء</span>
            </div>

            <h1 className="text-[22px] sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              الكيمياء مع مستر{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                عمرو السيد
              </span>
            </h1>

            <p className="text-[14px] sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              منصة تعليمية متكاملة لطلاب المرحلة الثانوية. محاضرات مجانية ومدفوعة، متابعة لحظية للحضور والدرجات، تفنيد الأوائل، وامتحانات إلكترونية دقيقة.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('lectures')}
                className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 shrink-0" />
                <span>تصفح الكورسات والمحاضرات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('exams')}
                className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>الامتحانات وبنك الأسئلة</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('top_rankings')}
                className="min-h-[44px] px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-bold text-sm rounded-xl border border-indigo-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>أوائل الشيتات والامتحانات</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('student_data')}
                    className="min-h-[44px] px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold text-sm rounded-xl border border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>بيانات الطالب والتقارير الشاملة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminPanelOpen(true)}
                    className="min-h-[44px] px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-sm rounded-xl border border-amber-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>لوحة تحكم المعلم والإدارة</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Teacher Image Avatar in Glowing Podium */}
          <div className="relative shrink-0">
            <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-cyan-400/80 shadow-[0_0_35px_rgba(6,182,212,0.4)] bg-[#070d1e]">
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

      {/* Metrics Row (Single Column Full-Width on Mobile -> 2 Columns on Small Tablets -> 4 Columns on Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          onClick={() => setActiveTab('lectures')}
          className="p-4 sm:p-5 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">المحاضرات</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
              <PlayCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">{lectures.length}</p>
          <p className="text-xs sm:text-[13px] text-cyan-400/90 mt-1">{freeLectures.length} مجانية | {paidLectures.length} مدفوعة</p>
        </div>

        <div
          onClick={() => setActiveTab('exams')}
          className="p-4 sm:p-5 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">الامتحانات</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">{exams.length}</p>
          <p className="text-xs sm:text-[13px] text-blue-400/90 mt-1">تصحيح إلكتروني وتفنيد الأوائل</p>
        </div>

        <div
          onClick={() => setActiveTab('homework')}
          className="p-4 sm:p-5 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">الواجبات والشيتات</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
              <BookCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">{homeworks.length}</p>
          <p className="text-xs sm:text-[13px] text-indigo-400/90 mt-1">تدريبات ومتابعة مستمرة</p>
        </div>

        <div
          onClick={() => setActiveTab('wallet')}
          className="p-4 sm:p-5 bg-[#091224] border border-cyan-950/60 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">المحفظة</span>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono tabular-nums">
            {currentUser ? `${currentUser.walletBalance} ج.م` : '0 ج.م'}
          </p>
          <p className="text-xs sm:text-[13px] text-teal-400/90 mt-1">شحن وتفعيل فوري</p>
        </div>
      </div>

      {/* 1. PERSONAL STUDENT PROGRESS & PERFORMANCE ANALYTICS */}
      <PerformanceAnalyticsSection />

      {/* 2. FEATURED COURSES SECTION (قسم الكورسات المجانية وقسم الكورسات المدفوعة) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[20px] sm:text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>الكورسات والمحاضرات (المجانية والمدفوعة)</span>
            </h2>
            <p className="text-[14px] sm:text-sm text-slate-400 mt-1">
              الكورسات المجانية مفتوحة لجميع الطلاب فوراً، والكورسات المدفوعة تتطلب تصريحاً أو اشتراكاً.
            </p>
          </div>

          {/* Toggle between All / Free / Paid */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => setCourseFilter('all')}
              className={`min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                courseFilter === 'all'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setCourseFilter('free')}
              className={`min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                courseFilter === 'free'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span>المجانية</span>
            </button>
            <button
              type="button"
              onClick={() => setCourseFilter('paid')}
              className={`min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                courseFilter === 'paid'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>المدفوعة</span>
            </button>
          </div>
        </div>

        {displayedLectures.length === 0 ? (
          <div className="p-8 sm:p-12 bg-[#091224] border border-slate-800/80 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">لا توجد محاضرات في هذا القسم حالياً</h3>
            <p className="text-[14px] text-slate-400 max-w-md mx-auto">
              سيقوم مستر عمرو السيد بإضافة كورسات ومحاضرات جديدة قريباً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedLectures.map((lec) => {
              const isUnlocked = hasAccessToLecture(lec.id);
              const isFreeCourse = Boolean(lec.isFree || lec.price === 0);
              const canEnterDirectly = isUnlocked || isFreeCourse || isAdmin;
              const lessonsCount = getCourseLessons(lec).length;
              const coverSrc = resolveCourseCover(lec);

              return (
                <div
                  key={lec.id}
                  onClick={() => (onOpenCourse ? onOpenCourse(lec.id) : setSelectedCourseForDetails(lec))}
                  className={`bg-[#091224] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg cursor-pointer group ${
                    isFreeCourse
                      ? 'border-emerald-900/60 hover:border-emerald-500/60 hover:shadow-emerald-900/20'
                      : 'border-slate-800/80 hover:border-cyan-500/50 hover:shadow-cyan-900/20'
                  }`}
                >
                  <div>
                    <div className="relative aspect-video bg-[#050811] overflow-hidden">
                      <img
                        src={coverSrc}
                        alt={lec.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#091224] via-transparent to-transparent" />
                      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-cyan-200 bg-[#050811]/85 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
                          {lec.chapterTitle}
                        </span>
                        {isFreeCourse ? (
                          <span className="text-white bg-emerald-600 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                            <Gift className="w-3.5 h-3.5" />
                            مجاني
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-white bg-cyan-600 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                            <Unlock className="w-3.5 h-3.5" />
                            مفتوح لك
                          </span>
                        ) : (
                          <span className="text-white bg-amber-600 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold tabular-nums">
                            <Lock className="w-3.5 h-3.5" />
                            {lec.price} ج.م
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                        {lec.title}
                      </h3>

                      <p className="text-[14px] text-slate-400 line-clamp-2 leading-relaxed">
                        {lec.description || 'اضغط للدخول إلى الكورس واستعراض المحاضرات والواجبات والامتحانات.'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 tabular-nums">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          {lessonsCount} {lessonsCount === 1 ? 'محاضرة' : 'محاضرات'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          {lec.durationMinutes} دقيقة
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenCourse) {
                          onOpenCourse(lec.id);
                        } else {
                          setActiveTab('lectures');
                        }
                      }}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>{canEnterDirectly ? 'الدخول للكورس' : 'استعراض الكورس'}</span>
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                    </button>

                    {!canEnterDirectly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourseForDetails(lec);
                        }}
                        className="min-h-[44px] py-2 px-4 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 font-bold cursor-pointer shrink-0"
                      >
                        اشتراك
                      </button>
                    )}
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
