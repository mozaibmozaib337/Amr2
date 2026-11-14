import React, { useMemo, useState } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  FolderOpen,
  FileText,
  Eye,
  Sparkles,
  Search,
  UploadCloud,
  PlusCircle,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  X,
  FileCheck2,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  Lock,
  ExternalLink,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import { UniversalPlusUploader } from './UniversalPlusUploader';
import { parseDriveUrl } from '../utils/linkParser';
import { getCourseLessons } from '../utils/courseCovers';
import { openExternalSafe } from '../utils/safeExternalLink';
import { CourseLesson, FileDocument, GradeLevel, Lecture, LessonSubSection } from '../types';

export const FilesSection: React.FC = () => {
  const {
    files,
    lectures,
    activeGrade,
    setActiveDocument,
    currentUser,
    setIsLoginModalOpen,
    addFile,
    deleteFile,
    hasAccessToLecture,
    setSelectedCourseForDetails,
  } = usePlatform();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'accordion' | 'grid'>('accordion');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null);

  // Quick Verified Document Submission Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('مذكرات الشرح');
  const [docLessonTitle, setDocLessonTitle] = useState('');
  const [docCourseId, setDocCourseId] = useState('');
  const [docGrade, setDocGrade] = useState<GradeLevel>(activeGrade === 'all' ? 'sec3' : activeGrade);
  const [docDescription, setDocDescription] = useState('');
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strict Grade Isolation: if student is logged in, show only their grade
  const targetGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;

  const isTeacherOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const categories = useMemo(
    () => Array.from(new Set(files.map((f) => f.category))).filter(Boolean),
    [files]
  );

  const filteredFiles = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return files.filter((f) => {
      const matchesGrade = targetGrade === 'all' || f.grade === targetGrade;
      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
      const matchesSearch =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.lessonTitle || '').toLowerCase().includes(q);
      return matchesGrade && matchesCategory && matchesSearch;
    });
  }, [files, targetGrade, selectedCategory, searchTerm]);

  // Group standalone/library files by Lesson Title (or Category if no lessonTitle)
  const groupedLibraryFiles = useMemo(() => {
    const map = new Map<string, FileDocument[]>();
    filteredFiles.forEach((f) => {
      const groupKey = (f.lessonTitle && f.lessonTitle.trim()) || f.category || 'مذكرات وملفات عامة';
      const arr = map.get(groupKey) || [];
      arr.push(f);
      map.set(groupKey, arr);
    });
    return Array.from(map.entries()).map(([groupTitle, items]) => ({
      id: `lib_${groupTitle}`,
      groupTitle,
      items,
    }));
  }, [filteredFiles]);

  // Extract structured Course Lessons that have attached PDFs, reference links, or linked files
  const courseLessonDocumentGroups = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const groups: {
      id: string;
      course: Lecture;
      lesson: CourseLesson;
      docSubs: LessonSubSection[];
    }[] = [];

    lectures
      .filter((lec) => targetGrade === 'all' || lec.grade === targetGrade)
      .forEach((course) => {
        const lessons = getCourseLessons(course);
        lessons.forEach((lesson) => {
          const docSubs = lesson.subSections.filter((sub) => {
            const isDocKind =
              sub.kind === 'pdf' ||
              sub.kind === 'link' ||
              (sub.kind === 'homework' && Boolean(sub.fileUrl));
            if (!isDocKind) return false;
            if (selectedCategory !== 'all' && !sub.title.includes(selectedCategory)) {
              return false;
            }
            if (!q) return true;
            return (
              sub.title.toLowerCase().includes(q) ||
              lesson.title.toLowerCase().includes(q) ||
              course.title.toLowerCase().includes(q)
            );
          });

          if (docSubs.length > 0) {
            groups.push({
              id: `course_${course.id}_lesson_${lesson.id}`,
              course,
              lesson,
              docSubs,
            });
          }
        });
      });

    return groups;
  }, [lectures, targetGrade, searchTerm, selectedCategory]);

  const isGroupExpanded = (groupId: string, index: number) => {
    if (searchTerm.trim()) return true;
    if (groupId in expandedGroups) return expandedGroups[groupId];
    return index === 0;
  };

  const toggleGroup = (groupId: string, defaultOpen: boolean) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !(groupId in prev ? prev[groupId] : defaultOpen),
    }));
  };

  const handleVerifyDocLink = () => {
    if (!quickUrl.trim()) {
      setFormNotice({ type: 'error', message: '⚠️ برجاء كتابة رابط Google Drive أولاً.' });
      return;
    }
    setFormNotice(null);
    const parsed = parseDriveUrl(quickUrl);
    if (!parsed.isValid) {
      setFormNotice({
        type: 'error',
        message: '⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط Google Drive صحيح (/file/d/ID أو ?id=ID أو /open?id=ID).',
      });
      return;
    }

    setFormNotice({
      type: 'success',
      message: `✅ تم التحقق من رابط Google Drive بنجاح! معرّف الملف: (${parsed.id})`,
    });
    if (!docTitle.trim()) {
      setDocTitle(`مذكرة كيمياء - ملف ${parsed.id.slice(0, 8)}`);
    }
  };

  const handleSubmitVerifiedDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !quickUrl.trim()) {
      setFormNotice({ type: 'error', message: '⚠️ برجاء إكمال العنوان والرابط.' });
      return;
    }

    const parsed = parseDriveUrl(quickUrl);
    if (!parsed.isValid) {
      setFormNotice({
        type: 'error',
        message: '⚠️ الرابط المدخل ليس رابط Google Drive صالح (فقط Google Drive مدعوم للملفات والمذكرات).',
      });
      return;
    }

    setIsSubmitting(true);
    setFormNotice(null);

    try {
      const res = await addFile({
        title: docTitle.trim(),
        category: docCategory.trim() || 'مذكرات الشرح',
        lessonTitle: docLessonTitle.trim() || undefined,
        courseId: docCourseId || undefined,
        grade: docGrade,
        fileUrl: parsed.previewUrl,
        fileName: `${docTitle.trim()}.pdf`,
        fileType: 'pdf',
        sizeMb: 5.0,
        description:
          docDescription ||
          `مذكرة كيمياء معتمدة من Google Drive مرفوعة بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
        provider: 'drive',
        external_id: parsed.id,
        original_url: quickUrl.trim(),
      });

      if (res && !res.success) {
        const errorMsg = res.errorMessage || 'فشل الحفظ في قاعدة البيانات Supabase';
        setFormNotice({ type: 'error', message: `❌ خطأ Supabase: ${errorMsg}` });
      } else {
        setFormNotice({ type: 'success', message: '⚡ تم حفظ المذكرة بنجاح في قاعدة البيانات Supabase!' });
        setTimeout(() => {
          setShowQuickAddModal(false);
          setQuickUrl('');
          setDocTitle('');
          setDocLessonTitle('');
          setDocCourseId('');
          setDocDescription('');
          setFormNotice(null);
        }, 1000);
      }
    } catch (err: any) {
      setFormNotice({ type: 'error', message: `❌ حدث خطأ غير متوقع: ${err?.message || err}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'مذكرة_كيمياء_مستر_عمرو_السيد.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenCourseSubDoc = (course: Lecture, lesson: CourseLesson, sub: LessonSubSection) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const canAccess = isTeacherOrSec || Boolean(course.isFree || course.price === 0) || hasAccessToLecture(course.id);
    if (!canAccess) {
      setSelectedCourseForDetails(course);
      return;
    }

    if (sub.fileUrl) {
      const parsedDrive = parseDriveUrl(sub.fileUrl);
      setActiveDocument({
        title: `${lesson.title} — ${sub.title}`,
        fileUrl: parsedDrive.isValid ? parsedDrive.previewUrl : sub.fileUrl,
        fileName: sub.fileName || `${sub.title}.pdf`,
        fileType: 'pdf',
      });
      return;
    }

    if (sub.externalUrl) {
      openExternalSafe(sub.externalUrl);
    }
  };

  const renderFileCard = (file: FileDocument) => (
    <div
      key={file.id}
      className="bg-[#091224] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-md group"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-md border border-cyan-800/40 truncate">
            {file.category}
          </span>
          <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{file.dateAdded}</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            {file.lessonTitle && (
              <p className="text-[11px] font-bold text-amber-300 mb-0.5 truncate">
                {file.lessonTitle}
              </p>
            )}
            <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug">
              {file.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {file.description || 'مذكرة كيمياء معتمدة لمنصة مستر عمرو السيد.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              setIsLoginModalOpen(true);
              return;
            }
            if (file.courseId) {
              const linkedCourse = lectures.find((l) => l.id === file.courseId);
              const isFreeLinked = Boolean(linkedCourse?.isFree || linkedCourse?.price === 0);
              if (linkedCourse && !isTeacherOrSec && !isFreeLinked && !hasAccessToLecture(linkedCourse.id)) {
                setSelectedCourseForDetails(linkedCourse);
                return;
              }
            }
            setActiveDocument({
              title: file.title,
              fileUrl: file.fileUrl,
              fileName: file.fileName,
              fileType: file.fileType,
            });
          }}
          className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>عرض في المشغل المدمج</span>
        </button>

        {currentUser ? (
          <button
            type="button"
            onClick={() => handleDownload(file.fileUrl, file.fileName)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
            title="تحميل المذكرة إلى جهازك"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="p-2 bg-slate-800/60 text-slate-400 hover:text-cyan-400 rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title="سجل دخولك لتحميل المذكرة"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {isTeacherOrSec && (
          confirmDeleteFileId === file.id ? (
            <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/60 px-2 py-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  deleteFile(file.id);
                  setConfirmDeleteFileId(null);
                }}
                className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded cursor-pointer"
              >
                حذف
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteFileId(null)}
                className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteFileId(file.id)}
              className="p-2 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-800/40 transition-colors cursor-pointer"
              title="حذف الملف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );

  const hasAnyAccordionContent =
    courseLessonDocumentGroups.length > 0 || groupedLibraryFiles.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 bg-[#091224] border border-cyan-900/30 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <span>الملفات والمذكرات والملازم المعتمدة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تصفح المذكرات والكتب الخارجية مرتبة بنفس هيكل الدروس والأقسام الفرعية المنسدلة أو كبطاقات سريعة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Unified Hierarchical Accordion vs Grid */}
          <div className="flex items-center bg-[#060b18] border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('accordion')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'accordion'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>دروس وأقسام منسدلة</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>شبكة سريعة</span>
            </button>
          </div>

          {isTeacherOrSec && (
            <button
              type="button"
              onClick={() => setShowQuickAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة مذكرة أو قسم كتاب</span>
            </button>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الدرس أو المذكرة..."
              className="w-full bg-[#060b18] border border-slate-700/80 rounded-xl px-3 py-2 ps-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Quick Verified Add Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091224] border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-7 w-full max-w-xl space-y-5 shadow-2xl relative animate-scale-in">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                <FileCheck2 className="w-5 h-5 text-cyan-400" />
                <span>إضافة مذكرة / كتاب داخل درس (فحص فوري)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleSubmitVerifiedDoc} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 block">
                  رابط Google Drive (/file/d/ID أو ?id=ID أو /open?id=ID):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={quickUrl}
                      onChange={(e) => setQuickUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full p-2.5 ps-8 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white font-mono focus:outline-none"
                    />
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyDocLink}
                    disabled={!quickUrl.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأكيد وفحص</span>
                  </button>
                </div>
              </div>

              {formNotice && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    formNotice.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                      : 'bg-red-950/60 border-red-600/50 text-red-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{formNotice.message}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">عنوان المذكرة أو المستند:</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="مثال: مذكرة الباب الأول - العناصر الانتقالية"
                    className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">القسم الفرعي / التصنيف:</label>
                    <input
                      type="text"
                      list="quick-doc-category-presets"
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      placeholder="مثال: حل كتاب مندليف، مذكرات الشرح..."
                      className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <datalist id="quick-doc-category-presets">
                      <option value="مذكرات الشرح" />
                      <option value="حل كتاب مندليف" />
                      <option value="حل كتاب الامتحان" />
                      <option value="ما ورد في امتحانات ثانوية عامة" />
                      <option value="مذكرات المراجعة" />
                      <option value="نماذج امتحانات" />
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">الدرس / المحاضرة التابعة لها:</label>
                    <input
                      type="text"
                      value={docLessonTitle}
                      onChange={(e) => setDocLessonTitle(e.target.value)}
                      placeholder="مثال: الدرس الأول: العناصر الانتقالية"
                      className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">ربط بكورس معين (اختياري):</label>
                    <select
                      value={docCourseId}
                      onChange={(e) => setDocCourseId(e.target.value)}
                      className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="">ملف عام في المكتبة</option>
                      {lectures.map((lec) => (
                        <option key={lec.id} value={lec.id}>
                          {lec.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">الصف الدراسي:</label>
                    <select
                      value={docGrade}
                      onChange={(e) => setDocGrade(e.target.value as GradeLevel)}
                      className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="sec1">الصف الأول الثانوي</option>
                      <option value="sec2">الصف الثاني الثانوي</option>
                      <option value="sec3">الصف الثالث الثانوي</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">الوصف أو الملاحظات:</label>
                  <textarea
                    rows={2}
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    placeholder="وصف مختصر للمذكرة أو محتواها..."
                    className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !docTitle.trim() || !quickUrl.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      <span>حفظ المذكرة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Plus Uploader (+) for Teacher & Secretary */}
      {isTeacherOrSec && (
        <div className="p-5 bg-[#091224] border border-cyan-800/40 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>رفع الفيديوهات والمذكرات المباشر للسيرفر وقاعدة البيانات (+)</span>
          </div>
          <UniversalPlusUploader defaultCategory="مذكرات الشرح" />
        </div>
      )}

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#091224] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            جميع الأقسام
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#091224] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      {viewMode === 'accordion' ? (
        !hasAnyAccordionContent ? (
          <div className="p-12 bg-[#091224] border border-slate-800 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">لا توجد ملفات أو مذكرات مرفوعة لهذا الصف حالياً</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              سيقوم مستر عمرو السيد بإضافة المذكرات وملفات الكتب والدروس الخاصة بصفك فور تجهيزها.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section A: Structured Course Lesson Sub-Sections containing PDFs / Files / Books */}
            {courseLessonDocumentGroups.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>ملفات ومذكرات محاضرات الكورسات ({courseLessonDocumentGroups.length})</span>
                </h3>

                <div className="space-y-3">
                  {courseLessonDocumentGroups.map((group, idx) => {
                    const isExpanded = isGroupExpanded(group.id, idx);
                    const canAccess =
                      isTeacherOrSec ||
                      Boolean(group.course.isFree || group.course.price === 0) ||
                      hasAccessToLecture(group.course.id);

                    return (
                      <div
                        key={group.id}
                        className="bg-[#091224] border border-slate-800 rounded-2xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id, idx === 0)}
                          className="w-full px-5 py-4 flex items-center justify-between gap-4 text-right hover:bg-slate-800/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate">
                                {group.lesson.title}
                              </h4>
                              <p className="text-[11px] text-cyan-400 truncate mt-0.5">
                                الكورس: {group.course.title}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-[#050811] border border-slate-700 text-[11px] font-semibold text-slate-300 tabular-nums">
                              {group.docSubs.length} ملفات / أقسام
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-2.5 bg-[#060b18]/60">
                            {group.docSubs.map((sub) => (
                              <div
                                key={sub.id}
                                onClick={() => handleOpenCourseSubDoc(group.course, group.lesson, sub)}
                                className="p-3.5 rounded-xl bg-[#091224] border border-slate-800 hover:border-cyan-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl border border-blue-700/40 bg-blue-950/60 text-blue-400 flex items-center justify-center shrink-0">
                                    {sub.kind === 'link' ? (
                                      <ExternalLink className="w-4 h-4" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                                      {sub.title}
                                    </h5>
                                    {sub.notes && (
                                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                        {sub.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCourseSubDoc(group.course, group.lesson, sub);
                                  }}
                                  className={`min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                                    canAccess
                                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                      : 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                                  }`}
                                >
                                  {canAccess ? (
                                    <>
                                      <Eye className="w-4 h-4 shrink-0" />
                                      <span>{sub.kind === 'link' ? 'فتح المرجع' : 'عرض الملف'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-4 h-4 shrink-0" />
                                      <span>اشترك للفتح</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section B: Categorized / Lesson-Grouped Library Files Accordion */}
            {groupedLibraryFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>مكتبة المذكرات والكتب حسب الدروس والأقسام ({filteredFiles.length})</span>
                </h3>

                <div className="space-y-3">
                  {groupedLibraryFiles.map((group, idx) => {
                    const isExpanded = isGroupExpanded(group.id, idx);
                    return (
                      <div
                        key={group.id}
                        className="bg-[#091224] border border-slate-800 rounded-2xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id, idx === 0)}
                          className="w-full px-5 py-4 flex items-center justify-between gap-4 text-right hover:bg-slate-800/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                {group.groupTitle}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                اضغط لعرض الملفات والمذكرات المدرجة تحت هذا الدرس / القسم
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-[#050811] border border-slate-700 text-[11px] font-semibold text-slate-300 tabular-nums">
                              {group.items.length} ملفات
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 bg-[#060b18]/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.items.map(renderFileCard)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      ) : filteredFiles.length === 0 ? (
        <div className="p-12 bg-[#091224] border border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">لا توجد ملفات أو مذكرات مرفوعة لهذا الصف حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            سيقوم مستر عمرو السيد بإضافة المذكرات والملخصات الخاصة بصفك الدراسي فور تجهيزها.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(renderFileCard)}
        </div>
      )}
    </div>
  );
};
