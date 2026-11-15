import coverElements from '../assets/images/course_cover_elements_1794567838925.jpg';
import coverOrganic from '../assets/images/course_cover_organic_1794567838916.jpg';
import coverAnalysis from '../assets/images/course_cover_analysis_1794567839061.jpg';
import {
  CourseLesson,
  Lecture,
  LessonSectionItem,
  LessonSectionKind,
  LessonSubSection,
} from '../types';

export interface CourseCoverPreset {
  id: string;
  label: string;
  url: string;
}

export const COURSE_COVER_PRESETS: CourseCoverPreset[] = [
  { id: 'elements', label: 'العناصر الانتقالية والتركيب الذري', url: coverElements },
  { id: 'organic', label: 'الكيمياء العضوية والروابط', url: coverOrganic },
  { id: 'analysis', label: 'الكيمياء التحليلية والمعايرة', url: coverAnalysis },
];

export function resolveCourseCover(course: Pick<Lecture, 'title' | 'chapterTitle' | 'coverImageUrl'>): string {
  if (course.coverImageUrl && course.coverImageUrl.trim()) {
    return course.coverImageUrl.trim();
  }
  const combined = `${course.title || ''} ${course.chapterTitle || ''}`;
  if (/عضو|هيدرو|بنزين|كحول|ألكان|ألكين/i.test(combined)) {
    return coverOrganic;
  }
  if (/تحليل|اتزان|كهرب|معاير|أحماض|قواعد/i.test(combined)) {
    return coverAnalysis;
  }
  return coverElements;
}

export function createStarterLesson(indexNumber = 1, title?: string): CourseLesson {
  return {
    id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || `الدرس ${indexNumber}: درس جديد`,
    description: '',
    order: indexNumber,
    subSections: [],
  };
}

/**
 * Normalizes a section's items so both modern multi-item sections (`sub.items`)
 * and legacy single-item sections render and edit uniformly.
 */
export function getSubSectionItems(sub: LessonSubSection): LessonSectionItem[] {
  if (Array.isArray(sub.items) && sub.items.length > 0) {
    return sub.items;
  }
  const hasDirectContent = Boolean(
    sub.videoUrl?.trim() ||
      sub.fileUrl?.trim() ||
      sub.linkedExamId?.trim() ||
      sub.linkedHomeworkId?.trim() ||
      sub.externalUrl?.trim() ||
      sub.textContent?.trim()
  );
  if (!hasDirectContent) return [];
  return [
    {
      id: `${sub.id}_item_1`,
      title: sub.title,
      kind: sub.kind,
      videoUrl: sub.videoUrl,
      fileUrl: sub.fileUrl,
      fileName: sub.fileName,
      linkedExamId: sub.linkedExamId,
      linkedHomeworkId: sub.linkedHomeworkId,
      externalUrl: sub.externalUrl,
      textContent: sub.textContent,
      notes: sub.notes,
      order: 1,
    },
  ];
}

export function buildEmptySectionItem(kind: LessonSectionKind, order = 1, defaultTitle = ''): LessonSectionItem {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: defaultTitle || `عنصر ${order}`,
    kind,
    order,
  };
}

/**
 * Returns the structured published lessons list for a course.
 * If the course is an older/flat lecture with no custom `lessons` array at all,
 * synthesizes Lesson 1 from its top-level videoUrl and pdfUrl.
 */
export function getCourseLessons(course: Lecture): CourseLesson[] {
  if (Array.isArray(course.lessons)) {
    if (course.lessons.length > 0 || course.isPublished !== undefined) {
      return course.lessons;
    }
  }

  const hasTopMedia = Boolean(course.videoUrl?.trim() || course.pdfUrl?.trim());
  if (!hasTopMedia) {
    return [];
  }

  const starterSubSections: LessonSubSection[] = [
    {
      id: `${course.id}_sub_video`,
      title: 'شرح المحاضرة',
      kind: 'video',
      videoUrl: course.videoUrl || '',
    },
  ];

  if (course.pdfUrl) {
    starterSubSections.push({
      id: `${course.id}_sub_pdf`,
      title: course.pdfTitle || 'مذكرات وملفات PDF',
      kind: 'pdf',
      fileUrl: course.pdfUrl,
      fileName: `${course.pdfTitle || course.title}.pdf`,
    });
  }

  return [
    {
      id: `${course.id}_lesson_1`,
      title: `المحاضرة الأولى: ${course.title}`,
      description: course.description || '',
      order: 1,
      subSections: starterSubSections,
    },
  ];
}
