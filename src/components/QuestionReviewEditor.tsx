import React, { useRef, useState } from 'react';
import { Question } from '../types';
import {
  CheckCircle2,
  Trash2,
  PlusCircle,
  ImagePlus,
  Image as ImageIcon,
  X,
  FileQuestion,
  Sparkles,
  Loader2,
  PenTool,
  CheckSquare,
  ArrowRightLeft,
  BookOpen,
  HelpCircle,
  Plus,
} from 'lucide-react';

import { parseQuizWithAiClient } from '../utils/aiClientService';

interface QuestionReviewEditorProps {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  titleLabel?: string;
}

export const QuestionReviewEditor: React.FC<QuestionReviewEditorProps> = ({
  questions,
  setQuestions,
  titleLabel = 'مراجعة وتعديل الأسئلة',
}) => {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineNotice, setRefineNotice] = useState<string | null>(null);

  // AI Refinement without 404 network errors
  const handleRefineWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsRefining(true);
    setRefineNotice(null);
    try {
      const data = await parseQuizWithAiClient({
        rawText: JSON.stringify(questions, null, 2),
        instructions: `يرجى تعديل قائمة الأسئلة الحالية بدقة وفقاً لطلب الأستاذ التالي: "${aiPrompt}".`,
      });
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setRefineNotice(
          data.warning
            ? `⚠️ ${data.warning}`
            : '✨ تم تنفيذ التعديلات بنجاح وبدقة كاملة!'
        );
        setAiPrompt('');
        setTimeout(() => setRefineNotice(null), 4500);
      } else {
        setRefineNotice(`⚠️ ${data.error || data.warning || 'تعذر تنفيذ التعديلات بالذكاء الاصطناعي حالياً.'}`);
      }
    } catch {
      setRefineNotice('⚠️ حدث خطأ في الاتصال بالخادم أثناء تعديل الأسئلة.');
    } finally {
      setIsRefining(false);
    }
  };

  // 1. Add Manual Question (No AI needed) - MCQ
  const handleAddManualMcq = () => {
    const newQ: Question = {
      id: `q_manual_mcq_${Date.now()}_${questions.length + 1}`,
      text: `سؤال ${questions.length + 1}: اكتب نص السؤال الكيميائي هنا...`,
      type: 'mcq',
      options: ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'],
      correctAnswerIndex: 0,
      explanation: '',
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  // 2. Add Manual Question (No AI needed) - Essay (المعلم يصححه)
  const handleAddManualEssay = () => {
    const newQ: Question = {
      id: `q_manual_essay_${Date.now()}_${questions.length + 1}`,
      text: `سؤال مقالي ${questions.length + 1}: اكتب نص المسألة الكيميائية أو السؤال المقالي هنا...`,
      type: 'essay',
      options: [],
      correctAnswerIndex: 0,
      modelAnswer: '',
      explanation: 'سؤال مقالي يصححه المعلم يدوياً ويرصد درجته.',
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  // 3. Convert question between MCQ and Essay (تحويل السؤال الاختياري لمقالي والعكس)
  const handleToggleQuestionType = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentType = q.type || 'mcq';
        if (currentType === 'mcq') {
          // Convert from MCQ to Essay (مقالي يصححه المعلم)
          return {
            ...q,
            type: 'essay',
            modelAnswer: q.modelAnswer || (q.options && q.options[q.correctAnswerIndex] ? `الإجابة النموذجية: ${q.options[q.correctAnswerIndex]}` : ''),
            explanation: q.explanation || 'سؤال مقالي يصححه المعلم يدوياً.',
          };
        } else {
          // Convert from Essay to MCQ
          const defaultOpts = q.options && q.options.length >= 2
            ? q.options
            : ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'];
          return {
            ...q,
            type: 'mcq',
            options: defaultOpts,
            correctAnswerIndex: 0,
          };
        }
      })
    );
  };

  // Update question text
  const handleUpdateText = (qIndex: number, newText: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, text: newText } : q))
    );
  };

  // Update model answer for essay questions
  const handleUpdateModelAnswer = (qIndex: number, newModelAnswer: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, modelAnswer: newModelAnswer } : q))
    );
  };

  // Update explanation
  const handleUpdateExplanation = (qIndex: number, newExplanation: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, explanation: newExplanation } : q))
    );
  };

  // Update single option text
  const handleUpdateOption = (qIndex: number, optIndex: number, newOptionText: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newOpts = [...(q.options || [])];
        newOpts[optIndex] = newOptionText;
        return { ...q, options: newOpts };
      })
    );
  };

  // Add new option to MCQ
  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentOpts = q.options || [];
        return {
          ...q,
          options: [...currentOpts, `الخيار (${currentOpts.length + 1})`],
        };
      })
    );
  };

  // 4. Delete single option / answer (حذف الإجابة أو الخيار)
  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentOpts = q.options || [];
        if (currentOpts.length <= 1) {
          alert('يجب الإبقاء على خيار واحد على الأقل، أو يمكنك تحويل السؤال لمقالي بالكامل');
          return q;
        }
        const newOpts = currentOpts.filter((_, i) => i !== optIndex);
        const newCorrect =
          q.correctAnswerIndex === optIndex
            ? 0
            : q.correctAnswerIndex > optIndex
            ? q.correctAnswerIndex - 1
            : q.correctAnswerIndex;
        return { ...q, options: newOpts, correctAnswerIndex: newCorrect };
      })
    );
  };

  // Set correct answer index for MCQ
  const handleSetCorrectAnswer = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, correctAnswerIndex: optIndex } : q))
    );
  };

  // Delete entire question
  const handleDeleteQuestion = (qIndex: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  // Image handling
  const handleImageFileChange = (qIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setQuestions((prev) =>
        prev.map((q, idx) => (idx === qIndex ? { ...q, image: dataUrl } : q))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, image: undefined } : q))
    );
  };

  const mcqCount = questions.filter((q) => q.type !== 'essay').length;
  const essayCount = questions.filter((q) => q.type === 'essay').length;

  return (
    <div className="p-4 sm:p-5 bg-[#050811] rounded-2xl border-2 border-cyan-800/60 space-y-4 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-cyan-900/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center shrink-0">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-white">
                {titleLabel} ({questions.length} سؤال)
              </h4>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">
                {mcqCount} اختيار من متعدد
              </span>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">
                {essayCount} مقالي يصححه المعلم
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              يمكنك إضافة الأسئلة يدوياً بدون ذكاء اصطناعي، حذف أي إجابة، أو تحويل السؤال الاختياري لمقالي لتصححه بنفسك.
            </p>
          </div>
        </div>

        {/* Manual Add Question Buttons (No AI needed) */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            type="button"
            onClick={handleAddManualMcq}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            title="إضافة سؤال اختيار من متعدد وتحديد الإجابة الصحيحة وحذف الخيارات"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>+ سؤال اختياري (يدوي)</span>
          </button>

          <button
            type="button"
            onClick={handleAddManualEssay}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            title="إضافة سؤال مقالي تفصيلي يصححه المعلم يدوياً في لوحة التصحيح"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>+ سؤال مقالي (يصححه المعلم)</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner if no questions yet */}
      {questions.length === 0 && (
        <div className="p-6 bg-[#081024] border-2 border-dashed border-cyan-800/70 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-white">لا توجد أسئلة مضافة حتى الآن</h5>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              اضغط على أحد الأزرار أدناه لإضافة الأسئلة يدوياً بيدك بدون الحاجة للذكاء الاصطناعي، أو استخدم الذكاء الاصطناعي كخيار إضافي.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleAddManualMcq}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <CheckSquare className="w-4 h-4" />
              <span>إضافة سؤال اختيار من متعدد (MCQ) يدوياً</span>
            </button>
            <button
              type="button"
              onClick={handleAddManualEssay}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <PenTool className="w-4 h-4" />
              <span>إضافة سؤال مقالي يدوياً (يصححه المعلم)</span>
            </button>
          </div>
        </div>
      )}

      {/* Optional AI Refinement Bar (Only if user chooses to use it) */}
      {questions.length > 0 && (
        <div className="p-3 bg-[#081228] border border-cyan-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>(اختياري) تعديل أو صياغة الأسئلة بذكاء Google Gemini:</span>
            </span>
            <span className="text-[10px] text-slate-400">يمكنك التعديل يدوياً بالكامل أدناه دون الحاجة لـ AI</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRefineWithAi();
                }
              }}
              placeholder="اكتب أمراً للذكاء الاصطناعي إذا رغبت (مثال: أعد صياغة السؤال 2، اجعل كل الأسئلة مقالية)..."
              className="flex-1 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              disabled={isRefining || !aiPrompt.trim()}
              onClick={handleRefineWithAi}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>تعديل بـ Gemini ⚡</span>
            </button>
          </div>
          {refineNotice && (
            <p className="text-[11px] text-emerald-400 font-medium animate-fade-in">{refineNotice}</p>
          )}
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pe-1">
          {questions.map((q, qIdx) => {
            const isEssay = q.type === 'essay';

            return (
              <div
                key={q.id || qIdx}
                className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                  isEssay
                    ? 'bg-[#0f1424] border-amber-500/40 shadow-amber-950/20 shadow-md'
                    : 'bg-[#080d1b] border-slate-800 shadow-md'
                }`}
              >
                {/* Question Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center font-mono ${
                        isEssay
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {qIdx + 1}
                    </span>

                    <span className="text-xs font-bold text-white">
                      السؤال رقم {qIdx + 1}:
                    </span>

                    {/* Question Type Badge & 1-Click Converter */}
                    <button
                      type="button"
                      onClick={() => handleToggleQuestionType(qIdx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                        isEssay
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                      }`}
                      title="اضغط للتحويل بين السؤال الاختياري والسؤال المقالي"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>{isEssay ? '✍️ سؤال مقالي (يصححه المعلم)' : '🔘 اختيار من متعدد (تصحيح آلي)'}</span>
                    </button>
                  </div>

                  {/* Right Header Buttons: Image Upload, Convert Type Button, and Delete */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Instant Convert Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleQuestionType(qIdx)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                      title={isEssay ? 'تحويل إلى اختيار من متعدد' : 'تحويل إلى سؤال مقالي ليقوم المعلم بتصحيحه'}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden md:inline">
                        {isEssay ? 'تحويل لاختياري' : 'تحويل لمقالي (أصححه أنا)'}
                      </span>
                    </button>

                    {/* Image Attachment Button */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => {
                        fileInputRefs.current[q.id || qIdx] = el;
                      }}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileChange(qIdx, file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[q.id || qIdx]?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/50 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      title="إضافة صورة أو رسم توضيحي بجانب السؤال"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{q.image ? 'تغيير الصورة' : 'إرفاق صورة/رسم'}</span>
                    </button>

                    {/* Delete Question Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذا السؤال نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Body: Text Input & Image preview */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  <div className={q.image ? 'md:col-span-8 space-y-1' : 'md:col-span-12 space-y-1'}>
                    <label className="block text-[11px] text-slate-300 font-semibold">
                      نص السؤال الكيميائي:
                    </label>
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => handleUpdateText(qIdx, e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700/80 focus:border-cyan-400 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                      placeholder="اكتب نص السؤال الكيميائي أو المسألة بالتفصيل..."
                    />
                  </div>

                  {/* Attached Image Thumbnail */}
                  {q.image && (
                    <div className="md:col-span-4 bg-[#050811] p-2 rounded-xl border border-cyan-800/40 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>صورة السؤال المرفقة</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(qIdx)}
                          className="p-0.5 text-slate-400 hover:text-red-400 cursor-pointer"
                          title="حذف الصورة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <img
                        src={q.image}
                        alt={`صورة السؤال ${qIdx + 1}`}
                        className="w-full h-24 object-contain rounded-lg bg-black/40"
                      />
                    </div>
                  )}
                </div>

                {/* ESSAY QUESTION MODE: Teacher Grading Banner & Model Answer */}
                {isEssay ? (
                  <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <PenTool className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        سؤال مقالي تفصيلي: سيقوم الطالب بكتابة خطوات وإجابة هذا السؤال، وتصححه أنت يدوياً وترصد درجته عبر لوحة تصحيح المعلم.
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-amber-200/90 font-medium">
                        الإجابة النموذجية أو معايير تصحيح المعلم (اختياري - كمرجع لك عند مراجعة إجابة الطالب):
                      </label>
                      <textarea
                        rows={2}
                        value={q.modelAnswer || ''}
                        onChange={(e) => handleUpdateModelAnswer(qIdx, e.target.value)}
                        placeholder="اكتب الحل النموذجي أو الخطوات التي تبحث عنها أثناء التصحيح..."
                        className="w-full bg-[#050811] border border-amber-500/30 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* MCQ QUESTION MODE: Options with deletion, adding, and correct answer setting */
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>خيارات الإجابة (اضغط على علامة الصح لتحديد الإجابة الصحيحة، وسلة المهملات لحذف أي خيار):</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddOption(qIdx)}
                        className="text-[11px] px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ إضافة خيار إضافي</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || []).map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-500/15 border-emerald-400/80 text-emerald-200 shadow-sm'
                                : 'bg-[#050811] border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {/* Select as Correct Radio Button */}
                            <button
                              type="button"
                              onClick={() => handleSetCorrectAnswer(qIdx, optIdx)}
                              className={`p-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                                isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                              title={isCorrect ? 'هذه هي الإجابة النموذجية الصحيحة' : 'اضغط لتحديد هذا الخيار كإجابة نموذجية'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden sm:inline">
                                {isCorrect ? 'صحيحة' : 'تحديد'}
                              </span>
                            </button>

                            {/* Editable Option Text */}
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              className="flex-1 bg-transparent border-0 text-xs text-white focus:outline-none px-1"
                              placeholder={`الخيار (${optIdx + 1})`}
                            />

                            {/* Delete this single option / answer (حذف الإجابة) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(qIdx, optIdx)}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer shrink-0 transition-colors"
                              title="حذف هذا الخيار نهائياً من السؤال"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explanation / Notes (Optional for all question types) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      <span>تفسير علمي أو ملاحظات للطالب بعد الحل (اختياري):</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateExplanation(qIdx, e.target.value)}
                    placeholder="اكتب التفسير العلمي أو القاعدة الكيميائية المستند عليها..."
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Action Footer for Adding More Questions */}
      {questions.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-slate-400">
            إجمالي الأسئلة في هذا الامتحان: <strong className="text-white font-mono">{questions.length}</strong> سؤال
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddManualMcq}
              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ إضافة سؤال اختياري جديد</span>
            </button>
            <button
              type="button"
              onClick={handleAddManualEssay}
              className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>+ إضافة سؤال مقالي جديد</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
