import React, { useState } from 'react';
import {
  Layers,
  PlusCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Video,
  FileText,
  BookCheck,
  FileCheck2,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  CourseLesson,
  Lecture,
  LessonSectionKind,
  LessonSubSection,
} from '../types';
import {
  COURSE_COVER_PRESETS,
  OPTIONAL_SUBSECTION_PRESETS,
  STARTER_DEFAULT_SUBSECTIONS,
  createStarterLesson,
  createSubSectionFromTemplate,
} from '../utils/courseCovers';
import { parseDriveUrl, parseVideoUrl } from '../utils/linkParser';
import { usePlatform } from '../context/PlatformContext';

interface CourseCurriculumManagerProps {
  course: Partial<Lecture>;
  onChange: (updatedFields: Partial<Lecture>) => void;
}

export const CourseCurriculumManager: React.FC<CourseCurriculumManagerProps> = ({
  course,
  onChange,
}) => {
  const { exams, homeworks, files } = usePlatform();

  const lessons: CourseLesson[] = Array.isArray(course.lessons) ? course.lessons : [];
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    if (lessons[0]) map[lessons[0].id] = true;
    return map;
  });
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [customSubInputs, setCustomSubInputs] = useState<
    Record<string, { title: string; kind: LessonSectionKind }>
  >({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const flashNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const setLessons = (nextLessons: CourseLesson[]) => {
    onChange({
      lessons: nextLessons.map((l, i) => ({ ...l, order: i + 1 })),
    });
  };

  const uploadFileToServer = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.url || null;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey('cover');
    try {
      const url = await uploadFileToServer(file);
      if (url) {
        onChange({ coverImageUrl: url });
        flashNotice('تم رفع صورة غلاف الكورس بنجاح.');
      }
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubFileUpload = async (
    lessonId: string,
    subId: string,
    kind: LessonSectionKind,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(subId);
    try {
      const url = await uploadFileToServer(file);
      if (url) {
        updateSubSection(lessonId, subId, {
          ...(kind === 'video' ? { videoUrl: url } : { fileUrl: url, fileName: file.name }),
        });
        flashNotice(`تم رفع الملف (${file.name}) وربطه بالقسم بنجاح.`);
      }
    } finally {
      setUploadingKey(null);
    }
  };

  const handleAddLesson = () => {
    const nextIdx = lessons.length + 1;
    const created = createStarterLesson(
      nextIdx,
      newLessonTitle.trim() || `المحاضرة ${nextIdx}: محاضرة جديدة`
    );
    const updated = [...lessons, created];
    setLessons(updated);
    setExpandedLessons((prev) => ({ ...prev, [created.id]: true }));
    setNewLessonTitle('');
    flashNotice(`تمت إضافة (${created.title}) مع الأقسام الافتراضية.`);
  };

  const handleRemoveLesson = (lessonId: string) => {
    setLessons(lessons.filter((l) => l.id !== lessonId));
  };

  const handleMoveLesson = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;
    const copy = [...lessons];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setLessons(copy);
  };

  const updateLesson = (lessonId: string, patch: Partial<CourseLesson>) => {
    setLessons(lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)));
  };

  const addSubSectionToLesson = (lessonId: string, sub: LessonSubSection) => {
    setLessons(
      lessons.map((l) =>
        l.id === lessonId ? { ...l, subSections: [...l.subSections, sub] } : l
      )
    );
  };

  const updateSubSection = (
    lessonId: string,
    subId: string,
    patch: Partial<LessonSubSection>
  ) => {
    setLessons(
      lessons.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              subSections: l.subSections.map((s) =>
                s.id === subId ? { ...s, ...patch } : s
              ),
            }
          : l
      )
    );
  };

  const removeSubSection = (lessonId: string, subId: string) => {
    setLessons(
      lessons.map((l) =>
        l.id === lessonId
          ? { ...l, subSections: l.subSections.filter((s) => s.id !== subId) }
          : l
      )
    );
  };

  const moveSubSection = (lessonId: string, subIndex: number, direction: -1 | 1) => {
    setLessons(
      lessons.map((l) => {
        if (l.id !== lessonId) return l;
        const target = subIndex + direction;
        if (target < 0 || target >= l.subSections.length) return l;
        const nextSubs = [...l.subSections];
        const [removed] = nextSubs.splice(subIndex, 1);
        nextSubs.splice(target, 0, removed);
        return { ...l, subSections: nextSubs };
      })
    );
  };

  const handleAddCustomSubSection = (lessonId: string) => {
    const draft = customSubInputs[lessonId] || { title: '', kind: 'video' as LessonSectionKind };
    const cleanTitle = draft.title.trim();
    if (!cleanTitle) {
      flashNotice('اكتب اسم القسم الفرعي أولاً (مثال: حل كتاب مندليف).');
      return;
    }
    const newSub: LessonSubSection = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      kind: draft.kind,
    };
    addSubSectionToLesson(lessonId, newSub);
    setCustomSubInputs((prev) => ({
      ...prev,
      [lessonId]: { title: '', kind: draft.kind },
    }));
  };

  const kindOptions: { value: LessonSectionKind; label: string }[] = [
    { value: 'video', label: 'فيديو شرح (YouTube / Drive / ملف)' },
    { value: 'pdf', label: 'مذكرة / ملف PDF' },
    { value: 'homework', label: 'واجب / شيت' },
    { value: 'exam', label: 'امتحان إلكتروني' },
    { value: 'link', label: 'رابط خارجي / مرجع' },
  ];

  const getKindIcon = (kind: LessonSectionKind) => {
    switch (kind) {
      case 'video':
        return <Video className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'homework':
        return <BookCheck className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'exam':
        return <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <ExternalLink className="w-4 h-4 text-violet-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {statusNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Course Metadata: Cover, Schedule, Instructions */}
      <div className="p-4 rounded-2xl bg-[#050811] border border-cyan-900/40 space-y-3.5">
        <h4 className="font-bold text-cyan-300 flex items-center gap-2 text-xs">
          <ImageIcon className="w-4 h-4" />
          <span>صورة غلاف الكورس والمواعيد والتعليمات</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COURSE_COVER_PRESETS.map((preset) => {
            const isSelected = course.coverImageUrl === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ coverImageUrl: preset.url })}
                className={`rounded-xl overflow-hidden border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-full h-16 object-cover"
                />
                <div className="p-1.5 text-[10px] font-bold text-slate-200 truncate">
                  {preset.label}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={course.coverImageUrl || ''}
            onChange={(e) => onChange({ coverImageUrl: e.target.value })}
            placeholder="أو الصق رابط صورة غلاف مخصصة..."
            className="flex-1 min-w-[200px] bg-[#080d1b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            dir="ltr"
          />
          <label className="px-3 py-2 rounded-xl bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/60 font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingKey === 'cover' ? 'جاري الرفع...' : 'رفع صورة غلاف'}</span>
            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              مواعيد الكورس / الجدول (اختياري)
            </label>
            <input
              type="text"
              value={course.scheduleText || ''}
              onChange={(e) => onChange({ scheduleText: e.target.value })}
              placeholder="مثال: كل أحد وأربعاء الساعة 6 مساءً"
              className="w-full bg-[#080d1b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              تعليمات هامة للطالب داخل الكورس (اختياري)
            </label>
            <input
              type="text"
              value={course.instructions || ''}
              onChange={(e) => onChange({ instructions: e.target.value })}
              placeholder="مثال: لا تنتقل للاختبار قبل حل واجب المحاضرة..."
              className="w-full bg-[#080d1b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Hierarchical Lessons & Sub-Sections CRUD Builder */}
      <div className="p-4 rounded-2xl bg-[#050811] border border-cyan-900/40 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-extrabold text-white flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>محاضرات الكورس والأقسام الفرعية ({lessons.length})</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              كل محاضرة تمتلك أقسامها المستقلة بالكامل: عدّل الأسماء أو احذف أو أضف أقساماً جديدة (مثل حل كتاب مندليف / الامتحان) بحرية تامة.
            </p>
          </div>
        </div>

        {/* Add New Lesson Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            placeholder={`اكتب عنوان المحاضرة الجديدة (مثال: المحاضرة ${lessons.length + 1}: سبائك الحديد)`}
            className="flex-1 bg-[#080d1b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={handleAddLesson}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة محاضرة داخل الكورس</span>
          </button>
        </div>

        {/* Lessons List */}
        {lessons.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#080d1b] border border-dashed border-slate-700 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-cyan-400 mx-auto" />
            <p className="text-xs font-bold text-slate-200">
              لم تضف محاضرات مفصلة لهذا الكورس بعد
            </p>
            <p className="text-[11px] text-slate-400">
              اضغط "إضافة محاضرة داخل الكورس" بالأعلى لإنشاء محاضرة متكاملة بأقسامها (شرح المحاضرة، تسليم الواجب، الاختبار التفاعلي، الكتب والمذكرات).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, lIndex) => {
              const isExpanded = Boolean(expandedLessons[lesson.id]);
              const customDraft = customSubInputs[lesson.id] || {
                title: '',
                kind: 'video' as LessonSectionKind,
              };

              return (
                <div
                  key={lesson.id}
                  className="rounded-2xl bg-[#091224] border border-slate-700/80 overflow-hidden"
                >
                  {/* Lesson Header */}
                  <div className="p-3.5 bg-[#080d1b] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                      <span className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {lIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                        className="flex-1 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lIndex, -1)}
                        disabled={lIndex === 0}
                        title="تحريك لأعلى"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lIndex, 1)}
                        disabled={lIndex === lessons.length - 1}
                        title="تحريك لأسفل"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLessons((prev) => ({
                            ...prev,
                            [lesson.id]: !prev[lesson.id],
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>الأقسام ({lesson.subSections.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLesson(lesson.id)}
                        title="حذف هذه المحاضرة بالكامل"
                        className="p-1.5 rounded-lg bg-red-950/50 border border-red-800/40 text-red-400 hover:bg-red-900/50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lesson Expanded Sub-Sections Editor */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-slate-800">
                      <div>
                        <input
                          type="text"
                          value={lesson.description || ''}
                          onChange={(e) =>
                            updateLesson(lesson.id, { description: e.target.value })
                          }
                          placeholder="وصف مختصر للمحاضرة (اختياري)..."
                          className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Quick Preset Pills to Re-add Default or Optional Sections */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400">
                          إضافة سريعة لأقسام جاهزة داخل هذه المحاضرة فقط:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[...STARTER_DEFAULT_SUBSECTIONS, ...OPTIONAL_SUBSECTION_PRESETS].map(
                            (tpl) => (
                              <button
                                key={tpl.key}
                                type="button"
                                onClick={() =>
                                  addSubSectionToLesson(
                                    lesson.id,
                                    createSubSectionFromTemplate(tpl)
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#050811] border border-cyan-900/50 hover:border-cyan-400 text-[11px] font-semibold text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{tpl.title}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Existing Sub-Sections List (Full Inline Rename + Kind + Binding + Delete) */}
                      <div className="space-y-2.5">
                        {lesson.subSections.map((sub, sIndex) => (
                          <div
                            key={sub.id}
                            className="p-3 rounded-xl bg-[#050811] border border-slate-700/80 space-y-2.5"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              {getKindIcon(sub.kind)}
                              <span className="text-[10px] font-mono text-slate-500">
                                #{sIndex + 1}
                              </span>
                              <input
                                type="text"
                                value={sub.title}
                                onChange={(e) =>
                                  updateSubSection(lesson.id, sub.id, {
                                    title: e.target.value,
                                  })
                                }
                                placeholder="اسم القسم الفرعي (قابل للتعديل بالكامل)"
                                className="flex-1 min-w-[160px] bg-[#080d1b] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
                              />
                              <select
                                value={sub.kind}
                                onChange={(e) =>
                                  updateSubSection(lesson.id, sub.id, {
                                    kind: e.target.value as LessonSectionKind,
                                  })
                                }
                                className="bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 focus:outline-none focus:border-cyan-400"
                              >
                                {kindOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => moveSubSection(lesson.id, sIndex, -1)}
                                disabled={sIndex === 0}
                                title="تحريك القسم لأعلى"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer shrink-0"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSubSection(lesson.id, sIndex, 1)}
                                disabled={sIndex === lesson.subSections.length - 1}
                                title="تحريك القسم لأسفل"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer shrink-0"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSubSection(lesson.id, sub.id)}
                                title="حذف هذا القسم الفرعي"
                                className="p-1.5 rounded-lg bg-red-950/50 border border-red-800/40 text-red-400 hover:bg-red-900/50 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Dynamic Binding Inputs by Section Kind */}
                            {sub.kind === 'video' && (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={sub.videoUrl || ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const parsed = parseVideoUrl(raw);
                                    updateSubSection(lesson.id, sub.id, {
                                      videoUrl: parsed.isValid ? parsed.embedUrl : raw,
                                    });
                                  }}
                                  placeholder="رابط فيديو YouTube أو Google Drive أو مسار مرفوع..."
                                  className="flex-1 min-w-[200px] bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-cyan-400"
                                  dir="ltr"
                                />
                                <label className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-bold cursor-pointer flex items-center gap-1 shrink-0">
                                  <Upload className="w-3 h-3" />
                                  <span>
                                    {uploadingKey === sub.id ? 'جاري الرفع...' : 'رفع فيديو'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) =>
                                      handleSubFileUpload(lesson.id, sub.id, 'video', e)
                                    }
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}

                            {sub.kind === 'pdf' && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={sub.fileUrl || ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parsed = parseDriveUrl(raw);
                                      updateSubSection(lesson.id, sub.id, {
                                        fileUrl: parsed.isValid ? parsed.previewUrl : raw,
                                      });
                                    }}
                                    placeholder="رابط ملف PDF / Google Drive أو اختر من المذكرات..."
                                    className="flex-1 min-w-[200px] bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-cyan-400"
                                    dir="ltr"
                                  />
                                  <label className="px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-700/40 text-blue-300 font-bold cursor-pointer flex items-center gap-1 shrink-0">
                                    <Upload className="w-3 h-3" />
                                    <span>
                                      {uploadingKey === sub.id ? 'جاري الرفع...' : 'رفع PDF'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,image/*"
                                      onChange={(e) =>
                                        handleSubFileUpload(lesson.id, sub.id, 'pdf', e)
                                      }
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                {files.length > 0 && (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const picked = files.find((f) => f.id === e.target.value);
                                      if (picked) {
                                        updateSubSection(lesson.id, sub.id, {
                                          fileUrl: picked.fileUrl,
                                          fileName: picked.fileName || `${picked.title}.pdf`,
                                        });
                                      }
                                    }}
                                    className="w-full bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300"
                                  >
                                    <option value="">
                                      أو اختر ملفاً مرفوعاً مسبقاً من قسم الملفات والمذكرات...
                                    </option>
                                    {files.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.title} ({f.fileName})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}

                            {sub.kind === 'homework' && (
                              <div className="space-y-2">
                                <select
                                  value={sub.linkedHomeworkId || ''}
                                  onChange={(e) =>
                                    updateSubSection(lesson.id, sub.id, {
                                      linkedHomeworkId: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                                >
                                  <option value="">
                                    -- ربط بواجب أو شيت إلكتروني من المنصة (اختياري) --
                                  </option>
                                  {homeworks.map((hw) => (
                                    <option key={hw.id} value={hw.id}>
                                      {hw.title} ({hw.kind === 'sheet' ? 'شيت' : 'واجب'})
                                    </option>
                                  ))}
                                </select>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={sub.fileUrl || ''}
                                    onChange={(e) =>
                                      updateSubSection(lesson.id, sub.id, {
                                        fileUrl: e.target.value,
                                      })
                                    }
                                    placeholder="أو رابط ملف PDF للواجب..."
                                    className="flex-1 min-w-[180px] bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono"
                                    dir="ltr"
                                  />
                                  <label className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/40 text-amber-300 font-bold cursor-pointer flex items-center gap-1 shrink-0">
                                    <Upload className="w-3 h-3" />
                                    <span>رفع ملف واجب</span>
                                    <input
                                      type="file"
                                      accept=".pdf,image/*,.doc,.docx"
                                      onChange={(e) =>
                                        handleSubFileUpload(lesson.id, sub.id, 'homework', e)
                                      }
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              </div>
                            )}

                            {sub.kind === 'exam' && (
                              <div className="space-y-2">
                                <select
                                  value={sub.linkedExamId || ''}
                                  onChange={(e) =>
                                    updateSubSection(lesson.id, sub.id, {
                                      linkedExamId: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                                >
                                  <option value="">
                                    -- اختر امتحاناً إلكترونياً لربطه بهذا القسم --
                                  </option>
                                  {exams.map((ex) => (
                                    <option key={ex.id} value={ex.id}>
                                      {ex.title} ({ex.questions.length} سؤال)
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={sub.externalUrl || ''}
                                  onChange={(e) =>
                                    updateSubSection(lesson.id, sub.id, {
                                      externalUrl: e.target.value,
                                    })
                                  }
                                  placeholder="أو رابط اختبار خارجي (اختياري)..."
                                  className="w-full bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono"
                                  dir="ltr"
                                />
                              </div>
                            )}

                            {sub.kind === 'link' && (
                              <input
                                type="text"
                                value={sub.externalUrl || ''}
                                onChange={(e) =>
                                  updateSubSection(lesson.id, sub.id, {
                                    externalUrl: e.target.value,
                                  })
                                }
                                placeholder="الرابط الخارجي أو المرجع..."
                                className="w-full bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono"
                                dir="ltr"
                              />
                            )}

                            <input
                              type="text"
                              value={sub.notes || ''}
                              onChange={(e) =>
                                updateSubSection(lesson.id, sub.id, { notes: e.target.value })
                              }
                              placeholder="ملاحظة قصيرة للطالب أسفل هذا القسم (اختياري)..."
                              className="w-full bg-[#080d1b] border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Custom Any-Name Sub-Section Creator */}
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-dashed border-cyan-700/50 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={customDraft.title}
                          onChange={(e) =>
                            setCustomSubInputs((prev) => ({
                              ...prev,
                              [lesson.id]: { ...customDraft, title: e.target.value },
                            }))
                          }
                          placeholder="أضف قسماً فرعياً بأي اسم مخصص (مثال: حل كتاب أفوجادرو)..."
                          className="flex-1 min-w-[200px] bg-[#080d1b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                        <select
                          value={customDraft.kind}
                          onChange={(e) =>
                            setCustomSubInputs((prev) => ({
                              ...prev,
                              [lesson.id]: {
                                ...customDraft,
                                kind: e.target.value as LessonSectionKind,
                              },
                            }))
                          }
                          className="bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          {kindOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddCustomSubSection(lesson.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>إضافة القسم</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
