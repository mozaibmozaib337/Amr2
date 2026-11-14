import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Play,
  FileText,
  BookCheck,
  FileCheck2,
  ExternalLink,
  Lock,
  Unlock,
  Gift,
  Info,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Edit3,
  Save,
  LogIn,
} from 'lucide-react';
import {
  CourseLesson,
  GradeLevel,
  Lecture,
  LessonSectionKind,
  LessonSubSection,
} from '../types';
import { usePlatform } from '../context/PlatformContext';
import { getCourseLessons, resolveCourseCover } from '../utils/courseCovers';
import { parseDriveUrl, parseVideoUrl } from '../utils/linkParser';
import { openExternalSafe } from '../utils/safeExternalLink';
import { AssessmentConfig, InteractiveAssessmentSolver } from './InteractiveAssessmentSolver';

interface CourseDetailViewProps {
  course: Lecture;
  onBack: () => void;
  setActiveTab: (tab: string) => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  onBack,
  setActiveTab,
}) => {
  const {
    currentUser,
    hasAccessToLecture,
    setSelectedCourseForDetails,
    setActiveVideo,
    setActiveDocument,
    recordLectureEntry,
    exams,
    homeworks,
    setIsLoginModalOpen,
    setIsAdminPanelOpen,
    updateLecture,
  } = usePlatform();

  const lessons = getCourseLessons(course);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (lessons[0]) initial[lessons[0].id] = true;
    return initial;
  });
  const [activeAssessment, setActiveAssessment] = useState<AssessmentConfig | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(course.description || '');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'secretary';
  const isFreeCourse = Boolean(course.isFree || course.price === 0);
  const isUnlocked = hasAccessToLecture(course.id);
  const canAccessContent = isAdmin || (Boolean(currentUser) && (isFreeCourse || isUnlocked));

  const gradeLabels: Record<GradeLevel, string> = {
    sec1: 'الصف الأول الثانوي',
    sec2: 'الصف الثاني الثانوي',
    sec3: 'الصف الثالث الثانوي',
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessonIds((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  const kindMeta: Record<
    LessonSectionKind,
    { label: string; buttonText: string; icon: React.ComponentType<{ className?: string }>; accentClass: string }
  > = {
    video: {
      label: 'فيديو شرح',
      buttonText: 'تشغيل الفيديو',
      icon: Play,
      accentClass: 'text-cyan-400 bg-cyan-950/70 border-cyan-700/40',
    },
    pdf: {
      label: 'مذكرة / ملف PDF',
      buttonText: 'عرض الملف',
      icon: FileText,
      accentClass: 'text-blue-400 bg-blue-950/70 border-blue-700/40',
    },
    homework: {
      label: 'واجب / شيت',
      buttonText: 'فتح وتسليم الواجب',
      icon: BookCheck,
      accentClass: 'text-amber-400 bg-amber-950/70 border-amber-700/40',
    },
    exam: {
      label: 'امتحان إلكتروني',
      buttonText: 'بدء الاختبار',
      icon: FileCheck2,
      accentClass: 'text-emerald-400 bg-emerald-950/70 border-emerald-700/40',
    },
    link: {
      label: 'مرجع / رابط',
      buttonText: 'فتح المحتوى',
      icon: ExternalLink,
      accentClass: 'text-violet-400 bg-violet-950/70 border-violet-700/40',
    },
  };

  const showTempNotice = (msg: string) => {
    setInlineNotice(msg);
    setTimeout(() => setInlineNotice(null), 4000);
  };

  const handleOpenSubSection = (lesson: CourseLesson, sub: LessonSubSection) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!canAccessContent) {
      setSelectedCourseForDetails(course);
      return;
    }

    if (sub.kind === 'video') {
      const rawUrl = (sub.videoUrl || course.videoUrl || '').trim();
      if (!rawUrl) {
        showTempNotice('لم يقم المعلم بإرفاق رابط الفيديو لهذا القسم بعد.');
        return;
      }
      const parsed = parseVideoUrl(rawUrl);
      const playableUrl = parsed.isValid ? parsed.embedUrl : rawUrl;
      recordLectureEntry(course.id, `${course.title} — ${lesson.title}`);
      setActiveVideo({
        ...course,
        title: `${course.title} — ${lesson.title} (${sub.title})`,
        videoUrl: playableUrl,
      });
      return;
    }

    if (sub.kind === 'pdf') {
      const rawFile = (sub.fileUrl || course.pdfUrl || '').trim();
      if (!rawFile) {
        showTempNotice('لم يتم إرفاق ملف PDF لهذا القسم بعد.');
        return;
      }
      const parsedDrive = parseDriveUrl(rawFile);
      const displayUrl = parsedDrive.isValid ? parsedDrive.previewUrl : rawFile;
      setActiveDocument({
        title: `${lesson.title} — ${sub.title}`,
        fileUrl: displayUrl,
        fileName: sub.fileName || `${sub.title}.pdf`,
        fileType: 'pdf',
      });
      return;
    }

    if (sub.kind === 'homework') {
      if (sub.linkedHomeworkId) {
        const hw = homeworks.find((h) => h.id === sub.linkedHomeworkId);
        if (hw) {
          if (!currentUser) {
            setIsLoginModalOpen(true);
            return;
          }
          if (hw.questions && hw.questions.length > 0) {
            setActiveAssessment({
              id: hw.id,
              title: hw.title,
              lessonTitle: hw.lessonTitle || lesson.title,
              mode: hw.kind === 'sheet' ? 'sheet' : 'homework',
              grade: hw.grade,
              durationMinutes: hw.durationMinutes,
              totalMarks: hw.totalMarks,
              questions: hw.questions,
              fileUrl: hw.fileUrl,
              fileName: hw.fileName,
              fileType: hw.fileType,
            });
            return;
          }
          if (hw.fileUrl) {
            setActiveDocument({
              title: hw.title,
              fileUrl: hw.fileUrl,
              fileName: hw.fileName || `${hw.title}.pdf`,
              fileType: hw.fileType || 'pdf',
            });
            return;
          }
        }
      }
      if (sub.fileUrl) {
        const parsedDrive = parseDriveUrl(sub.fileUrl);
        setActiveDocument({
          title: `${lesson.title} — ${sub.title}`,
          fileUrl: parsedDrive.isValid ? parsedDrive.previewUrl : sub.fileUrl,
          fileName: sub.fileName || `${sub.title}.pdf`,
          fileType: 'pdf',
        });
        return;
      }
      if (sub.externalUrl) {
        openExternalSafe(sub.externalUrl);
        return;
      }
      setActiveTab('homework');
      return;
    }

    if (sub.kind === 'exam') {
      if (sub.linkedExamId) {
        const ex = exams.find((e) => e.id === sub.linkedExamId);
        if (ex) {
          if (!currentUser) {
            setIsLoginModalOpen(true);
            return;
          }
          setActiveAssessment({
            id: ex.id,
            title: ex.title,
            lessonTitle: ex.lessonTitle || lesson.title,
            mode: 'exam',
            grade: ex.grade,
            durationMinutes: ex.durationMinutes,
            totalMarks: ex.totalMarks,
            questions: ex.questions,
          });
          return;
        }
      }
      if (sub.externalUrl) {
        openExternalSafe(sub.externalUrl);
        return;
      }
      setActiveTab('exams');
      return;
    }

    if (sub.externalUrl) {
      openExternalSafe(sub.externalUrl);
    } else if (sub.fileUrl) {
      setActiveDocument({
        title: `${lesson.title} — ${sub.title}`,
        fileUrl: sub.fileUrl,
        fileName: sub.fileName || `${sub.title}.pdf`,
        fileType: 'pdf',
      });
    } else {
      showTempNotice('لم يتم ربط محتوى لهذا القسم الفرعي بعد.');
    }
  };

  if (activeAssessment) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveAssessment(null)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#091224] border border-slate-700 text-xs font-bold text-slate-200 hover:border-cyan-500 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى محتوى الكورس ({course.title})</span>
        </button>

        <InteractiveAssessmentSolver
          assessment={activeAssessment}
          onClose={() => setActiveAssessment(null)}
        />
      </div>
    );
  }

  const totalSubSections = lessons.reduce((acc, l) => acc + l.subSections.length, 0);
  const coverSrc = resolveCourseCover(course);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#091224] border border-slate-800 hover:border-cyan-500/60 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-cyan-400" />
          <span>العودة إلى الكورسات</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAdminPanelOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>إدارة محاضرات وأقسام الكورس من لوحة التحكم</span>
          </button>
        )}
      </div>

      {/* Inline Notice */}
      {inlineNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{inlineNotice}</span>
        </div>
      )}

      {/* Course Hero Card */}
      <div className="bg-[#091224] border border-cyan-900/40 rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 relative bg-[#050811] aspect-video lg:aspect-auto min-h-[230px]">
          <img
            src={coverSrc}
            alt={course.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050811]/90 via-transparent to-transparent" />
          <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#050811]/85 border border-cyan-700/50 text-cyan-300 text-[11px] font-bold">
              {course.chapterTitle}
            </span>
            {isFreeCourse ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" />
                مجاني
              </span>
            ) : isUnlocked ? (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-600 text-white text-[11px] font-bold flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" />
                مشترك بالفعل
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold tabular-nums">
                {course.price} ج.م
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold">
              <span>{gradeLabels[course.grade]}</span>
              <span>•</span>
              <span className="tabular-nums">{lessons.length} محاضرات</span>
              <span>•</span>
              <span className="tabular-nums">{totalSubSections} قسم محتوى</span>
            </div>

            <h1 className="text-xl lg:text-2xl font-extrabold text-white leading-snug">
              {course.title}
            </h1>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-cyan-400">وصف الكورس:</span>
                {isAdmin && !isEditingDescription && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftDescription(course.description || '');
                      setIsEditingDescription(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{course.description ? 'تعديل وصف الكورس' : 'إضافة وصف للكورس'}</span>
                  </button>
                )}
              </div>

              {isEditingDescription && isAdmin ? (
                <div className="space-y-2 p-3 rounded-2xl bg-[#050811] border border-cyan-700/50">
                  <textarea
                    rows={3}
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="اكتب وصفاً واضحاً لمحتوى الكورس وأهدافه ليراه الطلاب قبل الاشتراك..."
                    className="w-full bg-[#091224] border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateLecture(course.id, { description: draftDescription.trim() });
                        setIsEditingDescription(false);
                        showTempNotice('تم حفظ وصف الكورس على المنصة وقاعدة البيانات بنجاح.');
                      }}
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ الوصف</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {course.description || 'كورس متكامل يشمل شرح المحاضرات بالتفصيل، تسليم الواجبات، والامتحانات التفاعلية لمتابعة مستواك خطوة بخطوة.'}
                </p>
              )}
            </div>

            {/* Important Instructions Callout */}
            <div className="p-3.5 rounded-2xl bg-[#050811] border border-cyan-800/40 space-y-1">
              <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>تعليمات هامة للطالب قبل البدء:</span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {course.instructions?.trim() ||
                  'شاهد فيديو شرح المحاضرة أولاً مع تدوين الملاحظات، ثم حمل المذكرة وحل الواجب قبل الدخول إلى الاختبار التفاعلي لضمان تثبيت المعلومات بنسبة 100%.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 tabular-nums">
                <Clock className="w-4 h-4 text-cyan-400" />
                {course.durationMinutes} دقيقة
              </span>
              {course.scheduleText && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  {course.scheduleText}
                </span>
              )}
            </div>

            {!currentUser ? (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-cyan-600/25 flex items-center gap-2 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>سجّل الدخول للاشتراك وفتح الكورس</span>
              </button>
            ) : !canAccessContent ? (
              <button
                type="button"
                onClick={() => setSelectedCourseForDetails(course)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-600/25 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>الاشتراك في الكورس الآن ({course.price} ج.م)</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>الكورس مفتوح لك بالكامل — اختر المحاضرة بالأسفل</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Read-Only Curriculum Banner (Guests & Unsubscribed Students) */}
      {!canAccessContent && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-200 leading-relaxed">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              {!currentUser
                ? 'أنت تستعرض الآن وصف ومحتويات الكورس فقط — يمكنك الاطلاع على أسماء المحاضرات والأقسام لمعرفة ما بداخل الكورس، ولفتح وتشغيل الفيديوهات والملفات يجب تسجيل الدخول والاشتراك أولاً.'
                : 'أنت الآن في وضع قراءة وصف ومحتويات الكورس فقط — يمكنك قراءة أسماء المحاضرات والأقسام والتعليمات، وللدخول وتشغيل الفيديوهات أو فتح الملفات يجب الاشتراك في الكورس أولاً.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => (!currentUser ? setIsLoginModalOpen(true) : setSelectedCourseForDetails(course))}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            {!currentUser ? <LogIn className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
            <span>{!currentUser ? 'تسجيل الدخول للفتح' : 'اشترك للدخول للكورس الآن'}</span>
          </button>
        </div>
      )}

      {/* Course Curriculum Accordion: Lessons -> SubSections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>محتوى الكورس والمحاضرات ({lessons.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            اضغط على اسم المحاضرة لعرض الأقسام والملفات والاختبارات بداخلها
          </span>
        </div>

        <div className="space-y-3">
          {lessons.map((lesson, idx) => {
            const isExpanded = Boolean(expandedLessonIds[lesson.id]);
            return (
              <div
                key={lesson.id}
                className="bg-[#091224] border border-slate-800 rounded-2xl overflow-hidden transition-colors"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleLesson(lesson.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-right hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {lesson.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-[#050811] border border-slate-700 text-[11px] font-semibold text-slate-300 tabular-nums">
                      {lesson.subSections.length} أقسام
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Body: Independent Editable Sub-Sections */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-2.5 bg-[#060b18]/60">
                    {lesson.subSections.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        لا توجد أقسام مضافة في هذه المحاضرة بعد.
                      </p>
                    ) : (
                      lesson.subSections.map((sub) => {
                        const meta = kindMeta[sub.kind] || kindMeta.link;
                        const Icon = meta.icon;
                        return (
                          <div
                            key={sub.id}
                            onClick={() => handleOpenSubSection(lesson, sub)}
                            className="p-3.5 rounded-xl bg-[#091224] border border-slate-800 hover:border-cyan-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.accentClass}`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                    {sub.title}
                                  </h4>
                                  <span className="text-[11px] font-semibold text-slate-400 bg-[#050811] px-2 py-0.5 rounded border border-slate-800">
                                    {meta.label}
                                  </span>
                                </div>
                                {sub.notes && (
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                    {sub.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSubSection(lesson, sub);
                              }}
                              className={`min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                                canAccessContent
                                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/25'
                                  : 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                              }`}
                            >
                              {canAccessContent ? (
                                <>
                                  <Icon className="w-4 h-4 shrink-0" />
                                  <span>{meta.buttonText}</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 shrink-0" />
                                  <span>{!currentUser ? 'سجّل الدخول للفتح' : 'اشترك للفتح'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
