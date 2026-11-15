import React, { useMemo, useState } from 'react';
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
  AlignRight,
  Save,
  Send,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import {
  CourseLesson,
  Lecture,
  LessonSectionItem,
  LessonSectionKind,
  LessonSubSection,
} from '../types';
import {
  COURSE_COVER_PRESETS,
  buildEmptySectionItem,
  createStarterLesson,
  getSubSectionItems,
} from '../utils/courseCovers';
import { parseDriveUrl, parseVideoUrl } from '../utils/linkParser';
import { usePlatform } from '../context/PlatformContext';
import {
  formatSecondsToHMS,
  probePdfPageCount,
  probeVideoDuration,
  ProgressPayload,
} from '../utils/realUploader';
import { LinkVerificationService } from '../utils/LinkVerificationService';
import {
  SUPABASE_FILES_BUCKET,
  SUPABASE_LECTURES_BUCKET,
  uploadFileToSupabaseDirect,
} from '../utils/supabaseStorage';

interface CourseCurriculumManagerProps {
  course: Partial<Lecture>;
  onChange: (updatedFields: Partial<Lecture>) => void;
  onPublish?: (publishedFields: Partial<Lecture>) => void;
  showPublishBar?: boolean;
}

export const CourseCurriculumManager: React.FC<CourseCurriculumManagerProps> = ({
  course,
  onChange,
  onPublish,
  showPublishBar = true,
}) => {
  const { exams, homeworks, files } = usePlatform();

  // Working draft state lives in `draftLessons` so edits NEVER leak to students (`lessons`) until "حفظ ونشر".
  const lessons: CourseLesson[] = useMemo(() => {
    if (Array.isArray(course.draftLessons)) return course.draftLessons;
    if (Array.isArray(course.lessons)) return course.lessons;
    return [];
  }, [course.draftLessons, course.lessons]);

  const publishedLessons: CourseLesson[] = useMemo(
    () => (Array.isArray(course.lessons) ? course.lessons : []),
    [course.lessons]
  );

  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    if (lessons[0]) map[lessons[0].id] = true;
    return map;
  });
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [customSubInputs, setCustomSubInputs] = useState<
    Record<string, { title: string; kind: LessonSectionKind }>
  >({});
  const [newItemKindDrafts, setNewItemKindDrafts] = useState<Record<string, LessonSectionKind>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [verifyingItemKey, setVerifyingItemKey] = useState<string | null>(null);
  const [uploadProgressState, setUploadProgressState] = useState<{
    key: string;
    fileName: string;
    bucket: string;
    status: 'uploading' | 'completed' | 'error';
    metaText?: string;
    errorMessage?: string;
    progress: ProgressPayload;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // Publish Target Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [selectedPublishLessonIds, setSelectedPublishLessonIds] = useState<Record<string, boolean>>({});
  const [quickLessonInModal, setQuickLessonInModal] = useState('');
  const [sourceCopyLessonId, setSourceCopyLessonId] = useState<string>('');

  const flashNotice = (msg: string) => {
    setErrorNotice(null);
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 5000);
  };

  const flashError = (msg: string) => {
    setStatusNotice(null);
    setErrorNotice(msg);
  };

  const setDraftLessons = (nextLessons: CourseLesson[]) => {
    const normalized = nextLessons.map((l, i) => ({
      ...l,
      order: i + 1,
      subSections: l.subSections.map((s, sIdx) => ({
        ...s,
        order: sIdx + 1,
      })),
    }));
    onChange({
      lessons: normalized,
      draftLessons: normalized,
      isPublished: true,
      lastPublishedAt: new Date().toISOString(),
    });
  };

  const uploadDirectToBucket = async (
    file: File,
    key: string,
    bucket: typeof SUPABASE_FILES_BUCKET | typeof SUPABASE_LECTURES_BUCKET,
    initialMetaText?: string
  ) => {
    setUploadingKey(key);
    setErrorNotice(null);
    let latestMetaText = initialMetaText;
    setUploadProgressState({
      key,
      fileName: file.name,
      bucket,
      status: 'uploading',
      metaText: latestMetaText,
      progress: {
        percent: 0,
        loadedFormatted: '0 B',
        totalFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        speed: 'اتصال مباشر',
        remaining: 'جارِ الحساب...',
        rawLoaded: 0,
        rawTotal: file.size,
      },
    });

    try {
      const result = await uploadFileToSupabaseDirect(file, {
        bucket,
        onProgress: (p) => {
          setUploadProgressState((prev) => ({
            key,
            fileName: file.name,
            bucket,
            status: p.percent >= 100 ? 'completed' : 'uploading',
            metaText: prev?.metaText ?? latestMetaText,
            progress: p,
          }));
        },
      });
      setUploadProgressState((prev) =>
        prev
          ? {
              ...prev,
              status: 'completed',
              progress: { ...prev.progress, percent: 100, speed: 'مكتمل', remaining: '0 ثانية' },
            }
          : null
      );
      return result;
    } catch (err: any) {
      const msg = err?.message || String(err || 'فشل الرفع إلى Supabase Storage');
      setUploadProgressState((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              errorMessage: msg,
            }
          : null
      );
      throw err;
    } finally {
      setUploadingKey(null);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadDirectToBucket(file, 'cover', SUPABASE_FILES_BUCKET);
      onChange({ coverImageUrl: result.url });
      flashNotice(`${result.diagnosticMessage} — تم ربط صورة الغلاف بنجاح.`);
    } catch (err: any) {
      flashError(`فشل رفع صورة الغلاف: ${err?.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleItemFileUpload = async (
    lessonId: string,
    subId: string,
    itemId: string,
    kind: LessonSectionKind,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadKey = `${subId}:${itemId}`;
    const targetBucket =
      kind === 'video' ? SUPABASE_LECTURES_BUCKET : SUPABASE_FILES_BUCKET;
    try {
      let videoProbe: { durationSeconds: number; formatted: string; hms: string } | null = null;
      let pdfPages: number | null = null;
      let metaText: string | undefined;

      if (kind === 'video') {
        videoProbe = await probeVideoDuration(file);
        if (videoProbe.durationSeconds > 0) {
          metaText = `⏱️ المدة: ${videoProbe.hms} (${videoProbe.formatted})`;
        }
      } else {
        pdfPages = await probePdfPageCount(file);
        if (pdfPages && pdfPages > 0) {
          metaText = `📄 عدد الصفحات: ${pdfPages} صفحة`;
        }
      }

      const result = await uploadDirectToBucket(file, uploadKey, targetBucket, metaText);
      if (metaText) {
        setUploadProgressState((prev) => (prev ? { ...prev, metaText } : prev));
      }

      updateSectionItem(lessonId, subId, itemId, {
        ...(kind === 'video'
          ? {
              videoUrl: result.url,
              ...(videoProbe && videoProbe.durationSeconds > 0
                ? {
                    durationSeconds: videoProbe.durationSeconds,
                    durationFormatted: videoProbe.formatted,
                    durationHms: videoProbe.hms,
                  }
                : {}),
            }
          : {
              fileUrl: result.url,
              fileName: file.name,
              ...(pdfPages && pdfPages > 0 ? { pageCount: pdfPages } : {}),
            }),
      });
      flashNotice(
        `${result.diagnosticMessage} (${file.name})${metaText ? ` · ${metaText}` : ''}`
      );
    } catch (err: any) {
      flashError(`فشل رفع (${file.name}): ${err?.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleVerifyItemLink = async (
    lessonId: string,
    subId: string,
    item: LessonSectionItem
  ) => {
    const rawTarget =
      item.kind === 'video'
        ? item.videoUrl || ''
        : item.kind === 'pdf' || item.kind === 'homework'
        ? item.fileUrl || item.externalUrl || ''
        : item.externalUrl || '';

    if (!rawTarget.trim()) {
      flashError('أدخل الرابط أولاً قبل الفحص والتحقق.');
      return;
    }

    const itemKey = `${subId}:${item.id}`;
    setVerifyingItemKey(itemKey);
    try {
      const targetKind = item.kind === 'video' ? 'video' : 'document';
      const meta = await LinkVerificationService.verifyUrl(rawTarget, targetKind);
      if (!meta.isValid) {
        flashError(meta.error || 'الرابط غير صالح أو تعذر التحقق منه.');
        return;
      }

      const patch: Partial<LessonSectionItem> = {};
      if (item.kind === 'video') {
        patch.videoUrl = meta.sanitizedUrl;
        if (meta.durationSeconds && meta.durationSeconds > 0) {
          patch.durationSeconds = meta.durationSeconds;
          patch.durationFormatted = meta.durationFormatted;
          patch.durationHms = meta.durationHms || formatSecondsToHMS(meta.durationSeconds);
        }
      } else if (item.kind === 'pdf' || item.kind === 'homework') {
        if (item.fileUrl) patch.fileUrl = meta.sanitizedUrl;
        else patch.externalUrl = meta.sanitizedUrl;
        if (meta.pageCount && meta.pageCount > 0) {
          patch.pageCount = meta.pageCount;
        }
      } else {
        patch.externalUrl = meta.sanitizedUrl;
        if (meta.pageCount && meta.pageCount > 0) patch.pageCount = meta.pageCount;
        if (meta.durationSeconds && meta.durationSeconds > 0) {
          patch.durationSeconds = meta.durationSeconds;
          patch.durationFormatted = meta.durationFormatted;
          patch.durationHms = meta.durationHms;
        }
      }

      updateSectionItem(lessonId, subId, item.id, patch);
      const summaryParts = ['✅ تم التحقق من الرابط وحفظه في الدرس بنجاح'];
      if (meta.durationHms) summaryParts.push(`⏱️ المدة: ${meta.durationHms}`);
      else if (meta.durationFormatted) summaryParts.push(`⏱️ المدة: ${meta.durationFormatted}`);
      if (meta.pageCount) summaryParts.push(`📄 عدد الصفحات: ${meta.pageCount} صفحة`);
      flashNotice(summaryParts.join(' · '));
    } catch (err: any) {
      flashError(`تعذر فحص الرابط: ${err?.message || err}`);
    } finally {
      setVerifyingItemKey(null);
    }
  };

  // ==================== LESSON CRUD ====================
  const handleAddLesson = () => {
    const nextIdx = lessons.length + 1;
    const created = createStarterLesson(
      nextIdx,
      newLessonTitle.trim() || `الدرس ${nextIdx}: درس جديد`
    );
    const updated = [...lessons, created];
    setDraftLessons(updated);
    setExpandedLessons((prev) => ({ ...prev, [created.id]: true }));
    setNewLessonTitle('');
    flashNotice(`تمت إضافة (${created.title}) للكورس — أضف الأقسام والعناصر التي تريدها بداخله.`);
  };

  const handleRemoveLesson = (lessonId: string) => {
    setDraftLessons(lessons.filter((l) => l.id !== lessonId));
    setConfirmDeleteKey(null);
    flashNotice('تم حذف الدرس من المسودة.');
  };

  const handleMoveLesson = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;
    const copy = [...lessons];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setDraftLessons(copy);
  };

  const updateLesson = (lessonId: string, patch: Partial<CourseLesson>) => {
    setDraftLessons(lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)));
  };

  // ==================== DYNAMIC SUB-SECTION CRUD ====================
  const syncLegacyFieldsFromItems = (
    sub: LessonSubSection,
    nextItems: LessonSectionItem[]
  ): LessonSubSection => {
    const first = nextItems[0];
    return {
      ...sub,
      items: nextItems.map((it, idx) => ({ ...it, order: idx + 1 })),
      videoUrl: first?.videoUrl || undefined,
      fileUrl: first?.fileUrl || undefined,
      fileName: first?.fileName || undefined,
      linkedExamId: first?.linkedExamId || undefined,
      linkedHomeworkId: first?.linkedHomeworkId || undefined,
      externalUrl: first?.externalUrl || undefined,
      textContent: first?.textContent || undefined,
    };
  };

  const handleAddCustomSubSection = (lessonId: string) => {
    const draft = customSubInputs[lessonId] || { title: '', kind: 'video' as LessonSectionKind };
    const cleanTitle = draft.title.trim();
    if (!cleanTitle) {
      flashNotice('اكتب اسم القسم المخصص أولاً (مثال: شرح الدرس، ملف الواجب، حل كتاب خارجي...).');
      return;
    }
    const newSubId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const firstItem = buildEmptySectionItem(draft.kind, 1, cleanTitle);
    const newSub: LessonSubSection = {
      id: newSubId,
      title: cleanTitle,
      kind: draft.kind,
      items: [firstItem],
    };
    setDraftLessons(
      lessons.map((l) =>
        l.id === lessonId ? { ...l, subSections: [...l.subSections, newSub] } : l
      )
    );
    setExpandedSubs((prev) => ({ ...prev, [newSubId]: true }));
    setCustomSubInputs((prev) => ({
      ...prev,
      [lessonId]: { title: '', kind: draft.kind },
    }));
  };

  const updateSubSection = (
    lessonId: string,
    subId: string,
    patch: Partial<LessonSubSection>
  ) => {
    setDraftLessons(
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
    setDraftLessons(
      lessons.map((l) =>
        l.id === lessonId
          ? { ...l, subSections: l.subSections.filter((s) => s.id !== subId) }
          : l
      )
    );
    setConfirmDeleteKey(null);
  };

  const moveSubSection = (lessonId: string, subIndex: number, direction: -1 | 1) => {
    setDraftLessons(
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

  // ==================== MULTI-ITEM CRUD INSIDE SECTION ====================
  const addItemToSubSection = (
    lessonId: string,
    subId: string,
    kindOverride?: LessonSectionKind
  ) => {
    setDraftLessons(
      lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return {
          ...l,
          subSections: l.subSections.map((s) => {
            if (s.id !== subId) return s;
            const currentItems = getSubSectionItems(s);
            const nextKind = kindOverride || newItemKindDrafts[subId] || s.kind;
            const kindLabel = kindOptions.find((k) => k.value === nextKind)?.shortLabel || 'عنصر';
            const nextItem = buildEmptySectionItem(
              nextKind,
              currentItems.length + 1,
              `${kindLabel} ${currentItems.length + 1}`
            );
            return syncLegacyFieldsFromItems(s, [...currentItems, nextItem]);
          }),
        };
      })
    );
    setExpandedSubs((prev) => ({ ...prev, [subId]: true }));
  };

  const updateSectionItem = (
    lessonId: string,
    subId: string,
    itemId: string,
    patch: Partial<LessonSectionItem>
  ) => {
    setDraftLessons(
      lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return {
          ...l,
          subSections: l.subSections.map((s) => {
            if (s.id !== subId) return s;
            const currentItems = getSubSectionItems(s);
            const nextItems = currentItems.map((it) =>
              it.id === itemId ? { ...it, ...patch } : it
            );
            return syncLegacyFieldsFromItems(s, nextItems);
          }),
        };
      })
    );
  };

  const removeSectionItem = (lessonId: string, subId: string, itemId: string) => {
    setDraftLessons(
      lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return {
          ...l,
          subSections: l.subSections.map((s) => {
            if (s.id !== subId) return s;
            const currentItems = getSubSectionItems(s);
            const nextItems = currentItems.filter((it) => it.id !== itemId);
            return syncLegacyFieldsFromItems(s, nextItems);
          }),
        };
      })
    );
    setConfirmDeleteKey(null);
  };

  const moveSectionItem = (
    lessonId: string,
    subId: string,
    itemIndex: number,
    direction: -1 | 1
  ) => {
    setDraftLessons(
      lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return {
          ...l,
          subSections: l.subSections.map((s) => {
            if (s.id !== subId) return s;
            const currentItems = [...getSubSectionItems(s)];
            const target = itemIndex + direction;
            if (target < 0 || target >= currentItems.length) return s;
            const [removed] = currentItems.splice(itemIndex, 1);
            currentItems.splice(target, 0, removed);
            return syncLegacyFieldsFromItems(s, currentItems);
          }),
        };
      })
    );
  };

  // ==================== DRAFT SAVE & PUBLISH TARGET MODAL ====================
  const handleSaveDraftOnly = () => {
    setDraftLessons(lessons);
    flashNotice('تم حفظ كافة التعديلات ومزامنتها داخل الكورس والقاعدة بنجاح.');
  };

  const openPublishModal = () => {
    const selectionMap: Record<string, boolean> = {};
    lessons.forEach((l) => {
      selectionMap[l.id] = true;
    });
    setSelectedPublishLessonIds(selectionMap);
    setSourceCopyLessonId('');
    setQuickLessonInModal('');
    setIsPublishModalOpen(true);
  };

  const handleQuickAddLessonInPublishModal = () => {
    const clean = quickLessonInModal.trim();
    if (!clean) return;
    const nextIdx = lessons.length + 1;
    const created = createStarterLesson(nextIdx, clean);
    const updated = [...lessons, created];
    setDraftLessons(updated);
    setSelectedPublishLessonIds((prev) => ({ ...prev, [created.id]: true }));
    setExpandedLessons((prev) => ({ ...prev, [created.id]: true }));
    setQuickLessonInModal('');
  };

  const handleConfirmPublish = () => {
    const selectedIds = Object.keys(selectedPublishLessonIds).filter(
      (id) => selectedPublishLessonIds[id]
    );
    if (selectedIds.length === 0) {
      flashNotice('اختر درساً واحداً على الأقل لنشر المحتوى فيه.');
      return;
    }

    const sourceTemplateLesson = sourceCopyLessonId
      ? lessons.find((l) => l.id === sourceCopyLessonId)
      : undefined;

    const cloneSubSectionsWithFreshIds = (subs: LessonSubSection[], prefix: string): LessonSubSection[] =>
      subs.map((s, sIdx) => {
        const subItems = getSubSectionItems(s).map((it, iIdx) => ({
          ...it,
          id: `${prefix}_item_${sIdx}_${iIdx}_${Math.random().toString(36).slice(2, 6)}`,
        }));
        return {
          ...s,
          id: `${prefix}_sub_${sIdx}_${Math.random().toString(36).slice(2, 6)}`,
          items: subItems,
        };
      });

    // Update draftLessons first if a source copy template was selected
    const updatedDraft = lessons.map((lesson, idx) => {
      if (
        sourceTemplateLesson &&
        selectedPublishLessonIds[lesson.id] &&
        lesson.id !== sourceTemplateLesson.id
      ) {
        return {
          ...lesson,
          order: idx + 1,
          subSections: cloneSubSectionsWithFreshIds(sourceTemplateLesson.subSections, lesson.id),
        };
      }
      return { ...lesson, order: idx + 1 };
    });

    // Build published lessons: checked lessons take the updated draft; unchecked keep prior published state (if previously published)
    const prevPublishedMap = new Map(publishedLessons.map((l) => [l.id, l]));
    const nextPublished: CourseLesson[] = [];

    updatedDraft.forEach((draftLesson) => {
      if (selectedPublishLessonIds[draftLesson.id]) {
        nextPublished.push({
          ...draftLesson,
          subSections: draftLesson.subSections.map((s) => ({ ...s })),
        });
      } else {
        const prevPub = prevPublishedMap.get(draftLesson.id);
        if (prevPub) {
          nextPublished.push(prevPub);
        }
      }
    });

    const normalizedPublished = nextPublished.map((l, idx) => ({ ...l, order: idx + 1 }));
    const nowIso = new Date().toISOString();

    const publishPatch: Partial<Lecture> = {
      lessons: normalizedPublished,
      draftLessons: updatedDraft,
      isPublished: true,
      lastPublishedAt: nowIso,
    };

    if (onPublish) {
      onPublish(publishPatch);
    } else {
      onChange(publishPatch);
    }

    setIsPublishModalOpen(false);
    flashNotice(`تم نشر المحتوى بنجاح إلى ${selectedIds.length} ${selectedIds.length === 1 ? 'درس' : 'دروس'} وحفظه على المنصة!`);
  };

  const kindOptions: { value: LessonSectionKind; label: string; shortLabel: string }[] = [
    { value: 'video', label: 'فيديو (YouTube / Drive / ملف)', shortLabel: 'فيديو' },
    { value: 'pdf', label: 'ملف / مذكرة PDF أو صورة', shortLabel: 'ملف' },
    { value: 'homework', label: 'واجب / شيت', shortLabel: 'واجب' },
    { value: 'exam', label: 'امتحان إلكتروني', shortLabel: 'امتحان' },
    { value: 'link', label: 'رابط خارجي / مرجع', shortLabel: 'رابط' },
    { value: 'text', label: 'نص / شرح مكتوب', shortLabel: 'نص' },
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
      case 'text':
        return <AlignRight className="w-4 h-4 text-pink-400 shrink-0" />;
      default:
        return <ExternalLink className="w-4 h-4 text-violet-400 shrink-0" />;
    }
  };

  const hasUnpublishedChanges = useMemo(
    () => JSON.stringify(lessons) !== JSON.stringify(publishedLessons),
    [lessons, publishedLessons]
  );

  return (
    <div className="space-y-5 text-xs">
      {statusNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="break-all">{statusNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="break-all">{errorNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="p-1 text-red-300 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadProgressState && (
        <div
          className={`p-3 rounded-xl bg-[#050c1e] space-y-2 shadow-lg border ${
            uploadProgressState.status === 'error'
              ? 'border-red-500/60'
              : uploadProgressState.status === 'completed'
              ? 'border-emerald-500/50'
              : 'border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-white truncate">
              {uploadProgressState.status === 'error'
                ? `فشل الرفع إلى ${uploadProgressState.bucket}: ${uploadProgressState.fileName}`
                : uploadProgressState.status === 'completed'
                ? `تم الرفع إلى ${uploadProgressState.bucket}: ${uploadProgressState.fileName}`
                : `جاري الرفع إلى ${uploadProgressState.bucket}: ${uploadProgressState.fileName}`}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`font-mono font-bold ${
                  uploadProgressState.status === 'error'
                    ? 'text-red-400'
                    : uploadProgressState.status === 'completed'
                    ? 'text-emerald-400'
                    : 'text-cyan-400'
                }`}
              >
                {uploadProgressState.progress.percent}%
              </span>
              {uploadProgressState.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => setUploadProgressState(null)}
                  className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="إغلاق شريط التقدم"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                uploadProgressState.status === 'error'
                  ? 'bg-red-500'
                  : uploadProgressState.status === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${uploadProgressState.progress.percent}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300 font-mono">
            <span>
              {uploadProgressState.progress.loadedFormatted} / {uploadProgressState.progress.totalFormatted}
            </span>
            <span>
              {uploadProgressState.progress.speed}
              {uploadProgressState.status === 'uploading' && uploadProgressState.progress.remaining
                ? ` · متبقي: ${uploadProgressState.progress.remaining}`
                : ''}
            </span>
          </div>
          {uploadProgressState.metaText && (
            <div className="text-[11px] font-bold text-amber-300 bg-amber-950/30 border border-amber-700/30 px-2.5 py-1.5 rounded-lg">
              {uploadProgressState.metaText}
            </div>
          )}
          {uploadProgressState.errorMessage && (
            <div className="text-[11px] font-bold text-red-200 bg-red-950/50 border border-red-700/40 px-2.5 py-1.5 rounded-lg break-all">
              {uploadProgressState.errorMessage}
            </div>
          )}
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
          <label className="min-h-[40px] px-3 py-2 rounded-xl bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/60 font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
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

      {/* Draft & Publish Action Bar */}
      {showPublishBar && (
        <div className="p-3.5 rounded-2xl bg-[#070f21] border border-cyan-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs">حالة محتوى الكورس:</span>
              {hasUnpublishedChanges ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                  يوجد تعديلات محفوظة كمسودة لم تُنشر بعد
                </span>
              ) : publishedLessons.length > 0 ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  منشور ومطابق للمسودة ({publishedLessons.length} دروس)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                  مسودة جديدة
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              أي تعديل يُحفظ كمسودة تلقائياً ولا يظهر للطلاب إلا بعد الضغط على «حفظ ونشر».
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraftOnly}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>حفظ كمسودة</span>
            </button>

            <button
              type="button"
              onClick={openPublishModal}
              disabled={lessons.length === 0}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>حفظ ونشر</span>
            </button>
          </div>
        </div>
      )}

      {/* 100% Dynamic Hierarchical Lessons -> Dynamic Sections -> Multi-Item Builder */}
      <div className="p-4 rounded-2xl bg-[#050811] border border-cyan-900/40 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-extrabold text-white flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>دروس ومحاضرات الكورس والأقسام الديناميكية ({lessons.length})</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              كل درس فارغ ومستقل تماماً عند الإنشاء: أنشئ أقساماً بالأسماء التي تريدها، وأضف بداخل كل قسم عدداً مفتوحاً من العناصر (فيديوهات، ملفات، واجبات، امتحانات، روابط، نصوص).
            </p>
          </div>
        </div>

        {/* Add New Lesson Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLesson();
              }
            }}
            placeholder={`اكتب عنوان الدرس الجديد (مثال: الدرس ${lessons.length + 1}: سبائك الحديد)`}
            className="flex-1 bg-[#080d1b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={handleAddLesson}
            className="min-h-[42px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة درس جديد</span>
          </button>
        </div>

        {/* Lessons List */}
        {lessons.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#080d1b] border border-dashed border-slate-700 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-cyan-400 mx-auto" />
            <p className="text-xs font-bold text-slate-200">
              لا توجد دروس مضافة لهذا الكورس بعد
            </p>
            <p className="text-[11px] text-slate-400">
              اضغط «إضافة درس جديد» بالأعلى، ثم أنشئ الأقسام والعناصر الخاصة بك بحرية تامة دون أي قوالب ثابتة.
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
              const lessonDeleteKey = `lesson:${lesson.id}`;
              const isConfirmingLessonDelete = confirmDeleteKey === lessonDeleteKey;

              return (
                <div
                  key={lesson.id}
                  className="rounded-2xl bg-[#091224] border border-slate-700/80 overflow-hidden"
                >
                  {/* Lesson Header */}
                  <div className="p-3.5 bg-[#080d1b] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {lIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                        className="flex-1 min-w-0 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lIndex, -1)}
                        disabled={lIndex === 0}
                        title="تحريك الدرس لأعلى"
                        className="min-w-[34px] min-h-[34px] p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(lIndex, 1)}
                        disabled={lIndex === lessons.length - 1}
                        title="تحريك الدرس لأسفل"
                        className="min-w-[34px] min-h-[34px] p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center cursor-pointer"
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
                        className="min-h-[34px] px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>الأقسام ({lesson.subSections.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isConfirmingLessonDelete ? (
                        <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/60 px-2 py-1 rounded-lg">
                          <span className="text-[10px] text-red-200 font-bold">تأكيد الحذف؟</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLesson(lesson.id)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteKey(null)}
                            className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(lessonDeleteKey)}
                          title="حذف هذا الدرس"
                          className="min-w-[34px] min-h-[34px] p-1.5 rounded-lg bg-red-950/50 border border-red-800/40 text-red-400 hover:bg-red-900/50 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lesson Expanded Dynamic Sections & Multi-Item Editor */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 space-y-4 border-t border-slate-800">
                      <div>
                        <input
                          type="text"
                          value={lesson.description || ''}
                          onChange={(e) =>
                            updateLesson(lesson.id, { description: e.target.value })
                          }
                          placeholder="وصف مختصر للدرس (اختياري)..."
                          className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Dynamic Custom Sections inside this Lesson */}
                      {lesson.subSections.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[#050811] border border-dashed border-slate-800 text-center text-[11px] text-slate-400">
                          هذا الدرس فارغ تماماً — أضف أول قسم مخصص من النموذج بالأسفل بالاسم والنوع الذي تريده.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {lesson.subSections.map((sub, sIndex) => {
                            const subItems = getSubSectionItems(sub);
                            const isSubOpen = expandedSubs[sub.id] ?? true;
                            const subDeleteKey = `sub:${lesson.id}:${sub.id}`;
                            const isConfirmingSubDelete = confirmDeleteKey === subDeleteKey;
                            const nextItemKind = newItemKindDrafts[sub.id] || sub.kind;

                            return (
                              <div
                                key={sub.id}
                                className="p-3 rounded-xl bg-[#050811] border border-slate-700/80 space-y-3"
                              >
                                {/* Section Header */}
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
                                    placeholder="اسم القسم (قابل للتعديل بحرية)"
                                    className="flex-1 min-w-[150px] bg-[#080d1b] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
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
                                        {opt.shortLabel}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => moveSubSection(lesson.id, sIndex, -1)}
                                      disabled={sIndex === 0}
                                      title="تحريك القسم لأعلى"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveSubSection(lesson.id, sIndex, 1)}
                                      disabled={sIndex === lesson.subSections.length - 1}
                                      title="تحريك القسم لأسفل"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedSubs((prev) => ({
                                          ...prev,
                                          [sub.id]: !isSubOpen,
                                        }))
                                      }
                                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>العناصر ({subItems.length})</span>
                                      {isSubOpen ? (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    {isConfirmingSubDelete ? (
                                      <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/60 px-1.5 py-1 rounded-lg">
                                        <button
                                          type="button"
                                          onClick={() => removeSubSection(lesson.id, sub.id)}
                                          className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded cursor-pointer"
                                        >
                                          تأكيد الحذف
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteKey(null)}
                                          className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(subDeleteKey)}
                                        title="حذف هذا القسم"
                                        className="p-1.5 rounded-lg bg-red-950/50 border border-red-800/40 text-red-400 hover:bg-red-900/50 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Section Notes */}
                                <input
                                  type="text"
                                  value={sub.notes || ''}
                                  onChange={(e) =>
                                    updateSubSection(lesson.id, sub.id, { notes: e.target.value })
                                  }
                                  placeholder="وصف أو ملاحظة قصيرة لهذا القسم (اختياري)..."
                                  className="w-full bg-[#080d1b] border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-400"
                                />

                                {/* Multi-Item Content List inside Section */}
                                {isSubOpen && (
                                  <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                                    {subItems.length === 0 ? (
                                      <p className="text-[11px] text-slate-400 text-center py-2">
                                        لا توجد عناصر داخل هذا القسم بعد — اضغط «+ إضافة عنصر جديد» بالأسفل.
                                      </p>
                                    ) : (
                                      subItems.map((item, itemIdx) => {
                                        const itemDeleteKey = `item:${lesson.id}:${sub.id}:${item.id}`;
                                        const isConfirmingItemDelete = confirmDeleteKey === itemDeleteKey;
                                        const isItemUploading = uploadingKey === `${sub.id}:${item.id}`;

                                        return (
                                          <div
                                            key={item.id}
                                            className="p-2.5 rounded-xl bg-[#080d1b] border border-slate-700/70 space-y-2"
                                          >
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {getKindIcon(item.kind)}
                                              <span className="text-[10px] font-mono text-slate-400">
                                                عنصر {itemIdx + 1}
                                              </span>
                                              <input
                                                type="text"
                                                value={item.title}
                                                onChange={(e) =>
                                                  updateSectionItem(lesson.id, sub.id, item.id, {
                                                    title: e.target.value,
                                                  })
                                                }
                                                placeholder="عنوان العنصر (مثال: الجزء الأول، مذكرة المعادلات...)"
                                                className="flex-1 min-w-[140px] bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none"
                                              />
                                              <select
                                                value={item.kind}
                                                onChange={(e) =>
                                                  updateSectionItem(lesson.id, sub.id, item.id, {
                                                    kind: e.target.value as LessonSectionKind,
                                                  })
                                                }
                                                className="bg-[#050811] border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                                              >
                                                {kindOptions.map((opt) => (
                                                  <option key={opt.value} value={opt.value}>
                                                    {opt.shortLabel}
                                                  </option>
                                                ))}
                                              </select>

                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    moveSectionItem(lesson.id, sub.id, itemIdx, -1)
                                                  }
                                                  disabled={itemIdx === 0}
                                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                                                >
                                                  <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    moveSectionItem(lesson.id, sub.id, itemIdx, 1)
                                                  }
                                                  disabled={itemIdx === subItems.length - 1}
                                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                                                >
                                                  <ArrowDown className="w-3 h-3" />
                                                </button>

                                                {isConfirmingItemDelete ? (
                                                  <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/60 px-1.5 py-0.5 rounded">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        removeSectionItem(lesson.id, sub.id, item.id)
                                                      }
                                                      className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded cursor-pointer"
                                                    >
                                                      حذف
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setConfirmDeleteKey(null)}
                                                      className="px-1 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer"
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteKey(itemDeleteKey)}
                                                    title="حذف هذا العنصر"
                                                    className="p-1 rounded bg-red-950/50 border border-red-800/40 text-red-400 hover:bg-red-900/50 cursor-pointer"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Dynamic Fields by Item Kind */}
                                            {item.kind === 'video' && (
                                              <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={item.videoUrl || ''}
                                                    onChange={(e) => {
                                                      const raw = e.target.value;
                                                      const parsed = parseVideoUrl(raw);
                                                      updateSectionItem(lesson.id, sub.id, item.id, {
                                                        videoUrl: parsed.isValid ? parsed.embedUrl : raw,
                                                      });
                                                    }}
                                                    placeholder="رابط فيديو YouTube أو Google Drive أو مسار مرفوع..."
                                                    className="flex-1 min-w-[180px] bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-cyan-400"
                                                    dir="ltr"
                                                  />
                                                  {item.videoUrl && (
                                                    <button
                                                      type="button"
                                                      disabled={verifyingItemKey === `${sub.id}:${item.id}`}
                                                      onClick={() => handleVerifyItemLink(lesson.id, sub.id, item)}
                                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-bold cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                                                    >
                                                      <CheckCircle2 className="w-3 h-3" />
                                                      <span>
                                                        {verifyingItemKey === `${sub.id}:${item.id}`
                                                          ? 'جاري الفحص...'
                                                          : 'فحص الرابط'}
                                                      </span>
                                                    </button>
                                                  )}
                                                  <label className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-bold cursor-pointer flex items-center gap-1 shrink-0">
                                                    <Upload className="w-3 h-3" />
                                                    <span>
                                                      {isItemUploading ? 'جاري الرفع...' : 'رفع فيديو'}
                                                    </span>
                                                    <input
                                                      type="file"
                                                      accept="video/*"
                                                      onChange={(e) =>
                                                        handleItemFileUpload(
                                                          lesson.id,
                                                          sub.id,
                                                          item.id,
                                                          'video',
                                                          e
                                                        )
                                                      }
                                                      className="hidden"
                                                    />
                                                  </label>
                                                </div>
                                                {(item.durationHms || item.durationFormatted) && (
                                                  <div className="text-[10px] font-bold text-amber-300 bg-amber-950/30 border border-amber-800/30 px-2 py-1 rounded-md inline-flex items-center gap-1.5">
                                                    <span>
                                                      ⏱️ مدة الفيديو: {item.durationHms || ''}
                                                      {item.durationFormatted ? ` (${item.durationFormatted})` : ''}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {item.kind === 'pdf' && (
                                              <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={item.fileUrl || ''}
                                                    onChange={(e) => {
                                                      const raw = e.target.value;
                                                      const parsed = parseDriveUrl(raw);
                                                      updateSectionItem(lesson.id, sub.id, item.id, {
                                                        fileUrl: parsed.isValid ? parsed.previewUrl : raw,
                                                      });
                                                    }}
                                                    placeholder="رابط ملف PDF / Google Drive أو ارفع ملفاً من جهازك..."
                                                    className="flex-1 min-w-[180px] bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-cyan-400"
                                                    dir="ltr"
                                                  />
                                                  {item.fileUrl && (
                                                    <button
                                                      type="button"
                                                      disabled={verifyingItemKey === `${sub.id}:${item.id}`}
                                                      onClick={() => handleVerifyItemLink(lesson.id, sub.id, item)}
                                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-bold cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                                                    >
                                                      <CheckCircle2 className="w-3 h-3" />
                                                      <span>
                                                        {verifyingItemKey === `${sub.id}:${item.id}`
                                                          ? 'جاري الفحص...'
                                                          : 'فحص الرابط'}
                                                      </span>
                                                    </button>
                                                  )}
                                                  <label className="px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-700/40 text-blue-300 font-bold cursor-pointer flex items-center gap-1 shrink-0">
                                                    <Upload className="w-3 h-3" />
                                                    <span>
                                                      {isItemUploading ? 'جاري الرفع...' : 'رفع ملف'}
                                                    </span>
                                                    <input
                                                      type="file"
                                                      accept=".pdf,image/*"
                                                      onChange={(e) =>
                                                        handleItemFileUpload(
                                                          lesson.id,
                                                          sub.id,
                                                          item.id,
                                                          'pdf',
                                                          e
                                                        )
                                                      }
                                                      className="hidden"
                                                    />
                                                  </label>
                                                </div>
                                                {item.pageCount && item.pageCount > 0 && (
                                                  <div className="text-[10px] font-bold text-cyan-300 bg-cyan-950/30 border border-cyan-800/30 px-2 py-1 rounded-md inline-flex items-center gap-1.5">
                                                    <span>📄 عدد الصفحات: {item.pageCount} صفحة</span>
                                                  </div>
                                                )}
                                                {files.length > 0 && (
                                                  <select
                                                    value=""
                                                    onChange={(e) => {
                                                      const picked = files.find(
                                                        (f) => f.id === e.target.value
                                                      );
                                                      if (picked) {
                                                        updateSectionItem(lesson.id, sub.id, item.id, {
                                                          fileUrl: picked.fileUrl,
                                                          fileName:
                                                            picked.fileName || `${picked.title}.pdf`,
                                                        });
                                                      }
                                                    }}
                                                    className="w-full bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300"
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

                                            {item.kind === 'homework' && (
                                              <div className="space-y-1.5">
                                                <select
                                                  value={item.linkedHomeworkId || ''}
                                                  onChange={(e) =>
                                                    updateSectionItem(lesson.id, sub.id, item.id, {
                                                      linkedHomeworkId: e.target.value || undefined,
                                                    })
                                                  }
                                                  className="w-full bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-400"
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
                                                    value={item.fileUrl || ''}
                                                    onChange={(e) =>
                                                      updateSectionItem(lesson.id, sub.id, item.id, {
                                                        fileUrl: e.target.value,
                                                      })
                                                    }
                                                    placeholder="أو رابط ملف PDF للواجب..."
                                                    className="flex-1 min-w-[160px] bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono"
                                                    dir="ltr"
                                                  />
                                                  {item.fileUrl && (
                                                    <button
                                                      type="button"
                                                      disabled={verifyingItemKey === `${sub.id}:${item.id}`}
                                                      onClick={() => handleVerifyItemLink(lesson.id, sub.id, item)}
                                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-bold cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                                                    >
                                                      <CheckCircle2 className="w-3 h-3" />
                                                      <span>
                                                        {verifyingItemKey === `${sub.id}:${item.id}`
                                                          ? 'جاري الفحص...'
                                                          : 'فحص الرابط'}
                                                      </span>
                                                    </button>
                                                  )}
                                                  <label className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/40 text-amber-300 font-bold cursor-pointer flex items-center gap-1 shrink-0">
                                                    <Upload className="w-3 h-3" />
                                                    <span>
                                                      {isItemUploading ? 'جاري الرفع...' : 'رفع واجب'}
                                                    </span>
                                                    <input
                                                      type="file"
                                                      accept=".pdf,image/*,.doc,.docx"
                                                      onChange={(e) =>
                                                        handleItemFileUpload(
                                                          lesson.id,
                                                          sub.id,
                                                          item.id,
                                                          'homework',
                                                          e
                                                        )
                                                      }
                                                      className="hidden"
                                                    />
                                                  </label>
                                                </div>
                                                {item.pageCount && item.pageCount > 0 && (
                                                  <div className="text-[10px] font-bold text-amber-300 bg-amber-950/30 border border-amber-800/30 px-2 py-1 rounded-md inline-flex items-center gap-1.5">
                                                    <span>📄 عدد الصفحات: {item.pageCount} صفحة</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {item.kind === 'exam' && (
                                              <div className="space-y-1.5">
                                                <select
                                                  value={item.linkedExamId || ''}
                                                  onChange={(e) =>
                                                    updateSectionItem(lesson.id, sub.id, item.id, {
                                                      linkedExamId: e.target.value || undefined,
                                                    })
                                                  }
                                                  className="w-full bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                                                >
                                                  <option value="">
                                                    -- اختر امتحاناً إلكترونياً لربطه بهذا العنصر --
                                                  </option>
                                                  {exams.map((ex) => (
                                                    <option key={ex.id} value={ex.id}>
                                                      {ex.title} ({ex.questions.length} سؤال)
                                                    </option>
                                                  ))}
                                                </select>
                                                <input
                                                  type="text"
                                                  value={item.externalUrl || ''}
                                                  onChange={(e) =>
                                                    updateSectionItem(lesson.id, sub.id, item.id, {
                                                      externalUrl: e.target.value,
                                                    })
                                                  }
                                                  placeholder="أو رابط اختبار خارجي (اختياري)..."
                                                  className="w-full bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono"
                                                  dir="ltr"
                                                />
                                              </div>
                                            )}

                                            {item.kind === 'link' && (
                                              <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={item.externalUrl || ''}
                                                    onChange={(e) =>
                                                      updateSectionItem(lesson.id, sub.id, item.id, {
                                                        externalUrl: e.target.value,
                                                      })
                                                    }
                                                    placeholder="الرابط الخارجي أو المرجع (https://...)..."
                                                    className="flex-1 min-w-[180px] bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono"
                                                    dir="ltr"
                                                  />
                                                  {item.externalUrl && (
                                                    <button
                                                      type="button"
                                                      disabled={verifyingItemKey === `${sub.id}:${item.id}`}
                                                      onClick={() => handleVerifyItemLink(lesson.id, sub.id, item)}
                                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-bold cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                                                    >
                                                      <CheckCircle2 className="w-3 h-3" />
                                                      <span>
                                                        {verifyingItemKey === `${sub.id}:${item.id}`
                                                          ? 'جاري الفحص...'
                                                          : 'فحص الرابط'}
                                                      </span>
                                                    </button>
                                                  )}
                                                </div>
                                                {(item.pageCount || item.durationHms) && (
                                                  <div className="text-[10px] font-bold text-cyan-300 bg-cyan-950/30 border border-cyan-800/30 px-2 py-1 rounded-md inline-flex items-center gap-2">
                                                    {item.durationHms && <span>⏱️ {item.durationHms}</span>}
                                                    {item.pageCount && <span>📄 {item.pageCount} صفحة</span>}
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {item.kind === 'text' && (
                                              <textarea
                                                rows={3}
                                                value={item.textContent || ''}
                                                onChange={(e) =>
                                                  updateSectionItem(lesson.id, sub.id, item.id, {
                                                    textContent: e.target.value,
                                                  })
                                                }
                                                placeholder="اكتب المحتوى النصي أو الملخص أو المعادلات التي ستظهر للطالب هنا..."
                                                className="w-full bg-[#050811] border border-slate-700 rounded-lg px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
                                              />
                                            )}

                                            <input
                                              type="text"
                                              value={item.notes || ''}
                                              onChange={(e) =>
                                                updateSectionItem(lesson.id, sub.id, item.id, {
                                                  notes: e.target.value,
                                                })
                                              }
                                              placeholder="ملاحظة للطالب على هذا العنصر (اختياري)..."
                                              className="w-full bg-[#050811] border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-400"
                                            />
                                          </div>
                                        );
                                      })
                                    )}

                                    {/* Add Additional Item Bar inside Section */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      <select
                                        value={nextItemKind}
                                        onChange={(e) =>
                                          setNewItemKindDrafts((prev) => ({
                                            ...prev,
                                            [sub.id]: e.target.value as LessonSectionKind,
                                          }))
                                        }
                                        className="bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200"
                                      >
                                        {kindOptions.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            نوع العنصر: {opt.shortLabel}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => addItemToSubSection(lesson.id, sub.id, nextItemKind)}
                                        className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-700/50 text-cyan-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>إضافة عنصر جديد داخل القسم</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 100% Dynamic Custom Section Creator */}
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-dashed border-cyan-700/50 flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="text"
                          value={customDraft.title}
                          onChange={(e) =>
                            setCustomSubInputs((prev) => ({
                              ...prev,
                              [lesson.id]: { ...customDraft, title: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomSubSection(lesson.id);
                            }
                          }}
                          placeholder="أضف قسماً جديداً بأي اسم (مثال: شرح الدرس / حل كتاب أفوجادرو / ملخص القوانين)..."
                          className="flex-1 min-w-0 bg-[#080d1b] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                        <div className="flex items-center gap-2 shrink-0">
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
                            className="flex-1 sm:flex-none bg-[#080d1b] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200"
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
                            className="min-h-[38px] px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>إضافة قسم</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PUBLISH TARGET LESSONS MODAL */}
      {isPublishModalOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsPublishModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b1329] border border-emerald-500/50 rounded-2xl w-full max-w-xl max-h-[90dvh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>حفظ ونشر التعديلات — اختيار الدروس المستهدفة</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                اختر الدروس التي تريد نشر تحديثات المسودة إليها ليتمكن الطلاب من رؤيتها فوراً وحفظها في قاعدة البيانات. الدروس غير المحددة ستظل كما كانت منشورة سابقاً دون نشر مسوداتها الجديدة.
              </span>
            </div>

            {/* Optional: Broadcast one lesson's sections across all checked lessons */}
            {lessons.length > 1 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">
                  مصدر النشر:
                </label>
                <select
                  value={sourceCopyLessonId}
                  onChange={(e) => setSourceCopyLessonId(e.target.value)}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">
                    نشر كل درس محدد بمحتوياته وأقسامه المستقلة (الوضع الافتراضي)
                  </option>
                  {lessons.map((l, idx) => (
                    <option key={l.id} value={l.id}>
                      تعميم محتويات وأقسام (الدرس {idx + 1}: {l.title}) على جميع الدروس المحددة
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Checkboxes for All Lessons in Course */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">
                  دروس الكورس ({lessons.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = lessons.every((l) => selectedPublishLessonIds[l.id]);
                    const next: Record<string, boolean> = {};
                    lessons.forEach((l) => {
                      next[l.id] = !allSelected;
                    });
                    setSelectedPublishLessonIds(next);
                  }}
                  className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                >
                  {lessons.every((l) => selectedPublishLessonIds[l.id])
                    ? 'إلغاء تحديد الكل'
                    : 'تحديد كل الدروس'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                {lessons.map((l, idx) => {
                  const checked = Boolean(selectedPublishLessonIds[l.id]);
                  const itemsCount = l.subSections.reduce(
                    (acc, s) => acc + Math.max(1, getSubSectionItems(s).length),
                    0
                  );
                  return (
                    <label
                      key={l.id}
                      onClick={() =>
                        setSelectedPublishLessonIds((prev) => ({
                          ...prev,
                          [l.id]: !prev[l.id],
                        }))
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-950/35 border-emerald-500/60 text-white'
                          : 'bg-[#050811] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-emerald-500 border-emerald-400 text-white'
                              : 'bg-[#080d1b] border-slate-600'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            محتويات الدرس {idx + 1}: {l.title}
                          </p>
                          <p className="text-[10px] text-slate-400 tabular-nums">
                            {l.subSections.length} أقسام · {itemsCount} عناصر
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Inline Quick Add New Lesson inside Publish Modal */}
            <div className="p-3 rounded-xl bg-[#050811] border border-dashed border-cyan-800/50 space-y-2">
              <p className="text-[11px] font-bold text-cyan-300">
                + إضافة درس جديد مباشرة وتحديد نشره:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickLessonInModal}
                  onChange={(e) => setQuickLessonInModal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddLessonInPublishModal();
                    }
                  }}
                  placeholder="اسم الدرس الجديد..."
                  className="flex-1 bg-[#080d1b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleQuickAddLessonInPublishModal}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  إضافة
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/25"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الحفظ والنشر للطلاب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
