export type GradeLevel = 'sec1' | 'sec2' | 'sec3';
export type SubscriptionType = 'lecture' | 'course' | 'center';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentCode?: string;
  parentPhone?: string;
  age?: number;
  subscriptionType?: SubscriptionType;
  lastLoginAt?: string;
  isOnline?: boolean;
  governorate: string;
  grade: GradeLevel;
  role: 'student' | 'admin' | 'secretary';
  walletBalance: number;
  enrolledLectureIds: string[];
}

export interface LiveLoginAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  parentPhone: string;
  studentCode: string;
  grade: GradeLevel;
  governorate: string;
  subscriptionType: SubscriptionType;
  age?: number;
  timestamp: string;
  timeFormatted: string;
  unreadByAdmin: boolean;
}

export interface AuthorizedStudent {
  id: string;
  studentName: string;
  phone: string;
  studentCode: string;
  lectureId: string;
  dateAdded: string;
}

export interface Secretary {
  id: string;
  name: string;
  phone: string;
  dateAdded: string;
  notes?: string;
}

export interface HonoredStudent {
  id: string;
  name: string;
  grade: GradeLevel;
  score: number;
  maxScore: number;
  percentage: number;
  governorate: string;
  rank: number;
  badge?: string;
  dateAdded: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  accountNumber: string;
  instructions: string;
  iconType: 'vodafone' | 'fawry' | 'instapay' | 'bank' | 'card';
  isEnabled: boolean;
}

export interface PlatformSettings {
  themeMode: 'dark' | 'light' | 'system';
  primaryColor: 'cyan' | 'blue' | 'emerald' | 'violet' | 'amber';
  fontFamily: 'Alexandria' | 'Cairo' | 'Tajawal';
  layoutRadius: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
}

export interface VideoChapter {
  id: string;
  title: string;
  timeSeconds: number;
}

export type LessonSectionKind = 'video' | 'pdf' | 'homework' | 'exam' | 'link';

export interface LessonSubSection {
  id: string;
  title: string;
  kind: LessonSectionKind;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  linkedExamId?: string;
  linkedHomeworkId?: string;
  externalUrl?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  order?: number;
  subSections: LessonSubSection[];
}

export interface Lecture {
  id: string;
  title: string;
  chapterTitle: string;
  grade: GradeLevel;
  durationMinutes: number;
  videoUrl: string;
  videoFileName?: string;
  videoFileSize?: string;
  description: string;
  pdfUrl?: string;
  pdfTitle?: string;
  coverImageUrl?: string;
  instructions?: string;
  scheduleText?: string;
  lessons?: CourseLesson[];
  price: number;
  isFree?: boolean;
  dateAdded: string;
  provider?: 'youtube' | 'drive' | 'local' | 'other';
  external_id?: string;
  original_url?: string;
}

export interface Question {
  id: string;
  text: string;
  image?: string; // صورة بجانب السؤال
  type?: 'mcq' | 'essay'; // نوع السؤال: اختيار من متعدد أو مقالي
  points?: number; // درجة مستقلة لكل سؤال
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  modelAnswer?: string; // إجابة نموذجية للأسئلة المقالية
}

export interface Exam {
  id: string;
  title: string;
  lessonTitle?: string; // ربط الامتحان بالدرس
  grade: GradeLevel;
  durationMinutes: number;
  totalMarks: number;
  questions: Question[];
  dateAdded: string;
  sourceFileName?: string;
}

export interface Homework {
  id: string;
  title: string;
  kind?: 'homework' | 'sheet'; // واجب منزلي أو شيت درس
  lessonTitle?: string; // ربط الواجب/الشيت بالدرس (مثال: الدرس الأول)
  grade: GradeLevel;
  description: string;
  deadline: string;
  durationMinutes?: number; // مدة الحل بالدقائق (حد أقصى 24 ساعة للواجب و3 ساعات للشيت)
  totalMarks?: number; // الدرجة الكلية للواجب أو الشيت
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'image';
  questions?: Question[];
  dateAdded: string;
}

export interface FileDocument {
  id: string;
  title: string;
  category: string;
  lessonTitle?: string;
  courseId?: string;
  grade: GradeLevel;
  sizeMb?: number;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'image' | 'other';
  dateAdded: string;
  description?: string;
  provider?: 'youtube' | 'drive' | 'local' | 'other';
  external_id?: string;
  original_url?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'purchase';
  amount: number;
  date: string;
  description: string;
  code?: string;
}

export interface RechargeCode {
  code: string;
  value: number;
  isUsed: boolean;
  usedBy?: string;
  dateCreated: string;
  maxUses?: number; // 1 or 2 as requested by teacher
  usedCount?: number; // times used so far
  courseId?: string; // specific course unlocked by this code
  courseTitle?: string;
}

export interface RegisteredAccount {
  id: string;
  name: string;
  email: string; // Case sensitive
  phone: string;
  password: string; // Case sensitive
  studentCode: string; // Case sensitive
  parentPhone?: string; // رقم ولي الأمر
  age?: number; // العمر
  subscriptionType?: SubscriptionType; // حصة أونلاين / كورس شهري / سنتر وقاعة
  lastLoginAt?: string;
  isOnline?: boolean;
  grade: GradeLevel;
  governorate: string;
  role: 'student' | 'admin' | 'secretary';
  walletBalance: number;
  registeredAt: string;
}

export interface StudentActivity {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentCode?: string;
  grade: GradeLevel;
  type: 'lecture_enter' | 'exam_submit' | 'homework_submit' | 'login';
  itemId: string;
  itemTitle: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  status: 'entered' | 'completed' | 'missed';
  timestamp: string;
  timeAgo?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  assessmentType?: 'exam' | 'sheet' | 'homework'; // تمييز الامتحان عن الشيت عن الواجب
  lessonTitle?: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentCode?: string;
  grade: GradeLevel;
  governorate: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentMinutes: number;
  submittedAt: string;
  rank?: number;
  autoMcqScore?: number;
  autoMcqMax?: number;
  teacherExtraScore?: number;
  teacherGraded?: boolean;
  essayAnswers?: Record<string, string>;
  essayScores?: Record<string, number>; // درجة المعلم لكل سؤال مقالي بشكل مستقل
  blankCount?: number; // عدد الأسئلة المتروكة فارغة (صفر تلقائي)
  status?: 'pending_teacher_review' | 'fully_graded';
  gradedBy?: string;
  gradedAt?: string;
}

export interface StudentDossier {
  student: RegisteredAccount;
  totalLectures: number;
  enteredLectures: number;
  attendanceRate: number;
  totalExams: number;
  takenExams: number;
  averageExamScore: number;
  totalSheets: number;
  solvedSheets: number;
  averageSheetScore: number;
  totalHomeworks: number;
  solvedHomeworks: number;
  homeworkCompletionRate: number;
  lectureRecords: { lectureId: string; lectureTitle: string; entered: boolean; date?: string }[];
  examRecords: { examId: string; examTitle: string; lessonTitle?: string; taken: boolean; score?: number; maxScore?: number; percentage?: number; status?: string; date?: string }[];
  homeworkRecords: { homeworkId: string; homeworkTitle: string; kind: 'homework' | 'sheet'; lessonTitle?: string; solved: boolean; score?: number; maxScore?: number; percentage?: number; status?: string; date?: string }[];
}

export interface PaymentReceiptRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  lectureId: string;
  lectureTitle: string;
  amount: number;
  paymentMethodName: string;
  screenshotUrl: string;
  submittedAt: string;
  activationDeadline: string; // 20 minutes after submission
  status: 'pending_review' | 'approved' | 'rejected' | 'auto_activated';
  reviewedAt?: string;
  notes?: string;
}

export interface ExtractedStudentEntry {
  studentName: string;
  phone: string;
  studentCode: string;
  lectureId?: string;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  senderName: string;
  senderRole: 'admin' | 'secretary';
  targetGrade?: GradeLevel | 'all';
  createdAt: string;
  priority?: 'normal' | 'urgent';
}

export interface TeacherProfile {
  id?: string;
  name: string;
  title: string;
  bio: string;
  phone: string;
  whatsapp: string;
  email: string;
  officeAddress: string;
  avatarUrl: string;
  announcementText: string;
  updatedAt?: string;
}

export interface UploadProgressInfo {
  isUploading: boolean;
  progressPercent: number;
  uploadedBytesFormatted: string;
  totalBytesFormatted: string;
  speedFormatted: string;
  remainingTimeFormatted: string;
  fileName: string;
  fileSizeFormatted: string;
  statusText: string;
}


