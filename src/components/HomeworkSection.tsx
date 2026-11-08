import React, { useState, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  BookCheck,
  Calendar,
  Upload,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { Homework } from '../types';

export const HomeworkSection: React.FC = () => {
  const {
    homeworks,
    activeGrade,
    currentUser,
    setIsLoginModalOpen,
    setActiveDocument,
    recordHomeworkAction,
  } = usePlatform();
  const [submittedHwIds, setSubmittedHwIds] = useState<string[]>([]);
  const [selectedHw, setSelectedHw] = useState<Homework | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hwScore, setHwScore] = useState<number | null>(null);
  const [isHwGraded, setIsHwGraded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const hwModalRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    try {
      if (!document.fullscreenElement) {
        hwModalRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;
  const filteredHw = homeworks.filter((hw) => {
    if (studentGrade === 'all') return true;
    return hw.grade === studentGrade;
  });

  const handleOpenHw = (hw: Homework) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedHw(hw);
    setSelectedAnswers({});
    setHwScore(null);
    setIsHwGraded(false);
    setAnswerText('');
  };

  const handleGradeHomework = () => {
    if (!selectedHw || !selectedHw.questions) return;
    let correctCount = 0;
    selectedHw.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });
    setHwScore(correctCount);
    setIsHwGraded(true);
    setSubmittedHwIds((prev) => [...prev, selectedHw.id]);
    recordHomeworkAction(selectedHw.id, selectedHw.title, true);
    setSuccessNotice(`تم تصحيح الواجب بنجاح! درجتك: ${correctCount} من ${selectedHw.questions.length}`);
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!selectedHw) return;

    setSubmittedHwIds((prev) => [...prev, selectedHw.id]);
    recordHomeworkAction(selectedHw.id, selectedHw.title, true);
    setSuccessNotice(`تم تسليم إجابة ${selectedHw.title} بنجاح!`);
    setSelectedHw(null);
    setAnswerText('');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="p-6 bg-[#091224] border border-cyan-900/30 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-cyan-400" />
            <span>الواجبات والشيتات المنزلية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            متابعة دقيقة وحل التمارين الأسبوعية مع تصحيح وملاحظات فريق مستر عمرو السيد.
          </p>
        </div>
      </div>

      {successNotice && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Homework List */}
      {filteredHw.length === 0 ? (
        <div className="p-12 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <BookCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">لا توجد واجبات مضافة حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            سيتم نشر شيتات الواجب والتمارين بالتزامن مع نزول المحاضرات على المنصة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHw.map((hw) => {
            const isSubmitted = submittedHwIds.includes(hw.id);

            return (
              <div
                key={hw.id}
                className="bg-[#091224] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">
                      واجب كيمياء
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        isSubmitted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isSubmitted ? 'تم التسليم' : 'بانتظار الحل'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white line-clamp-2">{hw.title}</h3>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {hw.description || 'حل أسئلة وتدريبات المحاضرة وتسليمها قبل الموعد المحدد.'}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>آخر موعد: {hw.deadline}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  {hw.fileUrl && (
                    <button
                      onClick={() =>
                        setActiveDocument({
                          title: hw.title,
                          fileUrl: hw.fileUrl!,
                          fileName: hw.fileName,
                          fileType: hw.fileType,
                        })
                      }
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>الشيت / الملزمة</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenHw(hw)}
                    disabled={isSubmitted}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSubmitted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isSubmitted ? 'تم التسليم' : hw.questions && hw.questions.length > 0 ? 'حل وتصحيح الواجب تفاعلياً' : 'تسليم الحل'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Homework submission / interactive quiz solver modal */}
      {selectedHw && (
        <div
          ref={hwModalRef}
          className={`fixed inset-0 z-50 flex items-center justify-center ${
            isFullscreen ? 'p-0' : 'p-2 sm:p-4'
          } bg-black/85 backdrop-blur-sm animate-fade-in`}
        >
          <div
            className={`bg-[#0b1429] border border-cyan-800/40 ${
              isFullscreen ? 'w-full h-full rounded-none max-h-none' : 'rounded-2xl w-full max-w-3xl max-h-[92vh]'
            } overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 text-slate-100 shadow-2xl transition-all`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
              <div>
                <h3 className="font-bold text-base text-white">{selectedHw.title}</h3>
                <p className="text-xs text-cyan-400 mt-0.5">
                  {selectedHw.questions && selectedHw.questions.length > 0
                    ? `واجب تفاعلي بنظام التصحيح الفوري (${selectedHw.questions.length} أسئلة)`
                    : 'تسليم إجابات وحلول الشيت'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0e1c38] hover:bg-[#13274e] border border-cyan-700/60 text-cyan-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  title={isFullscreen ? 'تصغير النافذة' : 'فتح في نافذة كاملة'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'نافذة كاملة'}</span>
                </button>
                <button
                  onClick={() => setSelectedHw(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Interactive Questions Solver Mode */}
            {selectedHw.questions && selectedHw.questions.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-4 pe-1">
                {isHwGraded && hwScore !== null && (
                  <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-center space-y-1">
                    <h4 className="text-sm font-bold text-emerald-300">نتيجة تصحيح الواجب النموذجية</h4>
                    <p className="text-lg font-black text-white">
                      درجتك: {hwScore} من {selectedHw.questions.length} (
                      {Math.round((hwScore / selectedHw.questions.length) * 100)}%)
                    </p>
                    <p className="text-[11px] text-slate-300">تم التصحيح والتقييم آلياً وفقاً لنموذج إجابة مستر عمرو السيد.</p>
                  </div>
                )}

                <div className="space-y-4">
                  {selectedHw.questions.map((q, qIdx) => {
                    const isSelected = selectedAnswers[q.id] !== undefined;
                    const studentAns = selectedAnswers[q.id];
                    const isCorrect = isHwGraded && studentAns === q.correctAnswerIndex;
                    const isWrong = isHwGraded && isSelected && studentAns !== q.correctAnswerIndex;

                    return (
                      <div
                        key={q.id || qIdx}
                        className={`p-4 rounded-xl border space-y-3 ${
                          isCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/50'
                            : isWrong
                            ? 'bg-red-950/20 border-red-500/50'
                            : 'bg-[#060a16] border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                            <span className="text-cyan-400 ms-1 font-mono">س{qIdx + 1}:</span> {q.text}
                          </p>
                        </div>

                        {q.image && (
                          <div className="max-w-xs mx-auto rounded-lg overflow-hidden border border-slate-700">
                            <img src={q.image} alt="توضيح السؤال" className="w-full max-h-48 object-contain" />
                          </div>
                        )}

                        {/* Options */}
                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isOptionChosen = studentAns === optIdx;
                            const isTeacherModelAnswer = isHwGraded && optIdx === q.correctAnswerIndex;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isHwGraded}
                                onClick={() =>
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: optIdx,
                                  }))
                                }
                                className={`w-full text-right p-2.5 rounded-lg border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                  isTeacherModelAnswer
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                                    : isOptionChosen
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                    : 'bg-[#080d1b] border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <span>{opt}</span>
                                {isTeacherModelAnswer && (
                                  <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                                    الإجابة الصحيحة ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {isHwGraded && q.explanation && (
                          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-cyan-300">
                            💡 <span className="font-semibold text-slate-300">تفسير مستر عمرو:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedHw(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs cursor-pointer"
                  >
                    {isHwGraded ? 'إغلاق' : 'إلغاء'}
                  </button>

                  {!isHwGraded && (
                    <button
                      type="button"
                      onClick={handleGradeHomework}
                      className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تسليم وتصحيح الواجب فورياً ⚡</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Text / Manual Submission Mode */
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    اكتب إجاباتك أو خطوات الحل أو رابط صورة ورقة الإجابة:
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="مثال: إجابة السؤال 1: ج، السؤال 2: أكسيد حديد مغناطيسي..."
                    className="w-full bg-[#080d1b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedHw(null)}
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
            )}
          </div>
        </div>
      )}

    </div>
  );
};
