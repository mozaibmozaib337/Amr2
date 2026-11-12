import React, { useState } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  Trophy,
  Crown,
  Search,
  Clock,
  MessageSquare,
  FileCheck2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  PenTool,
  X,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { ExamSubmission, Question } from '../types';
import { buildWhatsAppUrl } from '../utils/safeExternalLink';
import { getQuestionPoints } from './InteractiveAssessmentSolver';

export const TopRankingsDirectorySection: React.FC = () => {
  const {
    exams,
    homeworks,
    activeGrade,
    getExamRankings,
    updateExamSubmissionGrade,
    currentUser,
  } = usePlatform();

  const [subTab, setSubTab] = useState<'sheets' | 'exams'>('sheets');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [searchByItem, setSearchByItem] = useState<Record<string, string>>({});
  const [gradingSubmission, setGradingSubmission] = useState<{
    sub: ExamSubmission;
    questions: Question[];
    fallbackTotalMarks: number;
  } | null>(null);
  const [essayInputs, setEssayInputs] = useState<Record<string, string>>({});
  const [bulkEssayScoreInput, setBulkEssayScoreInput] = useState<string>('');

  const isTeacherOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;

  // Strictly ONLY Sheets (exclude regular homeworks completely)
  const sheetItems = homeworks.filter((hw) => {
    if (hw.kind !== 'sheet') return false;
    if (studentGrade !== 'all' && currentUser?.role === 'student' && hw.grade !== studentGrade) {
      return false;
    }
    return true;
  });

  // Strictly ONLY Exams
  const examItems = exams.filter((ex) => {
    if (studentGrade !== 'all' && currentUser?.role === 'student' && ex.grade !== studentGrade) {
      return false;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openEssayGrader = (sub: ExamSubmission, questions: Question[], fallbackTotalMarks: number) => {
    const initialMap: Record<string, string> = {};
    questions
      .filter((q) => q.type === 'essay')
      .forEach((q) => {
        if (sub.essayScores && sub.essayScores[q.id] !== undefined) {
          initialMap[q.id] = String(sub.essayScores[q.id]);
        } else {
          initialMap[q.id] = '';
        }
      });
    setEssayInputs(initialMap);
    setBulkEssayScoreInput(sub.teacherExtraScore !== undefined ? String(sub.teacherExtraScore) : '');
    setGradingSubmission({ sub, questions, fallbackTotalMarks });
  };

  const handleSaveEssayGrade = () => {
    if (!gradingSubmission) return;
    const { sub, questions, fallbackTotalMarks } = gradingSubmission;
    const essayQs = questions.filter((q) => q.type === 'essay');

    if (essayQs.length > 0) {
      const scoresMap: Record<string, number> = {};
      let totalExtra = 0;
      essayQs.forEach((q) => {
        const maxQ = getQuestionPoints(q, questions, fallbackTotalMarks);
        const ans = (sub.essayAnswers?.[q.id] || '').trim();
        if (!ans) {
          scoresMap[q.id] = 0;
          return;
        }
        const parsed = parseFloat(essayInputs[q.id] ?? '');
        const clean = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), maxQ) : 0;
        scoresMap[q.id] = clean;
        totalExtra += clean;
      });
      updateExamSubmissionGrade(sub.id, Number(totalExtra.toFixed(2)), scoresMap);
    } else {
      const extra = parseFloat(bulkEssayScoreInput) || 0;
      updateExamSubmissionGrade(sub.id, extra);
    }
    setGradingSubmission(null);
  };

  const renderCollapsibleItem = (item: {
    id: string;
    title: string;
    lessonTitle?: string;
    totalMarks: number;
    questions: Question[];
    type: 'sheet' | 'exam';
  }) => {
    const isExpanded = !!expandedIds[item.id];
    const allRankings = getExamRankings(item.id, item.type);
    const searchVal = (searchByItem[item.id] || '').toLowerCase().trim();
    const filteredRankings = searchVal
      ? allRankings.filter(
          (r) =>
            r.studentName.toLowerCase().includes(searchVal) ||
            r.studentPhone.includes(searchVal) ||
            (r.studentCode && r.studentCode.toLowerCase().includes(searchVal)) ||
            (r.governorate && r.governorate.toLowerCase().includes(searchVal))
        )
      : allRankings;

    return (
      <div
        key={item.id}
        className="bg-[#091224] border border-cyan-900/40 rounded-2xl overflow-hidden shadow-md transition-all"
      >
        {/* Collapsed Header Row (Shows only name + lesson badge + chevron arrow by default) */}
        <button
          type="button"
          onClick={() => toggleExpand(item.id)}
          aria-expanded={isExpanded}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right hover:bg-cyan-950/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                item.type === 'sheet'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              }`}
            >
              {item.type === 'sheet' ? <BookOpen className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">{item.title}</h3>
                {item.lessonTitle && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {item.lessonTitle}
                  </span>
                )}
              </div>
              {isExpanded && (
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                  الدرجة الكلية: {item.totalMarks} · عدد الطلاب المصنفين: {allRankings.length} طالب
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#060b18] border border-slate-800 text-[11px] font-mono tabular-nums text-slate-300">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{allRankings.length} طالب</span>
            </span>
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                isExpanded
                  ? 'bg-cyan-600 text-white border-cyan-400'
                  : 'bg-[#060b18] text-cyan-300 border-slate-700 hover:border-cyan-500'
              }`}
              title={isExpanded ? 'إغلاق قائمة الأوائل' : 'فتح قائمة الأوائل كاملة'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
        </button>

        {/* Expanded Full Ranked Leaderboard (1st to Last - Zero Cap) */}
        {isExpanded && (
          <div className="border-t border-slate-800 p-4 sm:p-5 bg-[#060b18] space-y-4 animate-fade-in">
            {/* Search bar inside this sheet/exam */}
            <div className="relative">
              <input
                type="text"
                value={searchByItem[item.id] || ''}
                onChange={(e) => setSearchByItem((prev) => ({ ...prev, [item.id]: e.target.value }))}
                placeholder="ابحث داخل القائمة بالاسم، الكود، رقم الهاتف، أو المحافظة..."
                className="w-full bg-[#091224] border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2 ps-10 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {filteredRankings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-[#091224] rounded-xl border border-slate-800">
                {allRankings.length === 0
                  ? `لم يقم أي طالب بتسليم ${item.type === 'sheet' ? 'هذا الشيت' : 'هذا الامتحان'} بعد.`
                  : 'لا توجد نتائج تطابق بحثك.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#091224] max-h-[540px] overflow-y-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-[#0b1428] text-slate-400 text-[11px] font-bold border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3 text-center w-16">المركز</th>
                      <th className="py-3 px-3">اسم الطالب</th>
                      <th className="py-3 px-3">كود الطالب</th>
                      <th className="py-3 px-3">المحافظة</th>
                      <th className="py-3 px-3 text-center">الدرجة</th>
                      <th className="py-3 px-3 text-center">النسبة</th>
                      <th className="py-3 px-3 text-center">المدة</th>
                      <th className="py-3 px-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRankings.map((sub) => {
                      const rank = sub.rank || 1;
                      const isTop1 = rank === 1;
                      const isTop2 = rank === 2;
                      const isTop3 = rank === 3;
                      const waUrl = buildWhatsAppUrl(
                        sub.studentPhone,
                        `ألف مبروك يا بطل!\nتهنئة خاصة من مستر عمرو السيد بمناسبة حصولك على المركز (${rank}) في ${sub.examTitle} بدرجة (${sub.score} / ${sub.maxScore}) بنسبة (${sub.percentage}%).\nاستمر في التفوق!`
                      );

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-cyan-950/20 transition-colors ${
                            isTop1
                              ? 'bg-amber-500/10'
                              : isTop2
                              ? 'bg-slate-400/10'
                              : isTop3
                              ? 'bg-amber-800/10'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-black tabular-nums ${
                                isTop1
                                  ? 'bg-amber-400 text-slate-950'
                                  : isTop2
                                  ? 'bg-slate-300 text-slate-950'
                                  : isTop3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {rank}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span>{sub.studentName}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-cyan-400 whitespace-nowrap tabular-nums">
                            {sub.studentCode || '---'}
                          </td>

                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                            {sub.governorate || 'القاهرة'}
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold whitespace-nowrap tabular-nums">
                            <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-800/40 rounded-lg text-cyan-300">
                              {sub.score} / {sub.maxScore}
                            </span>
                            {sub.status === 'pending_teacher_review' && (
                              <span className="block text-[10px] text-amber-400 font-sans mt-0.5">
                                بانتظار تصحيح المقالي
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold tabular-nums whitespace-nowrap">
                            <span
                              className={
                                sub.percentage >= 90
                                  ? 'text-emerald-400'
                                  : sub.percentage >= 75
                                  ? 'text-cyan-400'
                                  : 'text-amber-300'
                              }
                            >
                              {sub.percentage}%
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 whitespace-nowrap tabular-nums">
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              {sub.timeSpentMinutes || 1} د
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isTeacherOrSec && item.questions.some((q) => q.type === 'essay') && (
                                <button
                                  type="button"
                                  onClick={() => openEssayGrader(sub, item.questions, item.totalMarks)}
                                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="تصحيح المقالي ومنح/خصم الدرجات"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span>{sub.teacherGraded ? 'تعديل المقالي' : 'تصحيح المقالي'}</span>
                                </button>
                              )}

                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                                title="إرسال تهنئة عبر واتساب"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>تهنئة</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Main Sub-Tabs Switch */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>قوائم الأوائل الشاملة (من المركز الأول حتى الأخير)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">أوائل الشيتات والامتحانات</h2>
          <p className="text-xs text-slate-400 mt-1">
            اختر الشيتات أو الامتحانات واضغط على السهم بجانب أي تقييم لعرض أو إخفاء قائمة الأوائل بالكامل دون أي حد أقصى للعدد.
          </p>
        </div>

        {/* Sub-Tabs: Sheets vs Exams ONLY */}
        <div className="flex items-center gap-2 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('sheets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'sheets'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>أوائل الشيتات ({sheetItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('exams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'exams'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>أوائل الامتحانات ({examItems.length})</span>
          </button>
        </div>
      </div>

      {/* Directory List */}
      {subTab === 'sheets' ? (
        sheetItems.length === 0 ? (
          <div className="p-10 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-2">
            <BookOpen className="w-9 h-9 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">لا توجد شيتات دروس مضافة حالياً</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              عند إضافة شيت مرتبط بالدرس من لوحة التحكم (بنوع &quot;شيت درس&quot;)، سيظهر هنا تلقائياً مع زر سهم لعرض جميع أوائل الشيت.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheetItems.map((sheet) => {
              const qs = sheet.questions || [];
              const totalM =
                qs.some((q) => q.points !== undefined)
                  ? Number(qs.reduce((acc, q) => acc + (q.points ?? 1), 0).toFixed(2))
                  : sheet.totalMarks || qs.length || 10;

              return renderCollapsibleItem({
                id: sheet.id,
                title: sheet.title,
                lessonTitle: sheet.lessonTitle,
                totalMarks: totalM,
                questions: qs,
                type: 'sheet',
              });
            })}
          </div>
        )
      ) : examItems.length === 0 ? (
        <div className="p-10 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-2">
          <FileCheck2 className="w-9 h-9 text-cyan-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">لا توجد امتحانات مضافة حالياً</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            بمجرد إضافة امتحان وحله من الطلاب، سيظهر هنا مع زر سهم لعرض قائمة الترتيب كاملة من الأول للأخير.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {examItems.map((ex) => {
            const qs = ex.questions || [];
            const totalM =
              qs.some((q) => q.points !== undefined)
                ? Number(qs.reduce((acc, q) => acc + (q.points ?? 1), 0).toFixed(2))
                : ex.totalMarks;

            return renderCollapsibleItem({
              id: ex.id,
              title: ex.title,
              lessonTitle: ex.lessonTitle,
              totalMarks: totalM,
              questions: qs,
              type: 'exam',
            });
          })}
        </div>
      )}

      {/* Teacher Essay Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fade-in text-slate-100">
          <div className="bg-[#0b1429] border-2 border-amber-500/60 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-amber-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <PenTool className="w-5 h-5" />
                <span>تصحيح الأسئلة المقالية: {gradingSubmission.sub.studentName}</span>
              </div>
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#060b18] rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <span>
                  التقييم: <strong className="text-white">{gradingSubmission.sub.examTitle}</strong>
                </span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  درجة الاختياري الآلية: {gradingSubmission.sub.autoMcqScore ?? gradingSubmission.sub.score}
                </span>
              </div>

              {gradingSubmission.questions.filter((q) => q.type === 'essay').length > 0 ? (
                gradingSubmission.questions.map((q, idx) => {
                  if (q.type !== 'essay') return null;
                  const maxQ = getQuestionPoints(q, gradingSubmission.questions, gradingSubmission.fallbackTotalMarks);
                  const ans = (gradingSubmission.sub.essayAnswers?.[q.id] || '').trim();

                  return (
                    <div key={q.id || idx} className="p-3.5 bg-[#080d1b] border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">س{idx + 1}: {q.text}</span>
                        <span className="font-mono text-amber-300 font-bold tabular-nums">الدرجة العظمى: {maxQ}</span>
                      </div>
                      <div className="p-2.5 bg-black/50 rounded-lg text-cyan-200 whitespace-pre-wrap">
                        {ans || <span className="text-rose-400 font-bold">متروك فارغاً - 0 درجة تلقائياً</span>}
                      </div>
                      {ans && (
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                          <label className="font-bold text-amber-300">الدرجة الممنوحة (من {maxQ}):</label>
                          <input
                            type="number"
                            min={0}
                            max={maxQ}
                            step={0.5}
                            value={essayInputs[q.id] ?? ''}
                            onChange={(e) =>
                              setEssayInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            className="w-24 p-1.5 bg-[#060b18] border border-amber-500/50 rounded-lg text-white font-mono text-center font-bold focus:outline-none tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEssayInputs((prev) => ({ ...prev, [q.id]: String(maxQ) }))
                            }
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            منح الدرجة الكاملة ({maxQ})
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="space-y-1.5">
                  <label className="font-bold text-amber-300 block">درجة الأسئلة المقالية المضافة:</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={bulkEssayScoreInput}
                    onChange={(e) => setBulkEssayScoreInput(e.target.value)}
                    className="w-full p-3 bg-[#060b18] border border-amber-500/50 rounded-xl text-white font-mono text-sm focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEssayGrade}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الدرجة النهائية وحفظ الترتيب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
