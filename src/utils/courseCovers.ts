import coverElements from '../assets/images/course_cover_elements_1794567838925.jpg';
import coverOrganic from '../assets/images/course_cover_organic_1794567838916.jpg';
import coverAnalysis from '../assets/images/course_cover_analysis_1794567839061.jpg';
import { CourseLesson, Lecture, LessonSectionKind, LessonSubSection } from '../types';

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

export interface SubSectionPresetTemplate {
  key: string;
  title: string;
  kind: LessonSectionKind;
  isDefault?: boolean;
}

export const STARTER_DEFAULT_SUBSECTIONS: SubSectionPresetTemplate[] = [
  { key: 'lecture_video', title: 'شرح المحاضرة', kind: 'video', isDefault: true },
  { key: 'homework_submit', title: 'تسليم الواجب', kind: 'homework', isDefault: true },
  { key: 'interactive_exam', title: 'الاختبار التفاعلي', kind: 'exam', isDefault: true },
];

export const OPTIONAL_SUBSECTION_PRESETS: SubSectionPresetTemplate[] = [
  { key: 'notes_pdf', title: 'مذكرات وملفات PDF', kind: 'pdf' },
  { key: 'mendeleev_book', title: 'حل كتاب مندليف', kind: 'video' },
  { key: 'exam_book', title: 'حل كتاب الامتحان', kind: 'video' },
  { key: 'thanawya_past', title: 'ما ورد في امتحانات ثانوية عامة', kind: 'pdf' },
];

export function createSubSectionFromTemplate(tpl: SubSectionPresetTemplate): LessonSubSection {
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: tpl.title,
    kind: tpl.kind,
    isDefault: tpl.isDefault,
  };
}

export function createStarterLesson(indexNumber = 1, title?: string): CourseLesson {
  return {
    id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || `المحاضرة ${indexNumber}: درس جديد`,
    description: '',
    order: indexNumber,
    subSections: STARTER_DEFAULT_SUBSECTIONS.map(createSubSectionFromTemplate),
  };
}

/**
 * Returns the structured lessons list for a course.
 * If the course is an older/flat lecture with no custom `lessons` array yet,
 * synthesizes a clean structured Lesson 1 using its top-level videoUrl and pdfUrl.
 */
export function getCourseLessons(course: Lecture): CourseLesson[] {
  if (Array.isArray(course.lessons) && course.lessons.length > 0) {
    return course.lessons;
  }

  const starterSubSections: LessonSubSection[] = [
    {
      id: `${course.id}_sub_video`,
      title: 'شرح المحاضرة',
      kind: 'video',
      videoUrl: course.videoUrl || '',
      isDefault: true,
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
