import React, { useState, useRef } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  FileCheck2,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Minimize2,
  PenTool,
  Check,
} from 'lucide-react';
import { Exam, Question } from '../types';

export const ExamsSection: React.FC = () => {
  const { exams, activeGrade, currentUser, setIsLoginModalOpen, recordExamResult, updateExamSubmissionGrade } = usePlatform();
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqMaxMarks, setMcqMaxMarks] = useState(0);
  const [hasEssayQuestions, setHasEssayQuestions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [teacherExtraInput, setTeacherExtraInput] = useState<string>('');
  const [teacherGradedFinal, setTeacherGradedFinal] = useState<{ total: number; extra: number } | null>(null);
  const examContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    try {
      if (!document.fullscreenElement) {
        examContainerRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;
  const filteredExams = exams.filter((e) => {
    if (studentGrade === 'all') return true;
    return e.grade === studentGrade;
  });

  const handleStartExam = (exam: Exam) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setEssayAnswers({});
    setIsFinished(false);
    setScore(0);
    setMcqScore(0);
    setMcqMaxMarks(0);
    setHasEssayQuestions(false);
    setTeacherExtraInput('');
    setTeacherGradedFinal(null);
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleEssayChange = (questionId: string, text: string) => {
    setEssayAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const isTeacherOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  const handleFinishExam = () => {
    if (!activeExam) return;

    const totalQuestions = activeExam.questions.length || 1;
    const markPerQuestion = activeExam.totalMarks / totalQuestions;

    const essayList = activeExam.questions.filter((q) => q.type === 'essay');
    const mcqList = activeExam.questions.filter((q) => q.type !== 'essay');

    const isMixed = essayList.length > 0;
    setHasEssayQuestions(isMixed);

    let earnedMcq = 0;
    mcqList.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        earnedMcq += markPerQuestion;
      }
    });

    const calculatedMcqScore = Math.round(earnedMcq);
    const calculatedMcqMax = Math.round(mcqList.length * markPerQuestion);

    setMcqScore(calculatedMcqScore);
    setMcqMaxMarks(calculatedMcqMax);
    setScore(calculatedMcqScore);
    setIsFinished(true);

    // Save exam result to state & permanent Cloud Firestore
    recordExamResult(
      activeExam.id,
      activeExam.title,
      calculatedMcqScore,
      activeExam.totalMarks,
      25,
      {
        autoMcqScore: calculatedMcqScore,
        autoMcqMax: calculatedMcqMax,
        essayAnswers,
        status: isMixed ? 'pending_teacher_review' : 'fully_graded',
      }
    );
  };

  const handleAddTeacherScore = () => {
    if (!activeExam) return;
    const extra = parseFloat(teacherExtraInput) || 0;
    const finalTotal = mcqScore + extra;
    setScore(finalTotal);
    setTeacherGradedFinal({ total: finalTotal, extra });

    recordExamResult(
      activeExam.id,
      activeExam.title,
      finalTotal,
      activeExam.totalMarks,
      25,
      {
        autoMcqScore: mcqScore,
        autoMcqMax: mcqMaxMarks,
        essayAnswers,
        status: 'fully_graded',
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 bg-[#091224] border border-cyan-900/30 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-cyan-400" />
            <span>الامتحانات الإلكترونية والتقييمات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            امتحانات محاكية لنظام التابلت والثانوية العامة مع تصحيح ذكي فوري للأسئلة الموضوعية والمقالية.
          </p>
        </div>
      </div>

      {/* If an active exam is being taken */}
      {activeExam ? (
        <div
          ref={examContainerRef}
          className={`${
            isFullscreen
              ? 'fixed inset-0 z-50 p-4 sm:p-8 bg-[#070d1e] overflow-y-auto space-y-6 rounded-none'
              : 'bg-[#091224] border border-cyan-800/40 rounded-2xl p-6 sm:p-8 space-y-6'
          } transition-all`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">{activeExam.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                الدرجة الكلية: {activeExam.totalMarks} · المدة: {activeExam.durationMinutes} دقيقة · الصف: {activeExam.grade}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e1c38] hover:bg-[#13274e] border border-cyan-700/60 text-cyan-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                title={isFullscreen ? 'تصغير النافذة' : 'فتح في نافذة كاملة'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'نافذة كاملة'}</span>
              </button>
              <button
                onClick={() => setActiveExam(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-xl cursor-pointer transition-colors"
              >
                الخروج من الامتحان
              </button>
            </div>
          </div>

          {!isFinished ? (
            activeExam.questions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                لا توجد أسئلة مضافة في هذا الامتحان بعد.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Question progress and questions map */}
                <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">
                      السؤال {currentQuestionIndex + 1} من {activeExam.questions.length}
                    </span>
                    {activeExam.questions[currentQuestionIndex]?.type === 'essay' ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        سؤال مقالي
                      </span>
                    ) : (
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        اختيار من متعدد (MCQ)
                      </span>
                    )}
                  </div>

                  {/* Question jump pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                    {activeExam.questions.map((q, idx) => {
                      const isAnswered =
                        q.type === 'essay'
                          ? !!(essayAnswers[q.id]?.trim())
                          : selectedAnswers[q.id] !== undefined;
                      const isCurrent = idx === currentQuestionIndex;

                      return (
                        <button
                          key={q.id || idx}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-cyan-500 text-black shadow-md ring-2 ring-cyan-300'
                              : isAnswered
                              ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Card */}
                {(() => {
                  const q = activeExam.questions[currentQuestionIndex];
                  if (!q) return null;
                  const isEssay = q.type === 'essay';

                  return (
                    <div className="space-y-4">
                      <div className="p-4 sm:p-5 bg-[#060a16] border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold text-cyan-400">
                            {isEssay ? 'سؤال مقالي تفصيلي' : 'اختر الإجابة الصحيحة'}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                          {q.text}
                        </p>
                        {q.image && (
                          <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-cyan-800/50 bg-black/40 p-2">
                            <img
                              src={q.image}
                              alt="صورة السؤال الكيميائي"
                              className="w-full max-h-64 object-contain mx-auto rounded-lg"
                            />
                          </div>
                        )}
                      </div>

                      {/* Question Content: MCQ Options or Essay Input */}
                      {isEssay ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                            <span className="flex items-center gap-1 text-amber-300 font-bold">
                              <PenTool className="w-3.5 h-3.5" />
                              <span>إجابة الطالب والخطوات الرياضية / الكيميائية:</span>
                            </span>
                            <span className="font-mono text-[11px]">
                              {(essayAnswers[q.id] || '').length} حرف
                            </span>
                          </div>
                          <textarea
                            value={essayAnswers[q.id] || ''}
                            onChange={(e) => handleEssayChange(q.id, e.target.value)}
                            rows={5}
                            placeholder="اكتب خطوات الحل والمعادلات الكيميائية والتفسير العلمي هنا بالتفصيل..."
                            className="w-full p-4 bg-[#060a16] border border-slate-800 focus:border-cyan-400 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all leading-relaxed"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {q.options.map((opt, idx) => {
                            const isSelected = selectedAnswers[q.id] === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectOption(q.id, idx)}
                                className={`w-full text-right p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                                    : 'bg-[#080d1b] border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <span>{opt}</span>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 bg-[#080d1b] rounded-full" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Navigator Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                          className="px-4 py-2 bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>السابق</span>
                        </button>

                        {currentQuestionIndex < activeExam.questions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>التالي</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={handleFinishExam}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                          >
                            إنهاء وتسليم الامتحان
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )
          ) : (
            /* Result Screen */
            <div className="p-8 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Award className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">تم تسليم الامتحان بنجاح!</h4>

              {hasEssayQuestions ? (
                /* Mixed Exam: MCQ graded + Essay awaiting teacher review */
                <div className="max-w-lg mx-auto bg-[#060b18] border border-amber-500/30 rounded-2xl p-5 space-y-3 text-right">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>حالة التصحيح الذكي للأسئلة:</span>
                  </div>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed font-medium">
                    تم تصحيح الأسئلة الاختيارية، وفي انتظار تصحيح المعلم للأسئلة المقالية لحساب الدرجة الكلية
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <span>الدرجة الجزئية (الأسئلة الاختيارية):</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">
                      {mcqScore} من {mcqMaxMarks}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>الدرجة الكلية للامتحان:</span>
                    <span className="font-mono text-slate-400">
                      {activeExam.totalMarks} درجة (قيد اكتمال التصحيح)
                    </span>
                  </div>

                  {/* Student Essay Answers Viewer */}
                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-800 text-right">
                    <span className="text-xs font-bold text-amber-300 block">إجابات الأسئلة المقالية المسجلة للطالب:</span>
                    {activeExam.questions.filter((q) => q.type === 'essay').map((q, idx) => (
                      <div key={q.id || idx} className="p-3 bg-[#080d1b] border border-slate-800 rounded-xl text-xs space-y-1.5">
                        <p className="text-white font-medium">{q.text}</p>
                        <div className="text-cyan-300 font-mono bg-black/40 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          {essayAnswers[q.id] || 'لم يكتب الطالب إجابة لهذا السؤال'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Teacher Grading Panel for Teacher / Secretary */}
                  {isTeacherOrSec && (
                    <div className="mt-4 p-4 bg-[#1e1b4b] border-2 border-amber-500/50 rounded-2xl text-right space-y-3 shadow-xl">
                      <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>👨‍🏫 لوحة المعلم: إضافة درجة السؤال المقالي</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        أدخل درجة الأسئلة المقالية لتُضاف فوق درجة الذكاء الاصطناعي للاختياري ({mcqScore}) وتُحفظ كدرجة نهائية دائمة في قاعدة البيانات:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={activeExam.totalMarks - mcqMaxMarks}
                          value={teacherExtraInput}
                          onChange={(e) => setTeacherExtraInput(e.target.value)}
                          placeholder="أدخل درجة السؤال المقالي لإضافتها..."
                          className="flex-1 p-2.5 bg-[#0b1224] border border-amber-500/40 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={handleAddTeacherScore}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                        >
                          اعتماد وإضافة الدرجة النهائية
                        </button>
                      </div>

                      {teacherGradedFinal && (
                        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>🏆 الدرجة النهائية الكلية: {teacherGradedFinal.total} / {activeExam.totalMarks}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            (درجة الذكاء الاصطناعي للاختياري: {mcqScore} + درجة مراجعة المعلم للمقالي: {teacherGradedFinal.extra})
                          </p>
                          <p className="text-[10px] text-emerald-400 font-bold">
                            تم حفظ وتحديث الدرجة النهائية للطالب في قاعدة البيانات الدائمة بنجاح!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Pure MCQ Exam: 100% final score */
                <div className="max-w-md mx-auto bg-[#060b18] border border-emerald-500/30 rounded-2xl p-5 space-y-2">
                  <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم التصحيح الفوري الإلكتروني بنسبة 100%</span>
                  </p>
                  <p className="text-sm text-slate-300">
                    نتيجتك النهائية: <span className="text-cyan-400 font-bold font-mono text-xl">{score}</span> من{' '}
                    <span className="font-mono text-white font-bold">{activeExam.totalMarks}</span>
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    النسبة المئوية: {Math.round((score / (activeExam.totalMarks || 1)) * 100)}%
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setActiveExam(null)}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  العودة لقائمة الامتحانات
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Exams Grid */
        filteredExams.length === 0 ? (
          <div className="p-12 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">لا توجد امتحانات مسجلة حالياً</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              سيتم نشر الاختبارات الدورية على المنصة مع مواعيد المحاضرات.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-[#091224] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-cyan-400">
                    <span className="bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40 text-[11px]">
                      امتحان إلكتروني
                    </span>
                    <span className="font-mono">{exam.totalMarks} درجة</span>
                  </div>

                  <h3 className="font-bold text-sm text-white line-clamp-2">{exam.title}</h3>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {exam.durationMinutes} دقيقة
                    </span>
                    <span>·</span>
                    <span>{exam.questions.length} سؤال</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleStartExam(exam)}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>بدء الامتحان الآن</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
