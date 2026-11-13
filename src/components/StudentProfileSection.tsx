import React from 'react';
import {
  UserCircle2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  GraduationCap,
  CheckCircle2,
  FileCheck2,
  BookCheck,
  PlaySquare,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { GradeLevel } from '../types';

interface StudentProfileSectionProps {
  setActiveTab: (tab: string) => void;
}

export const StudentProfileSection: React.FC<StudentProfileSectionProps> = ({ setActiveTab }) => {
  const { currentUser, getStudentDossier, setIsLoginModalOpen } = usePlatform();

  if (!currentUser) {
    return (
      <div className="p-12 bg-[#091224] border border-slate-800 rounded-3xl text-center space-y-4">
        <UserCircle2 className="w-12 h-12 text-cyan-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">سجل دخولك لعرض ملفك الأكاديمي</h3>
        <button
          type="button"
          onClick={() => setIsLoginModalOpen(true)}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          تسجيل الدخول الآن
        </button>
      </div>
    );
  }

  const gradeLabels: Record<GradeLevel, string> = {
    sec1: 'الصف الأول الثانوي',
    sec2: 'الصف الثاني الثانوي',
    sec3: 'الصف الثالث الثانوي',
  };

  const dossier = getStudentDossier(currentUser.id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-cyan-900/40 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-cyan-600/30 shrink-0">
            {currentUser.name.trim().charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] sm:text-2xl font-extrabold text-white">{currentUser.name}</h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 border border-cyan-700/50 text-cyan-300 text-xs font-bold">
                {gradeLabels[currentUser.grade]}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                كود الطالب: <strong className="text-white">{currentUser.studentCode || '---'}</strong>
              </span>
              <span className="flex items-center gap-1 font-mono" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                {currentUser.phone}
              </span>
              {currentUser.parentPhone && (
                <span className="flex items-center gap-1 font-mono">
                  هاتف ولي الأمر: {currentUser.parentPhone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {currentUser.governorate}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                {currentUser.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="px-4 py-2.5 rounded-2xl bg-[#050811] border border-emerald-800/50 text-right flex-1 sm:flex-initial">
            <p className="text-xs text-slate-400">رصيد المحفظة الحالي</p>
            <p className="text-lg font-extrabold text-emerald-400 tabular-nums">
              {currentUser.walletBalance} ج.م
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className="min-h-[44px] px-4 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors flex-1 sm:flex-initial"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>شحن الرصيد / كود السنتر</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">حضور المحاضرات</span>
            <PlaySquare className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-white tabular-nums">
            {dossier ? `${dossier.enteredLectures} / ${dossier.totalLectures}` : '0 / 0'}
          </p>
          <p className="text-xs text-cyan-400 tabular-nums">
            نسبة الحضور: {dossier?.attendanceRate ?? 0}%
          </p>
        </div>

        <div className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">الامتحانات الإلكترونية</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white tabular-nums">
            {dossier ? `${dossier.takenExams} / ${dossier.totalExams}` : '0 / 0'}
          </p>
          <p className="text-xs text-emerald-400 tabular-nums">
            متوسط الدرجات: {dossier?.averageExamScore ?? 0}%
          </p>
        </div>

        <div className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">الواجبات والشيتات</span>
            <BookCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white tabular-nums">
            {dossier ? `${dossier.solvedHomeworks} / ${dossier.totalHomeworks}` : '0 / 0'}
          </p>
          <p className="text-xs text-amber-400 tabular-nums">
            معدل الإنجاز: {dossier?.homeworkCompletionRate ?? 0}%
          </p>
        </div>
      </div>

      {/* Detailed Exam & Homework Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>سجل درجات الامتحانات</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('exams')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>الانتقال للامتحانات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {!dossier || dossier.examRecords.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا توجد امتحانات مسجلة لصفك حالياً.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {dossier.examRecords.map((rec) => (
                <div
                  key={rec.examId}
                  className="p-3 rounded-xl bg-[#050811] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{rec.examTitle}</p>
                    {rec.date && <p className="text-[11px] text-slate-400">{rec.date}</p>}
                  </div>
                  {rec.taken ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-bold tabular-nums shrink-0">
                      {rec.score} / {rec.maxScore} ({rec.percentage}%)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 font-semibold shrink-0">
                      لم يُحل بعد
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-[#091224] border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>سجل الواجبات والشيتات</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('homework')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>الانتقال للواجبات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {!dossier || dossier.homeworkRecords.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا توجد واجبات أو شيتات لصفك حالياً.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {dossier.homeworkRecords.map((rec) => (
                <div
                  key={rec.homeworkId}
                  className="p-3 rounded-xl bg-[#050811] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{rec.homeworkTitle}</p>
                    <p className="text-[11px] text-slate-400">
                      {rec.kind === 'sheet' ? 'شيت تقييمي' : 'واجب منزلي'}
                    </p>
                  </div>
                  {rec.solved ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-bold tabular-nums shrink-0">
                      {rec.maxScore ? `${rec.score ?? 0} / ${rec.maxScore}` : 'تم التسليم ✓'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-700/40 text-amber-300 font-semibold shrink-0">
                      قيد الانتظار
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
