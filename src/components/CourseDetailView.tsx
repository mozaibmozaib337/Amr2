import React, { useEffect, useRef, useState } from 'react';
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
  Maximize2,
  LayoutList,
  AlignRight,
} from 'lucide-react';
import {
  CourseLesson,
  GradeLevel,
  Lecture,
  LessonSectionItem,
  LessonSectionKind,
  LessonSubSection,
} from '../types';
import { usePlatform } from '../context/PlatformContext';
import {
  getCourseLessons,
  getSubSectionItems,
  resolveCourseCover,
} from '../utils/courseCovers';
import { parseDriveUrl } from '../utils/linkParser';
import { AssessmentConfig, InteractiveAssessmentSolver } from './InteractiveAssessmentSolver';
import { InlineCourseVideoPlayer } from './InlineCourseVideoPlayer';

interface CourseDetailViewProps {
  course: Lecture;
  onBack: () => void;
  setActiveTab: (tab: string) => void;
}

interface OpenedCourseItem {
  lessonId: string;
  subId: string;
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
    exams,
    homeworks,
    files,
    setIsLoginModalOpen,
    setIsAdminPanelOpen,
    setActiveDocument,
    updateLecture,
  } = usePlatform();

  const lessons = getCourseLessons(course);
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>({});
  const [openedItem, setOpenedItem] = useState<OpenedCourseItem | null>(null);
  const [selectedSubItemId, setSelectedSubItemId] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(course.description || '');

  const contentTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenedItem(null);
    setSelectedSubItemId(null);
    setExpandedLessonIds({});
  }, [course.id]);

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
    text: {
      label: 'محتوى نصي',
      buttonText: 'قراءة المحتوى',
      icon: AlignRight,
      accentClass: 'text-pink-400 bg-pink-950/70 border-pink-700/40',
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

    const subItems = getSubSectionItems(sub);
    setExpandedLessonIds((prev) => ({ ...prev, [lesson.id]: true }));
    setOpenedItem({ lessonId: lesson.id, subId: sub.id });
    setSelectedSubItemId(subItems[0]?.id || null);

    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const activeLesson = openedItem
    ? lessons.find((l) => l.id === openedItem.lessonId) || null
    : null;
  const activeSub =
    activeLesson && openedItem
      ? activeLesson.subSections.find((s) => s.id === openedItem.subId) || null
      : null;

  const isImageUrl = (url: string): boolean => {
    const clean = url.split('?')[0].toLowerCase();
    return (
      clean.startsWith('data:image/') ||
      /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(clean)
    );
  };

  const renderInlineFileOrLink = (
    rawFileUrl: string,
    displayTitle: string,
    fileName?: string,
    externalUrl?: string
  ) => {
    const trimmedFile = rawFileUrl.trim();
    const trimmedExt = (externalUrl || '').trim();
    const activeRawUrl = trimmedFile || trimmedExt;

    if (activeRawUrl) {
      const parsedDrive = parseDriveUrl(activeRawUrl);
      const resolvedUrl = parsedDrive.isValid ? parsedDrive.previewUrl : activeRawUrl;
      const detectedImage = isImageUrl(resolvedUrl);
      const resolvedFileType: 'pdf' | 'image' | 'other' = detectedImage
        ? 'image'
        : trimmedFile || parsedDrive.isValid || /\.pdf(\?|$)/i.test(resolvedUrl)
        ? 'pdf'
        : 'other';

      const handleOpenInPlatformModal = () => {
        setActiveDocument({
          title: displayTitle,
          fileUrl: resolvedUrl,
          fileName:
            fileName ||
            (resolvedFileType === 'image'
              ? `${displayTitle}.png`
              : resolvedFileType === 'pdf'
              ? `${displayTitle}.pdf`
              : displayTitle),
          fileType: resolvedFileType,
        });
      };

      return (
        <div className="w-full min-h-[340px] sm:min-h-[420px] bg-[#091224] border border-cyan-900/40 rounded-2xl shadow-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-600/10">
              {trimmedFile ? (
                <FileText className="w-8 h-8" />
              ) : (
                <ExternalLink className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 truncate">
                {displayTitle}
              </p>
              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-relaxed">
                اضغط{' '}
                <button
                  type="button"
                  onClick={handleOpenInPlatformModal}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-2 cursor-pointer font-extrabold focus:outline-none"
                >
                  هنا
                </button>{' '}
                لفتح الملف!
              </h3>
            </div>

            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={handleOpenInPlatformModal}
                className="min-h-[48px] w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm sm:text-base font-extrabold shadow-lg shadow-cyan-600/30 inline-flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Maximize2 className="w-4 h-4 shrink-0" />
                <span>فتح الملف</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
        <FileText className="w-10 h-10 text-cyan-400 mx-auto" />
        <h3 className="text-base font-bold text-white">{displayTitle}</h3>
        <p className="text-xs sm:text-sm text-slate-400">
          لم يتم إرفاق ملف أو رابط لهذا القسم بعد. يمكنك اختيار قسم آخر من قائمة المحاضرات.
        </p>
      </div>
    );
  };

  const renderSingleSubContent = (
    lesson: CourseLesson,
    sub: LessonSubSection,
    target: LessonSectionItem | LessonSubSection
  ) => {
    const adaptedSub: LessonSubSection = {
      id: target.id,
      title: target.title || sub.title,
      kind: target.kind,
      videoUrl: target.videoUrl,
      fileUrl: target.fileUrl,
      fileName: target.fileName,
      linkedExamId: target.linkedExamId,
      linkedHomeworkId: target.linkedHomeworkId,
      externalUrl: target.externalUrl,
      textContent: target.textContent,
      notes: target.notes,
    };

    // 1. Video Content (explicit video kind or attached videoUrl)
    if (adaptedSub.kind === 'video' || (adaptedSub.kind === 'link' && Boolean(adaptedSub.videoUrl?.trim()))) {
      return (
        <InlineCourseVideoPlayer
          key={`${course.id}-${lesson.id}-${adaptedSub.id}`}
          course={course}
          lesson={lesson}
          subSection={adaptedSub}
        />
      );
    }

    // 2. Text / Explanatory Notes Content
    if (adaptedSub.kind === 'text') {
      return (
        <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/40 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <span className="w-9 h-9 rounded-xl bg-pink-950/70 border border-pink-700/40 text-pink-400 flex items-center justify-center shrink-0">
              <AlignRight className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                {adaptedSub.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">{lesson.title}</p>
            </div>
          </div>

          {adaptedSub.textContent?.trim() ? (
            <div className="p-4 sm:p-5 rounded-xl bg-[#050811] border border-slate-800 text-slate-100 text-xs sm:text-sm leading-loose whitespace-pre-wrap">
              {adaptedSub.textContent}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              لم يتم كتابة نص داخل هذا الجزء بعد.
            </p>
          )}

          {adaptedSub.notes?.trim() && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{adaptedSub.notes}</span>
            </div>
          )}
        </div>
      );
    }

    // 3. Homework / Sheet
    if (adaptedSub.kind === 'homework') {
      const hw = adaptedSub.linkedHomeworkId
        ? homeworks.find((h) => h.id === adaptedSub.linkedHomeworkId)
        : undefined;

      if (hw && hw.questions && hw.questions.length > 0) {
        const hwAssessment: AssessmentConfig = {
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
        };
        return (
          <InteractiveAssessmentSolver
            key={`hw-${hwAssessment.id}-${adaptedSub.id}`}
            assessment={hwAssessment}
            onClose={() => setOpenedItem(null)}
          />
        );
      }

      if (hw?.fileUrl || adaptedSub.fileUrl || adaptedSub.externalUrl) {
        return renderInlineFileOrLink(
          hw?.fileUrl || adaptedSub.fileUrl || '',
          hw?.title || `${lesson.title} — ${adaptedSub.title}`,
          hw?.fileName || adaptedSub.fileName,
          adaptedSub.externalUrl
        );
      }

      return (
        <div className="p-8 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
          <BookCheck className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">{adaptedSub.title}</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            لم يتم ربط أسئلة أو ملف لهذا الواجب بعد.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('homework')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
          >
            الانتقال إلى قسم الواجبات
          </button>
        </div>
      );
    }

    // 4. Exam / Quiz
    if (adaptedSub.kind === 'exam') {
      const ex = adaptedSub.linkedExamId
        ? exams.find((e) => e.id === adaptedSub.linkedExamId)
        : undefined;
      if (ex) {
        const examAssessment: AssessmentConfig = {
          id: ex.id,
          title: ex.title,
          lessonTitle: ex.lessonTitle || lesson.title,
          mode: 'exam',
          grade: ex.grade,
          durationMinutes: ex.durationMinutes,
          totalMarks: ex.totalMarks,
          questions: ex.questions,
        };
        return (
          <InteractiveAssessmentSolver
            key={`exam-${examAssessment.id}-${adaptedSub.id}`}
            assessment={examAssessment}
            onClose={() => setOpenedItem(null)}
          />
        );
      }

      if (adaptedSub.fileUrl || adaptedSub.externalUrl) {
        return renderInlineFileOrLink(
          adaptedSub.fileUrl || '',
          `${lesson.title} — ${adaptedSub.title}`,
          adaptedSub.fileName,
          adaptedSub.externalUrl
        );
      }

      return (
        <div className="p-8 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
          <FileCheck2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">{adaptedSub.title}</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            لم يتم ربط أسئلة لهذا الاختبار بعد.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            الانتقال إلى قسم الامتحانات
          </button>
        </div>
      );
    }

    // 5. PDF / Document / External Link
    const rawFile = (
      adaptedSub.fileUrl ||
      (adaptedSub.kind === 'pdf' ? course.pdfUrl : '') ||
      ''
    ).trim();
    return renderInlineFileOrLink(
      rawFile,
      `${lesson.title} — ${adaptedSub.title}`,
      adaptedSub.fileName,
      adaptedSub.externalUrl
    );
  };

  const renderActiveContent = (lesson: CourseLesson, sub: LessonSubSection) => {
    const subItems = getSubSectionItems(sub);
    if (subItems.length <= 1) {
      return renderSingleSubContent(lesson, sub, subItems[0] || sub);
    }

    const activeItem =
      subItems.find((it) => it.id === selectedSubItemId) || subItems[0];

    return (
      <div className="space-y-3 w-full min-w-0">
        {/* Multi-Item Selector Strip within the Open Section */}
        <div className="p-3 rounded-2xl bg-[#091224] border border-cyan-900/40 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-cyan-300">
              محتويات قسم «{sub.title}» ({subItems.length} عناصر)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {subItems.map((it, idx) => {
              const meta = kindMeta[it.kind] || kindMeta.link;
              const Icon = meta.icon;
              const isSelected = it.id === activeItem.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubItemId(it.id);
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/25'
                      : 'bg-[#050811] border-slate-700 hover:border-cyan-500 text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[190px]">
                    {it.title || `${meta.label} ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {renderSingleSubContent(lesson, sub, activeItem)}
      </div>
    );
  };

  const totalSubSections = lessons.reduce((acc, l) => acc + l.subSections.length, 0);
  const coverSrc = resolveCourseCover(course);
  const linkedCourseFiles = files.filter((f) => f.courseId === course.id);

  // ==================== SPLIT VIEW MODE (Opened Content in Center + Lectures on Left / Bottom on Mobile) ====================
  if (openedItem && activeLesson && activeSub) {
    return (
      <div ref={contentTopRef} className="space-y-4 w-full min-w-0 animate-fade-in">
        {/* Top Action & Return Bar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#091224] border border-cyan-900/40 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenedItem(null)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <LayoutList className="w-4 h-4 shrink-0" />
              <span>العودة لعرض كل المحاضرات</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#050811] border border-slate-700 hover:border-cyan-500 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>الكورسات</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 min-w-0 max-w-full truncate">
            <span className="truncate font-semibold text-slate-300">{course.title}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate text-cyan-400 font-bold">{activeSub.title}</span>
          </div>
        </div>

        {/* Two-Zone Responsive Split:
            - Mobile (<1024px): order-1 (Content) full-width ON TOP, order-2 (Lectures list) BELOW
            - Desktop RTL (1024px+): order-1 (Content) in RIGHT/CENTER main area, order-2 (Lectures list) on LEFT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Active Content Area (Top on Mobile, Center on Desktop) */}
          <div className="order-1 lg:col-span-8 xl:col-span-9 w-full min-w-0">
            {renderActiveContent(activeLesson, activeSub)}
          </div>

          {/* Lectures & SubSections Sidebar (Bottom on Mobile, Left on Desktop) */}
          <aside
            aria-label="قائمة محاضرات وأقسام الكورس"
            className="order-2 lg:col-span-4 xl:col-span-3 w-full min-w-0 bg-[#091224] border border-cyan-900/40 rounded-2xl overflow-hidden shadow-xl lg:sticky lg:top-4"
          >
            <div className="px-4 py-3.5 bg-[#050811] border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                <h2 className="text-sm font-extrabold text-white truncate">محتويات الكورس</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums shrink-0">
                {lessons.length} محاضرات
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[75dvh] overflow-y-auto">
              {lessons.map((lesson, idx) => {
                const isExpanded = Boolean(expandedLessonIds[lesson.id]);
                const hasActiveSub = lesson.id === activeLesson.id;

                return (
                  <div key={lesson.id} className="bg-[#091224]">
                    <button
                      type="button"
                      onClick={() => toggleLesson(lesson.id)}
                      className={`w-full min-h-[52px] px-3.5 py-3 flex items-center justify-between gap-2.5 text-right transition-colors cursor-pointer ${
                        hasActiveSub ? 'bg-cyan-950/35' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums border ${
                            hasActiveSub
                              ? 'bg-cyan-600 border-cyan-500 text-white'
                              : 'bg-[#050811] border-slate-700 text-cyan-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {lesson.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {lesson.subSections.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 bg-[#060b18]/70 border-t border-slate-800/60">
                        {lesson.subSections.length === 0 ? (
                          <p className="text-[11px] text-slate-400 py-2 text-center">
                            لا توجد أقسام مضافة بعد.
                          </p>
                        ) : (
                          lesson.subSections.map((sub) => {
                            const meta = kindMeta[sub.kind] || kindMeta.link;
                            const Icon = meta.icon;
                            const isCurrentSub =
                              lesson.id === activeLesson.id && sub.id === activeSub.id;

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleOpenSubSection(lesson, sub)}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-right flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                  isCurrentSub
                                    ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-sm'
                                    : 'bg-[#091224] border-slate-800 hover:border-cyan-500/50 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.accentClass}`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{sub.title}</p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {meta.label}
                                    </p>
                                  </div>
                                </div>

                                {isCurrentSub && (
                                  <span className="text-[10px] font-bold text-cyan-300 shrink-0 whitespace-nowrap">
                                    مفتوح
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ==================== DEFAULT COURSE ENTRY VIEW (Hero + Centered Single-Column Lectures Accordion) ====================
  return (
    <div ref={contentTopRef} className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#091224] border border-slate-800 hover:border-cyan-500/60 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-cyan-400" />
          <span>العودة إلى الكورسات</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAdminPanelOpen(true)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs font-bold transition-colors cursor-pointer"
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
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold flex-wrap">
              <span>{gradeLabels[course.grade]}</span>
              <span>·</span>
              <span className="tabular-nums">{lessons.length} محاضرات</span>
              <span>·</span>
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
                    className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-bold cursor-pointer transition-colors"
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
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
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
                      className="min-h-[40px] px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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

      {/* Centered Single-Column Lectures Accordion List */}
      <div className="max-w-4xl mx-auto w-full space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>محتوى الكورس والمحاضرات ({lessons.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            اضغط على السهم بجانب أي محاضرة لعرض أو إخفاء الأقسام بداخلها
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
                  aria-expanded={isExpanded}
                  onClick={() => toggleLesson(lesson.id)}
                  className="w-full min-h-[56px] px-4 sm:px-5 py-4 flex items-center justify-between gap-3 text-right hover:bg-slate-800/30 transition-colors cursor-pointer"
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

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-[#050811] border border-slate-700 text-[11px] font-semibold text-slate-300 tabular-nums whitespace-nowrap">
                      {lesson.subSections.length} أقسام
                    </span>
                    <span className="w-9 h-9 rounded-xl bg-[#050811] border border-slate-800 flex items-center justify-center shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </span>
                  </div>
                </button>

                {/* Accordion Body: Sub-Sections */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-2.5 bg-[#060b18]/60">
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

        {linkedCourseFiles.length > 0 && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>ملفات ومذكرات مرتبطة بالكورس ({linkedCourseFiles.length})</span>
              </h3>
            </div>
            <div className="space-y-2.5">
              {linkedCourseFiles.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (!currentUser) {
                      setIsLoginModalOpen(true);
                      return;
                    }
                    if (!canAccessContent) {
                      setSelectedCourseForDetails(course);
                      return;
                    }
                    setActiveDocument(doc);
                  }}
                  className="p-3.5 rounded-xl bg-[#091224] border border-slate-800 hover:border-cyan-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl border text-blue-400 bg-blue-950/70 border-blue-700/40 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {doc.title}
                        </h4>
                        {doc.category && (
                          <span className="text-[11px] font-semibold text-slate-400 bg-[#050811] px-2 py-0.5 rounded border border-slate-800">
                            {doc.category}
                          </span>
                        )}
                      </div>
                      {doc.lessonTitle && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {doc.lessonTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!currentUser) {
                        setIsLoginModalOpen(true);
                        return;
                      }
                      if (!canAccessContent) {
                        setSelectedCourseForDetails(course);
                        return;
                      }
                      setActiveDocument(doc);
                    }}
                    className={`min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                      canAccessContent
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/25'
                        : 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                    }`}
                  >
                    {canAccessContent ? (
                      <>
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>عرض الملف</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>{!currentUser ? 'سجّل الدخول للفتح' : 'اشترك للفتح'}</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
