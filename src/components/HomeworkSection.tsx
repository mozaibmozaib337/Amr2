import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  BookCheck,
  Calendar,
  Upload,
  CheckCircle2,
  FileText,
  Clock,
  RotateCcw,
  BookOpen,
  X,
  Play,
} from 'lucide-react';
import { Homework } from '../types';
import { InteractiveAssessmentSolver, getAssessmentMaxWindowMinutes } from './InteractiveAssessmentSolver';

export const HomeworkSection: React.FC = () => {
  const {
    homeworks,
    activeGrade,
    currentUser,
    setIsLoginModalOpen,
    setActiveDocument,
    recordHomeworkAction,
    studentAccessMap,
    examSubmissions,
  } = usePlatform();

  const [typeFilter, setTypeFilter] = useState<'all' | 'homework' | 'sheet'>('all');
  const [activeInteractiveHw, setActiveInteractiveHw] = useState<Homework | null>(null);
  const [textModalHw, setTextModalHw] = useState<Homework | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;
  const filteredHw = homeworks.filter((hw) => {
    if (studentGrade !== 'all' && hw.grade !== studentGrade) return false;
    const hwKind = hw.kind === 'sheet' ? 'sheet' : 'homework';
    if (typeFilter !== 'all' && hwKind !== typeFilter) return false;
    return true;
  });

  const hasSavedAttempt = (hwId: string): boolean => {
    try {
      const studentId = currentUser?.id || 'guest_student';
      return !!localStorage.getItem(`amr_chem_attempt_${studentId}_${hwId}`);
    } catch {
      return false;
    }
  };

  const handleOpenHw = (hw: Homework) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (hw.questions && hw.questions.length > 0) {
      setActiveInteractiveHw(hw);
    } else {
      setTextModalHw(hw);
      setAnswerText('');
    }
  };

  const handleSubmitTextAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!textModalHw) return;

    recordHomeworkAction(textModalHw.id, textModalHw.title, true);
    setSuccessNotice(`تم تسليم إجابة (${textModalHw.title}) بنجاح!`);
    setTextModalHw(null);
    setAnswerText('');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Kind Switch */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] sm:text-2xl font-bold text-white flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>الواجبات المنزلية وشيتات الدروس</span>
          </h2>
          <p className="text-[14px] text-slate-400 mt-1.5 leading-relaxed">
            الواجبات المنزلية متاحة للاستكمال خلال 24 ساعة من الفتح، وشيتات الدروس محددة بحد أقصى 3 ساعات وتُحسب في قوائم الأوائل.
          </p>
        </div>

        {!activeInteractiveHw && (
          <div className="flex flex-wrap items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 text-xs sm:text-sm font-bold self-start md:self-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({homeworks.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('homework')}
              className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'homework' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              الواجبات ({homeworks.filter((h) => h.kind !== 'sheet').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('sheet')}
              className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'sheet' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              الشيتات ({homeworks.filter((h) => h.kind === 'sheet').length})
            </button>
          </div>
        )}
      </div>

      {successNotice && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Unified Single-Question Interactive Solver for Homework / Sheet */}
      {activeInteractiveHw ? (
        <InteractiveAssessmentSolver
          assessment={{
            id: activeInteractiveHw.id,
            title: activeInteractiveHw.title,
            lessonTitle: activeInteractiveHw.lessonTitle,
            mode: activeInteractiveHw.kind === 'sheet' ? 'sheet' : 'homework',
            grade: activeInteractiveHw.grade,
            durationMinutes: activeInteractiveHw.durationMinutes,
            totalMarks: activeInteractiveHw.totalMarks,
            questions: activeInteractiveHw.questions || [],
            fileUrl: activeInteractiveHw.fileUrl,
            fileName: activeInteractiveHw.fileName,
            fileType: activeInteractiveHw.fileType,
          }}
          onClose={() => setActiveInteractiveHw(null)}
          onSubmitted={(summary) => {
            setSuccessNotice(
              `تم تسليم (${activeInteractiveHw.title}) بنجاح · النتيجة المبدئية: ${summary.score} / ${summary.maxScore} (${summary.percentage}%)`
            );
            setTimeout(() => setSuccessNotice(null), 5000);
          }}
        />
      ) : filteredHw.length === 0 ? (
        <div className="p-10 sm:p-12 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <BookCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">لا توجد واجبات أو شيتات في هذا القسم حالياً</h3>
          <p className="text-[14px] text-slate-400 max-w-sm mx-auto">
            سيتم نشر الواجبات وشيتات الدروس بالتزامن مع نزول المحاضرات على المنصة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHw.map((hw) => {
            const hwKind: 'homework' | 'sheet' = hw.kind === 'sheet' ? 'sheet' : 'homework';
            const hwAccess = currentUser ? studentAccessMap[currentUser.id]?.homeworks?.[hw.id] : undefined;
            const latestSub = currentUser
              ? examSubmissions.find(
                  (s) => s.studentId === currentUser.id && s.examId === hw.id && s.assessmentType !== 'exam'
                )
              : undefined;
            const isSubmitted = !!hwAccess?.solved || !!latestSub;
            const inProgress = !isSubmitted && hasSavedAttempt(hw.id);
            const hasQuestions = !!(hw.questions && hw.questions.length > 0);
            const effectiveMins = getAssessmentMaxWindowMinutes(hwKind, hw.durationMinutes);
            const computedMaxMarks = hasQuestions
              ? hw.questions!.some((q) => q.points !== undefined)
                ? Number(hw.questions!.reduce((acc, q) => acc + (q.points ?? 1), 0).toFixed(2))
                : hw.totalMarks || hw.questions!.length
              : hw.totalMarks;

            return (
              <div
                key={hw.id}
                className={`bg-[#091224] border rounded-2xl p-5 flex flex-col justify-between transition-all shadow-md ${
                  hwKind === 'sheet'
                    ? 'border-amber-800/50 hover:border-amber-500/60'
                    : 'border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                        hwKind === 'sheet'
                          ? 'text-amber-300 bg-amber-500/15 border-amber-500/40'
                          : 'text-cyan-300 bg-cyan-950 border-cyan-800/40'
                      }`}
                    >
                      {hwKind === 'sheet' ? 'شيت درس (يُحسب في الأوائل)' : 'واجب منزلي'}
                    </span>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                        isSubmitted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : inProgress
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isSubmitted ? 'تم التسليم ✓' : inProgress ? 'جاري الاستكمال...' : 'بانتظار الحل'}
                    </span>
                  </div>

                  {hw.lessonTitle && (
                    <div className="inline-flex items-center gap-1 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-md font-semibold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{hw.lessonTitle}</span>
                    </div>
                  )}

                  <h3 className="font-bold text-base text-white line-clamp-2 leading-snug">{hw.title}</h3>

                  <p className="text-[14px] text-slate-400 line-clamp-2 leading-relaxed">
                    {hw.description || 'حل الأسئلة والتدريبات المطلوبة وتسليمها في الموعد المحدد.'}
                  </p>

                  <div className="space-y-1 text-xs sm:text-sm text-slate-400 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>آخر موعد: {hw.deadline}</span>
                    </div>
                    {hasQuestions && (
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-sans">
                          {hw.questions!.length} سؤال{computedMaxMarks ? ` · ${computedMaxMarks} درجة` : ''} · المهلة{' '}
                          {hwKind === 'homework'
                            ? effectiveMins >= 60
                              ? `${Math.round(effectiveMins / 60)} ساعة (قابل للاستكمال)`
                              : `${effectiveMins} دقيقة`
                            : `${effectiveMins} دقيقة (حد أقصى 3 ساعات)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {isSubmitted && (latestSub || hwAccess?.score !== undefined) && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm flex items-center justify-between text-emerald-300">
                      <span className="font-bold">الدرجة المسجلة:</span>
                      <span className="font-mono font-black tabular-nums">
                        {latestSub?.score ?? hwAccess?.score ?? 0} / {latestSub?.maxScore ?? hwAccess?.maxScore ?? computedMaxMarks ?? hw.questions?.length ?? 1}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  {hw.fileUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          setIsLoginModalOpen(true);
                          return;
                        }
                        setActiveDocument({
                          title: hw.title,
                          fileUrl: hw.fileUrl!,
                          fileName: hw.fileName,
                          fileType: hw.fileType,
                        });
                      }}
                      className="min-h-[44px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>الملزمة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenHw(hw)}
                    className={`flex-1 min-h-[44px] py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inProgress
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                        : isSubmitted && !hasQuestions
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                    }`}
                  >
                    {inProgress ? (
                      <>
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span>استكمال الحل الآن</span>
                      </>
                    ) : hasQuestions ? (
                      <>
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>{isSubmitted ? 'مراجعة / إعادة فتح' : hwKind === 'sheet' ? 'بدء حل الشيت' : 'بدء حل الواجب'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>{isSubmitted ? 'تم التسليم' : 'تسليم الحل'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Text / Manual Submission Modal (Only for Homeworks without structured questions) */}
      {textModalHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1429] border border-cyan-800/40 rounded-2xl w-full max-w-xl p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
              <div>
                <h3 className="font-bold text-base text-white">{textModalHw.title}</h3>
                <p className="text-xs text-cyan-400 mt-0.5">تسليم إجابات وحلول يدوية</p>
              </div>
              <button
                type="button"
                onClick={() => setTextModalHw(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTextAnswer} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  اكتب إجاباتك أو خطوات الحل بالتفصيل:
                </label>
                <textarea
                  required
                  rows={5}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="اكتب حلول الأسئلة هنا..."
                  className="w-full bg-[#080d1b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTextModalHw(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  تأكيد التسليم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
