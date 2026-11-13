import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { FileCheck2, Clock, Play, RotateCcw, CheckCircle2, BookOpen } from 'lucide-react';
import { Exam } from '../types';
import { InteractiveAssessmentSolver, getAssessmentMaxWindowMinutes } from './InteractiveAssessmentSolver';

export const ExamsSection: React.FC = () => {
  const { exams, activeGrade, currentUser, setIsLoginModalOpen, studentAccessMap, examSubmissions } = usePlatform();
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

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
  };

  const hasSavedAttempt = (examId: string): boolean => {
    try {
      const studentId = currentUser?.id || 'guest_student';
      return !!localStorage.getItem(`amr_chem_attempt_${studentId}_${examId}`);
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>الامتحانات الإلكترونية والتقييمات</span>
          </h2>
          <p className="text-[14px] text-slate-400 mt-1.5 leading-relaxed">
            امتحانات محاكية لنظام التابلت بحد أقصى 4 ساعات للامتحان، مع تصحيح آلي فوري للأسئلة الاختيارية ومراجعة المعلم للمقالي.
          </p>
        </div>
      </div>

      {/* Active Exam Solver */}
      {activeExam ? (
        <InteractiveAssessmentSolver
          assessment={{
            id: activeExam.id,
            title: activeExam.title,
            lessonTitle: activeExam.lessonTitle,
            mode: 'exam',
            grade: activeExam.grade,
            durationMinutes: activeExam.durationMinutes,
            totalMarks: activeExam.totalMarks,
            questions: activeExam.questions,
          }}
          onClose={() => setActiveExam(null)}
        />
      ) : filteredExams.length === 0 ? (
        <div className="p-10 sm:p-12 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">لا توجد امتحانات مسجلة حالياً</h3>
          <p className="text-[14px] text-slate-400 max-w-sm mx-auto">
            سيتم نشر الاختبارات الدورية على المنصة بالتزامن مع مواعيد المحاضرات.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const accessState = currentUser ? studentAccessMap[currentUser.id]?.exams?.[exam.id] : undefined;
            const latestSub = currentUser
              ? examSubmissions.find(
                  (s) => s.studentId === currentUser.id && s.examId === exam.id && (s.assessmentType || 'exam') === 'exam'
                )
              : undefined;
            const isTaken = !!accessState?.taken || !!latestSub;
            const inProgress = !isTaken && hasSavedAttempt(exam.id);
            const mcqCount = exam.questions.filter((q) => q.type !== 'essay').length;
            const essayCount = exam.questions.filter((q) => q.type === 'essay').length;
            const effectiveMins = getAssessmentMaxWindowMinutes('exam', exam.durationMinutes);
            const computedTotalMarks = exam.questions.some((q) => q.points !== undefined)
              ? Number(exam.questions.reduce((acc, q) => acc + (q.points ?? 1), 0).toFixed(2))
              : exam.totalMarks;

            return (
              <div
                key={exam.id}
                className="bg-[#091224] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-lg border border-cyan-800/40 text-[11px] font-bold">
                      امتحان إلكتروني
                    </span>
                    <span className="font-mono font-bold text-cyan-300 tabular-nums">{computedTotalMarks} درجة</span>
                  </div>

                  {exam.lessonTitle && (
                    <div className="inline-flex items-center gap-1 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-md font-semibold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{exam.lessonTitle}</span>
                    </div>
                  )}

                  <h3 className="font-bold text-base text-white line-clamp-2 leading-snug">{exam.title}</h3>

                  <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm text-slate-400 font-mono tabular-nums">
                    <span className="flex items-center gap-1 font-sans">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {effectiveMins} دقيقة
                    </span>
                    <span>·</span>
                    <span className="font-sans">{exam.questions.length} سؤال</span>
                    {essayCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-sans font-bold">
                        {mcqCount} اختياري + {essayCount} مقالي
                      </span>
                    )}
                  </div>

                  {isTaken && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm flex items-center justify-between text-emerald-300">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم التسليم</span>
                      </span>
                      <span className="font-mono font-black tabular-nums">
                        {latestSub?.score ?? accessState?.score ?? 0} / {latestSub?.maxScore ?? computedTotalMarks}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleStartExam(exam)}
                    className={`w-full min-h-[44px] py-2.5 font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      inProgress
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                  >
                    {inProgress ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>استكمال الامتحان المفتوح</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>{isTaken ? 'إعادة فتح الامتحان' : 'بدء الامتحان الآن'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
