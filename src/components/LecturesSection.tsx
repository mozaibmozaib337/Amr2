import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  PlaySquare,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  ArrowLeft,
  PlusCircle,
  BookOpen,
  Gift,
  Flame,
  Play,
  Info,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Video,
  X,
} from 'lucide-react';
import { parseVideoUrl } from '../utils/linkParser';

export const LecturesSection: React.FC = () => {
  const {
    lectures,
    activeGrade,
    setActiveVideo,
    setSelectedCourseForDetails,
    hasAccessToLecture,
    currentUser,
    setIsAdminPanelOpen,
    addLecture,
  } = usePlatform();

  const [courseFilter, setCourseFilter] = useState<'all' | 'free' | 'paid'>('all');

  // Quick Verified Submission Form State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
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
      setVerifiedId(null);
      setFormNotice({
        type: 'error',
        message: parsed.error || '⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط يوتيوب أو جوجل درايف صالح.'
      });
      return;
    }

    setVerifiedId(parsed.id);
    setFormNotice({
      type: 'success',
      message:
        parsed.provider === 'drive'
          ? `✅ تم التحقق من رابط Google Drive وتحويله للبث المباشر! معرّف الملف: (${parsed.id})`
          : `✅ تم التحقق من رابط يوتيوب بنجاح! معرّف الفيديو: (${parsed.id})`
    });
    if (!lectureTitle.trim()) {
      setLectureTitle(
        parsed.provider === 'drive'
          ? `محاضرة كيمياء (Drive) - ${parsed.id.substring(0, 8)}`
          : `محاضرة كيمياء - فيديو ${parsed.id}`
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
        message: parsed.error || '⚠️ الرابط المدخل غير صالح (يدعم YouTube أو Google Drive فقط).'
      });
      return;
    }

    setIsSubmitting(true);
    setFormNotice(null);

    try {
      const res = await addLecture({
        title: lectureTitle.trim(),
        description: `محاضرة كيمياء معتمدة لمنصة مستر عمرو السيد (${lectureDuration} دقيقة)`,
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
        console.error('[AddLecture Supabase Error]:', res.error || errorMsg);
        setFormNotice({ type: 'error', message: `❌ خطأ Supabase: ${errorMsg}` });
      } else {
        setFormNotice({ type: 'success', message: '⚡ تم حفظ المحاضرة بنجاح في قاعدة البيانات Supabase!' });
        setTimeout(() => {
          setShowQuickAddModal(false);
          setQuickUrl('');
          setVerifiedId(null);
          setLectureTitle('');
          setFormNotice(null);
        }, 1200);
      }
    } catch (err: any) {
      console.error('[AddLecture Exception]:', err);
      setFormNotice({ type: 'error', message: `❌ حدث خطأ غير متوقع: ${err?.message || err}` });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'secretary';

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="p-6 bg-[#091224] border border-cyan-900/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-cyan-400" />
            <span>المحاضرات والكورسات التعليمية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            قسم مخصص للمحاضرات المجانية المفتوحة للجميع، والمحاضرات المدفوعة المتاحة بالاشتراك أو بتصريح المعلم (هاتف + كود).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة رابط فيديو مفحوص ⚡</span>
            </button>
          )}
        </div>
      </div>

      {/* Free vs Paid Filter Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setCourseFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              courseFilter === 'all'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            جميع الكورسات
          </button>
          <button
            onClick={() => setCourseFilter('free')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              courseFilter === 'free'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>المحاضرات المجانية</span>
          </button>
          <button
            onClick={() => setCourseFilter('paid')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              courseFilter === 'paid'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>الكورسات المدفوعة</span>
          </button>
        </div>
      </div>

      {/* Lectures Grid */}
      {displayedLectures.length === 0 ? (
        <div className="p-12 bg-[#091224] border border-slate-800/80 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">لا توجد محاضرات في هذا القسم حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            سيقوم مستر عمرو السيد برفع محاضرات هذا القسم قريباً.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedLectures.map((lec) => {
            const isUnlocked = hasAccessToLecture(lec.id);
            const isFreeCourse = lec.isFree || lec.price === 0;
            const canPlayDirectly = isUnlocked || isFreeCourse || isAdmin;

            const handleCardClick = () => {
              if (canPlayDirectly) {
                setActiveVideo(lec);
              } else {
                setSelectedCourseForDetails(lec);
              }
            };

            return (
              <div
                key={lec.id}
                onClick={handleCardClick}
                className={`bg-[#091224] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg cursor-pointer group ${
                  isFreeCourse
                    ? 'border-emerald-900/60 hover:border-emerald-500/60 hover:shadow-emerald-900/20'
                    : 'border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-900/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
                      {lec.chapterTitle}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      {isFreeCourse ? (
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                          <Gift className="w-3.5 h-3.5" />
                          مجاني
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

                  <div className="flex items-start gap-2">
                    {lec.provider === 'drive' || /drive\.google\.com|drive\.usercontent\.google\.com/i.test(lec.videoUrl || '') ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Drive</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1 shrink-0">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>YouTube</span>
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                      {lec.title}
                    </h3>
                  </div>

                  {/* Course Description */}
                  <div className="bg-[#060b18] p-3 rounded-xl border border-slate-800/60">
                    <p className="text-[11px] font-medium text-cyan-400/90 mb-1">وصف الكورس:</p>
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {lec.description || 'انقر لتشغيل المحاضرة فورا أو الاطلاع على كامل المحتوى والمذكرات.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lec.durationMinutes} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-white font-bold">
                      {isFreeCourse ? (
                        <span className="text-emerald-400">مجاني 100%</span>
                      ) : (
                        <span>{lec.price} ج.م</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourseForDetails(lec);
                    }}
                    className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>التفاصيل</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canPlayDirectly) {
                        setActiveVideo(lec);
                      } else {
                        setSelectedCourseForDetails(lec);
                      }
                    }}
                    className={`font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      canPlayDirectly
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
                        : 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{canPlayDirectly ? 'تشغيل فوري' : 'خيارات الدخول'}</span>
                  </button>
                </div>
              </div>
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
                <span>إضافة محاضرة برابط YouTube أو Google Drive</span>
              </h3>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formNotice && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                formNotice.type === 'error'
                  ? 'bg-red-950/70 border border-red-500/40 text-red-200'
                  : 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-200'
              }`}>
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
                <label className="block text-xs text-slate-300">عنوان المحاضرة</label>
                <input
                  type="text"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="مثال: المحاضرة 1: الباب الأول العناصر الانتقالية"
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
                  محاضرة مجانية ومتاحة لكافة الطلاب
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
                      <span>حفظ المحاضرة في Supabase ⚡</span>
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

