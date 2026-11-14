import React, { useMemo, useState } from 'react';
import {
  UserCircle2,
  Phone,
  MapPin,
  Wallet,
  GraduationCap,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Sparkles,
  BookOpen,
  CreditCard,
  Eye,
  X,
  AlertCircle,
  Play,
  Plus,
  Trash2,
  Upload,
  Check,
  Search,
  Award,
  Clock,
} from 'lucide-react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import { ExamSubmission, GradeLevel, Question, QuestionBankItem } from '../types';
import { InteractiveAssessmentSolver, AssessmentConfig } from './InteractiveAssessmentSolver';

interface StudentProfileSectionProps {
  setActiveTab: (tab: string) => void;
}

type MainProfileTab = 'results' | 'custom_exam' | 'question_bank' | 'wallet_charge' | 'card_charge';
type ResultsSubTab = 'homework' | 'exam' | 'evaluative';

export const StudentProfileSection: React.FC<StudentProfileSectionProps> = () => {
  const {
    currentUser,
    activeGrade,
    setIsLoginModalOpen,
    examSubmissions,
    exams,
    homeworks,
    questionBank,
    addQuestionBankItem,
    deleteQuestionBankItem,
    paymentMethods,
    paymentRequests,
    submitPaymentReceipt,
    redeemCode,
    transactions,
  } = usePlatform();

  const [mainTab, setMainTab] = useState<MainProfileTab>('results');
  const [resultsSubTab, setResultsSubTab] = useState<ResultsSubTab>('homework');
  const [reviewSubmission, setReviewSubmission] = useState<ExamSubmission | null>(null);

  // Tab 2: Custom Exam ("امتحان خاص بيك")
  const [customChapter, setCustomChapter] = useState<string>('all');
  const [customCount, setCustomCount] = useState<number>(5);
  const [activeEvaluativeExam, setActiveEvaluativeExam] = useState<AssessmentConfig | null>(null);

  // Tab 3: Question Bank ("بنك الأسئلة")
  const [qbChapter, setQbChapter] = useState<string>('all');
  const [qbLesson, setQbLesson] = useState<string>('all');
  const [qbDifficulty, setQbDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [qbSearch, setQbSearch] = useState<string>('');
  const [qbSelectedOptions, setQbSelectedOptions] = useState<Record<string, number>>({});
  const [qbCheckedMap, setQbCheckedMap] = useState<Record<string, boolean>>({});
  const [showAddQbForm, setShowAddQbForm] = useState(false);
  const [newQb, setNewQb] = useState<{
    chapterTitle: string;
    lessonTitle: string;
    difficulty: 'easy' | 'medium' | 'hard';
    text: string;
    opt0: string;
    opt1: string;
    opt2: string;
    opt3: string;
    correctAnswerIndex: number;
    explanation: string;
  }>({
    chapterTitle: 'الباب الأول: العناصر الانتقالية',
    lessonTitle: 'الدرس الأول',
    difficulty: 'medium',
    text: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correctAnswerIndex: 0,
    explanation: '',
  });

  // Tab 4: Wallet Charge ("شحن المحفظة")
  const enabledPaymentMethods = useMemo(
    () => paymentMethods.filter((m) => m.isEnabled),
    [paymentMethods]
  );
  const [topupAmount, setTopupAmount] = useState<string>('100');
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    enabledPaymentMethods[0]?.id || ''
  );
  const [receiptScreenshot, setReceiptScreenshot] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [walletNotice, setWalletNotice] = useState<{ text: string; isError: boolean } | null>(null);

  // Tab 5: Prepaid Card ("شحن كارت")
  const [cardCode, setCardCode] = useState<string>('');
  const [cardNotice, setCardNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const effectiveGrade: GradeLevel =
    currentUser?.role === 'student'
      ? currentUser.grade
      : activeGrade !== 'all'
      ? activeGrade
      : 'sec3';

  const gradeLabels: Record<GradeLevel, string> = {
    sec1: 'الصف الأول الثانوي',
    sec2: 'الصف الثاني الثانوي',
    sec3: 'الصف الثالث الثانوي',
  };

  // All grade questions combining dedicated Question Bank + Exam & Homework questions
  const unifiedGradeQuestions = useMemo<QuestionBankItem[]>(() => {
    const bankForGrade = questionBank.filter((q) => q.grade === effectiveGrade);
    const existingIds = new Set(bankForGrade.map((q) => q.id));

    const extraFromExamsAndHw: QuestionBankItem[] = [];
    exams
      .filter((ex) => ex.grade === effectiveGrade)
      .forEach((ex) => {
        (ex.questions || []).forEach((q) => {
          if (q.type !== 'essay' && !existingIds.has(q.id) && (q.options || []).length >= 2) {
            existingIds.add(q.id);
            extraFromExamsAndHw.push({
              ...q,
              grade: effectiveGrade,
              chapterTitle: ex.lessonTitle ? `منهج: ${ex.lessonTitle}` : 'أسئلة الامتحانات الإلكترونية',
              lessonTitle: ex.title,
              difficulty: 'medium',
            });
          }
        });
      });

    homeworks
      .filter((hw) => hw.grade === effectiveGrade)
      .forEach((hw) => {
        (hw.questions || []).forEach((q) => {
          if (q.type !== 'essay' && !existingIds.has(q.id) && (q.options || []).length >= 2) {
            existingIds.add(q.id);
            extraFromExamsAndHw.push({
              ...q,
              grade: effectiveGrade,
              chapterTitle: hw.lessonTitle ? `منهج: ${hw.lessonTitle}` : 'أسئلة الواجبات والشيتات',
              lessonTitle: hw.title,
              difficulty: 'easy',
            });
          }
        });
      });

    return [...bankForGrade, ...extraFromExamsAndHw];
  }, [questionBank, exams, homeworks, effectiveGrade]);

  const chaptersList = useMemo(() => {
    return Array.from(new Set(unifiedGradeQuestions.map((q) => q.chapterTitle).filter(Boolean)));
  }, [unifiedGradeQuestions]);

  const lessonsList = useMemo(() => {
    const source =
      qbChapter === 'all'
        ? unifiedGradeQuestions
        : unifiedGradeQuestions.filter((q) => q.chapterTitle === qbChapter);
    return Array.from(new Set(source.map((q) => q.lessonTitle).filter(Boolean)));
  }, [unifiedGradeQuestions, qbChapter]);

  const filteredQbQuestions = useMemo(() => {
    const query = qbSearch.trim().toLowerCase();
    return unifiedGradeQuestions.filter((q) => {
      if (qbChapter !== 'all' && q.chapterTitle !== qbChapter) return false;
      if (qbLesson !== 'all' && q.lessonTitle !== qbLesson) return false;
      if (qbDifficulty !== 'all' && (q.difficulty || 'medium') !== qbDifficulty) return false;
      if (
        query &&
        !q.text.toLowerCase().includes(query) &&
        !q.chapterTitle.toLowerCase().includes(query) &&
        !q.lessonTitle.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [unifiedGradeQuestions, qbChapter, qbLesson, qbDifficulty, qbSearch]);

  // Student's own submissions across all types
  const mySubmissions = useMemo(() => {
    if (!currentUser) return [];
    if (isAdminOrSec) return examSubmissions;
    return examSubmissions.filter(
      (s) =>
        s.studentId === currentUser.id ||
        (currentUser.phone && s.studentPhone === currentUser.phone)
    );
  }, [examSubmissions, currentUser, isAdminOrSec]);

  const filteredSubmissions = useMemo(() => {
    return mySubmissions.filter((s) => {
      const t = s.assessmentType || 'exam';
      if (resultsSubTab === 'homework') return t === 'homework' || t === 'sheet';
      if (resultsSubTab === 'exam') return t === 'exam';
      return t === 'evaluative';
    });
  }, [mySubmissions, resultsSubTab]);

  // Helper to resolve question list for a submission (for total count & "عرض الإجابات")
  const resolveSubmissionQuestions = (sub: ExamSubmission): Question[] => {
    if (sub.questionsSnapshot && sub.questionsSnapshot.length > 0) {
      return sub.questionsSnapshot;
    }
    const matchedExam = exams.find((e) => e.id === sub.examId);
    if (matchedExam?.questions?.length) return matchedExam.questions;
    const matchedHw = homeworks.find((h) => h.id === sub.examId);
    if (matchedHw?.questions?.length) return matchedHw.questions;
    return [];
  };

  // Student's level insight for "امتحان خاص بيك"
  const studentLevelInfo = useMemo(() => {
    if (mySubmissions.length === 0) {
      return { avg: 0, label: 'بداية المسار', badge: 'مستوى تأسيسي', count: 0 };
    }
    const avg = Math.round(
      mySubmissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / mySubmissions.length
    );
    if (avg >= 85) {
      return { avg, label: 'متميز', badge: 'مستوى التحدي والمتفوقين', count: mySubmissions.length };
    }
    if (avg >= 65) {
      return { avg, label: 'جيد جداً', badge: 'مستوى متوازن متدرج', count: mySubmissions.length };
    }
    return { avg, label: 'يحتاج دعم وتثبيت', badge: 'مستوى بناء الأساسيات', count: mySubmissions.length };
  }, [mySubmissions]);

  const launchCustomExam = (presetDifficulty?: 'easy' | 'medium' | 'hard', customTitle?: string) => {
    let pool = unifiedGradeQuestions.filter((q) =>
      customChapter === 'all' ? true : q.chapterTitle === customChapter
    );
    if (presetDifficulty) {
      const strictPool = pool.filter((q) => (q.difficulty || 'medium') === presetDifficulty);
      if (strictPool.length >= 2) pool = strictPool;
    }
    if (pool.length === 0) {
      pool = unifiedGradeQuestions;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(customCount, shuffled.length));
    const totalMarks = picked.reduce((sum, q) => sum + (q.points ?? 1), 0);

    setActiveEvaluativeExam({
      id: `eval_${effectiveGrade}_${presetDifficulty || customChapter}_${Date.now()}`,
      title:
        customTitle ||
        `امتحان خاص (${customChapter === 'all' ? gradeLabels[effectiveGrade] : customChapter})`,
      lessonTitle: customChapter === 'all' ? 'تقييم شامل للمنهج' : customChapter,
      mode: 'evaluative',
      grade: effectiveGrade,
      durationMinutes: Math.max(10, picked.length * 2),
      totalMarks,
      questions: picked,
    });
  };

  const qbSessionStats = useMemo(() => {
    const checkedIds = Object.keys(qbCheckedMap).filter((id) => qbCheckedMap[id]);
    let correct = 0;
    checkedIds.forEach((id) => {
      const q = unifiedGradeQuestions.find((item) => item.id === id);
      if (q && qbSelectedOptions[id] === q.correctAnswerIndex) {
        correct += 1;
      }
    });
    return { solved: checkedIds.length, correct };
  }, [qbCheckedMap, qbSelectedOptions, unifiedGradeQuestions]);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptScreenshot(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWalletTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWalletNotice(null);
    const numAmount = Number(topupAmount);
    if (!Number.isFinite(numAmount) || numAmount < 10) {
      setWalletNotice({ text: 'يرجى إدخال مبلغ صحيح لا يقل عن 10 جنيهات.', isError: true });
      return;
    }
    const methodObj =
      enabledPaymentMethods.find((m) => m.id === selectedMethodId) || enabledPaymentMethods[0];
    const res = submitPaymentReceipt({
      lectureId: 'wallet_topup',
      lectureTitle: `شحن رصيد المحفظة (${numAmount} ج.م)`,
      amount: numAmount,
      paymentMethodName: methodObj?.name || 'تحويل إلكتروني',
      screenshotUrl:
        receiptScreenshot || 'https://placehold.co/600x360/0b1429/06b6d4?text=Wallet+TopUp+Receipt',
      notes: receiptNotes.trim() || `طلب شحن محفظة بقيمة ${numAmount} ج.م`,
    });
    if (res.success) {
      setWalletNotice({
        text: `تم إرسال طلب شحن المحفظة بمبلغ ${numAmount} ج.م بنجاح! سيتم إضافة الرصيد لحسابك فور مراجعة الإدارة.`,
        isError: false,
      });
      setReceiptScreenshot('');
      setReceiptNotes('');
    } else {
      setWalletNotice({ text: res.message, isError: true });
    }
  };

  const handleRedeemCard = (e: React.FormEvent, target: 'wallet' | 'card') => {
    e.preventDefault();
    if (!codeOrEmpty(cardCode)) return;
    const res = redeemCode(cardCode);
    const feedback = { text: res.message, isError: !res.success };
    if (target === 'wallet') {
      setWalletNotice(feedback);
    } else {
      setCardNotice(feedback);
    }
    if (res.success) setCardCode('');
  };

  function codeOrEmpty(val: string) {
    return val.trim().length > 0;
  }

  const handleAddQbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQb.text.trim() || !newQb.opt0.trim() || !newQb.opt1.trim()) return;
    addQuestionBankItem({
      grade: effectiveGrade,
      chapterTitle: newQb.chapterTitle.trim() || 'الباب الأول',
      lessonTitle: newQb.lessonTitle.trim() || 'الدرس الأول',
      difficulty: newQb.difficulty,
      type: 'mcq',
      points: 1,
      text: newQb.text.trim(),
      options: [newQb.opt0.trim(), newQb.opt1.trim(), newQb.opt2.trim(), newQb.opt3.trim()].filter(
        Boolean
      ),
      correctAnswerIndex: newQb.correctAnswerIndex,
      explanation: newQb.explanation.trim() || undefined,
    });
    setNewQb((prev) => ({
      ...prev,
      text: '',
      opt0: '',
      opt1: '',
      opt2: '',
      opt3: '',
      explanation: '',
    }));
    setShowAddQbForm(false);
  };

  if (!currentUser) {
    return (
      <div className="p-8 sm:p-12 bg-[#091224] border border-slate-800 rounded-3xl text-center space-y-4">
        <UserCircle2 className="w-12 h-12 text-cyan-400 mx-auto" />
        <h3 className="text-lg sm:text-xl font-bold text-white">سجل دخولك للوصول إلى صفحة حسابي</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          تعرض صفحة حسابي نتائج الواجبات والاختبارات، الامتحان التقييمي الخاص بك، بنك الأسئلة، وشحن المحفظة وكروت الشحن.
        </p>
        <button
          type="button"
          onClick={() => setIsLoginModalOpen(true)}
          className="min-h-[44px] px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold cursor-pointer"
        >
          تسجيل الدخول الآن
        </button>
      </div>
    );
  }

  const mainTabs: { id: MainProfileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'results', label: 'نتائج الواجبات والاختبارات', icon: ClipboardList },
    { id: 'custom_exam', label: 'امتحان خاص بيك', icon: Sparkles },
    { id: 'question_bank', label: 'بنك الأسئلة', icon: BookOpen },
    { id: 'wallet_charge', label: 'شحن المحفظة', icon: Wallet },
    { id: 'card_charge', label: 'شحن كارت', icon: CreditCard },
  ];

  const myTopupRequests = paymentRequests.filter(
    (req) =>
      req.lectureId === 'wallet_topup' &&
      (req.studentId === currentUser.id || (currentUser.phone && req.studentPhone === currentUser.phone))
  );

  const selectedMethodObj =
    enabledPaymentMethods.find((m) => m.id === selectedMethodId) || enabledPaymentMethods[0];

  const isHomeworkTab = resultsSubTab === 'homework';
  const nameColHeader = isHomeworkTab ? 'اسم الواجب' : 'اسم الاختبار';
  const startColHeader = isHomeworkTab ? 'وقت بدء الواجب' : 'وقت بدء الاختبار';
  const endColHeader = isHomeworkTab ? 'وقت إنهاء الواجب' : 'وقت إنهاء الاختبار';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact Student Header Card */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/40 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-cyan-600/30 shrink-0">
            {currentUser.name.trim().charAt(0)}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] sm:text-2xl font-extrabold text-white truncate">
                حسابي · {currentUser.name}
              </h2>
              <span className="text-xs font-bold text-cyan-400">
                · {isAdminOrSec ? 'عرض المشرف العام' : gradeLabels[currentUser.grade]}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-400">
              <span className="inline-flex items-center gap-1 font-mono">
                كود الطالب: <strong className="text-white">{currentUser.studentCode || 'ADMIN'}</strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-mono" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                {currentUser.phone}
              </span>
              {currentUser.governorate && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {currentUser.governorate}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-[#050811] border border-emerald-800/50">
            <p className="text-[11px] text-slate-400">رصيد المحفظة الحالي</p>
            <p className="text-lg font-extrabold text-emerald-400 tabular-nums">
              {currentUser.walletBalance} ج.م
            </p>
          </div>
        </div>
      </div>

      {/* Top Horizontal Scrollable Tabs Bar (5 Core Tabs) */}
      <div className="bg-[#091224] border border-cyan-900/40 rounded-2xl p-2">
        <div
          role="tablist"
          aria-label="أقسام حسابي"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
        >
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMainTab(tab.id);
                  if (tab.id !== 'custom_exam') setActiveEvaluativeExam(null);
                }}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                  active
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                    : 'bg-[#060b18] text-slate-300 hover:bg-slate-800/80 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-cyan-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== TAB 1: نتائج الواجبات والاختبارات ==================== */}
      {mainTab === 'results' && (
        <div className="p-5 sm:p-6 bg-[#091224] border border-slate-800 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                نتائج الواجبات والاختبارات
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                تابع درجاتك في جميع الواجبات والاختبارات والاختبارات التقييمية الخاصة بك، مع إمكانية مراجعة الإجابات والتفسير العلمي.
              </p>
            </div>
          </div>

          {/* 3 Sub-Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-800">
            {(
              [
                { id: 'homework', label: 'نتائج الواجبات' },
                { id: 'exam', label: 'نتائج الاختبارات' },
                { id: 'evaluative', label: 'نتائج الاختبارات التقييمية' },
              ] as { id: ResultsSubTab; label: string }[]
            ).map((sub) => {
              const active = resultsSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setResultsSubTab(sub.id)}
                  className={`min-h-[44px] px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-all border-b-2 ${
                    active
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-8 bg-[#060b18] border border-slate-800 rounded-2xl text-center space-y-2">
              <ClipboardList className="w-10 h-10 text-cyan-400/70 mx-auto" />
              <p className="text-sm font-bold text-white">
                لا توجد نتائج مسجلة في «
                {resultsSubTab === 'homework'
                  ? 'نتائج الواجبات'
                  : resultsSubTab === 'exam'
                  ? 'نتائج الاختبارات'
                  : 'نتائج الاختبارات التقييمية'}
                » حتى الآن
              </p>
              <p className="text-xs text-slate-400">
                {resultsSubTab === 'evaluative'
                  ? 'يمكنك إنشاء وحل اختبار تقييمي فوري من تبويب «امتحان خاص بيك» لتظهر نتيجته هنا.'
                  : 'بمجرد حل وتسليم أي تقييم أو واجب ستظهر كافة تفاصيل الدرجات والوقت والمحاولة هنا تلقائياً.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table View (11 exact columns) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-cyan-900/40 bg-[#060b18]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr
                      data-keep-dark="true"
                      className="bg-cyan-600 text-white font-extrabold"
                      style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                    >
                      <th className="py-3.5 px-3 whitespace-nowrap">التسلسل</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">رقم المحاولة</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">{nameColHeader}</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">عدد الأسئلة</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">النتيجة (%)</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">الدرجة</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">عدد الأسئلة المحلولة</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">عدد الأسئلة الصحيحة</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">{startColHeader}</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">{endColHeader}</th>
                      <th className="py-3.5 px-3 whitespace-nowrap text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 tabular-nums">
                    {filteredSubmissions.map((sub, idx) => {
                      const qs = resolveSubmissionQuestions(sub);
                      const totalQ = sub.totalQuestions ?? (qs.length > 0 ? qs.length : sub.maxScore || 0);
                      const solvedQ =
                        sub.solvedQuestionsCount ?? Math.max(0, totalQ - (sub.blankCount ?? 0));
                      const correctQ =
                        sub.correctQuestionsCount ??
                        (qs.length > 0 && sub.selectedAnswers
                          ? qs.filter(
                              (q) =>
                                q.type !== 'essay' &&
                                sub.selectedAnswers?.[q.id] === q.correctAnswerIndex
                            ).length
                          : Math.round(sub.autoMcqScore ?? sub.score));
                      const startTime = sub.startedAt || sub.submittedAt;

                      return (
                        <tr
                          key={sub.id}
                          className="odd:bg-[#091224] even:bg-[#060b18] hover:bg-cyan-950/30 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-300">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                            المحاولة {sub.attemptNumber ?? 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-white min-w-[170px]">
                            {sub.examTitle}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-200">{totalQ}</td>
                          <td className="py-3 px-3 font-mono font-extrabold text-emerald-400">
                            {sub.percentage}%
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                            {sub.score} من {sub.maxScore}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-200">{solvedQ}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-300">
                            {correctQ}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap" dir="ltr">
                            {startTime}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap" dir="ltr">
                            {sub.submittedAt}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setReviewSubmission(sub)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              <span>عرض الإجابات</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards View (< 768px) */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {filteredSubmissions.map((sub, idx) => {
                  const qs = resolveSubmissionQuestions(sub);
                  const totalQ = sub.totalQuestions ?? (qs.length > 0 ? qs.length : sub.maxScore || 0);
                  const solvedQ =
                    sub.solvedQuestionsCount ?? Math.max(0, totalQ - (sub.blankCount ?? 0));
                  const correctQ =
                    sub.correctQuestionsCount ??
                    (qs.length > 0 && sub.selectedAnswers
                      ? qs.filter(
                          (q) =>
                            q.type !== 'essay' &&
                            sub.selectedAnswers?.[q.id] === q.correctAnswerIndex
                        ).length
                      : Math.round(sub.autoMcqScore ?? sub.score));
                  const startTime = sub.startedAt || sub.submittedAt;

                  return (
                    <div
                      key={sub.id}
                      className="p-4 bg-[#060b18] border border-cyan-900/40 rounded-2xl space-y-3 text-xs tabular-nums"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[11px] font-bold text-cyan-400">
                            #{idx + 1} · المحاولة {sub.attemptNumber ?? 1}
                          </span>
                          <h4 className="text-sm font-extrabold text-white">{sub.examTitle}</h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-extrabold shrink-0">
                          {sub.percentage}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-[#091224] border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">الدرجة</span>
                          <strong className="text-white font-mono">
                            {sub.score} من {sub.maxScore}
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-[#091224] border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">عدد الأسئلة</span>
                          <strong className="text-white font-mono">{totalQ}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-[#091224] border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">الأسئلة المحلولة</span>
                          <strong className="text-cyan-300 font-mono">{solvedQ}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-[#091224] border border-slate-800">
                          <span className="text-slate-400 block text-[11px]">الإجابات الصحيحة</span>
                          <strong className="text-emerald-300 font-mono">{correctQ}</strong>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                        <p className="flex items-center justify-between">
                          <span>{startColHeader}:</span>
                          <span className="font-mono text-slate-300" dir="ltr">
                            {startTime}
                          </span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span>{endColHeader}:</span>
                          <span className="font-mono text-slate-300" dir="ltr">
                            {sub.submittedAt}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReviewSubmission(sub)}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold cursor-pointer"
                      >
                        <Eye className="w-4 h-4 shrink-0" />
                        <span>عرض الإجابات</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== TAB 2: امتحان خاص بيك ==================== */}
      {mainTab === 'custom_exam' && (
        <div className="space-y-5">
          {activeEvaluativeExam ? (
            <InteractiveAssessmentSolver
              assessment={activeEvaluativeExam}
              onClose={() => setActiveEvaluativeExam(null)}
              onSubmitted={() => {
                setResultsSubTab('evaluative');
              }}
            />
          ) : (
            <div className="p-5 sm:p-6 bg-[#091224] border border-slate-800 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span>امتحان خاص بيك · {gradeLabels[effectiveGrade]}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    اختبارات تقييمية مخصصة حسب صفك الدراسي ومستواك الأكاديمي وتُسجَّل نتائجها تلقائياً في «نتائج الاختبارات التقييمية».
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#060b18] border border-cyan-800/40 shrink-0">
                  <p className="text-[11px] text-slate-400">تقييم مستواك الحالي</p>
                  <p className="text-sm font-extrabold text-cyan-300 tabular-nums">
                    {studentLevelInfo.label} ({studentLevelInfo.avg}%) · {studentLevelInfo.badge}
                  </p>
                </div>
              </div>

              {/* 3 Tailored Presets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#060b18] border border-emerald-800/40 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-400">المستوى الأول · تأسيسي</span>
                    <h4 className="text-base font-extrabold text-white">تثبيت المفاهيم الأساسية</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      مناسب لبداية المراجعة والتأكد من إتقان القوانين والتعريفات الكيميائية الأساسية.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchCustomExam('easy', 'امتحان خاص - تثبيت المفاهيم الأساسية')}
                    className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    <span>ابدأ الامتحان التأسيسي</span>
                  </button>
                </div>

                <div className="p-4 bg-[#060b18] border border-cyan-800/40 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-cyan-400">المستوى الثاني · نظام حديث</span>
                    <h4 className="text-base font-extrabold text-white">اختبار متوازن على المنهج</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      مزيج متدرج من أسئلة الفهم والتطبيق المباشر على معادلات وأبواب {gradeLabels[effectiveGrade]}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchCustomExam('medium', 'امتحان خاص - النظام الحديث المتوازن')}
                    className="w-full min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    <span>ابدأ الامتحان المتوازن</span>
                  </button>
                </div>

                <div className="p-4 bg-[#060b18] border border-amber-800/40 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-400">المستوى الثالث · مستويات عليا</span>
                    <h4 className="text-base font-extrabold text-white">تحدي المتفوقين</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      أسئلة مستويات عليا ومسائل معايرة واتزان وتحليل كيميائي لقياس الدقة العالية.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchCustomExam('hard', 'امتحان خاص - تحدي المتفوقين')}
                    className="w-full min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4 shrink-0" />
                    <span>ابدأ اختبار المتفوقين</span>
                  </button>
                </div>
              </div>

              {/* Custom Builder */}
              <div className="p-5 bg-[#060b18] border border-slate-800 rounded-2xl space-y-4">
                <h4 className="text-sm sm:text-base font-extrabold text-white">
                  أو صمّم امتحانك التقييمي بنفسك حسب الباب وعدد الأسئلة:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-semibold">
                      اختر الباب / القسم
                    </label>
                    <select
                      value={customChapter}
                      onChange={(e) => setCustomChapter(e.target.value)}
                      className="w-full min-h-[44px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="all">جميع الأبواب ({unifiedGradeQuestions.length} سؤال متاح)</option>
                      {chaptersList.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-semibold">
                      عدد الأسئلة
                    </label>
                    <select
                      value={customCount}
                      onChange={(e) => setCustomCount(Number(e.target.value))}
                      className="w-full min-h-[44px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value={5}>5 أسئلة (تقييم سريع - 10 دقائق)</option>
                      <option value={10}>10 أسئلة (اختبار متوسط - 20 دقيقة)</option>
                      <option value={15}>15 سؤال (اختبار شامل - 30 دقيقة)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => launchCustomExam(undefined)}
                      disabled={unifiedGradeQuestions.length === 0}
                      className="w-full min-h-[44px] px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white text-xs sm:text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Play className="w-4 h-4 shrink-0" />
                      <span>بدء الامتحان المخصص</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: بنك الأسئلة ==================== */}
      {mainTab === 'question_bank' && (
        <div className="p-5 sm:p-6 bg-[#091224] border border-slate-800 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                بنك الأسئلة التدريبي · {gradeLabels[effectiveGrade]}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                تدرّب على أسئلة الكيمياء مصنفة حسب الباب والدرس مع التحقق الفوري وعرض التفسير العلمي.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3.5 py-2 rounded-xl bg-[#060b18] border border-cyan-800/40 text-xs font-bold tabular-nums">
                تم التدرب على <span className="text-cyan-400">{qbSessionStats.solved}</span> · إجابات صحيحة:{' '}
                <span className="text-emerald-400">{qbSessionStats.correct}</span>
              </div>
              {isAdminOrSec && (
                <button
                  type="button"
                  onClick={() => setShowAddQbForm((v) => !v)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال للبنك</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Add Question Form */}
          {isAdminOrSec && showAddQbForm && (
            <form
              onSubmit={handleAddQbSubmit}
              className="p-4 bg-[#060b18] border border-cyan-700/50 rounded-2xl space-y-3 text-xs"
            >
              <h4 className="text-sm font-extrabold text-cyan-300">إضافة سؤال جديد إلى بنك الأسئلة ({gradeLabels[effectiveGrade]})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={newQb.chapterTitle}
                  onChange={(e) => setNewQb({ ...newQb, chapterTitle: e.target.value })}
                  placeholder="اسم الباب (مثال: الباب الأول)"
                  className="min-h-[44px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-white"
                />
                <input
                  type="text"
                  required
                  value={newQb.lessonTitle}
                  onChange={(e) => setNewQb({ ...newQb, lessonTitle: e.target.value })}
                  placeholder="اسم الدرس"
                  className="min-h-[44px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-white"
                />
                <select
                  value={newQb.difficulty}
                  onChange={(e) =>
                    setNewQb({ ...newQb, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })
                  }
                  className="min-h-[44px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-white"
                >
                  <option value="easy">سهل / تأسيسي</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">مستويات عليا</option>
                </select>
              </div>
              <textarea
                required
                rows={2}
                value={newQb.text}
                onChange={(e) => setNewQb({ ...newQb, text: e.target.value })}
                placeholder="اكتب نص السؤال الكيميائي..."
                className="w-full bg-[#091224] border border-slate-700 rounded-xl p-3 text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="qbCorrectIdx"
                      checked={newQb.correctAnswerIndex === idx}
                      onChange={() => setNewQb({ ...newQb, correctAnswerIndex: idx })}
                    />
                    <input
                      type="text"
                      required={idx < 2}
                      value={(newQb as any)[`opt${idx}`]}
                      onChange={(e) => setNewQb({ ...newQb, [`opt${idx}`]: e.target.value })}
                      placeholder={`الاختيار ${idx + 1}`}
                      className="flex-1 min-h-[40px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-white"
                    />
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newQb.explanation}
                onChange={(e) => setNewQb({ ...newQb, explanation: e.target.value })}
                placeholder="التفسير العلمي للإجابة (اختياري)"
                className="w-full min-h-[44px] bg-[#091224] border border-slate-700 rounded-xl px-3 text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQbForm(false)}
                  className="min-h-[44px] px-4 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  حفظ في البنك
                </button>
              </div>
            </form>
          )}

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={qbSearch}
                onChange={(e) => setQbSearch(e.target.value)}
                placeholder="ابحث داخل الأسئلة..."
                className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 rounded-xl pe-3 ps-9 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <select
              value={qbChapter}
              onChange={(e) => {
                setQbChapter(e.target.value);
                setQbLesson('all');
              }}
              aria-label="تصفية حسب الباب"
              className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">جميع الأبواب</option>
              {chaptersList.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            <select
              value={qbLesson}
              onChange={(e) => setQbLesson(e.target.value)}
              aria-label="تصفية حسب الدرس"
              className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">جميع الدروس</option>
              {lessonsList.map((ls) => (
                <option key={ls} value={ls}>
                  {ls}
                </option>
              ))}
            </select>

            <select
              value={qbDifficulty}
              onChange={(e) =>
                setQbDifficulty(e.target.value as 'all' | 'easy' | 'medium' | 'hard')
              }
              aria-label="تصفية حسب المستوى"
              className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">كل المستويات</option>
              <option value="easy">سهل / تأسيسي</option>
              <option value="medium">متوسط</option>
              <option value="hard">مستويات عليا</option>
            </select>
          </div>

          {/* Questions List */}
          {filteredQbQuestions.length === 0 ? (
            <div className="p-8 bg-[#060b18] border border-slate-800 rounded-2xl text-center text-sm text-slate-400">
              لا توجد أسئلة مطابقة لخيارات التصفية الحالية.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQbQuestions.map((q, idx) => {
                const chosenIdx = qbSelectedOptions[q.id];
                const isChecked = !!qbCheckedMap[q.id];
                const isCorrect = isChecked && chosenIdx === q.correctAnswerIndex;
                const diffText =
                  q.difficulty === 'easy'
                    ? 'سهل'
                    : q.difficulty === 'hard'
                    ? 'مستويات عليا'
                    : 'متوسط';

                return (
                  <div
                    key={q.id}
                    className="p-4 sm:p-5 bg-[#060b18] border border-slate-800 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-xs text-cyan-400 font-semibold">
                          س{idx + 1} · {q.chapterTitle} · {q.lessonTitle} · {diffText}
                        </p>
                        <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                          {q.text}
                        </h4>
                      </div>
                      {isAdminOrSec && q.id.startsWith('qb_') === false && (
                        <button
                          type="button"
                          onClick={() => deleteQuestionBankItem(q.id)}
                          title="حذف السؤال من البنك"
                          className="p-2 rounded-lg bg-red-950/40 text-red-300 hover:bg-red-600 hover:text-white cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = chosenIdx === oIdx;
                        const isRightOpt = q.correctAnswerIndex === oIdx;

                        let optClass =
                          'bg-[#091224] border-slate-800 text-slate-200 hover:border-cyan-500/50';
                        if (isChecked) {
                          if (isRightOpt) {
                            optClass = 'bg-emerald-500/15 border-emerald-400 text-emerald-200';
                          } else if (isChosen) {
                            optClass = 'bg-red-500/15 border-red-400 text-red-200';
                          }
                        } else if (isChosen) {
                          optClass = 'bg-cyan-500/15 border-cyan-400 text-cyan-200';
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={isChecked}
                            onClick={() =>
                              setQbSelectedOptions((prev) => ({ ...prev, [q.id]: oIdx }))
                            }
                            className={`min-h-[44px] w-full text-right px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer disabled:cursor-default ${optClass}`}
                          >
                            <span>{opt}</span>
                            {isChecked && isRightOpt && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            {isChecked && isChosen && !isRightOpt && (
                              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      {!isChecked ? (
                        <button
                          type="button"
                          disabled={chosenIdx === undefined}
                          onClick={() =>
                            setQbCheckedMap((prev) => ({ ...prev, [q.id]: true }))
                          }
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>تحقق من الإجابة</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>إجابة صحيحة! أحسنت.</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-red-400">
                              <XCircle className="w-4 h-4 shrink-0" />
                              <span>
                                إجابة خاطئة — الإجابة الصحيحة:{' '}
                                <strong className="text-emerald-300">
                                  {q.options[q.correctAnswerIndex]}
                                </strong>
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isChecked && q.explanation && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 leading-relaxed">
                        💡 التفسير العلمي: {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: شحن المحفظة ==================== */}
      {mainTab === 'wallet_charge' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0c1c3f] to-[#091329] border border-cyan-800/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-right">
              <span className="text-xs font-bold text-cyan-400">محفظة الطالب التعليمية</span>
              <h3 className="text-2xl font-black text-white tabular-nums">
                رصيدك الحالي: <span className="text-cyan-400">{currentUser.walletBalance}</span> ج.م
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                يمكنك شحن محفظتك بطلب تحويل إلكتروني (فودافون كاش / إنستاباي / فوري) أو إدخال كود الشحن.
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Wallet className="w-7 h-7" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Wallet Top-Up by Amount & Payment Method */}
            <form
              onSubmit={handleWalletTopupSubmit}
              className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-4"
            >
              <h4 className="text-base font-extrabold text-white">طلب شحن المحفظة بمبلغ محدد</h4>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">المبلغ المطلوب شحنه (ج.م)</label>
                <input
                  type="number"
                  min={10}
                  required
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 text-sm font-mono font-bold text-white focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">وسيلة الدفع المتاحة</label>
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none"
                >
                  {enabledPaymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.accountNumber})
                    </option>
                  ))}
                </select>
              </div>

              {selectedMethodObj && (
                <div className="p-3.5 rounded-xl bg-[#060b18] border border-cyan-900/40 text-xs space-y-1">
                  <p className="font-bold text-cyan-300">بيانات التحويل: {selectedMethodObj.accountNumber}</p>
                  <p className="text-slate-400 leading-relaxed">{selectedMethodObj.instructions}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  إرفاق صورة إيصال التحويل (اختياري)
                </label>
                <label className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#060b18] border border-dashed border-cyan-700/60 hover:border-cyan-400 text-xs font-bold text-cyan-300 cursor-pointer">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>{receiptScreenshot ? 'تم اختيار صورة الإيصال ✓' : 'رفع سكرين شوت التحويل'}</span>
                  <input type="file" accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
                </label>
              </div>

              <input
                type="text"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="رقم الهاتف المحوَّل منه أو ملاحظات التحويل..."
                className="w-full min-h-[44px] bg-[#060b18] border border-slate-700 rounded-xl px-3 text-xs sm:text-sm text-white"
              />

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-extrabold cursor-pointer shadow-md"
              >
                إرسال طلب شحن المحفظة
              </button>
            </form>

            {/* Quick Code Top-up + Recent Topup Status */}
            <div className="space-y-5">
              <form
                onSubmit={(e) => handleRedeemCard(e, 'wallet')}
                className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-3"
              >
                <h4 className="text-base font-extrabold text-white">أو اشحن مباشرة بكود سريع</h4>
                <p className="text-xs text-slate-400">إذا كان لديك كود شحن جاهز أدخله هنا لإضافة المبلغ فوراً.</p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={cardCode}
                    onChange={(e) => {
                      setCardCode(e.target.value);
                      setWalletNotice(null);
                    }}
                    placeholder="مثال: AMR-XXXX-1"
                    className="flex-1 min-h-[44px] bg-[#060b18] border border-slate-700 rounded-xl px-3 text-sm font-mono uppercase text-white"
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold cursor-pointer shrink-0"
                  >
                    شحن فوري
                  </button>
                </div>

                {walletNotice && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      walletNotice.isError
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {walletNotice.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>{walletNotice.text}</span>
                  </div>
                )}
              </form>

              <div className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-sm font-extrabold text-white">طلبات شحن المحفظة ({myTopupRequests.length})</h4>
                {myTopupRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">لم ترسل طلبات شحن رصيد بعد.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {myTopupRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-[#060b18] border border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {req.amount} ج.م · {req.paymentMethodName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{req.submittedAt}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : req.status === 'rejected'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {req.status === 'approved'
                            ? 'تمت الموافقة ✓'
                            : req.status === 'rejected'
                            ? 'مرفوض ✗'
                            : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: شحن كارت ==================== */}
      {mainTab === 'card_charge' && (
        <div className="p-5 sm:p-6 bg-[#091224] border border-slate-800 rounded-3xl space-y-6 max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">شحن كارت السنتر والمكتبات</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                أدخل كود الكارت المطبوع لتفعيل رصيدك أو فتح الكورس المرتبط بالكارت فوراً.
              </p>
            </div>
          </div>

          <form onSubmit={(e) => handleRedeemCard(e, 'card')} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={cardCode}
                onChange={(e) => {
                  setCardCode(e.target.value);
                  setCardNotice(null);
                }}
                placeholder="أدخل كود الكارت هنا (مثال: AMR-ABC123-1)"
                className="flex-1 min-h-[48px] bg-[#060b18] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 text-sm sm:text-base font-mono uppercase text-white focus:outline-none"
                dir="ltr"
              />
              <button
                type="submit"
                className="min-h-[48px] px-7 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-extrabold rounded-xl cursor-pointer shadow-lg shadow-cyan-600/25 shrink-0"
              >
                شحن الكارت الآن
              </button>
            </div>

            {cardNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 ${
                  cardNotice.isError
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {cardNotice.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{cardNotice.text}</span>
              </div>
            )}
          </form>

          <div className="p-4 bg-[#060b18] border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-sm font-extrabold text-white">سجل الأكواد والكروت المشحونة</h4>
            {transactions.filter((t) => t.type === 'deposit').length === 0 ? (
              <p className="text-xs text-slate-400 py-3">لم يتم شحن أي كروت في المحفظة حتى الآن.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {transactions
                  .filter((t) => t.type === 'deposit')
                  .map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{tx.date}</p>
                      </div>
                      <span className="font-mono font-extrabold text-emerald-400 tabular-nums">
                        +{tx.amount} ج.م
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: عرض الإجابات ==================== */}
      {reviewSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setReviewSubmission(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[90dvh] bg-[#0b1429] border border-cyan-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
          >
            <div className="p-4 sm:p-5 bg-[#080d1b] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h4 className="text-base sm:text-lg font-extrabold text-white truncate">
                  مراجعة الإجابات · {reviewSubmission.examTitle}
                </h4>
                <p className="text-xs text-cyan-400 flex items-center gap-2 flex-wrap tabular-nums mt-0.5">
                  <span>المحاولة {reviewSubmission.attemptNumber ?? 1}</span>
                  <span>·</span>
                  <span>
                    الدرجة: {reviewSubmission.score} من {reviewSubmission.maxScore} ({reviewSubmission.percentage}%)
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {reviewSubmission.submittedAt}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewSubmission(null)}
                aria-label="إغلاق المراجعة"
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {(() => {
                const qs = resolveSubmissionQuestions(reviewSubmission);
                if (qs.length === 0) {
                  return (
                    <div className="p-6 bg-[#060b18] border border-slate-800 rounded-2xl text-center space-y-2">
                      <p className="text-sm font-bold text-white">ملخص النتيجة المسجلة</p>
                      <p className="text-xs text-slate-400">
                        الدرجة النهائية: {reviewSubmission.score} من {reviewSubmission.maxScore} ({reviewSubmission.percentage}%). تفاصيل نص الأسئلة غير مرفقة لهذه المحاولة السابقة.
                      </p>
                    </div>
                  );
                }

                return qs.map((q, qIdx) => {
                  const isEssay = q.type === 'essay';
                  const studentOpt = reviewSubmission.selectedAnswers?.[q.id];
                  const studentEssay = reviewSubmission.essayAnswers?.[q.id];
                  const isMcqCorrect =
                    !isEssay && studentOpt !== undefined && studentOpt === q.correctAnswerIndex;

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-4 rounded-2xl bg-[#060b18] border border-slate-800 space-y-2.5 text-xs sm:text-sm"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="font-bold text-white">
                          س{qIdx + 1}: {q.text}
                        </p>
                        {!isEssay && studentOpt !== undefined && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold shrink-0 ${
                              isMcqCorrect
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-red-500/15 text-red-300'
                            }`}
                          >
                            {isMcqCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>إجابة صحيحة</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>إجابة خاطئة</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      {isEssay ? (
                        <div className="space-y-1.5 text-xs">
                          <p className="text-slate-300">
                            إجابتك: <strong className="text-white">{studentEssay || 'لم يتم الإجابة'}</strong>
                          </p>
                          {q.modelAnswer && (
                            <p className="text-emerald-300">
                              الإجابة النموذجية: <strong>{q.modelAnswer}</strong>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-xs">
                          <p className="text-slate-300">
                            إجابتك:{' '}
                            <strong
                              className={
                                studentOpt === undefined
                                  ? 'text-slate-400'
                                  : isMcqCorrect
                                  ? 'text-emerald-300'
                                  : 'text-red-300'
                              }
                            >
                              {studentOpt !== undefined
                                ? q.options?.[studentOpt] ?? 'غير محدد'
                                : 'لم يتم الإجابة'}
                            </strong>
                          </p>
                          <p className="text-emerald-300">
                            الإجابة الصحيحة: <strong>{q.options?.[q.correctAnswerIndex]}</strong>
                          </p>
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-cyan-300 text-xs bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-2.5">
                          💡 التفسير العلمي: {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="p-4 bg-[#080d1b] border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setReviewSubmission(null)}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                إغلاق المراجعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
