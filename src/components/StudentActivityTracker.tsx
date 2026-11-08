import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  CheckCircle2,
  XCircle,
  Eye,
  User,
  Phone,
  Search,
  MessageSquare,
  Activity,
  FileText,
  Clock,
  Sparkles,
  Calendar,
  X,
  Award,
  BookOpen,
  Filter,
} from 'lucide-react';
import { GradeLevel, StudentDossier } from '../types';

export const StudentActivityTracker: React.FC = () => {
  const {
    registeredAccounts,
    studentAccessMap,
    studentActivities,
    lectures,
    exams,
    homeworks,
    getStudentDossier,
  } = usePlatform();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<string | null>(null);

  const students = registeredAccounts.filter((s) => {
    if (s.role === 'admin' || s.role === 'secretary') return false;
    if (selectedGrade !== 'all' && s.grade !== selectedGrade) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
      (s.governorate && s.governorate.toLowerCase().includes(q))
    );
  });

  const activeDossier: StudentDossier | null = selectedStudentForDossier
    ? getStudentDossier(selectedStudentForDossier)
    : null;

  // Send parent WhatsApp dossier
  const handleSendParentWhatsApp = (dossier: StudentDossier) => {
    const parentPhone = dossier.student.parentPhone || dossier.student.phone;
    const msg = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته،\nولي أمر الطالب المحترم: ${dossier.student.name} (${dossier.student.studentCode})\n\nنود إحاطتكم بتقرير المتابعة والأداء الأكاديمي الشامل في مادة الكيمياء مع مستر عمرو السيد:\n\n` +
      `📌 نسبة حضور المحاضرات: ${dossier.attendanceRate}% (${dossier.enteredLectures} من ${dossier.totalLectures})\n` +
      `📌 متوسط درجات الاختبارات: ${dossier.averageExamScore}%\n` +
      `📌 نسبة تسليم الواجبات والشيتات: ${dossier.homeworkCompletionRate}%\n\n` +
      `نتمنى له دوام التفوق والنجاح دائماً في الثانوية العامة! 🧪✨`
    );
    window.open(`https://wa.me/2${parentPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="bg-[#091224] border border-cyan-900/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-300 mb-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام المتابعة اللحظية المباشرة (Live Tracking)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>مصفوفة متابعة أنشطة ودخول الطلاب والدرجات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            متابعة فورية لدخول المحاضرات بالتواريخ، أداء الامتحانات بالدرجات، وإنجاز الواجبات مع علامات الصح والخطأ.
          </p>
        </div>

        {/* Grade Filters */}
        <div className="flex items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setSelectedGrade('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'all'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({registeredAccounts.filter((s) => s.role === 'student').length})
          </button>
          <button
            onClick={() => setSelectedGrade('sec3')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'sec3'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3 ثانوي
          </button>
          <button
            onClick={() => setSelectedGrade('sec2')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'sec2'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2 ثانوي
          </button>
          <button
            onClick={() => setSelectedGrade('sec1')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'sec1'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1 ثانوي
          </button>
        </div>
      </div>

      {/* Live Activity Ticker (آخر الأنشطة اللحظية) */}
      <div className="bg-[#060b18] border border-cyan-950 p-4 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>آخر الأنشطة اللحظية للطلاب على المنصة:</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">تحديث فوري</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          {studentActivities.slice(0, 4).map((act) => (
            <div
              key={act.id}
              className="p-2.5 bg-[#0b1428] border border-slate-800/80 rounded-xl text-xs flex items-start gap-2 text-slate-300"
            >
              <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400 shrink-0 mt-0.5">
                {act.type === 'lecture_enter' ? (
                  <BookOpen className="w-3.5 h-3.5" />
                ) : act.type === 'exam_submit' ? (
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-[11px] truncate">{act.studentName}</p>
                <p className="text-[10px] text-slate-400 line-clamp-1">{act.itemTitle}</p>
                {act.score !== undefined && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    الدرجة: {act.score}/{act.maxScore} ({act.percentage}%)
                  </span>
                )}
              </div>
              <span className="text-[9px] text-slate-500 font-mono shrink-0">{act.timeAgo || 'الآن'}</span>
            </div>
          ))}
        </div>
      </div>

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

      {/* Attendance & Performance Matrix Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-[#060b18]">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="bg-[#0b1428] text-slate-400 text-[11px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 px-3.5">بيانات الطالب</th>
              <th className="py-3 px-3.5">كود الطالب</th>
              <th className="py-3 px-3.5">الصف / المحافظة</th>
              {/* Lecture Columns */}
              {lectures.map((lec, idx) => (
                <th key={lec.id} className="py-3 px-2 text-center whitespace-nowrap" title={lec.title}>
                  مـ {idx + 1}
                </th>
              ))}
              {/* Exam Columns */}
              {exams.map((ex, idx) => (
                <th key={ex.id} className="py-3 px-2 text-center whitespace-nowrap text-amber-300" title={ex.title}>
                  امتحان {idx + 1}
                </th>
              ))}
              {/* Homework Columns */}
              {homeworks.map((hw, idx) => (
                <th key={hw.id} className="py-3 px-2 text-center whitespace-nowrap text-indigo-300" title={hw.title}>
                  واجب {idx + 1}
                </th>
              ))}
              <th className="py-3 px-3.5 text-center">الملف الشامل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6 + lectures.length + exams.length + homeworks.length} className="py-8 text-center text-slate-500 text-xs">
                  لا يوجد طلاب مسجلين يطابقون خيارات البحث.
                </td>
              </tr>
            ) : (
              students.map((st) => {
                const access = studentAccessMap[st.id] || { lectures: {}, exams: {}, homeworks: {} };

                return (
                  <tr key={st.id} className="hover:bg-cyan-950/20 transition-colors">
                    
                    {/* Student Name & Phone */}
                    <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                      <div>
                        <p>{st.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-normal">{st.phone}</p>
                      </div>
                    </td>

                    {/* Student Code */}
                    <td className="py-3 px-3.5 font-mono text-cyan-400 whitespace-nowrap">
                      {st.studentCode || 'SEC-00'}
                    </td>

                    {/* Grade & Governorate */}
                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                      <div>
                        <span>{st.grade === 'sec3' ? '3 ثانوي' : st.grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'}</span>
                        <p className="text-[10px] text-slate-500">{st.governorate}</p>
                      </div>
                    </td>

                    {/* Lectures Attendance Check / Cross */}
                    {lectures.map((lec) => {
                      const lecState = access.lectures?.[lec.id];
                      const entered = !!lecState?.entered;

                      return (
                        <td key={lec.id} className="py-3 px-2 text-center whitespace-nowrap">
                          {entered ? (
                            <span
                              title={`دخل المحاضرة: ${lecState?.date || 'مسجل'}`}
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>دخل</span>
                            </span>
                          ) : (
                            <span
                              title="لم يدخل المحاضرة حتى الآن"
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>لم يدخل</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Exams Result Check / Cross */}
                    {exams.map((ex) => {
                      const exState = access.exams?.[ex.id];
                      const taken = !!exState?.taken;

                      return (
                        <td key={ex.id} className="py-3 px-2 text-center whitespace-nowrap">
                          {taken ? (
                            <span
                              title={`أدى الامتحان بنتيجة ${exState?.score}/${exState?.maxScore} في ${exState?.date || ''}`}
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold font-mono"
                            >
                              <CheckCircle2 className="w-3 h-3 text-amber-400" />
                              <span>{exState?.score}/{exState?.maxScore}</span>
                            </span>
                          ) : (
                            <span
                              title="لم يؤدِ الامتحان حتى الآن"
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>لم يدخل</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Homework Check / Cross */}
                    {homeworks.map((hw) => {
                      const hwState = access.homeworks?.[hw.id];
                      const solved = !!hwState?.solved;

                      return (
                        <td key={hw.id} className="py-3 px-2 text-center whitespace-nowrap">
                          {solved ? (
                            <span
                              title={`تم حل الواجب في ${hwState?.date || 'مسجل'}`}
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] font-bold"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تم الحل</span>
                            </span>
                          ) : (
                            <span
                              title="لم يحل الواجب حتى الآن"
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>لم يحل</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Individual Dossier Button */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStudentForDossier(st.id)}
                        className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>الملف الشامل 👤</span>
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* COMPREHENSIVE INDIVIDUAL STUDENT DOSSIER MODAL */}
      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1428] border border-cyan-800/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-cyan-900/40 flex items-center justify-between bg-gradient-to-r from-[#0d1a38] to-[#0b1428] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 font-bold text-base">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">{activeDossier.student.name}</h3>
                  <p className="text-xs text-cyan-400 font-mono">
                    كود الطالب: {activeDossier.student.studentCode} | هاتف: {activeDossier.student.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForDossier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              
              {/* Highlight Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-cyan-950/30 border border-cyan-900/40 rounded-2xl text-center">
                  <span className="text-[11px] text-slate-400 font-medium">نسبة حضور المحاضرات</span>
                  <p className="text-xl font-extrabold text-cyan-300 font-mono mt-1">{activeDossier.attendanceRate}%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activeDossier.enteredLectures} من {activeDossier.totalLectures} محاضرة</p>
                </div>

                <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-2xl text-center">
                  <span className="text-[11px] text-slate-400 font-medium">متوسط درجات الامتحانات</span>
                  <p className="text-xl font-extrabold text-amber-300 font-mono mt-1">{activeDossier.averageExamScore}%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activeDossier.takenExams} من {activeDossier.totalExams} اختبار</p>
                </div>

                <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-2xl text-center">
                  <span className="text-[11px] text-slate-400 font-medium">نسبة حل الواجبات</span>
                  <p className="text-xl font-extrabold text-indigo-300 font-mono mt-1">{activeDossier.homeworkCompletionRate}%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activeDossier.solvedHomeworks} من {activeDossier.totalHomeworks} واجب</p>
                </div>
              </div>

              {/* Student Personal Info */}
              <div className="p-4 bg-[#070e1f] border border-slate-800 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 text-[11px]">الصف الدراسي:</span>
                  <p className="font-bold text-white mt-0.5">{activeDossier.student.grade === 'sec3' ? '3 ثانوي' : activeDossier.student.grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">المحافظة:</span>
                  <p className="font-bold text-white mt-0.5">{activeDossier.student.governorate}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">هاتف ولي الأمر:</span>
                  <p className="font-bold text-white mt-0.5 font-mono">{activeDossier.student.parentPhone || activeDossier.student.phone}</p>
                </div>
              </div>

              {/* Lecture Attendance Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>تفاصيل حضور ومتابعة المحاضرات:</span>
                </h4>
                <div className="space-y-1.5">
                  {activeDossier.lectureRecords.map((lec) => (
                    <div
                      key={lec.lectureId}
                      className="p-2.5 bg-[#070e1f] border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <span className="font-semibold text-white">{lec.lectureTitle}</span>
                      {lec.entered ? (
                        <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>دخل ({lec.date || 'تم المشاهدة'})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg font-bold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>لم يدخل المحاضرة</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Scores Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>نتائج وتفاصيل الاختبارات:</span>
                </h4>
                <div className="space-y-1.5">
                  {activeDossier.examRecords.map((ex) => (
                    <div
                      key={ex.examId}
                      className="p-2.5 bg-[#070e1f] border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <span className="font-semibold text-white">{ex.examTitle}</span>
                      {ex.taken ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-300 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-lg">
                            {ex.score} / {ex.maxScore} ({ex.percentage}%)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{ex.date}</span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg font-bold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>لم يؤدِ الامتحان</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer with Parent WhatsApp Sender */}
            <div className="p-4 border-t border-slate-800 bg-[#070d1e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400">
                يمكنك إرسال هذا التقرير التفصيلي بنقرة واحدة لولي أمر الطالب مباشرة.
              </span>
              <button
                onClick={() => handleSendParentWhatsApp(activeDossier)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>إرسال تقرير المتابعة لولي الأمر عبر واتساب 📲</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
