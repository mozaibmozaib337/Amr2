import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import { Trophy, Medal, Award, Sparkles, PlusCircle, Trash2, User } from 'lucide-react';

export const LeaderboardSection: React.FC = () => {
  const { honoredStudents, deleteHonoredStudent, currentUser, setIsAdminPanelOpen } = usePlatform();
  const isAdminOrSec = currentUser?.role === 'admin' || currentUser?.role === 'secretary';

  // Sort by rank or score
  const sortedStudents = [...honoredStudents].sort((a, b) => a.rank - b.rank || b.percentage - a.percentage);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0d1a38] to-[#091224] border border-cyan-800/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-full text-xs font-semibold text-amber-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>لوحة الشرف وأوائل مادة الكيمياء</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            قائمة الطلاب المتفوقين مع مستر عمرو السيد
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            تكريم أبطال الثانوية العامة الحاصلين على أعلى الدرجات في امتحانات وواجبات الكيمياء على مستوى الجمهورية.
          </p>
        </div>

        {isAdminOrSec && (
          <button
            onClick={() => setIsAdminPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إدارة لوحة الشرف</span>
          </button>
        )}
      </div>

      {/* Honor Roll Content */}
      {sortedStudents.length === 0 ? (
        <div className="p-8 sm:p-12 bg-[#091224] border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-white">لوحة الشرف قيد التحديث</h3>

          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            سيتم إعلان أسماء ودرجات الطلاب المتصدرين للدفعة وتكريمهم بالشهادات والجوائز فور انتهاء تصحيح أول اختبار شامل على المنصة.
          </p>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-xs text-slate-300">
            <div className="p-3 bg-[#060a16] border border-slate-800 rounded-xl">
              <span className="block font-bold text-amber-400 text-sm mb-1">الدرجة 95%+</span>
              الحصول على الدرجة النهائية أو ممتاز في الامتحانات الدورية.
            </div>
            <div className="p-3 bg-[#060a16] border border-slate-800 rounded-xl">
              <span className="block font-bold text-cyan-400 text-sm mb-1">حل الواجبات</span>
              تسليم جميع واجبات المحاضرات في مواعيدها المحددة.
            </div>
            <div className="p-3 bg-[#060a16] border border-slate-800 rounded-xl">
              <span className="block font-bold text-emerald-400 text-sm mb-1">الشهادات والجوائز</span>
              تكريم رسمي من مستر عمرو السيد وجوائز قيمة للأوائل.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sortedStudents.map((std, index) => {
              const isTop1 = std.rank === 1 || index === 0;
              const isTop2 = std.rank === 2 || index === 1;
              const isTop3 = std.rank === 3 || index === 2;

              return (
                <div
                  key={std.id}
                  className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    isTop1
                      ? 'bg-gradient-to-b from-[#181a33] to-[#0c1224] border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : isTop2
                      ? 'bg-[#0a1428] border-slate-400/50 shadow-md'
                      : isTop3
                      ? 'bg-[#0a1428] border-amber-800/50 shadow-md'
                      : 'bg-[#080d1b] border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isTop1
                            ? 'bg-amber-500 text-slate-950'
                            : isTop2
                            ? 'bg-slate-300 text-slate-950'
                            : isTop3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <Trophy className="w-3 h-3" />
                        <span>المركز {std.rank || index + 1}</span>
                      </span>

                      {isAdminOrSec && (
                        <button
                          onClick={() => deleteHonoredStudent(std.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="حذف من لوحة الشرف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-base shrink-0">
                        <User className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{std.name}</h4>
                        <p className="text-[11px] text-slate-400">{std.governorate}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#050811] rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-sans text-[11px]">الدرجة:</span>
                      <span className="font-bold text-cyan-400">
                        {std.score} / {std.maxScore} ({std.percentage}%)
                      </span>
                    </div>

                    {std.badge && (
                      <p className="text-[11px] font-medium text-amber-300 text-center bg-amber-500/10 py-1 rounded-lg border border-amber-500/20">
                        {std.badge}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 text-center">
                    معتمدة من مستر عمرو السيد · دفعة 2026
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
