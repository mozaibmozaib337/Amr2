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
  UserPlus,
  Edit3,
  Trash2,
  TrendingUp,
  BarChart3,
  KeyRound,
  Wallet,
  Save,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import { GradeLevel, RegisteredAccount, StudentDossier, SubscriptionType } from '../types';
import { buildWhatsAppUrl, formatWhatsAppPhone } from '../utils/safeExternalLink';

const GRADE_LABEL: Record<GradeLevel, string> = {
  sec3: 'الصف الثالث الثانوي',
  sec2: 'الصف الثاني الثانوي',
  sec1: 'الصف الأول الثانوي',
};

const SUBSCRIPTION_LABEL: Record<SubscriptionType, string> = {
  course: 'كورس شهري شامل',
  lecture: 'حصة منفردة',
  center: 'مسكن بالسنتر وقاعة',
};

function getChronologicalTimestamp(acc: RegisteredAccount, originalIndex: number, totalCount: number): number {
  const idMatch = acc.id?.match(/(?:std|acc|user)_(\d{10,15})/);
  if (idMatch && idMatch[1]) {
    const ms = Number(idMatch[1]);
    if (!Number.isNaN(ms) && ms > 0) return ms;
  }

  if (acc.registeredAt) {
    const parsed = Date.parse(acc.registeredAt);
    if (!Number.isNaN(parsed)) {
      return parsed + (totalCount - originalIndex);
    }
  }

  return totalCount - originalIndex;
}

function parseSortableDate(raw?: string, fallbackOrder: number = 0): number {
  if (!raw) return fallbackOrder;
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return iso;
  // Support DD/MM/YYYY or D/M/YYYY
  const parts = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const year = parts[3].length === 2 ? 2000 + Number(parts[3]) : Number(parts[3]);
    const dt = new Date(year, month, day).getTime();
    if (!Number.isNaN(dt)) return dt;
  }
  return fallbackOrder;
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

interface StudentDirectorySectionProps {
  sectionTitle?: string;
}

export const StudentDirectorySection: React.FC<StudentDirectorySectionProps> = ({
  sectionTitle = 'بيانات الطالب والتقارير الشاملة',
}) => {
  const {
    currentUser,
    registeredAccounts,
    examSubmissions,
    getStudentDossier,
    addRegisteredStudent,
    updateRegisteredStudent,
    deleteRegisteredStudent,
  } = usePlatform();

  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [parentPhoneSavedMsg, setParentPhoneSavedMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customMessageDraft, setCustomMessageDraft] = useState<string | null>(null);

  // Add Student Form (Exact same 10 fields entered by the teacher)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStdName, setNewStdName] = useState('');
  const [newStdPhone, setNewStdPhone] = useState('');
  const [newStdParentPhone, setNewStdParentPhone] = useState('');
  const [newStdCode, setNewStdCode] = useState('');
  const [newStdPass, setNewStdPass] = useState('');
  const [newStdGrade, setNewStdGrade] = useState<GradeLevel>('sec3');
  const [newStdSubscription, setNewStdSubscription] = useState<SubscriptionType>('course');
  const [newStdGov, setNewStdGov] = useState('القاهرة');
  const [newStdAge, setNewStdAge] = useState('18');
  const [newStdBalance, setNewStdBalance] = useState('0');
  const [sectionFeedback, setSectionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Standalone Edit & Confirm Delete state
  const [editingStudent, setEditingStudent] = useState<RegisteredAccount | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Build Recharts timeline progression for Exams & Sheets of the selected student
  const chartTimelineData = useMemo(() => {
    if (!activeDossier) return [];

    const studentSubs = examSubmissions.filter(
      (s) =>
        s.studentId === activeDossier.student.id ||
        s.studentPhone === activeDossier.student.phone
    );

    const points: {
      sortTime: number;
      name: string;
      fullTitle: string;
      date: string;
      الاختبارات: number | null;
      الشيتات: number | null;
      الدرجة: number;
      scoreText: string;
      kindLabel: string;
    }[] = [];

    activeDossier.examRecords
      .filter((ex) => ex.taken)
      .forEach((ex, idx) => {
        const sub = studentSubs.find((s) => s.examId === ex.examId);
        const pct =
          typeof ex.percentage === 'number'
            ? ex.percentage
            : ex.maxScore && ex.maxScore > 0
            ? Math.round(((ex.score ?? 0) / ex.maxScore) * 100)
            : 0;
        const rawDate = sub?.submittedAt || ex.date || 'مسجل';
        const shortName =
          ex.examTitle
            .replace(/^امتحان\s*/i, '')
            .replace(/^الامتحان\s*/i, '')
            .trim()
            .slice(0, 14) || `امتحان ${idx + 1}`;
        points.push({
          sortTime: parseSortableDate(rawDate, idx + 1),
          name: shortName,
          fullTitle: ex.examTitle,
          date: rawDate,
          الاختبارات: pct,
          الشيتات: null,
          الدرجة: pct,
          scoreText: `${ex.score ?? 0} / ${ex.maxScore ?? 0}`,
          kindLabel: 'امتحان إلكتروني',
        });
      });

    activeDossier.homeworkRecords
      .filter((r) => r.kind === 'sheet' && r.solved)
      .forEach((sh, idx) => {
        const sub = studentSubs.find((s) => s.examId === sh.homeworkId);
        const pct =
          typeof sh.percentage === 'number'
            ? sh.percentage
            : sh.maxScore && sh.maxScore > 0
            ? Math.round(((sh.score ?? 0) / sh.maxScore) * 100)
            : 100;
        const rawDate = sub?.submittedAt || sh.date || 'تم التسليم';
        const shortName =
          sh.homeworkTitle
            .replace(/^شيت\s*/i, '')
            .trim()
            .slice(0, 14) || `شيت ${idx + 1}`;
        points.push({
          sortTime: parseSortableDate(rawDate, 1000 + idx),
          name: shortName,
          fullTitle: sh.homeworkTitle,
          date: rawDate,
          الاختبارات: null,
          الشيتات: pct,
          الدرجة: pct,
          scoreText:
            sh.score !== undefined && sh.maxScore !== undefined
              ? `${sh.score} / ${sh.maxScore}`
              : 'مكتمل',
          kindLabel: 'شيت درس',
        });
      });

    points.sort((a, b) => a.sortTime - b.sortTime);
    return points;
  }, [activeDossier, examSubmissions]);

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

  const showTempFeedback = (type: 'success' | 'error', text: string) => {
    setSectionFeedback({ type, text });
    setTimeout(() => {
      setSectionFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

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

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStdName.trim() || !newStdPhone.trim() || !newStdCode.trim()) {
      showTempFeedback('error', 'يرجى إدخال اسم الطالب ورقم هاتفه وكود الطالب.');
      return;
    }
    if (!newStdParentPhone.trim()) {
      showTempFeedback('error', 'رقم ولي الأمر إلزامي لإرسال تقارير المتابعة.');
      return;
    }

    addRegisteredStudent({
      name: newStdName.trim(),
      phone: newStdPhone.trim(),
      parentPhone: newStdParentPhone.trim(),
      studentCode: newStdCode.trim(),
      password: newStdPass.trim() || newStdCode.trim(),
      grade: newStdGrade,
      subscriptionType: newStdSubscription,
      governorate: newStdGov.trim() || 'القاهرة',
      age: Number(newStdAge) || 18,
      walletBalance: Number(newStdBalance) || 0,
    });

    setNewStdName('');
    setNewStdPhone('');
    setNewStdParentPhone('');
    setNewStdCode('');
    setNewStdPass('');
    setNewStdAge('18');
    setNewStdBalance('0');
    setShowAddForm(false);
    showTempFeedback('success', 'تم إضافة الطالب بجميع بياناته وحفظه بنجاح!');
  };

  const activeReportText = activeDossier
    ? customMessageDraft ?? buildParentWhatsAppReport(activeDossier)
    : '';
  const activeParentRawPhone = activeDossier?.student.parentPhone?.trim() || '';
  const hasRegisteredParentPhone = formatWhatsAppPhone(activeParentRawPhone).length >= 10;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Feedback Alert */}
      {sectionFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
            sectionFeedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
          }`}
        >
          {sectionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{sectionFeedback.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0a1428] via-[#091224] to-[#081529] border border-cyan-500/25 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>سجل بيانات الطلاب الكامل والتقارير الأكاديمية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {sectionTitle} ({chronologicalStudents.length} طالب مسجل)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              يعرض هذا القسم كافة بيانات الطلاب المدخلة بنفس تفاصيلها (الاسم، رقم الهاتف، ولي الأمر، الكود، كلمة المرور، الصف، الاشتراك، المحافظة، السن، الرصيد) مرتبة من #1 حتى أحدث طالب، مع رسوم بيانية تفاعلية لمستوى الدرجات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'إخفاء نموذج الإضافة' : 'إضافة طالب بنفس البيانات'}</span>
            </button>

            {/* Grade Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
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
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
        </div>

        {/* Collapsible Add Student Form (Exact Same 10 Fields Entered by Teacher) */}
        {showAddForm && (
          <form
            onSubmit={handleAddStudentSubmit}
            className="bg-[#060b18] border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>تسجيل طالب جديد بنفس بيانات الإدخال</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                إلغاء ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  اسم الطالب كاملاً <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStdName}
                  onChange={(e) => setNewStdName(e.target.value)}
                  placeholder="مثال: محمد السيد أحمد"
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  رقم هاتف الطالب <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newStdPhone}
                  onChange={(e) => setNewStdPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-amber-300 mb-1 font-bold">
                  رقم ولي الأمر (إلزامي) <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newStdParentPhone}
                  onChange={(e) => setNewStdParentPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-[#0a1122] border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  كود الطالب <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStdCode}
                  onChange={(e) => setNewStdCode(e.target.value)}
                  placeholder="SEC3-205"
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 uppercase font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">كلمة المرور / الكود السري</label>
                <input
                  type="text"
                  value={newStdPass}
                  onChange={(e) => setNewStdPass(e.target.value)}
                  placeholder="افتراضياً نفس الكود"
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                <select
                  value={newStdGrade}
                  onChange={(e) => setNewStdGrade(e.target.value as GradeLevel)}
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="sec3">الصف الثالث الثانوي</option>
                  <option value="sec2">الصف الثاني الثانوي</option>
                  <option value="sec1">الصف الأول الثانوي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">نوع الاشتراك</label>
                <select
                  value={newStdSubscription}
                  onChange={(e) => setNewStdSubscription(e.target.value as SubscriptionType)}
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="course">كورس شهري شامل</option>
                  <option value="lecture">حصة منفردة</option>
                  <option value="center">مسكن بالسنتر وقاعة</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">المحافظة</label>
                <input
                  type="text"
                  value={newStdGov}
                  onChange={(e) => setNewStdGov(e.target.value)}
                  placeholder="مثال: الدقهلية / المنصورة"
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">العمر / السن</label>
                <input
                  type="number"
                  value={newStdAge}
                  onChange={(e) => setNewStdAge(e.target.value)}
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">رصيد المحفظة المبدئي (ج.م)</label>
                <input
                  type="number"
                  value={newStdBalance}
                  onChange={(e) => setNewStdBalance(e.target.value)}
                  className="w-full bg-[#0a1122] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 text-white text-xs font-bold shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وإضافة الطالب الآن</span>
              </button>
            </div>
          </form>
        )}

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
            <span>اضغط على أي طالب لفتح نافذة التفاصيل الكاملة والرسوم البيانية</span>
          </div>
        </div>
      </div>

      {/* Students Chronological Directory with Exact Entered Fields */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0a1122] border border-slate-800 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">لا يوجد طلاب يطابقون البحث الحالي</p>
          <p className="text-xs text-slate-500">جرب تعديل كلمة البحث أو إضافة طالب جديد من الزر بالأعلى.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredStudents.map(({ student, chronologicalNumber }) => {
            const dossier = getStudentDossier(student.id);
            const hasParent = formatWhatsAppPhone(student.parentPhone).length >= 10;
            const subLabel =
              SUBSCRIPTION_LABEL[student.subscriptionType || 'course'] || 'كورس شهري شامل';

            return (
              <div
                key={student.id}
                onClick={() => handleOpenStudent(student.id)}
                className="group p-4 rounded-2xl bg-[#0a1122] hover:bg-[#0d162d] border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Right: Chronological Index & Core Identity with all entered fields */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col items-center justify-center shrink-0 font-mono tabular-nums"
                    title="الترتيب الزمني للتسجيل"
                  >
                    <span className="text-[9px] text-cyan-400 leading-none">تسجيل</span>
                    <span className="text-sm font-black text-white leading-tight">#{chronologicalNumber}</span>
                  </div>

                  <div className="min-w-0 space-y-1.5">
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
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                        {subLabel}
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
                      <span className="inline-flex items-center gap-1 font-mono">
                        <KeyRound className="w-3 h-3 text-slate-500" />
                        <span>كلمة المرور: {student.password || '—'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{student.governorate || 'غير محدد'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <span>السن: {student.age ?? 18}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-cyan-300">
                        <Wallet className="w-3 h-3" />
                        <span>الرصيد: {student.walletBalance ?? 0} ج.م</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>سجل في: {student.registeredAt}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left: Academic Summary & Actions */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
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

                  <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {dossier && hasParent && (
                      <a
                        href={buildWhatsAppUrl(student.parentPhone, buildParentWhatsAppReport(dossier))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        title={`إرسال التقرير مباشرة إلى رقم ولي الأمر المسجل (${student.parentPhone})`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>إرسال تقرير لولي الأمر</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenStudent(student.id)}
                      className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>التفاصيل والرسوم البيانية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingStudent({ ...student })}
                      className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all cursor-pointer"
                      title="تعديل بيانات الطالب"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteId === student.id ? (
                      <div className="inline-flex items-center gap-1 bg-rose-950/90 border border-rose-500/50 rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteRegisteredStudent(student.id);
                            setConfirmDeleteId(null);
                            if (selectedStudentId === student.id) setSelectedStudentId(null);
                            showTempFeedback('success', `تم حذف الطالب "${student.name}" بنجاح.`);
                          }}
                          className="text-[11px] font-bold text-rose-300 hover:text-white cursor-pointer whitespace-nowrap"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-slate-400 hover:text-white px-1 cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(student.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-all cursor-pointer"
                        title="حذف الطالب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPREHENSIVE STUDENT DETAIL MODAL WITH RECHARTS ANALYTICS */}
      {activeDossier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="bg-[#0b1328] border border-cyan-500/40 rounded-3xl w-full max-w-5xl max-h-[92dvh] overflow-hidden shadow-2xl flex flex-col text-slate-100"
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
              {/* Complete Student Entered Fields Strip */}
              <div className="p-4 rounded-2xl bg-[#070d1d] border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500">الصف الدراسي</span>
                  <p className="font-bold text-white mt-0.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{GRADE_LABEL[activeDossier.student.grade] || activeDossier.student.grade}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">نوع الاشتراك</span>
                  <p className="font-bold text-cyan-300 mt-0.5">
                    {SUBSCRIPTION_LABEL[activeDossier.student.subscriptionType || 'course']}
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
                  <span className="text-[11px] text-slate-500">كلمة المرور / الكود السري</span>
                  <p className="font-bold text-amber-300 font-mono mt-0.5">
                    {activeDossier.student.password || 'غير محدد'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">العمر / السن</span>
                  <p className="font-bold text-white font-mono tabular-nums mt-0.5">
                    {activeDossier.student.age ?? 18} سنة
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">رصيد المحفظة</span>
                  <p className="font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
                    {activeDossier.student.walletBalance ?? 0} ج.م
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">رقم هاتف ولي الأمر</span>
                  <p className="font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
                    {activeParentRawPhone || 'غير مسجل'}
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

              {/* RECHARTS ANALYTICS: Performance Evolution Over Time */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#070d1d] border border-cyan-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span>الرسوم البيانية لتطور الدرجات ومستوى الأداء عبر الزمن</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تحليل تفاعلي لمسار درجات الطالب في الاختبارات الإلكترونية والشيتات بمرور الوقت
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1.5 text-amber-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      الاختبارات
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      الشيتات
                    </span>
                  </div>
                </div>

                {chartTimelineData.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#0b1328] border border-slate-800 text-center space-y-1.5">
                    <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">
                      لا توجد درجات اختبارات أو شيتات مكتملة لرسم المنحنى بعد
                    </p>
                    <p className="text-[11px] text-slate-500">
                      بمجرد إتمام الطالب لأي امتحان أو شيت، سيظهر مخطط تطور درجاته ومقارنة أدائه هنا تلقائياً.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Chart 1: AreaChart for Score Progression Over Time */}
                    <div className="p-3.5 rounded-xl bg-[#0b1328] border border-slate-800 space-y-2">
                      <p className="text-xs font-bold text-cyan-300">
                        منحنى تطور النسبة المئوية عبر الزمن (%)
                      </p>
                      <div className="h-56 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartTimelineData} margin={{ top: 10, right: 12, left: -12, bottom: 5 }}>
                            <defs>
                              <linearGradient id="examScoreGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                              </linearGradient>
                              <linearGradient id="sheetScoreGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              axisLine={{ stroke: '#334155' }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              axisLine={{ stroke: '#334155' }}
                              unit="%"
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                const row = payload[0]?.payload;
                                return (
                                  <div
                                    dir="rtl"
                                    className="bg-[#060b18] border border-cyan-500/50 rounded-xl p-3 text-xs shadow-xl space-y-1 text-right"
                                  >
                                    <p className="font-bold text-white">{row.fullTitle}</p>
                                    <p className="text-[11px] text-cyan-300">{row.kindLabel}</p>
                                    <p className="font-mono tabular-nums text-amber-300 font-bold">
                                      الدرجة: {row.scoreText} ({row.الدرجة}%)
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono tabular-nums">{row.date}</p>
                                  </div>
                                );
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Area
                              type="monotone"
                              dataKey="الاختبارات"
                              stroke="#f59e0b"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#examScoreGrad)"
                              connectNulls
                              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#060b18' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="الشيتات"
                              stroke="#10b981"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#sheetScoreGrad)"
                              connectNulls
                              dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#060b18' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: BarChart Comparing Assessment Percentages */}
                    <div className="p-3.5 rounded-xl bg-[#0b1328] border border-slate-800 space-y-2">
                      <p className="text-xs font-bold text-emerald-300">
                        مقارنة النسبة المئوية لكل اختبار وشيت (%)
                      </p>
                      <div className="h-56 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartTimelineData} margin={{ top: 10, right: 12, left: -12, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              axisLine={{ stroke: '#334155' }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              axisLine={{ stroke: '#334155' }}
                              unit="%"
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                const row = payload[0]?.payload;
                                return (
                                  <div
                                    dir="rtl"
                                    className="bg-[#060b18] border border-emerald-500/50 rounded-xl p-3 text-xs shadow-xl space-y-1 text-right"
                                  >
                                    <p className="font-bold text-white">{row.fullTitle}</p>
                                    <p className="text-[11px] text-emerald-300">{row.kindLabel}</p>
                                    <p className="font-mono tabular-nums text-white font-bold">
                                      النسبة: {row.الدرجة}% ({row.scoreText})
                                    </p>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="الاختبارات" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="الشيتات" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
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

      {/* STANDALONE EDIT STUDENT MODAL */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
          onClick={() => setEditingStudent(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              updateRegisteredStudent(editingStudent.id, {
                name: editingStudent.name,
                phone: editingStudent.phone,
                parentPhone: editingStudent.parentPhone,
                studentCode: editingStudent.studentCode,
                password: editingStudent.password,
                grade: editingStudent.grade,
                subscriptionType: editingStudent.subscriptionType,
                governorate: editingStudent.governorate,
                age: Number(editingStudent.age) || 18,
                walletBalance: Number(editingStudent.walletBalance) || 0,
              });
              setEditingStudent(null);
              showTempFeedback('success', 'تم تعديل وحفظ بيانات الطالب بنجاح!');
            }}
            className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">
                  تعديل بيانات الطالب: {editingStudent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">اسم الطالب</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">كود الطالب المسجل به</label>
                <input
                  type="text"
                  required
                  value={editingStudent.studentCode}
                  onChange={(e) => setEditingStudent({ ...editingStudent, studentCode: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">رقم هاتف الطالب</label>
                <input
                  type="tel"
                  required
                  value={editingStudent.phone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-amber-300 mb-1 font-bold">رقم ولي الأمر</label>
                <input
                  type="tel"
                  required
                  value={editingStudent.parentPhone || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                  className="w-full bg-[#050811] border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                <select
                  value={editingStudent.grade}
                  onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value as GradeLevel })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="sec3">الصف الثالث الثانوي</option>
                  <option value="sec2">الصف الثاني الثانوي</option>
                  <option value="sec1">الصف الأول الثانوي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">نوع الاشتراك</label>
                <select
                  value={editingStudent.subscriptionType || 'course'}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, subscriptionType: e.target.value as SubscriptionType })
                  }
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="course">كورس شهري شامل</option>
                  <option value="lecture">حصة منفردة</option>
                  <option value="center">مسكن بالسنتر وقاعة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">كلمة المرور / كود الدخول</label>
                <input
                  type="text"
                  value={editingStudent.password || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">المحافظة</label>
                <input
                  type="text"
                  value={editingStudent.governorate || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, governorate: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">العمر / السن</label>
                <input
                  type="number"
                  value={editingStudent.age ?? 18}
                  onChange={(e) => setEditingStudent({ ...editingStudent, age: Number(e.target.value) })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">رصيد المحفظة (ج.م)</label>
                <input
                  type="number"
                  value={editingStudent.walletBalance ?? 0}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, walletBalance: Number(e.target.value) })
                  }
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات فوراً</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
