import React, { useState } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  Trophy,
  Medal,
  Crown,
  Search,
  Award,
  Sparkles,
  Clock,
  Calendar,
  MessageSquare,
  FileCheck2,
  ChevronDown,
  Filter,
  PenTool,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ExamSubmission } from '../types';

export const ExamRankingsSection: React.FC = () => {
  const { exams, getExamRankings, examSubmissions, updateExamSubmissionGrade, currentUser } = usePlatform();
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    return exams.length > 0 ? exams[0].id : 'exam_trans_1';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [gradingSubmission, setGradingSubmission] = useState<ExamSubmission | null>(null);
  const [teacherScoreInput, setTeacherScoreInput] = useState<string>('');

  const isTeacherOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  if (!currentExam || exams.length === 0) {
    return (
      <div className="bg-[#091224] border border-cyan-900/40 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xl">
        <Trophy className="w-10 h-10 text-amber-400/80 mx-auto" />
        <h3 className="text-base sm:text-lg font-bold text-white">
          لوحة تفنيد وترتيب أعلى الدرجات في الاختبار الواحد
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          الموقع نقي وبانتظار نشر أول امتحان من لوحة التحكم. بمجرد إضافة اختبار وحله من الطلاب، سيتم تفنيد وفرز النتائج من الأعلى للأقل تلقائياً مع منصة التتويج 🥇🥈🥉.
        </p>
      </div>
    );
  }

  const rankings: ExamSubmission[] = currentExam ? getExamRankings(currentExam.id) : [];

  const filteredRankings = rankings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.studentName.toLowerCase().includes(q) ||
      item.studentPhone.includes(q) ||
      (item.studentCode && item.studentCode.toLowerCase().includes(q)) ||
      (item.governorate && item.governorate.toLowerCase().includes(q))
    );
  });

  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  // Helper to open WhatsApp congratulations
  const handleCongratulateWhatsApp = (student: ExamSubmission) => {
    const text = encodeURIComponent(
      `ألف مبروك يا بطل! 🌟\nتهنئة خاصة من مستر عمرو السيد بمناسبة تفوقك وحصولك على المركز (${student.rank || 1}) في ${student.examTitle} بدرجة (${student.score}/${student.maxScore}) بنسبة (${student.percentage}%).\nاستمر في التألق والتميز في مادة الكيمياء! 🧪⚛️`
    );
    window.open(`https://wa.me/2${student.studentPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="bg-[#091224] border border-cyan-900/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>لوحة المتفوقين في الاختبار الواحد</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>تفنيد وترتيب أعلى الدرجات (من الأعلى للأقل)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            عرض ترتيب الطلاب تنازلياً حسب أعلى الدرجات والسرعة في إنهاء الاختبار.
          </p>
        </div>

        {/* Exam Picker Dropdown */}
        <div className="relative min-w-[240px]">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-[#060b18] border border-cyan-800/60 focus:border-cyan-400 rounded-2xl px-4 py-2.5 pe-10 text-xs sm:text-sm font-bold text-white focus:outline-none appearance-none cursor-pointer"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.totalMarks} درجة)
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Selected Exam Snapshot */}
      {currentExam && (
        <div className="bg-gradient-to-r from-[#0c1836] via-[#09132b] to-[#070e22] border border-cyan-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{currentExam.title}</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">
                الدرجة الكلية: <span className="text-cyan-300 font-bold">{currentExam.totalMarks} درجة</span> | عدد الأسئلة: {currentExam.questions.length} | عدد الطلاب المسلمين: {rankings.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold font-mono">
              أعلى درجة: {top1 ? `${top1.score}/${top1.maxScore}` : '50/50'}
            </span>
          </div>
        </div>
      )}

      {/* Podium for Top 3 Students */}
      {rankings.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          
          {/* 2nd Place: Silver */}
          {top2 && (
            <div className="order-2 md:order-1 bg-gradient-to-b from-[#131d36] to-[#091124] border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-lg">
              <div className="w-9 h-9 rounded-full bg-slate-300/20 border border-slate-400 flex items-center justify-center text-slate-200 mb-2 font-bold text-sm">
                🥈 2
              </div>
              <h4 className="font-extrabold text-sm text-white line-clamp-1">{top2.studentName}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{top2.governorate || 'القاهرة'}</p>
              
              <div className="mt-3 py-1.5 px-3 bg-slate-800/80 rounded-xl w-full flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">الدرجة:</span>
                <span className="font-mono font-extrabold text-white">{top2.score} / {top2.maxScore}</span>
              </div>
              <span className="text-xs font-bold text-slate-300 mt-1 font-mono">{top2.percentage}%</span>

              <button
                onClick={() => handleCongratulateWhatsApp(top2)}
                className="mt-3 w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>تهنئة واتساب</span>
              </button>
            </div>
          )}

          {/* 1st Place: Gold (Highest Card) */}
          {top1 && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-[#171e36] to-[#091124] border-2 border-amber-400/80 rounded-2xl p-5 flex flex-col items-center text-center relative shadow-xl shadow-amber-500/10 md:-translate-y-2">
              <div className="absolute -top-3.5 px-3 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] rounded-full shadow flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>المركز الأول 🥇</span>
              </div>

              <div className="w-12 h-12 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-amber-300 my-2 font-black text-lg">
                🏆
              </div>
              <h4 className="font-black text-base text-white line-clamp-1">{top1.studentName}</h4>
              <p className="text-xs text-amber-300 font-semibold mt-0.5">{top1.governorate || 'المنصورة'}</p>

              <div className="mt-3 py-2 px-4 bg-amber-500/15 border border-amber-500/30 rounded-xl w-full flex items-center justify-between text-xs">
                <span className="text-amber-200 font-medium">الدرجة النهائية:</span>
                <span className="font-mono font-black text-white text-sm">{top1.score} / {top1.maxScore}</span>
              </div>
              <span className="text-sm font-black text-amber-400 mt-1 font-mono">{top1.percentage}%</span>

              <button
                onClick={() => handleCongratulateWhatsApp(top1)}
                className="mt-3 w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>إرسال تهنئة فورية لواتساب الطالب</span>
              </button>
            </div>
          )}

          {/* 3rd Place: Bronze */}
          {top3 && (
            <div className="order-3 bg-gradient-to-b from-[#241712] to-[#091124] border border-amber-800/60 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-lg">
              <div className="w-9 h-9 rounded-full bg-amber-900/30 border border-amber-700 flex items-center justify-center text-amber-400 mb-2 font-bold text-sm">
                🥉 3
              </div>
              <h4 className="font-extrabold text-sm text-white line-clamp-1">{top3.studentName}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{top3.governorate || 'الشرقية'}</p>

              <div className="mt-3 py-1.5 px-3 bg-slate-800/80 rounded-xl w-full flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">الدرجة:</span>
                <span className="font-mono font-extrabold text-white">{top3.score} / {top3.maxScore}</span>
              </div>
              <span className="text-xs font-bold text-amber-500 mt-1 font-mono">{top3.percentage}%</span>

              <button
                onClick={() => handleCongratulateWhatsApp(top3)}
                className="mt-3 w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>تهنئة واتساب</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن طالب بالاسم، الكود، المحافظة، أو رقم الهاتف..."
          className="w-full bg-[#060b18] border border-slate-800 focus:border-cyan-400 rounded-2xl px-4 py-2.5 ps-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
      </div>

      {/* Full Ranked Table (من الأعلى للأقل) */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-[#060b18]">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="bg-[#0b1428] text-slate-400 text-[11px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 px-3.5 text-center w-16">الترتيب</th>
              <th className="py-3 px-3.5">اسم الطالب</th>
              <th className="py-3 px-3.5">كود الطالب</th>
              <th className="py-3 px-3.5">المحافظة</th>
              <th className="py-3 px-3.5 text-center">الدرجة المحققة</th>
              <th className="py-3 px-3.5 text-center">النسبة المئوية</th>
              <th className="py-3 px-3.5 text-center">الوقت المستغرق</th>
              <th className="py-3 px-3.5">تاريخ ووقت الحل</th>
              <th className="py-3 px-3.5 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredRankings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                  لا توجد نتائج مسجلة لهذا الاختبار تطابق بحثك.
                </td>
              </tr>
            ) : (
              filteredRankings.map((sub, idx) => {
                const rankNum = idx + 1;
                const isTop1 = rankNum === 1;
                const isTop2 = rankNum === 2;
                const isTop3 = rankNum === 3;

                return (
                  <tr
                    key={sub.id}
                    className={`hover:bg-cyan-950/20 transition-colors ${
                      isTop1 ? 'bg-amber-500/10' : isTop2 ? 'bg-slate-800/30' : isTop3 ? 'bg-amber-900/10' : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black font-mono ${
                          isTop1
                            ? 'bg-amber-400 text-slate-950'
                            : isTop2
                            ? 'bg-slate-300 text-slate-900'
                            : isTop3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {rankNum}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{sub.studentName}</span>
                      </div>
                    </td>

                    {/* Student Code */}
                    <td className="py-3 px-3.5 font-mono text-cyan-400 whitespace-nowrap">
                      {sub.studentCode || 'SEC-00'}
                    </td>

                    {/* Governorate */}
                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap">
                      {sub.governorate || 'القاهرة'}
                    </td>

                    {/* Score */}
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-white whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-800/40 rounded-lg text-cyan-300">
                        {sub.score} / {sub.maxScore}
                      </span>
                      {sub.status === 'pending_teacher_review' && (
                        <span className="block text-[10px] text-amber-400 font-sans mt-1">
                          ⚠️ بانتظار تصحيح المقالي
                        </span>
                      )}
                      {sub.teacherGraded && (
                        <span className="block text-[10px] text-emerald-400 font-sans mt-1">
                          ✓ معتمد (+{sub.teacherExtraScore || 0})
                        </span>
                      )}
                    </td>

                    {/* Percentage */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sub.percentage >= 90
                                ? 'bg-emerald-400'
                                : sub.percentage >= 80
                                ? 'bg-cyan-400'
                                : sub.percentage >= 70
                                ? 'bg-blue-400'
                                : 'bg-amber-400'
                            }`}
                            style={{ width: `${sub.percentage}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs">{sub.percentage}%</span>
                      </div>
                    </td>

                    {/* Time Spent */}
                    <td className="py-3 px-3.5 text-center font-mono text-slate-400 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{sub.timeSpentMinutes || 25} دقيقة</span>
                      </div>
                    </td>

                    {/* Submitted At */}
                    <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {sub.submittedAt}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {isTeacherOrSec && sub.status === 'pending_teacher_review' && (
                          <button
                            onClick={() => {
                              setGradingSubmission(sub);
                              setTeacherScoreInput(sub.teacherExtraScore?.toString() || '');
                            }}
                            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold border border-amber-500/40"
                            title="مراجعة وتصحيح السؤال المقالي"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">تصحيح</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCongratulateWhatsApp(sub)}
                          title="إرسال تهنئة عبر واتساب"
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">تهنئة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Teacher Essay Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fade-in text-slate-100">
          <div className="bg-[#0b1429] border-2 border-amber-500/60 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <PenTool className="w-5 h-5" />
                <span>تصحيح الأسئلة المقالية للطالب: {gradingSubmission.studentName}</span>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#060b18] rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">الاختبار: <strong className="text-white">{gradingSubmission.examTitle}</strong></p>
                <p className="text-slate-400">الدرجة الجزئية التلقائية للاختياري: <strong className="text-cyan-400 font-mono">{gradingSubmission.autoMcqScore || gradingSubmission.score} من {gradingSubmission.maxScore}</strong></p>
              </div>

              {/* Student Essay Answers */}
              <div className="space-y-2">
                <span className="font-bold text-amber-300 block">إجابات الطالب المقالية:</span>
                {gradingSubmission.essayAnswers && Object.keys(gradingSubmission.essayAnswers).length > 0 ? (
                  Object.entries(gradingSubmission.essayAnswers).map(([qId, ans], idx) => (
                    <div key={qId} className="p-3 bg-[#080d1b] border border-slate-800 rounded-xl space-y-1 text-xs">
                      <span className="text-slate-400 font-bold">إجابة السؤال {idx + 1}:</span>
                      <p className="p-2 bg-black/50 rounded text-cyan-300 font-mono whitespace-pre-wrap">{ans}</p>
                    </div>
                  ))
                ) : (
                  <p className="p-3 bg-[#080d1b] rounded-xl text-slate-400">لا توجد إجابات مقالية مسجلة لهذا الطالب.</p>
                )}
              </div>

              {/* Extra score input */}
              <div className="space-y-1 pt-2">
                <label className="font-bold text-amber-300 block">درجة الأسئلة المقالية لإضافتها:</label>
                <input
                  type="number"
                  min={0}
                  value={teacherScoreInput}
                  onChange={(e) => setTeacherScoreInput(e.target.value)}
                  placeholder="أدخل درجة المقالي لإضافتها..."
                  className="w-full p-3 bg-[#060b18] border border-amber-500/50 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const extra = parseFloat(teacherScoreInput) || 0;
                  updateExamSubmissionGrade(gradingSubmission.id, extra);
                  setGradingSubmission(null);
                }}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                اعتماد وإضافة الدرجة النهائية في قاعدة البيانات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
