import React, { useState, useRef, useEffect } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  Sparkles,
  Bot,
  Upload,
  Send,
  FileCheck2,
  BookCheck,
  Image,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Trash2,
  FileText,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  RotateCcw,
} from 'lucide-react';
import { Question, GradeLevel } from '../types';
import { QuestionReviewEditor } from './QuestionReviewEditor';
import { parseQuizWithAiClient, checkAiHealth, resetAiConnection, AiHealthStatus } from '../utils/aiClientService';
import { optimizeImageForAi } from '../utils/fileOptimizer';

export const GeminiTeacherDashboard: React.FC = () => {
  const { currentUser, addExam, addHomework, activeGrade } = usePlatform();

  // Strict check: Only Teacher (Admin) or Secretary can view and use this dashboard
  const isAuthorized =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL ||
    currentUser?.phone === '01069780486' ||
    currentUser?.phone === '+20 10 69780486';

  const [promptText, setPromptText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [optimizedFileDataUrl, setOptimizedFileDataUrl] = useState<string>('');
  const [extractedFileText, setExtractedFileText] = useState<string>('');
  const [isFileReadable, setIsFileReadable] = useState<boolean>(true);
  const [includeImagesWithQuestions, setIncludeImagesWithQuestions] = useState(true);
  const [targetGrade, setTargetGrade] = useState<GradeLevel>(activeGrade === 'all' ? 'sec3' : activeGrade);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isResettingAi, setIsResettingAi] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState('امتحان كيمياء ذكي - مستر عمرو السيد');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    checkAiHealth(false).then(setAiHealth);
  }, [isAuthorized]);

  const handleCheckConnection = async () => {
    setIsCheckingHealth(true);
    setResetSuccessMsg(null);
    const status = await checkAiHealth(true);
    setAiHealth(status);
    setIsCheckingHealth(false);
  };

  const handleEmergencyResetAi = async () => {
    setIsResettingAi(true);
    setAiError(null);
    setAiWarning(null);
    setResetSuccessMsg(null);
    const status = await resetAiConnection();
    setAiHealth(status);
    if (status.healthy) {
      setResetSuccessMsg(status.message || '⚡ تمت إعادة ضبط الطوارئ للذكاء الاصطناعي بنجاح!');
      setTimeout(() => setResetSuccessMsg(null), 5000);
    } else {
      setAiError(status.message);
    }
    setIsResettingAi(false);
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 bg-[#091224] border border-red-500/30 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-red-950/80 text-red-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">صلاحية الوصول مقيدة</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          لوحة تحكم Gemini AI الحقيقية مخصصة حصرياً لمستر عمرو السيد وإدارة السكرتارية المعتمدة.
        </p>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setAiError(null);
    setAiWarning(null);
    setIsFileReadable(true);
    setExtractedFileText('');

    const optimized = await optimizeImageForAi(file);
    setOptimizedFileDataUrl(optimized.dataUrl);
    setFileMimeType(optimized.mimeType || file.type || 'image/jpeg');
    setExtractedFileText(optimized.extractedText || '');

    if (file.type.startsWith('image/')) {
      setFilePreview(optimized.dataUrl);
    } else {
      setFilePreview(null);
    }

    if (optimized.quality && !optimized.quality.isValid) {
      setIsFileReadable(false);
      setAiError(
        optimized.quality.warning ||
          'الصورة غير واضحة أو منخفضة الدقة. يُرجى رفع صورة أوضح للأسئلة.'
      );
    }
  };

  const handleRunGemini = async () => {
    if (!promptText && !selectedFile) {
      setAiError('يرجى كتابة أمر لـ Gemini أو إرفاق ملف/صورة كتاب أو شيت قبل الإرسال.');
      return;
    }

    if (selectedFile && !isFileReadable && !extractedFileText && !promptText.trim()) {
      setAiError('الصورة المرفوعة غير واضحة ولا تحتوي على تباين كافٍ لقراءة الأسئلة. يُرجى إعادة رفع صورة أوضح.');
      return;
    }

    setIsLoading(true);
    setAiError(null);
    setAiWarning(null);
    setAiResponseText('⏳ جاري تحليل الملف والطلب عبر نظام الاستخراج المزدوج (Gemini Vision + المحرك العلمي)...');
    setSaveSuccessNotice(null);

    try {
      let fileBase64 = optimizedFileDataUrl;
      let mime = fileMimeType;
      let rawExtracted = extractedFileText;

      if (selectedFile && !fileBase64) {
        const optimized = await optimizeImageForAi(selectedFile);
        fileBase64 = optimized.dataUrl;
        mime = optimized.mimeType;
        rawExtracted = optimized.extractedText || '';
        setOptimizedFileDataUrl(fileBase64);
        setExtractedFileText(rawExtracted);
        if (optimized.quality && !optimized.quality.isValid) {
          setAiError(
            optimized.quality.warning ||
              'الصورة غير واضحة أو تالفة. يُرجى رفع صورة أوضح للأسئلة.'
          );
          setAiResponseText(null);
          setIsLoading(false);
          return;
        }
      }

      const data = await parseQuizWithAiClient({
        instructions: promptText || 'استخرج كل الأسئلة من هذه الصورة حرفياً مع الحفاظ التام على الرموز والمعادلات العلمية',
        grade: targetGrade,
        fileData: fileBase64 || undefined,
        mimeType: mime || undefined,
        rawText: rawExtracted || undefined,
      });

      if (data.unreadableImage) {
        setAiError(
          data.error ||
            'الصورة غير واضحة أو بها قص في النص. يُرجى إعادة تصوير أو رفع صورة أوضح للأسئلة.'
        );
        setAiResponseText(null);
        return;
      }

      if (data.warning) {
        setAiWarning(data.warning);
      }

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setSuggestedTitle(data.quizTitle || 'اختبار كيميائي مخصص');
        const qList: Question[] = (data.questions || []).map((q: any, idx: number) => {
          const resolvedType = q.type || (q.options && q.options.length > 0 ? 'mcq' : 'essay');
          return {
            id: q.id || `q_gemini_${Date.now()}_${idx + 1}`,
            text: q.text || 'سؤال تم استخراجه',
            image: includeImagesWithQuestions && filePreview ? filePreview : q.image || undefined,
            type: resolvedType,
            points: typeof q.points === 'number' ? q.points : resolvedType === 'essay' ? 2 : 1,
            options: resolvedType === 'essay' ? [] : q.options || ['أ', 'ب', 'ج', 'د'],
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
            modelAnswer: q.modelAnswer,
            explanation: q.explanation || 'إجابة نموذجية دقيقة وفق مناهج الكيمياء للثانوية العامة.',
          };
        });

        setGeneratedQuestions(qList);
        const engineLabel =
          data.source === 'gemini'
            ? `محرك Google Gemini (${data.modelUsed || 'gemini-4-hydrogen'})`
            : 'محرك الاستخراج العلمي المحلي الدقيق';
        setAiResponseText(
          `✅ [رد النظام]: تم تجهيز الأسئلة بنجاح عبر ${engineLabel}!\n\n` +
          `• عدد الأسئلة المستخرجة: ${qList.length} سؤال\n` +
          `• عنوان التقييم المقترح: ${data.quizTitle}\n` +
          `• جاهز الآن للحفظ المباشر كـ امتحان إلكتروني أو واجب في قاعدة البيانات الدائمة.`
        );
      } else {
        setAiError(data.error || data.warning || 'تعذر استخراج الأسئلة حالياً. يرجى المحاولة مرة أخرى أو رفع صورة أوضح.');
        setAiResponseText(null);
      }
    } catch (err: any) {
      setAiError('حدث خطأ غير متوقع أثناء معالجة الطلب: ' + (err?.message || 'خطأ في الاتصال'));
      setAiResponseText(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsExam = () => {
    if (generatedQuestions.length === 0) return;

    addExam({
      title: suggestedTitle,
      grade: targetGrade,
      durationMinutes: Math.max(20, generatedQuestions.length * 3),
      totalMarks: generatedQuestions.length * 2,
      questions: generatedQuestions,
      sourceFileName: selectedFile?.name || 'Gemini_AI_Generated',
    });

    setSaveSuccessNotice('تم حفظ وتثبيت الامتحان بنجاح في قاعدة البيانات الدائمة (Firestore) وقسم الامتحانات!');
  };

  const handleSaveAsHomework = () => {
    if (generatedQuestions.length === 0) return;

    addHomework({
      title: suggestedTitle,
      grade: targetGrade,
      description: `شيت وواجب مستخرج بواسطة Google Gemini بناءً على: ${promptText || selectedFile?.name || 'مذكرة الشرح'}`,
      deadline: 'خلال أسبوع من تاريخ النشر',
      fileUrl: filePreview || undefined,
      fileName: selectedFile?.name || 'شيت_كيمياء.pdf',
      fileType: 'pdf',
      questions: generatedQuestions,
    });

    setSaveSuccessNotice('تم حفظ وتثبيت الشيت/الواجب بنجاح في قاعدة البيانات الدائمة وقسم الواجبات!');
  };

  const handleCopyQuestions = () => {
    if (generatedQuestions.length === 0) return;
    const textToCopy = generatedQuestions
      .map(
        (q, idx) =>
          `س${idx + 1}: ${q.text}\n` +
          (q.options?.length ? q.options.map((opt, oIdx) => `  (${['أ', 'ب', 'ج', 'د'][oIdx] || oIdx + 1}) ${opt}`).join('\n') : '(سؤال مقالي)') +
          `\nالإجابة الصحيحة: ${q.options?.[q.correctAnswerIndex] || 'مراجعة المعلم'}\nتفسير: ${q.explanation || ''}\n`
      )
      .join('\n---\n\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddManualMcq = () => {
    const newQ: Question = {
      id: `q_manual_mcq_${Date.now()}_${generatedQuestions.length + 1}`,
      text: `سؤال ${generatedQuestions.length + 1}: اكتب نص السؤال الكيميائي هنا...`,
      type: 'mcq',
      options: ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'],
      correctAnswerIndex: 0,
      explanation: '',
    };
    setGeneratedQuestions((prev) => [...prev, newQ]);
    setSaveSuccessNotice(null);
  };

  const handleAddManualEssay = () => {
    const newQ: Question = {
      id: `q_manual_essay_${Date.now()}_${generatedQuestions.length + 1}`,
      text: `سؤال مقالي ${generatedQuestions.length + 1}: اكتب نص المسألة الكيميائية أو السؤال المقالي هنا...`,
      type: 'essay',
      options: [],
      correctAnswerIndex: 0,
      modelAnswer: '',
      explanation: 'سؤال مقالي يصححه المعلم يدوياً.',
    };
    setGeneratedQuestions((prev) => [...prev, newQ]);
    setSaveSuccessNotice(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-[#17143a] via-[#1a1c4b] to-[#0e1630] border-2 border-amber-500/50 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>لوحة حصرية للمعلم والسكرتارية فقط</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                Gemini 4 Hydrogen SDK
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
              <Bot className="w-6 h-6 text-amber-400" />
              <span>لوحة أدوات المعلم والسكرتارية (Gemini AI الحقيقي + قاعدة البيانات الدائمة)</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              ارفع صورة الكتاب، المذكرة، أو الشيت، واطلب من Gemini توليد الأسئلة، إدراج صور توضيحية بجانب كل سؤال، أو استخراج وتنسيق الامتحانات وحفظها فورياً في السيرفر وقاعدة البيانات للأبد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <div className="p-2.5 bg-black/40 rounded-2xl border border-amber-500/30 flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">نموذج نشط: {aiHealth?.activeModel || aiHealth?.primaryModel || 'gemini-4-hydrogen'}</span>
            </div>
            <button
              type="button"
              onClick={handleCheckConnection}
              disabled={isCheckingHealth || isResettingAi}
              className="px-3 py-2.5 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-2xl text-xs font-bold text-cyan-200 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
            >
              <Activity className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'جاري الفحص...' : 'فحص اتصال Gemini'}</span>
            </button>
            <button
              type="button"
              onClick={handleEmergencyResetAi}
              disabled={isResettingAi || isCheckingHealth}
              title="زر إعادة ضبط الطوارئ للذكاء الاصطناعي (مسح الكاش وإعادة تفعيل الاتصال فوراً)"
              className="px-3 py-2.5 bg-amber-600 hover:bg-amber-500 border border-amber-400/60 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-amber-600/20 disabled:opacity-60"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResettingAi ? 'animate-spin' : ''}`} />
              <span>{isResettingAi ? 'إعادة التفعيل...' : 'إعادة ضبط الطوارئ'}</span>
            </button>
          </div>
        </div>

        {/* Live AI Health Bar */}
        {aiHealth && (
          <div
            className={`mt-4 px-3.5 py-2.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
              aiHealth.healthy
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/50 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {aiHealth.healthy ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{resetSuccessMsg || aiHealth.message}</span>
            </div>
            <span className="text-[11px] opacity-80 font-mono">
              الأساسي: {aiHealth.primaryModel} | الاحتياطي: {aiHealth.fallbackModel}
            </span>
          </div>
        )}
      </div>

      {/* Quick Manual Question Creator Banner (بدون الحاجة للذكاء الاصطناعي) */}
      <div className="p-5 bg-gradient-to-r from-[#0d1630] via-[#0b1328] to-[#091224] border-2 border-cyan-500/40 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-extrabold text-white">
              ✍️ إضافة أسئلة يدوياً بيدك (بدون الحاجة للذكاء الاصطناعي)
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            يمكنك كتابة الأسئلة يدوياً، حذف أي إجابة، وتحويل السؤال الاختياري لمقالي لتصححه أنت وترصد درجته بنفسك.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddManualMcq}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            title="إضافة سؤال اختيار من متعدد وتحديد إجابته"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>+ سؤال اختياري (يدوي)</span>
          </button>

          <button
            type="button"
            onClick={handleAddManualEssay}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            title="إضافة سؤال مقالي يصححه المعلم يدوياً"
          >
            <Sliders className="w-4 h-4" />
            <span>+ سؤال مقالي (يصححه المعلم)</span>
          </button>
        </div>
      </div>

      {/* Main Input Form */}
      <div className="bg-[#091224] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        {/* Upload File or Image Area */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            <span>1. (اختياري) ارفع صورة أو ملف الشيت / الكتاب لتحليله وتوليد الأسئلة بـ Gemini:</span>
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-[#0d142b] hover:bg-[#111a36] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
            />

            {filePreview ? (
              <div className="relative max-h-48 overflow-hidden rounded-xl border border-amber-400/50 shadow-md">
                <img src={filePreview} alt="معاينة الملف" className="max-h-48 object-contain" />
              </div>
            ) : selectedFile ? (
              <div className="flex items-center gap-2 text-sm text-amber-300 font-bold">
                <FileText className="w-5 h-5" />
                <span>{selectedFile.name}</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  اضغط لاختيار صورة من الكتاب أو ملف PDF للشيت
                </p>
                <p className="text-[11px] text-slate-400">
                  يدعم صور الكاميرا، لقطات الشاشة، الشيتات، والمذكرات
                </p>
              </>
            )}
          </div>
        </div>

        {/* Options Row: Target Grade & Image attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">الصف الدراسي المستهدف:</label>
            <select
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value as GradeLevel)}
              className="w-full p-3 bg-[#060b18] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="sec3">الصف الثالث الثانوي (الكيمياء 2026)</option>
              <option value="sec2">الصف الثاني الثانوي</option>
              <option value="sec1">الصف الأول الثانوي</option>
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2.5 p-3 bg-[#060b18] border border-slate-700 rounded-xl cursor-pointer hover:border-amber-400 transition-colors">
              <input
                type="checkbox"
                checked={includeImagesWithQuestions}
                onChange={(e) => setIncludeImagesWithQuestions(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-amber-200">
                إضافة الصورة المرفوعة بجانب الأسئلة تلقائياً (Diagrams / صور توضيحية)
              </span>
            </label>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Bot className="w-4 h-4" />
            <span>2. أمر وتوجيهات المعلم لـ Gemini AI الحقيقي:</span>
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={3}
            placeholder="مثال: استخرج كل الأسئلة من هذه الصورة واجعلها اختيار من متعدد مع سؤال مقالي، أو اقترح 5 أسئلة إضافية على هذا الباب مع توضيح الإجابات النموذجية..."
            className="w-full p-4 bg-[#060b18] border border-slate-700 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all leading-relaxed"
          />

          {/* Quick Prompt Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] text-slate-400 shrink-0">أوامر سريعة:</span>
            {[
              'استخرج الأسئلة من الصورة حرفياً واجعلها MCQ ومقالي',
              'حلل الشيت واقترح أسئلة مستويات تفكير عليا',
              'ضع سؤالين اختيار من متعدد وسؤالاً مقالياً مع نموذج الإجابة',
              'نسق المسائل الكيميائية مع التفسير العلمي وخطوات الحل',
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPromptText(p)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 whitespace-nowrap cursor-pointer transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Submit to Real Gemini AI */}
        <button
          onClick={handleRunGemini}
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-black font-extrabold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-black" />
              <span>جاري التحليل واستخراج الأسئلة عبر Gemini AI الحقيقي...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current text-black" />
              <span>⚡ إرسال إلى Gemini AI الحقيقي والتحليل الآن</span>
            </>
          )}
        </button>

        {/* Error Alert Banner with Retry */}
        {aiError && (
          <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-100">تعذر تنفيذ الطلب عبر Gemini API</p>
                <p className="leading-relaxed">{aiError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRunGemini}
              disabled={isLoading}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة الآن</span>
            </button>
          </div>
        )}

        {/* Fallback / Rate-Limit Warning Banner */}
        {aiWarning && !aiError && (
          <div className="p-3.5 bg-amber-950/50 border border-amber-500/40 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{aiWarning}</p>
          </div>
        )}

        {/* Live Response Box */}
        {aiResponseText && (
          <div className="p-4 bg-[#060b18] border border-amber-500/40 rounded-2xl text-xs text-amber-200 font-mono whitespace-pre-wrap leading-relaxed shadow-inner animate-fade-in">
            {aiResponseText}
          </div>
        )}

        {/* Save Notice */}
        {saveSuccessNotice && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-bold animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Generated & Manual Questions Section with Actions & Full Editor */}
        {generatedQuestions.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-4 animate-fade-in">
            <div className="p-4 sm:p-5 bg-[#0d1630] rounded-3xl border border-cyan-800/60 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-cyan-300 block">
                    عنوان الامتحان أو التقييم (يمكنك تعديله):
                  </label>
                  <input
                    type="text"
                    value={suggestedTitle}
                    onChange={(e) => setSuggestedTitle(e.target.value)}
                    className="w-full bg-[#060a16] border border-cyan-700/60 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold focus:outline-none"
                    placeholder="اكتب عنوان الامتحان هنا..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                  <button
                    type="button"
                    onClick={handleSaveAsExam}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                    title="حفظ دائم في قاعدة البيانات كـ امتحان إلكتروني"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>اعتماد كامتحان إلكتروني</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAsHomework}
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                    title="حفظ دائم في قاعدة البيانات كـ شيت / واجب"
                  >
                    <BookCheck className="w-4 h-4" />
                    <span>اعتماد كشيت / واجب</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQuestions}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1 cursor-pointer"
                    title="نسخ جميع الأسئلة للحافظة"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  {confirmClear ? (
                    <div className="flex items-center gap-1.5 bg-red-950/70 border border-red-700/60 rounded-xl px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedQuestions([]);
                          setSaveSuccessNotice(null);
                          setConfirmClear(false);
                        }}
                        className="text-xs font-bold text-red-200 hover:text-white cursor-pointer"
                      >
                        تأكيد المسح
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="text-xs text-slate-300 hover:text-white px-1 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="p-2.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs cursor-pointer"
                      title="مسح الأسئلة والبدء من جديد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Comprehensive Question Review & Live Editor */}
            <QuestionReviewEditor
              questions={generatedQuestions}
              setQuestions={setGeneratedQuestions}
              titleLabel="مراجعة وتعديل الأسئلة (حذف خيارات، تحويل لمقالي، وإضافة أسئلة بدون AI)"
            />
          </div>
        )}
      </div>
    </div>
  );
};
