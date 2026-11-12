import React, { useMemo, useState } from 'react';
import {
  Search,
  Users,
  Phone,
  GraduationCap,
  MapPin,
  Calendar,
  BookOpen,
  FileCheck2,
  ClipboardCheck,
  BookCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Copy,
  Check,
  X,
  Eye,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import { GradeLevel, RegisteredAccount, StudentDossier } from '../types';
import { buildWhatsAppUrl, formatWhatsAppPhone } from '../utils/safeExternalLink';

const GRADE_LABEL: Record<GradeLevel, string> = {
  sec3: 'الصف الثالث الثانوي',
  sec2: 'الصف الثاني الثانوي',
  sec1: 'الصف الأول الثانوي',
};

function getChronologicalTimestamp(acc: RegisteredAccount, originalIndex: number, totalCount: number): number {
  // Extract epoch milliseconds if embedded in student id e.g. std_1739234567890_abc
  const idMatch = acc.id?.match(/(?:std|acc|user)_(\d{10,15})/);
  if (idMatch && idMatch[1]) {
    const ms = Number(idMatch[1]);
    if (!Number.isNaN(ms) && ms > 0) return ms;
  }

  if (acc.registeredAt) {
    const parsed = Date.parse(acc.registeredAt);
    if (!Number.isNaN(parsed)) {
      // Preserve registration tie-breaking using reversed insertion order
      // since registeredAccounts prepends newest entries at index 0
      return parsed + (totalCount - originalIndex);
    }
  }

  return totalCount - originalIndex;
}

function buildParentWhatsAppReport(dossier: StudentDossier): string {
  const { student } = dossier;
  const gradeLabel = GRADE_LABEL[student.grade] || student.grade;

  const takenExams = dossier.examRecords.filter((e) => e.taken);
  const missedExamsCount = dossier.examRecords.length - takenExams.length;

  const sheetRecords = dossier.homeworkRecords.filter((r) => r.kind === 'sheet');
  const solvedSheets = sheetRecords.filter((s) => s.solved);
  const missedSheetsCount = sheetRecords.length - solvedSheets.length;

  const hwRecords = dossier.homeworkRecords.filter((r) => r.kind === 'homework');
  const solvedHw = hwRecords.filter((h) => h.solved);
  const missedHwCount = hwRecords.length - solvedHw.length;

  const lines: string[] = [
    `السلام عليكم ورحمة الله وبركاته،`,
    `ولي أمر الطالب/ة المحترم: *${student.name}*`,
    `الكود: ${student.studentCode || 'غير محدد'} | الصف: ${gradeLabel}`,
    ``,
    `📊 *التقرير الأكاديمي الشامل في مادة الكيمياء — منصة مستر عمرو السيد:*`,
    ``,
    `1️⃣ *حضور المحاضرات:* ${dossier.attendanceRate}% (${dossier.enteredLectures} من أصل ${dossier.totalLectures} محاضرة)`,
  ];

  if (dossier.examRecords.length > 0) {
    lines.push(
      `2️⃣ *الامتحانات الإلكترونية:* دخل ${dossier.takenExams} من ${dossier.totalExams} (متوسط الدرجات: ${dossier.averageExamScore}%)`
    );
    takenExams.forEach((ex) => {
      const lessonTag = ex.lessonTitle ? ` [${ex.lessonTitle}]` : '';
      const scoreStr =
        ex.score !== undefined && ex.maxScore !== undefined
          ? `${ex.score}/${ex.maxScore} (${ex.percentage ?? 0}%)`
          : 'تم الدخول';
      lines.push(`   • ${ex.examTitle}${lessonTag}: ${scoreStr}`);
    });
    if (missedExamsCount > 0) {
      lines.push(`   ⚠️ امتحانات لم يدخلها: ${missedExamsCount}`);
    }
  } else {
    lines.push(`2️⃣ *الامتحانات الإلكترونية:* لا توجد امتحانات منشورة حالياً`);
  }

  if (sheetRecords.length > 0) {
    lines.push(
      `3️⃣ *شيتات الدروس:* دخل/حل ${dossier.solvedSheets} من ${dossier.totalSheets} (متوسط الدرجات: ${dossier.averageSheetScore}%)`
    );
    solvedSheets.forEach((sh) => {
      const lessonTag = sh.lessonTitle ? ` [${sh.lessonTitle}]` : '';
      const scoreStr =
        sh.score !== undefined && sh.maxScore !== undefined
          ? `${sh.score}/${sh.maxScore} (${sh.percentage ?? 0}%)`
          : 'تم التسليم';
      lines.push(`   • ${sh.homeworkTitle}${lessonTag}: ${scoreStr}`);
    });
    if (missedSheetsCount > 0) {
      lines.push(`   ⚠️ شيتات لم يحلها: ${missedSheetsCount}`);
    }
  } else {
    lines.push(`3️⃣ *شيتات الدروس:* لا توجد شيتات منشورة حالياً`);
  }

  if (hwRecords.length > 0) {
    lines.push(
      `4️⃣ *الواجبات المنزلية:* أتم حل ${solvedHw.length} من ${hwRecords.length} واجب (${dossier.homeworkCompletionRate}%)${
        missedHwCount > 0 ? ` · متبقي: ${missedHwCount}` : ''
      }`
    );
  }

  lines.push(``);
  lines.push(`مع أطيب التمنيات بدوام التفوق والنجاح 🧪✨`);
  lines.push(`أستاذ عمرو السيد — خبير مادة الكيمياء`);

  return lines.join('\n');
}

export const StudentDirectorySection: React.FC = () => {
  const {
    currentUser,
    registeredAccounts,
    getStudentDossier,
    updateRegisteredStudent,
  } = usePlatform();

  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [parentPhoneSavedMsg, setParentPhoneSavedMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customMessageDraft, setCustomMessageDraft] = useState<string | null>(null);

  const isAdminOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  // Chronologically ordered students: #1 = First registered student -> #N = Latest registered student
  const chronologicalStudents = useMemo(() => {
    const onlyStudents = registeredAccounts.filter((acc) => acc.role === 'student');
    const total = onlyStudents.length;
    const withOrder = onlyStudents.map((acc, idx) => ({
      acc,
      sortKey: getChronologicalTimestamp(acc, idx, total),
    }));
    withOrder.sort((a, b) => a.sortKey - b.sortKey);
    return withOrder.map((entry, idx) => ({
      student: entry.acc,
      chronologicalNumber: idx + 1,
    }));
  }, [registeredAccounts]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return chronologicalStudents.filter(({ student }) => {
      if (gradeFilter !== 'all' && student.grade !== gradeFilter) return false;
      if (!q) return true;
      return (
        student.name.toLowerCase().includes(q) ||
        student.phone.toLowerCase().includes(q) ||
        (student.parentPhone && student.parentPhone.toLowerCase().includes(q)) ||
        (student.studentCode && student.studentCode.toLowerCase().includes(q)) ||
        (student.governorate && student.governorate.toLowerCase().includes(q)) ||
        (student.email && student.email.toLowerCase().includes(q))
      );
    });
  }, [chronologicalStudents, gradeFilter, searchQuery]);

  const activeDossier: StudentDossier | null = useMemo(() => {
    if (!selectedStudentId) return null;
    return getStudentDossier(selectedStudentId);
  }, [selectedStudentId, getStudentDossier]);

  const activeChronoNumber = useMemo(() => {
    if (!selectedStudentId) return 0;
    return (
      chronologicalStudents.find((item) => item.student.id === selectedStudentId)
        ?.chronologicalNumber || 0
    );
  }, [selectedStudentId, chronologicalStudents]);

  if (!isAdminOrSec) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-[#0a1122] border border-rose-500/30 text-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-black text-white">قسم مخصص للمعلم والسكرتارية فقط</h2>
        <p className="text-xs text-slate-400">
          عرض بيانات الطلاب التفصيلية وتقارير أولياء الأمور متاح فقط لحساب الأستاذ عمرو السيد والسكرتارية المعتمدة.
        </p>
      </div>
    );
  }

  const handleOpenStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCustomMessageDraft(null);
    setParentPhoneInput('');
    setParentPhoneSavedMsg(null);
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2500);
    } catch {
      // Fallback ignored safely
    }
  };

  const activeReportText = activeDossier
    ? customMessageDraft ?? buildParentWhatsAppReport(activeDossier)
    : '';
  const activeParentRawPhone =
    activeDossier?.student.parentPhone?.trim() || '';
  const hasRegisteredParentPhone = formatWhatsAppPhone(activeParentRawPhone).length >= 10;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0a1428] via-[#091224] to-[#081529] border border-cyan-500/25 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>سجل بيانات الطلاب والتقارير الأكاديمية الشاملة</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              بيانات الطالب والتقارير الشاملة ({chronologicalStudents.length} طالب مسجل)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              جميع الطلاب مرتبون زمنياً من أول طالب مسجل (#1) حتى أحدث طالب مسجل. اضغط على أي طالب لعرض تفاصيل حضوره ونتائج امتحاناته وشيتاته وواجباته وإرسال تقرير فوري لولي الأمر.
            </p>
          </div>

          {/* Grade Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 text-xs font-bold self-start lg:self-auto">
            {(
              [
                { id: 'all', label: `الكل (${chronologicalStudents.length})` },
                { id: 'sec3', label: '3 ثانوي' },
                { id: 'sec2', label: '2 ثانوي' },
                { id: 'sec1', label: '1 ثانوي' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGradeFilter(opt.id)}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  gradeFilter === opt.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Quick Search Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث سريع بالاسم، رقم هاتف الطالب، رقم ولي الأمر، كود الطالب، أو المحافظة..."
              className="w-full bg-[#060b18] border border-cyan-900/50 focus:border-cyan-400 rounded-2xl pr-11 pl-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
            <span>
              عرض <strong className="text-cyan-300 font-mono tabular-nums">{filteredStudents.length}</strong> من أصل{' '}
              <strong className="text-white font-mono tabular-nums">{chronologicalStudents.length}</strong> طالب (مرتبون زمنياً من #1 حتى الأحدث)
            </span>
            <span>اضغط على أي طالب لفتح نافذة التفاصيل الكاملة</span>
          </div>
        </div>
      </div>

      {/* Students Chronological Directory */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0a1122] border border-slate-800 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">لا يوجد طلاب يطابقون البحث الحالي</p>
          <p className="text-xs text-slate-500">جرب تعديل كلمة البحث أو اختيار صف دراسي آخر.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredStudents.map(({ student, chronologicalNumber }) => {
            const dossier = getStudentDossier(student.id);
            const hasParent = formatWhatsAppPhone(student.parentPhone).length >= 10;

            return (
              <div
                key={student.id}
                onClick={() => handleOpenStudent(student.id)}
                className="group p-4 rounded-2xl bg-[#0a1122] hover:bg-[#0d162d] border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Right: Chronological Index & Core Identity */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col items-center justify-center shrink-0 font-mono tabular-nums"
                    title="الترتيب الزمني للتسجيل"
                  >
                    <span className="text-[9px] text-cyan-400 leading-none">تسجيل</span>
                    <span className="text-sm font-black text-white leading-tight">#{chronologicalNumber}</span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {student.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[11px] font-bold">
                        {student.studentCode || 'بدون كود'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                        {GRADE_LABEL[student.grade] || student.grade}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Phone className="w-3 h-3 text-cyan-400" />
                        <span>الطالب: {student.phone}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                          hasParent ? 'text-emerald-300 font-semibold' : 'text-amber-400'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>
                          ولي الأمر: {student.parentPhone?.trim() ? student.parentPhone : 'غير مسجل'}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{student.governorate || 'غير محدد'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>سجل في: {student.registeredAt}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left: Academic Summary Pills & Action Button */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 shrink-0">
                  {dossier && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold font-mono tabular-nums">
                      <span
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300"
                        title="نسبة حضور المحاضرات"
                      >
                        حضور {dossier.attendanceRate}%
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300"
                        title="متوسط الامتحانات"
                      >
                        امتحانات {dossier.takenExams}/{dossier.totalExams} ({dossier.averageExamScore}%)
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
                        title="شيتات الدروس"
                      >
                        شيتات {dossier.solvedSheets}/{dossier.totalSheets}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {dossier && hasParent && (
                      <a
                        href={buildWhatsAppUrl(student.parentPhone, buildParentWhatsAppReport(dossier))}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        title={`إرسال التقرير مباشرة إلى رقم ولي الأمر المسجل (${student.parentPhone})`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>إرسال تقرير لولي الأمر</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStudent(student.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض التقرير الشامل</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPREHENSIVE STUDENT DETAIL MODAL */}
      {activeDossier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="bg-[#0b1328] border border-cyan-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-[#0e1a36] to-[#0b1328] flex items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex flex-col items-center justify-center shrink-0 font-mono tabular-nums">
                  <span className="text-[9px] text-cyan-300">رقم</span>
                  <span className="text-base font-black text-white">#{activeChronoNumber}</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-white truncate">
                    {activeDossier.student.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-0.5">
                    <span className="font-mono text-cyan-300 font-bold">
                      الكود: {activeDossier.student.studentCode}
                    </span>
                    <span className="font-mono tabular-nums">
                      هاتف الطالب: {activeDossier.student.phone}
                    </span>
                    <span className="font-mono tabular-nums text-emerald-300 font-bold">
                      ولي الأمر: {activeParentRawPhone || 'غير مسجل'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
              {/* Student Metadata Strip */}
              <div className="p-4 rounded-2xl bg-[#070d1d] border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500">الصف الدراسي</span>
                  <p className="font-bold text-white mt-0.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{GRADE_LABEL[activeDossier.student.grade] || activeDossier.student.grade}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">المحافظة</span>
                  <p className="font-bold text-white mt-0.5">{activeDossier.student.governorate || 'غير محدد'}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">تاريخ التسجيل</span>
                  <p className="font-bold text-white font-mono tabular-nums mt-0.5">
                    {activeDossier.student.registeredAt}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">نوع الاشتراك</span>
                  <p className="font-bold text-cyan-300 mt-0.5">
                    {activeDossier.student.subscriptionType === 'center'
                      ? 'سنتر وقاعة'
                      : activeDossier.student.subscriptionType === 'lecture'
                      ? 'حصة أونلاين'
                      : 'كورس شهري'}
                  </p>
                </div>
              </div>

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">نسبة حضور المحاضرات</span>
                  <p className="text-2xl font-black text-cyan-300 font-mono tabular-nums">
                    {activeDossier.attendanceRate}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {activeDossier.enteredLectures} من {activeDossier.totalLectures} محاضرة
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">دخول ودرجات الامتحانات</span>
                  <p className="text-2xl font-black text-amber-300 font-mono tabular-nums">
                    {activeDossier.averageExamScore}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                    دخل {activeDossier.takenExams} من {activeDossier.totalExams} امتحان
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">دخول ودرجات الشيتات</span>
                  <p className="text-2xl font-black text-emerald-300 font-mono tabular-nums">
                    {activeDossier.averageSheetScore}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                    حل {activeDossier.solvedSheets} من {activeDossier.totalSheets} شيت
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">الواجبات المنزلية</span>
                  <p className="text-2xl font-black text-indigo-300 font-mono tabular-nums">
                    {activeDossier.homeworkCompletionRate}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                    حل {activeDossier.solvedHomeworks} من {activeDossier.totalHomeworks} واجب
                  </p>
                </div>
              </div>

              {/* Exams & Sheets Side-by-Side Detailed Records */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Exams Breakdown */}
                <div className="p-4 rounded-2xl bg-[#070d1d] border border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-amber-400" />
                    <span>تفاصيل دخول ودرجات الامتحانات</span>
                  </h3>
                  {activeDossier.examRecords.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">لا توجد امتحانات مسجلة حالياً.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pl-1">
                      {activeDossier.examRecords.map((ex) => (
                        <div
                          key={ex.examId}
                          className="p-3 rounded-xl bg-[#0b1328] border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{ex.examTitle}</p>
                            {ex.lessonTitle && (
                              <p className="text-[10px] text-slate-400 truncate">الدرس: {ex.lessonTitle}</p>
                            )}
                            {ex.date && (
                              <p className="text-[10px] text-slate-500 font-mono tabular-nums mt-0.5">
                                {ex.date}
                              </p>
                            )}
                          </div>
                          {ex.taken ? (
                            <div className="text-left shrink-0 space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono tabular-nums font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {ex.score ?? 0} / {ex.maxScore ?? 0} ({ex.percentage ?? 0}%)
                                </span>
                              </span>
                              {ex.status === 'pending_teacher_review' && (
                                <p className="text-[10px] text-cyan-300 flex items-center justify-end gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>بانتظار تصحيح المقالي</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold shrink-0">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>لم يدخل</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sheets Breakdown */}
                <div className="p-4 rounded-2xl bg-[#070d1d] border border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                    <span>تفاصيل دخول ودرجات الشيتات</span>
                  </h3>
                  {activeDossier.homeworkRecords.filter((r) => r.kind === 'sheet').length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">لا توجد شيتات دروس مسجلة حالياً.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pl-1">
                      {activeDossier.homeworkRecords
                        .filter((r) => r.kind === 'sheet')
                        .map((sh) => (
                          <div
                            key={sh.homeworkId}
                            className="p-3 rounded-xl bg-[#0b1328] border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{sh.homeworkTitle}</p>
                              {sh.lessonTitle && (
                                <p className="text-[10px] text-emerald-300 truncate">
                                  الدرس: {sh.lessonTitle}
                                </p>
                              )}
                              {sh.date && (
                                <p className="text-[10px] text-slate-500 font-mono tabular-nums mt-0.5">
                                  {sh.date}
                                </p>
                              )}
                            </div>
                            {sh.solved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono tabular-nums font-bold shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {sh.score !== undefined && sh.maxScore !== undefined
                                    ? `${sh.score} / ${sh.maxScore} (${sh.percentage ?? 0}%)`
                                    : 'تم التسليم'}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold shrink-0">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>لم يدخل</span>
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Homework & Lecture Attendance Detailed Records */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Homeworks */}
                <div className="p-4 rounded-2xl bg-[#070d1d] border border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-indigo-400" />
                    <span>تفاصيل دخول وإنجاز الواجبات</span>
                  </h3>
                  {activeDossier.homeworkRecords.filter((r) => r.kind === 'homework').length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">لا توجد واجبات مسجلة حالياً.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pl-1">
                      {activeDossier.homeworkRecords
                        .filter((r) => r.kind === 'homework')
                        .map((hw) => (
                          <div
                            key={hw.homeworkId}
                            className="p-3 rounded-xl bg-[#0b1328] border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{hw.homeworkTitle}</p>
                              {hw.date && (
                                <p className="text-[10px] text-slate-500 font-mono tabular-nums mt-0.5">
                                  {hw.date}
                                </p>
                              )}
                            </div>
                            {hw.solved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {hw.score !== undefined && hw.maxScore !== undefined
                                    ? `${hw.score}/${hw.maxScore} (${hw.percentage ?? 0}%)`
                                    : 'تم الحل'}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold shrink-0">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>لم يحل</span>
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Lecture Attendance */}
                <div className="p-4 rounded-2xl bg-[#070d1d] border border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>سجل حضور المحاضرات</span>
                  </h3>
                  {activeDossier.lectureRecords.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">لا توجد محاضرات منشورة حالياً.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pl-1">
                      {activeDossier.lectureRecords.map((lec) => (
                        <div
                          key={lec.lectureId}
                          className="p-3 rounded-xl bg-[#0b1328] border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <span className="font-semibold text-white truncate">{lec.lectureTitle}</span>
                          {lec.entered ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>حضر ({lec.date || 'مسجل'})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold shrink-0">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>لم يدخل</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Parent WhatsApp Report Preview & Direct Send Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-[#070f21] to-cyan-950/20 border border-emerald-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>تقرير المتابعة المباشر لولي الأمر (واتساب)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      يتم توجيه الرسالة تلقائياً إلى رقم ولي الأمر المسجل أثناء إنشاء الحساب:{' '}
                      <span className="font-mono font-bold text-emerald-300 tabular-nums">
                        {activeParentRawPhone || 'غير مسجل'}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(activeReportText, activeDossier.student.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
                  >
                    {copiedId === activeDossier.student.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">تم نسخ التقرير</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ نص التقرير</span>
                      </>
                    )}
                  </button>
                </div>

                {!hasRegisteredParentPhone && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        لم يسجل الطالب رقم ولي أمر عند إنشاء الحساب. يمكنك حفظ رقم ولي الأمر الآن ليتم سحبه وإرسال التقرير مباشرة:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="tel"
                        value={parentPhoneInput}
                        onChange={(e) => setParentPhoneInput(e.target.value)}
                        placeholder="أدخل رقم واتساب ولي الأمر (مثال: 01012345678)"
                        className="flex-1 min-w-[200px] bg-[#060b18] border border-amber-500/40 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!parentPhoneInput.trim()) return;
                          updateRegisteredStudent(activeDossier.student.id, {
                            parentPhone: parentPhoneInput.trim(),
                          });
                          setParentPhoneSavedMsg('تم حفظ رقم ولي الأمر بنجاح');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        حفظ رقم ولي الأمر
                      </button>
                    </div>
                    {parentPhoneSavedMsg && (
                      <p className="text-emerald-300 font-bold text-[11px]">{parentPhoneSavedMsg}</p>
                    )}
                  </div>
                )}

                <textarea
                  rows={7}
                  value={activeReportText}
                  onChange={(e) => setCustomMessageDraft(e.target.value)}
                  className="w-full bg-[#060b18] border border-slate-700 focus:border-emerald-400 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    {customMessageDraft !== null && (
                      <button
                        type="button"
                        onClick={() => setCustomMessageDraft(null)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        إعادة توليد التقرير التلقائي
                      </button>
                    )}
                    {hasRegisteredParentPhone && (
                      <span className="text-[11px] text-emerald-300 font-mono tabular-nums">
                        الرقم المسجل لولي الأمر: {activeParentRawPhone}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 ms-auto">
                    {hasRegisteredParentPhone ? (
                      <a
                        href={buildWhatsAppUrl(activeParentRawPhone, activeReportText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>إرسال تقرير لولي الأمر</span>
                      </a>
                    ) : (
                      <span className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs inline-flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>أدخل رقم ولي الأمر أولاً لتفعيل الإرسال المباشر</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
