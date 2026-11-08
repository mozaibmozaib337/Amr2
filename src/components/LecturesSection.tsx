import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  PlaySquare,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  ArrowLeft,
  PlusCircle,
  BookOpen,
  Gift,
  Flame,
  Play,
  Info,
} from 'lucide-react';

export const LecturesSection: React.FC = () => {
  const {
    lectures,
    activeGrade,
    setActiveVideo,
    setSelectedCourseForDetails,
    hasAccessToLecture,
    currentUser,
    setIsAdminPanelOpen,
  } = usePlatform();

  const [courseFilter, setCourseFilter] = useState<'all' | 'free' | 'paid'>('all');

  const studentGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;
  const gradeLectures = lectures.filter((lec) => {
    if (studentGrade === 'all') return true;
    return lec.grade === studentGrade;
  });

  const freeLectures = gradeLectures.filter((l) => l.isFree || l.price === 0);
  const paidLectures = gradeLectures.filter((l) => !l.isFree && l.price > 0);

  const displayedLectures =
    courseFilter === 'free'
      ? freeLectures
      : courseFilter === 'paid'
      ? paidLectures
      : gradeLectures;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'secretary';

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="p-6 bg-[#091224] border border-cyan-900/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-cyan-400" />
            <span>المحاضرات والكورسات التعليمية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            قسم مخصص للمحاضرات المجانية المفتوحة للجميع، والمحاضرات المدفوعة المتاحة بالاشتراك أو بتصريح المعلم (هاتف + كود).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة محاضرة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Free vs Paid Filter Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-[#060b18] p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setCourseFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              courseFilter === 'all'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            جميع الكورسات
          </button>
          <button
            onClick={() => setCourseFilter('free')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              courseFilter === 'free'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>المحاضرات المجانية</span>
          </button>
          <button
            onClick={() => setCourseFilter('paid')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              courseFilter === 'paid'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>الكورسات المدفوعة</span>
          </button>
        </div>
      </div>

      {/* Lectures Grid */}
      {displayedLectures.length === 0 ? (
        <div className="p-12 bg-[#091224] border border-slate-800/80 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">لا توجد محاضرات في هذا القسم حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            سيقوم مستر عمرو السيد برفع محاضرات هذا القسم قريباً.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedLectures.map((lec) => {
            const isUnlocked = hasAccessToLecture(lec.id);
            const isFreeCourse = lec.isFree || lec.price === 0;
            const canPlayDirectly = isUnlocked || isFreeCourse || isAdmin;

            const handleCardClick = () => {
              if (canPlayDirectly) {
                setActiveVideo(lec);
              } else {
                setSelectedCourseForDetails(lec);
              }
            };

            return (
              <div
                key={lec.id}
                onClick={handleCardClick}
                className={`bg-[#091224] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg cursor-pointer group ${
                  isFreeCourse
                    ? 'border-emerald-900/60 hover:border-emerald-500/60 hover:shadow-emerald-900/20'
                    : 'border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-900/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
                      {lec.chapterTitle}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      {isFreeCourse ? (
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                          <Gift className="w-3.5 h-3.5" />
                          مجاني
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                          <Unlock className="w-3.5 h-3.5" />
                          مفتوح لك
                        </span>
                      ) : (
                        <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          مدفوع ({lec.price} ج.م)
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {lec.title}
                  </h3>

                  {/* Course Description */}
                  <div className="bg-[#060b18] p-3 rounded-xl border border-slate-800/60">
                    <p className="text-[11px] font-medium text-cyan-400/90 mb-1">وصف الكورس:</p>
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {lec.description || 'انقر لتشغيل المحاضرة فورا أو الاطلاع على كامل المحتوى والمذكرات.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lec.durationMinutes} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-white font-bold">
                      {isFreeCourse ? (
                        <span className="text-emerald-400">مجاني 100%</span>
                      ) : (
                        <span>{lec.price} ج.م</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourseForDetails(lec);
                    }}
                    className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>التفاصيل</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canPlayDirectly) {
                        setActiveVideo(lec);
                      } else {
                        setSelectedCourseForDetails(lec);
                      }
                    }}
                    className={`font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      canPlayDirectly
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
                        : 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{canPlayDirectly ? 'تشغيل فوري' : 'خيارات الدخول'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
