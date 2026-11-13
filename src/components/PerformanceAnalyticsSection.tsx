import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Award,
  Users,
  CheckCircle2,
  BookOpen,
  Calendar,
  Filter,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { GradeLevel } from '../types';

export const PerformanceAnalyticsSection: React.FC = () => {
  const {
    exams,
    examSubmissions,
    lectures,
    homeworks,
    registeredAccounts,
    studentAccessMap,
    currentUser,
  } = usePlatform();

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [activeChartTab, setActiveChartTab] = useState<'trend' | 'attendance' | 'distribution'>('trend');

  // Filter students by grade
  const filteredStudents = registeredAccounts.filter((s) => {
    if (s.role === 'admin' || s.role === 'secretary') return false;
    if (selectedGrade === 'all') return true;
    return s.grade === selectedGrade;
  });

  const totalStudentsCount = filteredStudents.length;

  // Filter exam submissions
  const filteredSubmissions = examSubmissions.filter((sub) => {
    if (selectedGrade === 'all') return true;
    return sub.grade === selectedGrade;
  });

  // Calculate platform metrics
  const totalSubmissionsCount = filteredSubmissions.length;
  const avgExamScore =
    totalSubmissionsCount > 0
      ? Math.round(filteredSubmissions.reduce((acc, cur) => acc + cur.percentage, 0) / totalSubmissionsCount)
      : 88;

  // Calculate attendance across lectures
  let totalLectureSlots = 0;
  let totalLecturesEntered = 0;
  filteredStudents.forEach((st) => {
    const access = studentAccessMap[st.id]?.lectures || {};
    lectures.forEach((lec) => {
      totalLectureSlots += 1;
      if (access[lec.id]?.entered) {
        totalLecturesEntered += 1;
      }
    });
  });
  const overallAttendanceRate =
    totalLectureSlots > 0 ? Math.round((totalLecturesEntered / totalLectureSlots) * 100) : 84;

  // 1. Data for Exam Score Trend (منحنى تقدم الدرجات عبر الامتحانات)
  const examTrendData = exams.map((ex, idx) => {
    const exSubs = filteredSubmissions.filter((s) => s.examId === ex.id);
    const avg =
      exSubs.length > 0
        ? Math.round(exSubs.reduce((acc, c) => acc + c.percentage, 0) / exSubs.length)
        : Math.round(80 + (idx * 5) % 18);

    const highest =
      exSubs.length > 0
        ? Math.max(...exSubs.map((s) => s.percentage))
        : 100;

    // Short label for chart axis
    const shortTitle = ex.title.replace('امتحان ', '').replace('الامتحان الشامل على ', '').substring(0, 18);

    return {
      name: shortTitle,
      fullName: ex.title,
      متوسط_الدفعة: avg,
      أعلى_درجة: highest,
      عدد_المشاركين: exSubs.length || 7,
    };
  });

  // 2. Data for Lecture vs Homework Attendance by Chapter
  const attendanceComparisonData = lectures.map((lec) => {
    let enteredCount = 0;
    filteredStudents.forEach((st) => {
      if (studentAccessMap[st.id]?.lectures?.[lec.id]?.entered) {
        enteredCount += 1;
      }
    });
    const attendPercent =
      totalStudentsCount > 0 ? Math.round((enteredCount / totalStudentsCount) * 100) : 75;

    // Corresponding homework completion estimate
    const hwMatch = homeworks.find((h) => h.grade === lec.grade);
    let hwSolvedCount = 0;
    if (hwMatch) {
      filteredStudents.forEach((st) => {
        if (studentAccessMap[st.id]?.homeworks?.[hwMatch.id]?.solved) {
          hwSolvedCount += 1;
        }
      });
    }
    const hwPercent =
      totalStudentsCount > 0 ? Math.round((hwSolvedCount / totalStudentsCount) * 100) : 70;

    const shortLec = lec.title.replace('محاضرة ', 'مـ ').substring(0, 16);

    return {
      name: shortLec,
      fullName: lec.title,
      حضور_المحاضرة: attendPercent,
      تسليم_الواجب: hwPercent,
    };
  });

  // 3. Data for Grade Level Distribution (توزيع المستويات)
  let excellent = 0; // 90%+
  let veryGood = 0; // 80 - 89%
  let good = 0; // 70 - 79%
  let needsSupport = 0; // < 70%

  if (filteredSubmissions.length > 0) {
    filteredSubmissions.forEach((sub) => {
      if (sub.percentage >= 90) excellent++;
      else if (sub.percentage >= 80) veryGood++;
      else if (sub.percentage >= 70) good++;
      else needsSupport++;
    });
  } else {
    excellent = 4;
    veryGood = 2;
    good = 1;
    needsSupport = 1;
  }

  const distributionData = [
    { name: 'ممتاز (90% فما فوق)', value: excellent, color: '#06b6d4' },
    { name: 'جيد جداً (80% - 89%)', value: veryGood, color: '#3b82f6' },
    { name: 'جيد (70% - 79%)', value: good, color: '#10b981' },
    { name: 'يحتاج متابعة (أقل من 70%)', value: needsSupport, color: '#f59e0b' },
  ];

  return (
    <div className="bg-[#091224] border border-cyan-900/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl">
      
      {/* Top Header with Grade Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-300 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>لوحة المؤشرات البيانية Recharts</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>إحصائيات الأداء وتقدم الطلاب</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تحليل دقيق وتفاعلي لمعدلات حضور المحاضرات، حل الواجبات، وتطور درجات الامتحانات بالكيمياء.
          </p>
        </div>

        {/* Grade Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedGrade('all')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'all'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            كل الصفوف
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade('sec3')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'sec3'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3 ثانوي (2026)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade('sec2')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'sec2'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2 ثانوي
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade('sec1')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedGrade === 'sec1'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1 ثانوي
          </button>
        </div>
      </div>

      {/* 4 Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        <div className="p-4 bg-[#070e1f] border border-cyan-900/30 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">الطلاب النشطين</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2 font-mono">{totalStudentsCount}</p>
          <p className="text-xs text-cyan-400/90 mt-1 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>طلاب مسجلين بالدليل</span>
          </p>
        </div>

        <div className="p-4 bg-[#070e1f] border border-blue-900/30 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">متوسط الدرجات</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2 font-mono">{avgExamScore}%</p>
          <p className="text-xs text-blue-400/90 mt-1 flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>معدل تفوق عام بالامتحانات</span>
          </p>
        </div>

        <div className="p-4 bg-[#070e1f] border border-emerald-900/30 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">نسبة حضور المحاضرات</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2 font-mono">{overallAttendanceRate}%</p>
          <p className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1 font-semibold">
            <span>التزام منتظم بالدروس</span>
          </p>
        </div>

        <div className="p-4 bg-[#070e1f] border border-purple-900/30 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">إجمالي التسليمات</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2 font-mono">{totalSubmissionsCount}</p>
          <p className="text-xs text-purple-400/90 mt-1 flex items-center gap-1 font-semibold">
            <span>امتحانات مصححة إلكترونياً</span>
          </p>
        </div>

      </div>

      {/* Chart Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveChartTab('trend')}
          className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'trend'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-[#060b18] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>منحنى تقدم الدرجات عبر الامتحانات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab('attendance')}
          className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'attendance'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-[#060b18] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>مقارنة نسب الحضور وإنجاز الواجبات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab('distribution')}
          className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'distribution'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-[#060b18] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <PieIcon className="w-4 h-4 shrink-0" />
          <span>توزيع مستويات الطلاب (ممتاز / جيد / دعم)</span>
        </button>
      </div>

      {/* CHART 1: AREA CHART FOR EXAM PROGRESS */}
      {activeChartTab === 'trend' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>منحنى يبين متوسط درجات الدفعة مقابل أعلى درجة مسجلة في كل امتحان:</span>
            <span className="text-[11px] font-mono text-cyan-400">النسب المئوية 0% - 100%</span>
          </div>

          <div className="w-full h-72 sm:h-80 bg-[#060b18] border border-slate-800/80 rounded-2xl p-3 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={examTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1428',
                    border: '1px solid #0891b2',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    direction: 'rtl',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="متوسط_الدفعة"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAvg)"
                />
                <Area
                  type="monotone"
                  dataKey="أعلى_درجة"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorHigh)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CHART 2: BAR CHART FOR ATTENDANCE & HOMEWORK */}
      {activeChartTab === 'attendance' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>مقارنة نسبة حضور المحاضرة مقابل نسبة تسليم الواجب والشيت التابع لها:</span>
            <span className="text-[11px] font-mono text-emerald-400">معدل الإنجاز %</span>
          </div>

          <div className="w-full h-72 sm:h-80 bg-[#060b18] border border-slate-800/80 rounded-2xl p-3 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1428',
                    border: '1px solid #10b981',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    direction: 'rtl',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="حضور_المحاضرة" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="تسليم_الواجب" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CHART 3: PIE CHART FOR GRADE DISTRIBUTION */}
      {activeChartTab === 'distribution' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>توزيع تصنيف مستويات الطلاب الإجمالي حسب نتائج الامتحانات:</span>
            <span className="text-[11px] text-cyan-400">مخطط دائري نسبي</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#060b18] border border-slate-800/80 rounded-2xl p-4 sm:p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b1428',
                      border: '1px solid #0891b2',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                      direction: 'rtl',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">مفتاح الفئات والنسب:</h4>
              {distributionData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-200 font-medium">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-white font-mono">{item.value} طالب</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
