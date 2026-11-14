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
  BookOpen,
  Edit3,
  Save,
  X,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { PerformanceAnalyticsSection } from './PerformanceAnalyticsSection';
import { getCourseLessons, resolveCourseCover } from '../utils/courseCovers';
import { Lecture } from '../types';

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
    updateLecture,
  } = usePlatform();

  const [courseFilter, setCourseFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [editingDescCourse, setEditingDescCourse] = useState<Lecture | null>(null);
  const [descDraft, setDescDraft] = useState('');
  const [isSavingDesc, setIsSavingDesc] = useState(false);

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

  const handleProtectedNavigate = (tab: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleEnterCourse = (lec: Lecture) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const isUnlocked = hasAccessToLecture(lec.id);
    const isFreeCourse = Boolean(lec.isFree || lec.price === 0);
    if (isUnlocked || isFreeCourse || isAdmin) {
      if (onOpenCourse) {
        onOpenCourse(lec.id);
      } else {
        setActiveTab('lectures');
      }
      return;
    }
    setSelectedCourseForDetails(lec);
  };

  const handleReadCourseContents = (lec: Lecture) => {
    if (onOpenCourse) {
      onOpenCourse(lec.id);
    } else {
      setActiveTab('lectures');
    }
  };

  const openDescriptionEditor = (lec: Lecture, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDescCourse(lec);
    setDescDraft(lec.description || '');
  };

  const handleSaveCourseDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDescCourse) return;
    setIsSavingDesc(true);
    try {
      await updateLecture(editingDescCourse.id, { description: descDraft.trim() });
      setEditingDescCourse(null);
    } finally {
      setIsSavingDesc(false);
    }
  };

  return (
    <div className="space-y-7 sm:space-y-10 animate-fade-in pb-12">
      {/* 1. Hero Welcome Card (Top of HomeDashboard with Mr. Amr El-Sayed's Photo) */}
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
                onClick={() => handleProtectedNavigate('exams')}
                className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>الامتحانات وبنك الأسئلة</span>
              </button>

              <button
                type="button"
                onClick={() => handleProtectedNavigate('top_rankings')}
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

      {/* 2. FEATURED COURSES SECTION (Immediately Below Hero Welcome Card) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[20px] sm:text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>الكورسات والمحاضرات (المجانية والمدفوعة)</span>
            </h2>
            <p className="text-[14px] sm:text-sm text-slate-400 mt-1">
              يمكنك قراءة وصف ومحتويات أي كورس مجاناً، وللدخول إلى الدروس والمحاضرات يجب تسجيل الدخول والاشتراك.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(true)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>إضافة كورس ووصف</span>
              </button>
            )}

            {/* Toggle between All / Free / Paid */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 text-xs sm:text-sm font-bold">
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
              const canEnterDirectly = Boolean(currentUser) && (isUnlocked || isFreeCourse || isAdmin);
              const lessonsCount = getCourseLessons(lec).length;
              const coverSrc = resolveCourseCover(lec);

              return (
                <div
                  key={lec.id}
                  onClick={() => handleEnterCourse(lec)}
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
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                          {lec.title}
                        </h3>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => openDescriptionEditor(lec, e)}
                            title="تعديل وصف الكورس"
                            className="shrink-0 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-600/30 border border-slate-700 hover:border-cyan-500/50 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>وصف</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[14px] text-slate-400 line-clamp-2 leading-relaxed">
                        {lec.description || 'اضغط لقراءة محتويات الكورس والاطلاع على المحاضرات والواجبات والامتحانات.'}
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
                        handleEnterCourse(lec);
                      }}
                      className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        !currentUser
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : canEnterDirectly
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25'
                      }`}
                    >
                      {!currentUser ? (
                        <>
                          <LogIn className="w-4 h-4 shrink-0" />
                          <span>الدخول للكورس</span>
                        </>
                      ) : canEnterDirectly ? (
                        <>
                          <span>الدخول للكورس</span>
                          <ArrowLeft className="w-4 h-4 shrink-0" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 shrink-0" />
                          <span>الدخول للكورس</span>
                        </>
                      )}
                    </button>

                    {!canEnterDirectly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReadCourseContents(lec);
                        }}
                        className="min-h-[44px] py-2 px-3.5 rounded-xl bg-[#050811] border border-slate-700 hover:border-cyan-500 text-slate-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>قراءة المحتويات</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Live Student Progress Tracking Card */}
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

      {/* 4. Metrics Row */}
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
          onClick={() => handleProtectedNavigate('exams')}
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
          onClick={() => handleProtectedNavigate('homework')}
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
          onClick={() => handleProtectedNavigate('wallet')}
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

      {/* 5. PERSONAL STUDENT PROGRESS & PERFORMANCE ANALYTICS */}
      <PerformanceAnalyticsSection />

      {/* Teacher Quick Course Description Editor Modal */}
      {editingDescCourse && isAdmin && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingDescCourse(null)}
        >
          <form
            onSubmit={handleSaveCourseDescription}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b1329] border border-cyan-700/60 rounded-2xl w-full max-w-lg p-5 text-slate-100 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>تعديل وصف الكورس: {editingDescCourse.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingDescCourse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                وصف الكورس وما يتعلمه الطالب داخل المنهج:
              </label>
              <textarea
                rows={4}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder="اكتب وصفاً واضحاً لمحتويات الكورس والدروس والملفات المشمولة..."
                className="w-full bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDescCourse(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSavingDesc}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingDesc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ الوصف</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
