import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  PlaySquare,
  Lock,
  Unlock,
  Clock,
  PlusCircle,
  BookOpen,
  Gift,
  Flame,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Video,
  X,
  Layers,
  Calendar,
  ArrowLeft,
  Sliders,
} from 'lucide-react';
import { parseVideoUrl } from '../utils/linkParser';
import { getCourseLessons, resolveCourseCover } from '../utils/courseCovers';
import { CourseDetailView } from './CourseDetailView';
import { GradeLevel } from '../types';

interface LecturesSectionProps {
  onlyEnrolled?: boolean;
  setActiveTab?: (tab: string) => void;
  openedCourseId?: string | null;
  setOpenedCourseId?: (id: string | null) => void;
}

export const LecturesSection: React.FC<LecturesSectionProps> = ({
  onlyEnrolled = false,
  setActiveTab = () => {},
  openedCourseId: controlledCourseId,
  setOpenedCourseId: setControlledCourseId,
}) => {
  const {
    lectures,
    activeGrade,
    setSelectedCourseForDetails,
    hasAccessToLecture,
    currentUser,
    setIsAdminPanelOpen,
    addLecture,
  } = usePlatform();

  const [courseFilter, setCourseFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [internalCourseId, setInternalCourseId] = useState<string | null>(null);
  const openedCourseId = controlledCourseId !== undefined ? controlledCourseId : internalCourseId;
  const setOpenedCourseId = setControlledCourseId || setInternalCourseId;

  useEffect(() => {
    if (controlledCourseId === undefined) {
      setInternalCourseId(null);
    }
  }, [onlyEnrolled, controlledCourseId]);

  // Quick Verified Submission Form State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureChapter, setLectureChapter] = useState('الباب الأول');
  const [lectureDuration, setLectureDuration] = useState('60');
  const [lecturePrice, setLecturePrice] = useState('50');
  const [isFreeLecture, setIsFreeLecture] = useState(false);
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerifyVideoLink = () => {
    if (!quickUrl.trim()) {
      setFormNotice({ type: 'error', message: '⚠️ برجاء كتابة رابط فيديو يوتيوب أو جوجل درايف أولاً.' });
      return;
    }
    setFormNotice(null);
    const parsed = parseVideoUrl(quickUrl);
    if (!parsed.isValid) {
      setFormNotice({
        type: 'error',
        message: parsed.error || '⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط يوتيوب أو جوجل درايف صالح.',
      });
      return;
    }

    setFormNotice({
      type: 'success',
      message:
        parsed.provider === 'drive'
          ? `✅ تم التحقق من رابط Google Drive وتحويله للبث المباشر! معرّف الملف: (${parsed.id})`
          : `✅ تم التحقق من رابط يوتيوب بنجاح! معرّف الفيديو: (${parsed.id})`,
    });
    if (!lectureTitle.trim()) {
      setLectureTitle(
        parsed.provider === 'drive'
          ? `كورس كيمياء (Drive) - ${parsed.id.substring(0, 8)}`
          : `كورس كيمياء - فيديو ${parsed.id}`
      );
    }
  };

  const handleSubmitVerifiedLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureTitle.trim() || !quickUrl.trim()) {
      setFormNotice({ type: 'error', message: '⚠️ برجاء إكمال العنوان والرابط.' });
      return;
    }

    const parsed = parseVideoUrl(quickUrl);
    if (!parsed.isValid) {
      setFormNotice({
        type: 'error',
        message: parsed.error || '⚠️ الرابط المدخل غير صالح (يدعم YouTube أو Google Drive فقط).',
      });
      return;
    }

    setIsSubmitting(true);
    setFormNotice(null);

    try {
      const res = await addLecture({
        title: lectureTitle.trim(),
        description: `كورس كيمياء معتمد لمنصة مستر عمرو السيد (${lectureDuration} دقيقة)`,
        chapterTitle: lectureChapter,
        grade: activeGrade === 'all' ? 'sec3' : activeGrade,
        durationMinutes: Number(lectureDuration) || 60,
        videoUrl: parsed.embedUrl,
        videoFileName: `${parsed.provider}_${parsed.id}.mp4`,
        videoFileSize: parsed.provider === 'drive' ? 'Google Drive HD' : 'YouTube HD',
        price: isFreeLecture ? 0 : Number(lecturePrice) || 50,
        isFree: isFreeLecture,
        provider: parsed.provider,
        external_id: parsed.id,
        original_url: quickUrl.trim(),
      });

      if (res && !res.success) {
        const errorMsg = res.errorMessage || 'فشل الحفظ في قاعدة البيانات Supabase';
        setFormNotice({ type: 'error', message: `❌ خطأ Supabase: ${errorMsg}` });
      } else {
        setFormNotice({ type: 'success', message: '⚡ تم حفظ الكورس بنجاح في قاعدة البيانات Supabase!' });
        setTimeout(() => {
          setShowQuickAddModal(false);
          setQuickUrl('');
          setLectureTitle('');
          setFormNotice(null);
        }, 1200);
      }
    } catch (err: any) {
      setFormNotice({ type: 'error', message: `❌ حدث خطأ غير متوقع: ${err?.message || err}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'secretary';
  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;

  const gradeLabels: Record<GradeLevel, string> = {
    sec1: 'أولى ثانوي',
    sec2: 'تانية ثانوي',
    sec3: 'تالتة ثانوي',
  };

  // Look up live course so admin updates reflect immediately
  const openedCourse = openedCourseId
    ? lectures.find((l) => l.id === openedCourseId) || null
    : null;

  if (openedCourse) {
    return (
      <CourseDetailView
        course={openedCourse}
        onBack={() => setOpenedCourseId(null)}
        setActiveTab={setActiveTab}
      />
    );
  }

  const gradeLectures = lectures.filter((lec) => {
    if (studentGrade !== 'all' && lec.grade !== studentGrade) return false;
    if (onlyEnrolled) {
      const isFree = lec.isFree || lec.price === 0;
      return isAdmin || isFree || hasAccessToLecture(lec.id);
    }
    return true;
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
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] sm:text-2xl font-bold text-white flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>
              {onlyEnrolled ? 'كورساتي الحالية والمجانية' : 'الكورسات والمحاضرات التعليمية'}
            </span>
          </h2>
          <p className="text-[14px] text-slate-400 mt-1.5 leading-relaxed">
            {onlyEnrolled
              ? 'جميع الكورسات المشترك بها والمحاضرات المجانية المفتوحة لك لمتابعة الشرح والواجبات والاختبارات.'
              : 'تصفح الكورسات حسب منهجك، وادخل لأي كورس لاستعراض المحاضرات والأقسام والواجبات والامتحانات بداخله.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(true)}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-[#050811] border border-amber-500/40 text-amber-300 hover:bg-amber-600/20 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shrink-0"
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <span>إدارة الكورسات والأقسام</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-600/30"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>إضافة سريعة ⚡</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Free vs Paid Filter Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
            جميع الكورسات ({gradeLectures.length})
          </button>
          <button
            type="button"
            onClick={() => setCourseFilter('free')}
            className={`min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              courseFilter === 'free'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5 shrink-0" />
            <span>الكورسات المجانية ({freeLectures.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCourseFilter('paid')}
            className={`min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              courseFilter === 'paid'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>الكورسات المدفوعة ({paidLectures.length})</span>
          </button>
        </div>
      </div>

      {/* Courses Grid Cards */}
      {displayedLectures.length === 0 ? (
        <div className="p-12 bg-[#091224] border border-slate-800/80 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {onlyEnrolled ? 'لا توجد كورسات مفعّلة في حسابك حالياً' : 'لا توجد كورسات في هذا القسم حالياً'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {onlyEnrolled
              ? 'يمكنك تصفح جميع الكورسات والاشتراك عبر المحفظة أو كود السنتر لتظهر هنا فوراً.'
              : 'سيقوم مستر عمرو السيد برفع كورسات ومحاضرات هذا القسم قريباً.'}
          </p>
          {onlyEnrolled && (
            <button
              type="button"
              onClick={() => setActiveTab('lectures')}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
            >
              تصفح جميع الكورسات
            </button>
          )}
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
              <article
                key={lec.id}
                onClick={() => setOpenedCourseId(lec.id)}
                className={`bg-[#091224] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg cursor-pointer group ${
                  isFreeCourse
                    ? 'border-emerald-900/60 hover:border-emerald-500/60 hover:shadow-emerald-900/20'
                    : 'border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-900/20'
                }`}
              >
                <div>
                  {/* Course Cover Image */}
                  <div className="relative aspect-video bg-[#050811] overflow-hidden">
                    <img
                      src={coverSrc}
                      alt={lec.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#091224] via-[#091224]/25 to-transparent" />

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-cyan-200 bg-[#050811]/85 px-2.5 py-1 rounded-lg border border-cyan-700/50">
                        {lec.chapterTitle}
                      </span>

                      {isFreeCourse ? (
                        <span className="text-white bg-emerald-600 px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold shadow">
                          <Gift className="w-3.5 h-3.5" />
                          مجاني
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-white bg-cyan-600 px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold shadow">
                          <Unlock className="w-3.5 h-3.5" />
                          مشترك بالفعل
                        </span>
                      ) : (
                        <span className="text-white bg-amber-600 px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold tabular-nums shadow">
                          <Lock className="w-3.5 h-3.5" />
                          {lec.price} ج.م
                        </span>
                      )}
                    </div>

                    {/* Bottom Grade & Lesson Count */}
                    <div className="absolute bottom-2.5 right-3 left-3 flex items-center justify-between text-[11px] text-slate-200 font-semibold">
                      <span>{gradeLabels[lec.grade]}</span>
                      <span className="flex items-center gap-1 bg-[#050811]/80 px-2 py-0.5 rounded-md border border-slate-700/70 tabular-nums">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        {lessonsCount} {lessonsCount === 1 ? 'محاضرة' : 'محاضرات'}
                      </span>
                    </div>
                  </div>

                  {/* Course Card Body */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                      {lec.title}
                    </h3>

                    <p className="text-[14px] text-slate-300 line-clamp-2 leading-relaxed">
                      {lec.description || 'انقر للدخول إلى الكورس واستعراض المحاضرات، الواجبات، والامتحانات التفاعلية.'}
                    </p>

                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {lec.durationMinutes} دقيقة
                      </span>
                      {lec.scheduleText ? (
                        <span className="flex items-center gap-1 truncate text-xs">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{lec.scheduleText}</span>
                        </span>
                      ) : (
                        <span className="font-bold text-white tabular-nums">
                          {isFreeCourse ? (
                            <span className="text-emerald-400">مجاني 100%</span>
                          ) : (
                            <span>{lec.price} ج.م</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenedCourseId(lec.id);
                    }}
                    className={`flex-1 min-h-[44px] font-bold flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                      canEnterDirectly
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25'
                        : 'bg-[#050811] border border-slate-700 hover:border-cyan-500 text-slate-200'
                    }`}
                  >
                    <span>{canEnterDirectly ? 'الدخول للكورس' : 'استعراض المنهج'}</span>
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                  </button>

                  {!canEnterDirectly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseForDetails(lec);
                      }}
                      className="min-h-[44px] font-bold flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer shrink-0"
                    >
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>الإشتراك</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* QUICK VERIFIED LECTURE SUBMISSION MODAL */}
      {showQuickAddModal && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQuickAddModal(false)}
        >
          <div
            className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-xl p-5 text-slate-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                <span>إضافة سريعة لكورس برابط YouTube أو Google Drive</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  formNotice.type === 'error'
                    ? 'bg-red-950/70 border border-red-500/40 text-red-200'
                    : 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-200'
                }`}
              >
                {formNotice.type === 'error' ? (
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{formNotice.message}</span>
              </div>
            )}

            <form noValidate onSubmit={handleSubmitVerifiedLecture} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  رابط يوتيوب أو رابط فيديو جوجل درايف (/file/d/ID/view أو ?id=ID):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... أو https://drive.google.com/file/d/.../view"
                    className="flex-1 bg-[#050811] border border-cyan-900/60 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyVideoLink}
                    disabled={!quickUrl.trim()}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-md"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>تأكيد وفحص</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-slate-300">عنوان الكورس / المحاضرة</label>
                <input
                  type="text"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="مثال: كورس الباب الأول: العناصر الانتقالية"
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">المدة (بالدقائق)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={lectureDuration}
                    onChange={(e) => setLectureDuration(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">اسم الباب / الفصل</label>
                  <input
                    type="text"
                    value={lectureChapter}
                    onChange={(e) => setLectureChapter(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    disabled={isFreeLecture}
                    value={isFreeLecture ? '0' : lecturePrice}
                    onChange={(e) => setLecturePrice(e.target.value)}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="freeLecQuick"
                  checked={isFreeLecture}
                  onChange={(e) => setIsFreeLecture(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="freeLecQuick" className="text-xs text-slate-300 cursor-pointer">
                  كورس مجاني ومتاح لكافة الطلاب
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ في Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ الكورس في Supabase ⚡</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
