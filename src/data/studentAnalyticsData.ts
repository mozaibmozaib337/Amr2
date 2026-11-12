import {
  RegisteredAccount,
  Lecture,
  Exam,
  Homework,
  ExamSubmission,
  StudentActivity,
  BroadcastNotification,
} from '../types';

export interface StudentAccessState {
  lectures: Record<string, { entered: boolean; date?: string; enteredCount?: number; completed?: boolean; completedAt?: string }>;
  exams: Record<string, { taken: boolean; score?: number; maxScore?: number; percentage?: number; date?: string }>;
  homeworks: Record<string, { solved: boolean; score?: number; maxScore?: number; percentage?: number; date?: string }>;
}

// Master Admin Account
export const INITIAL_REGISTERED_USERS: RegisteredAccount[] = [
  {
    id: 'admin_amr_sayed',
    name: 'مستر عمرو السيد',
    email: 'Amr.ElSayed@Chemistry.Edu',
    phone: '01069780486',
    password: 'Amr@Chem2026',
    studentCode: 'AMR-001',
    grade: 'sec3',
    governorate: 'المنصورة / القاهرة',
    role: 'admin',
    walletBalance: 9999,
    registeredAt: '2026-09-01',
  },
];

// Clean Pure Initial Curriculum (Only what Mr. Amr or secretaries add will appear)
export const INITIAL_CURRICULUM_LECTURES: Lecture[] = [];
export const INITIAL_CURRICULUM_EXAMS: Exam[] = [];
export const INITIAL_CURRICULUM_HOMEWORKS: Homework[] = [];
export const INITIAL_EXAM_SUBMISSIONS: ExamSubmission[] = [];
export const INITIAL_STUDENT_ACCESS: Record<string, StudentAccessState> = {};
export const INITIAL_STUDENT_ACTIVITIES: StudentActivity[] = [];

// Broadcast notifications sent to all students
export const INITIAL_BROADCAST_NOTIFICATIONS: BroadcastNotification[] = [
  {
    id: 'notif_welcome_1',
    title: 'أهلاً بكم في منصة مستر عمرو السيد في الكيمياء 🧪',
    message: 'مرحباً بجميع أبنائنا وبناتنا طلاب الثانوية العامة والأزهرية في منصتكم التعليمية الرسمية. تابعوا هنا جميع التنبيهات ومواعيد المحاضرات والامتحانات الدورية.',
    senderName: 'مستر عمرو السيد',
    senderRole: 'admin',
    targetGrade: 'all',
    createdAt: new Date().toISOString(),
    priority: 'normal',
  },
];
