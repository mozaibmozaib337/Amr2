import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Question } from '../types';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Minimize2,
  PenTool,
  CheckSquare,
  Flag,
  XCircle,
  Sparkles,
  LogOut,
  FileText,
  Eraser,
} from 'lucide-react';

export interface AssessmentConfig {
  id: string;
  title: string;
  lessonTitle?: string;
  mode: 'exam' | 'sheet' | 'homework';
  grade: string;
  durationMinutes?: number;
  totalMarks?: number;
  questions: Question[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface InteractiveAssessmentSolverProps {
  assessment: AssessmentConfig;
  onClose: () => void;
  onSubmitted?: (summary: { score: number; maxScore: number; percentage: number }) => void;
}

interface StoredAttempt {
  startedAt: number;
  selectedAnswers: Record<string, number>;
  essayAnswers: Record<string, string>;
  currentQuestionIndex: number;
}

export function getAssessmentMaxWindowMinutes(mode: 'exam' | 'sheet' | 'homework', configuredMinutes?: number): number {
  if (mode === 'homework') {
    const val = configuredMinutes && configuredMinutes > 0 ? configuredMinutes : 1440;
    return Math.min(val, 1440); // حد أقصى يوم واحد (24 ساعة) للواجب
  }
  if (mode === 'sheet') {
    const val = configuredMinutes && configuredMinutes > 0 ? configuredMinutes : 180;
    return Math.min(val, 180); // حد أقصى 3 ساعات للشيت
  }
  const val = configuredMinutes && configuredMinutes > 0 ? configuredMinutes : 60;
  return Math.min(val, 240); // حد أقصى 4 ساعات للامتحان
}

export function getQuestionPoints(q: Question, allQuestions: Question[], fallbackTotalMarks?: number): number {
  if (q.points !== undefined && q.points >= 0) {
    return Number(q.points);
  }
  const hasAnyCustomPoints = allQuestions.some((item) => item.points !== undefined);
  if (!hasAnyCustomPoints && fallbackTotalMarks && fallbackTotalMarks > 0 && allQuestions.length > 0) {
    return Number((fallbackTotalMarks / allQuestions.length).toFixed(2));
  }
  return 1;
}

function formatDurationClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const InteractiveAssessmentSolver: React.FC<InteractiveAssessmentSolverProps> = ({
  assessment,
  onClose,
  onSubmitted,
}) => {
  const {
    currentUser,
    recordExamResult,
    recordHomeworkAction,
    updateExamSubmissionGrade,
    examSubmissions,
    setActiveDocument,
  } = usePlatform();

  const studentId = currentUser?.id || 'guest_student';
  const storageKey = `amr_chem_attempt_${studentId}_${assessment.id}`;

  const windowMinutes = getAssessmentMaxWindowMinutes(assessment.mode, assessment.durationMinutes);
  const windowMs = windowMinutes * 60 * 1000;

  // Load saved attempt if exists within allowed open window
  const initialAttempt = useMemo<StoredAttempt>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAttempt;
        if (parsed && typeof parsed.startedAt === 'number') {
          return {
            startedAt: parsed.startedAt,
            selectedAnswers: parsed.selectedAnswers || {},
            essayAnswers: parsed.essayAnswers || {},
            currentQuestionIndex: Math.min(
              Math.max(parsed.currentQuestionIndex || 0, 0),
              Math.max(assessment.questions.length - 1, 0)
            ),
          };
        }
      }
    } catch {}
    return {
      startedAt: Date.now(),
      selectedAnswers: {},
      essayAnswers: {},
      currentQuestionIndex: 0,
    };
  }, [storageKey, assessment.questions.length]);

  const [startedAt] = useState<number>(initialAttempt.startedAt);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(initialAttempt.selectedAnswers);
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>(initialAttempt.essayAnswers);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(initialAttempt.currentQuestionIndex);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    Math.max(0, Math.floor((initialAttempt.startedAt + windowMs - Date.now()) / 1000))
  );

  const [showFinishSummary, setShowFinishSummary] = useState(false);
  const [isSummaryFullscreen, setIsSummaryFullscreen] = useState(false);
  const [isSolverFullscreen, setIsSolverFullscreen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<{
    submissionId?: string;
    autoMcqScore: number;
    autoMcqMax: number;
    essayMax: number;
    totalMax: number;
    blankCount: number;
    hasEssay: boolean;
    score: number;
  } | null>(null);

  // Per-question teacher essay grading inputs inside result view
  const [teacherEssayInputs, setTeacherEssayInputs] = useState<Record<string, string>>({});
  const [teacherGradedSaved, setTeacherGradedSaved] = useState<{ total: number; essayTotal: number } | null>(null);

  const solverContainerRef = useRef<HTMLDivElement>(null);
  const autoSubmittedRef = useRef(false);

  const isTeacherOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  // Question breakdown & marks
  const questionStats = useMemo(() => {
    const questions = assessment.questions;
    let mcqCount = 0;
    let mcqPoints = 0;
    let essayCount = 0;
    let essayPoints = 0;
    let answeredCount = 0;
    const unansweredMcqIndices: number[] = [];
    const unansweredEssayIndices: number[] = [];

    questions.forEach((q, idx) => {
      const pts = getQuestionPoints(q, questions, assessment.totalMarks);
      const isEssay = q.type === 'essay';
      const isAns = isEssay
        ? !!(essayAnswers[q.id]?.trim())
        : selectedAnswers[q.id] !== undefined;

      if (isEssay) {
        essayCount += 1;
        essayPoints += pts;
        if (!isAns) unansweredEssayIndices.push(idx);
      } else {
        mcqCount += 1;
        mcqPoints += pts;
        if (!isAns) unansweredMcqIndices.push(idx);
      }

      if (isAns) answeredCount += 1;
    });

    const totalMarks = Number((mcqPoints + essayPoints).toFixed(2));
    return {
      totalCount: questions.length,
      mcqCount,
      mcqPoints: Number(mcqPoints.toFixed(2)),
      essayCount,
      essayPoints: Number(essayPoints.toFixed(2)),
      totalMarks,
      answeredCount,
      unansweredCount: questions.length - answeredCount,
      unansweredMcqIndices,
      unansweredEssayIndices,
    };
  }, [assessment.questions, assessment.totalMarks, selectedAnswers, essayAnswers]);

  // Persist progress in localStorage so student can resume (especially for homework within 24h)
  useEffect(() => {
    if (isFinished) return;
    try {
      const payload: StoredAttempt = {
        startedAt,
        selectedAnswers,
        essayAnswers,
        currentQuestionIndex,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [startedAt, selectedAnswers, essayAnswers, currentQuestionIndex, isFinished, storageKey]);

  // Execute final grading & submission
  const submitFinalAssessment = () => {
    if (isFinished) return;
    const questions = assessment.questions;
    let earnedMcq = 0;
    let blankCount = 0;

    questions.forEach((q) => {
      const pts = getQuestionPoints(q, questions, assessment.totalMarks);
      const isEssay = q.type === 'essay';
      if (isEssay) {
        if (!(essayAnswers[q.id] || '').trim()) {
          blankCount += 1; // سؤال مقالي متروك فارغاً = 0 تلقائياً
        }
      } else {
        const chosen = selectedAnswers[q.id];
        if (chosen === undefined) {
          blankCount += 1; // سؤال اختياري متروك فارغاً = 0 تلقائياً
        } else if (chosen === q.correctAnswerIndex) {
          earnedMcq += pts;
        }
      }
    });

    const autoMcqScore = Number(earnedMcq.toFixed(2));
    const autoMcqMax = questionStats.mcqPoints;
    const essayMax = questionStats.essayPoints;
    const totalMax = questionStats.totalMarks || assessment.totalMarks || questions.length || 1;
    const hasEssay = questionStats.essayCount > 0;
    const hasAnsweredEssay = questions.some((q) => q.type === 'essay' && !!(essayAnswers[q.id] || '').trim());
    const needsTeacherReview = hasEssay && hasAnsweredEssay;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

    recordExamResult(assessment.id, assessment.title, autoMcqScore, totalMax, elapsedMinutes, {
      assessmentType: assessment.mode,
      lessonTitle: assessment.lessonTitle,
      autoMcqScore,
      autoMcqMax,
      essayAnswers,
      blankCount,
      status: needsTeacherReview ? 'pending_teacher_review' : 'fully_graded',
    });

    if (assessment.mode === 'homework' || assessment.mode === 'sheet') {
      recordHomeworkAction(assessment.id, assessment.title, true, {
        score: autoMcqScore,
        maxScore: totalMax,
      });
    }

    try {
      localStorage.removeItem(storageKey);
    } catch {}

    setResultData({
      autoMcqScore,
      autoMcqMax,
      essayMax,
      totalMax,
      blankCount,
      hasEssay,
      score: autoMcqScore,
    });
    setShowFinishSummary(false);
    setIsSummaryFullscreen(false);
    setIsFinished(true);

    onSubmitted?.({
      score: autoMcqScore,
      maxScore: totalMax,
      percentage: Math.round((autoMcqScore / (totalMax || 1)) * 100),
    });
  };

  // Live countdown timer — auto-submits when window expires
  useEffect(() => {
    if (isFinished) return;
    const tick = () => {
      const rem = Math.max(0, Math.floor((startedAt + windowMs - Date.now()) / 1000));
      setRemainingSeconds(rem);
      if (rem <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        submitFinalAssessment();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, windowMs, isFinished]);

  const toggleSolverFullscreen = () => {
    setIsSolverFullscreen((prev) => !prev);
    try {
      if (!document.fullscreenElement) {
        solverContainerRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  const modeLabel =
    assessment.mode === 'sheet'
      ? 'الشيت'
      : assessment.mode === 'homework'
      ? 'الواجب'
      : 'الاختبار';

  const windowBadgeText =
    assessment.mode === 'homework'
      ? `متاح الاستكمال خلال ${windowMinutes >= 60 ? `${Math.round(windowMinutes / 60)} ساعة` : `${windowMinutes} دقيقة`} من الفتح`
      : assessment.mode === 'sheet'
      ? `حد أقصى للشيت: ${windowMinutes} دقيقة (3 ساعات كحد أقصى)`
      : `حد أقصى للاختبار: ${windowMinutes} دقيقة (4 ساعات كحد أقصى)`;

  const handleSaveTeacherEssayGrades = () => {
    if (!resultData) return;
    const essayQuestions = assessment.questions.filter((q) => q.type === 'essay');
    const essayScoresMap: Record<string, number> = {};
    let essayEarnedTotal = 0;

    essayQuestions.forEach((q) => {
      const qMax = getQuestionPoints(q, assessment.questions, assessment.totalMarks);
      const isBlank = !(essayAnswers[q.id] || '').trim();
      if (isBlank) {
        essayScoresMap[q.id] = 0;
        return;
      }
      const raw = parseFloat(teacherEssayInputs[q.id] ?? '');
      const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), qMax) : 0;
      essayScoresMap[q.id] = clamped;
      essayEarnedTotal += clamped;
    });

    const latestSub = examSubmissions.find(
      (s) =>
        s.examId === assessment.id &&
        s.studentId === studentId &&
        (s.assessmentType || 'exam') === assessment.mode
    );

    const newTotal = Number((resultData.autoMcqScore + essayEarnedTotal).toFixed(2));
    if (latestSub) {
      updateExamSubmissionGrade(latestSub.id, essayEarnedTotal, essayScoresMap);
    }
    setResultData((prev) => (prev ? { ...prev, score: newTotal } : prev));
    setTeacherGradedSaved({ total: newTotal, essayTotal: essayEarnedTotal });
  };

  const currentQuestion = assessment.questions[currentQuestionIndex];

  return (
    <div
      ref={solverContainerRef}
      className={`${
        isSolverFullscreen
          ? 'fixed inset-0 z-50 p-4 sm:p-8 bg-[#070d1e] overflow-y-auto space-y-5'
          : 'bg-[#091224] border border-cyan-800/40 rounded-2xl p-4 sm:p-7 space-y-5 shadow-xl'
      } transition-all`}
    >
      {/* Top Assessment Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {assessment.mode === 'sheet' ? 'شيت درس' : assessment.mode === 'homework' ? 'واجب منزلي' : 'امتحان إلكتروني'}
            </span>
            {assessment.lessonTitle && (
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {assessment.lessonTitle}
              </span>
            )}
            <span className="text-[11px] text-slate-400">{windowBadgeText}</span>
          </div>
          <h3 className="font-extrabold text-base sm:text-xl text-white">{assessment.title}</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isFinished && (
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tabular-nums flex items-center gap-1.5 ${
                remainingSeconds < 300
                  ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
                  : 'bg-[#060b18] border-cyan-800/60 text-cyan-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>المتبقي: {formatDurationClock(remainingSeconds)}</span>
            </div>
          )}

          {assessment.fileUrl && (
            <button
              type="button"
              onClick={() =>
                setActiveDocument({
                  title: assessment.title,
                  fileUrl: assessment.fileUrl!,
                  fileName: assessment.fileName,
                  fileType: assessment.fileType,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>ملف الشيت المرفق</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleSolverFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e1c38] hover:bg-[#13274e] border border-cyan-700/60 text-cyan-300 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            {isSolverFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isSolverFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
          </button>

          {!isFinished && (
            <button
              type="button"
              onClick={() => setShowFinishSummary(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer whitespace-nowrap shrink-0"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>إنهاء {modeLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer whitespace-nowrap shrink-0"
            title={assessment.mode === 'homework' && !isFinished ? 'يُحفظ تقدمك تلقائياً للاستكمال خلال 24 ساعة' : 'الخروج'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{assessment.mode === 'homework' && !isFinished ? 'حفظ وخروج (استكمال لاحقاً)' : 'خروج'}</span>
          </button>
        </div>
      </div>

      {!isFinished ? (
        assessment.questions.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            لا توجد أسئلة تفاعلية مضافة في {modeLabel} حتى الآن.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Dynamic Top Statistics Box */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 bg-[#060b18] border border-cyan-900/50 rounded-2xl">
              <div className="p-2.5 bg-[#091224] border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-semibold block">إجمالي الأسئلة</span>
                <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums">
                  {questionStats.totalCount} سؤال ({questionStats.totalMarks} د)
                </span>
              </div>
              <div className="p-2.5 bg-[#091224] border border-cyan-900/40 rounded-xl">
                <span className="text-[10px] text-cyan-400 font-semibold block">الاختيار من متعدد</span>
                <span className="text-sm sm:text-base font-black text-cyan-300 font-mono tabular-nums">
                  {questionStats.mcqCount} ({questionStats.mcqPoints} د)
                </span>
              </div>
              <div className="p-2.5 bg-[#091224] border border-amber-900/40 rounded-xl">
                <span className="text-[10px] text-amber-400 font-semibold block">الأسئلة المقالية</span>
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono tabular-nums">
                  {questionStats.essayCount} ({questionStats.essayPoints} د)
                </span>
              </div>
              <div className="p-2.5 bg-[#091224] border border-emerald-900/40 rounded-xl">
                <span className="text-[10px] text-emerald-400 font-semibold block">تم حله حتى الآن</span>
                <span className="text-sm sm:text-base font-black text-emerald-300 font-mono tabular-nums">
                  {questionStats.answeredCount} / {questionStats.totalCount}
                </span>
              </div>
              <div className="p-2.5 bg-[#091224] border border-rose-900/40 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] text-rose-400 font-semibold block">متبقٍ بدون حل</span>
                <span className="text-sm sm:text-base font-black text-rose-300 font-mono tabular-nums">
                  {questionStats.unansweredCount} سؤال
                </span>
              </div>
            </div>

            {/* Interactive Question Map Box directly under Top Statistics Box */}
            <div className="p-3.5 bg-[#060b18] border border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <span className="font-bold text-white">خريطة التنقل بين الأسئلة:</span>
                <div className="flex items-center gap-3 flex-wrap text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-600 inline-block border border-red-400" />
                    <span>السؤال الحالي (لم يُحل)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600 inline-block border border-emerald-400" />
                    <span>تم الحل ✓</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-800 inline-block border border-slate-600" />
                    <span>لم يُحل بعد</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap max-h-40 overflow-y-auto p-0.5">
                {assessment.questions.map((q, idx) => {
                  const isAnswered =
                    q.type === 'essay'
                      ? !!(essayAnswers[q.id]?.trim())
                      : selectedAnswers[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIndex;

                  // Strict requested visual rule:
                  // - Current unanswered -> Red
                  // - Answered -> Green (with cyan ring if current)
                  // - Unvisited unanswered -> Neutral
                  let btnClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500';
                  if (isCurrent && !isAnswered) {
                    btnClass = 'bg-red-600 border-red-400 text-white shadow-md shadow-red-600/30 ring-2 ring-red-300/70';
                  } else if (isAnswered) {
                    btnClass = isCurrent
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-md ring-2 ring-cyan-300'
                      : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500';
                  }

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      title={`السؤال ${idx + 1}${isAnswered ? ' - تم حله' : isCurrent ? ' - السؤال الحالي (لم يُحل)' : ' - لم يُحل بعد'}`}
                      className={`min-w-[34px] h-8 px-1.5 rounded-lg border text-xs font-mono font-bold tabular-nums transition-all cursor-pointer flex items-center justify-center gap-0.5 ${btnClass}`}
                    >
                      <span>{idx + 1}</span>
                      {isAnswered && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Single Question Display Card */}
            {currentQuestion && (() => {
              const q = currentQuestion;
              const isEssay = q.type === 'essay';
              const qPoints = getQuestionPoints(q, assessment.questions, assessment.totalMarks);
              const isAnswered = isEssay
                ? !!(essayAnswers[q.id]?.trim())
                : selectedAnswers[q.id] !== undefined;

              return (
                <div className="space-y-4">
                  <div className="p-4 sm:p-6 bg-[#060a16] border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-white tabular-nums ${
                            isAnswered ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        >
                          السؤال {currentQuestionIndex + 1} من {assessment.questions.length}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                            isEssay
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {isEssay ? '✍️ سؤال مقالي (تصحيح المعلم)' : '🔘 اختيار من متعدد'}
                        </span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold tabular-nums text-[11px]">
                        الدرجة: {qPoints}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-white leading-relaxed whitespace-pre-wrap">
                      {q.text}
                    </p>

                    {q.image && (
                      <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-cyan-800/50 bg-black/40 p-2">
                        <img
                          src={q.image}
                          alt={`صورة السؤال ${currentQuestionIndex + 1}`}
                          className="w-full max-h-72 object-contain mx-auto rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Answer Input Area */}
                  {isEssay ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                        <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <PenTool className="w-3.5 h-3.5" />
                          <span>إجابة الطالب (اكتب الخطوات والمعادلات بالتفصيل):</span>
                        </span>
                        <span className="font-mono text-[11px] tabular-nums">
                          {(essayAnswers[q.id] || '').length} حرف
                        </span>
                      </div>
                      <textarea
                        value={essayAnswers[q.id] || ''}
                        onChange={(e) =>
                          setEssayAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        rows={5}
                        placeholder="اكتب إجابتك الكاملة والخطوات الكيميائية هنا..."
                        className="w-full p-4 bg-[#060a16] border border-slate-800 focus:border-cyan-400 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                        <span>اختر الإجابة الصحيحة:</span>
                        {selectedAnswers[q.id] !== undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => {
                                const next = { ...prev };
                                delete next[q.id];
                                return next;
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Eraser className="w-3 h-3" />
                            <span>إلغاء التحديد</span>
                          </button>
                        )}
                      </div>

                      {(q.options || []).map((opt, idx) => {
                        const isSelected = selectedAnswers[q.id] === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({
                                ...prev,
                                [q.id]: idx,
                              }))
                            }
                            className={`w-full text-right p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 shadow-sm'
                                : 'bg-[#080d1b] border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{opt}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 bg-[#080d1b] rounded-full" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Single-Question Navigator Bar */}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {currentQuestionIndex < assessment.questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentQuestionIndex((prev) => Math.min(assessment.questions.length - 1, prev + 1))
                          }
                          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap shrink-0"
                        >
                          <span>التالي</span>
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowFinishSummary(true)}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Flag className="w-4 h-4" />
                          <span>إنهاء ومراجعة التسليم</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )
      ) : (
        /* Result & Review Screen */
        resultData && (
          <div className="space-y-6 animate-fade-in py-2">
            <div className="p-6 bg-[#060b18] border border-emerald-500/30 rounded-2xl text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Award className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-white">تم تسليم {modeLabel} بنجاح!</h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2 text-xs">
                <div className="p-3 bg-[#091224] border border-cyan-800/40 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">درجة الاختياري (تصحيح فوري)</span>
                  <span className="text-lg font-black text-cyan-300 font-mono tabular-nums">
                    {resultData.autoMcqScore} / {resultData.autoMcqMax}
                  </span>
                </div>

                <div className="p-3 bg-[#091224] border border-amber-800/40 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">المقالي (مراجعة المعلم)</span>
                  <span className="text-lg font-black text-amber-300 font-mono tabular-nums">
                    {teacherGradedSaved
                      ? `${teacherGradedSaved.essayTotal} / ${resultData.essayMax}`
                      : resultData.hasEssay
                      ? `من ${resultData.essayMax}`
                      : 'لا يوجد'}
                  </span>
                </div>

                <div className="p-3 bg-[#091224] border border-rose-800/40 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">أسئلة متروكة فارغة (0)</span>
                  <span className="text-lg font-black text-rose-300 font-mono tabular-nums">
                    {resultData.blankCount}
                  </span>
                </div>

                <div className="p-3 bg-[#091224] border border-emerald-800/40 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">النتيجة المسجلة حالياً</span>
                  <span className="text-lg font-black text-emerald-300 font-mono tabular-nums">
                    {resultData.score} / {resultData.totalMax} (
                    {Math.round((resultData.score / (resultData.totalMax || 1)) * 100)}%)
                  </span>
                </div>
              </div>

              {resultData.hasEssay && !teacherGradedSaved && (
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 max-w-2xl mx-auto">
                  تم رصد درجة الأسئلة الاختيارية فورياً، والأسئلة المقالية المجاب عليها بانتظار اعتماد ومراجعة المعلم لإضافتها للدرجة النهائية.
                </p>
              )}
            </div>

            {/* Teacher Per-Question Essay Grading Panel */}
            {isTeacherOrSec && questionStats.essayCount > 0 && (
              <div className="p-5 bg-[#121936] border-2 border-amber-500/50 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-amber-300 font-extrabold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>لوحة المعلم: تصحيح الأسئلة المقالية ومنح الدرجات</span>
                  </h4>
                  <span className="text-xs text-slate-300 font-mono tabular-nums">
                    الدرجة الكلية للمقالي: {resultData.essayMax}
                  </span>
                </div>

                <div className="space-y-3">
                  {assessment.questions.map((q, idx) => {
                    if (q.type !== 'essay') return null;
                    const qMax = getQuestionPoints(q, assessment.questions, assessment.totalMarks);
                    const ans = (essayAnswers[q.id] || '').trim();
                    const isBlank = !ans;

                    return (
                      <div key={q.id || idx} className="p-3.5 bg-[#070d1e] border border-slate-800 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-white">س{idx + 1}: {q.text}</span>
                          <span className="font-mono text-amber-300 font-bold tabular-nums">الدرجة العظمى: {qMax}</span>
                        </div>
                        <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800 text-cyan-200 whitespace-pre-wrap">
                          {isBlank ? (
                            <span className="text-rose-400 font-bold">متروك فارغاً - خطأ تلقائياً (0 / {qMax})</span>
                          ) : (
                            ans
                          )}
                        </div>
                        {!isBlank && (
                          <div className="flex items-center gap-3 flex-wrap pt-1">
                            <label className="text-amber-300 font-bold">الدرجة الممنوحة (من {qMax}):</label>
                            <input
                              type="number"
                              min={0}
                              max={qMax}
                              step={0.5}
                              value={teacherEssayInputs[q.id] ?? ''}
                              onChange={(e) =>
                                setTeacherEssayInputs((prev) => ({
                                  ...prev,
                                  [q.id]: e.target.value,
                                }))
                              }
                              placeholder={`0 إلى ${qMax}`}
                              className="w-28 bg-[#0b1428] border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setTeacherEssayInputs((prev) => ({
                                  ...prev,
                                  [q.id]: String(qMax),
                                }))
                              }
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              الدرجة الكاملة ({qMax})
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                  {teacherGradedSaved && (
                    <span className="text-xs font-bold text-emerald-300">
                      ✓ تم اعتماد الدرجة النهائية: {teacherGradedSaved.total} / {resultData.totalMax}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTeacherEssayGrades}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer ms-auto"
                  >
                    اعتماد درجات الأسئلة المقالية وحفظ النتيجة النهائية
                  </button>
                </div>
              </div>
            )}

            {/* Question-by-Question Review Breakdown */}
            <div className="space-y-3">
              <h5 className="text-sm font-bold text-white">مراجعة تفصيلية لجميع الأسئلة:</h5>
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pe-1">
                {assessment.questions.map((q, idx) => {
                  const pts = getQuestionPoints(q, assessment.questions, assessment.totalMarks);
                  const isEssay = q.type === 'essay';
                  const studentOpt = selectedAnswers[q.id];
                  const essayAns = (essayAnswers[q.id] || '').trim();
                  const isBlank = isEssay ? !essayAns : studentOpt === undefined;
                  const isMcqCorrect = !isEssay && !isBlank && studentOpt === q.correctAnswerIndex;

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        isBlank
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : isEssay
                          ? 'bg-amber-950/15 border-amber-500/30'
                          : isMcqCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-red-950/20 border-red-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-white">
                          س{idx + 1}: {q.text}
                        </span>
                        {isBlank ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>متروك فارغاً · 0 / {pts} (خطأ تلقائياً)</span>
                          </span>
                        ) : isEssay ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                            سؤال مقالي · الدرجة العظمى {pts}
                          </span>
                        ) : isMcqCorrect ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                            إجابة صحيحة · +{pts} / {pts} ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-[10px]">
                            إجابة خاطئة · 0 / {pts} ✗
                          </span>
                        )}
                      </div>

                      {!isEssay && !isMcqCorrect && (
                        <p className="text-emerald-300 text-[11px]">
                          الإجابة الصحيحة: <strong>{q.options?.[q.correctAnswerIndex]}</strong>
                        </p>
                      )}

                      {q.explanation && (
                        <p className="text-cyan-300/90 text-[11px]">💡 التفسير: {q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
              >
                العودة إلى القائمة
              </button>
            </div>
          </div>
        )
      )}

      {/* FINISH SUMMARY MODAL (with Fullscreen option) */}
      {showFinishSummary && !isFinished && (
        <div
          className={`fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in ${
            isSummaryFullscreen ? 'p-0' : 'p-3 sm:p-5'
          }`}
        >
          <div
            className={`bg-[#0b1429] border-2 border-cyan-500/50 text-slate-100 shadow-2xl flex flex-col overflow-hidden transition-all ${
              isSummaryFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-2xl max-h-[90vh] rounded-3xl'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#080d1b] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white">
                    ملخص حالة الحل قبل تسليم {modeLabel}
                  </h4>
                  <p className="text-[11px] text-slate-400">{assessment.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSummaryFullscreen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e1c38] hover:bg-[#13274e] border border-cyan-700/60 text-cyan-300 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                title={isSummaryFullscreen ? 'تصغير نافذة الملخص' : 'تكبير نافذة الملخص لملء الشاشة'}
              >
                {isSummaryFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isSummaryFullscreen ? 'تصغير النافذة' : 'ملء الشاشة'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Solved vs Remaining Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-center">
                  <span className="text-emerald-300 font-semibold block">تم حلها</span>
                  <p className="text-2xl font-black text-white font-mono tabular-nums mt-1">
                    {questionStats.answeredCount} / {questionStats.totalCount}
                  </p>
                </div>

                <div className="p-3.5 bg-rose-500/10 border border-rose-500/40 rounded-2xl text-center">
                  <span className="text-rose-300 font-semibold block">متبقية بدون حل</span>
                  <p className="text-2xl font-black text-rose-300 font-mono tabular-nums mt-1">
                    {questionStats.unansweredCount} سؤال
                  </p>
                </div>

                <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl text-center">
                  <span className="text-cyan-300 font-semibold block">الوقت المتبقي</span>
                  <p className="text-2xl font-black text-cyan-300 font-mono tabular-nums mt-1">
                    {formatDurationClock(remainingSeconds)}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown of Unanswered Questions */}
              {questionStats.unansweredCount > 0 ? (
                <div className="p-4 bg-[#070d1e] border border-amber-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>تفاصيل الأسئلة المتبقية بدون حل (اضغط على أي رقم للانتقال إليه فوراً):</span>
                  </div>

                  {questionStats.unansweredMcqIndices.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>أسئلة اختيار من متعدد متبقية ({questionStats.unansweredMcqIndices.length}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {questionStats.unansweredMcqIndices.map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCurrentQuestionIndex(idx);
                              setShowFinishSummary(false);
                              setIsSummaryFullscreen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-200 font-mono font-bold tabular-nums cursor-pointer"
                          >
                            سؤال {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionStats.unansweredEssayIndices.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5" />
                        <span>أسئلة مقالية متبقية ({questionStats.unansweredEssayIndices.length}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {questionStats.unansweredEssayIndices.map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCurrentQuestionIndex(idx);
                              setShowFinishSummary(false);
                              setIsSummaryFullscreen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 text-amber-200 font-mono font-bold tabular-nums cursor-pointer"
                          >
                            سؤال {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 font-semibold">
                    ⚠️ تنبيه: أي سؤال يتم تركه فارغاً عند التسليم يُحسب خطأ وتُمنح له 0 درجة تلقائياً.
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-emerald-300 font-bold text-center">
                  ✓ رائع! لقد قمت بحل جميع الأسئلة ({questionStats.totalCount} من {questionStats.totalCount}) ويمكنك التسليم الآن.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#080d1b] border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowFinishSummary(false);
                  setIsSummaryFullscreen(false);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                العودة لاستكمال الحل
              </button>
              <button
                type="button"
                onClick={submitFinalAssessment}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg cursor-pointer"
              >
                تأكيد التسليم النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
