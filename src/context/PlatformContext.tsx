import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  Lecture,
  Homework,
  FileDocument,
  Exam,
  RechargeCode,
  WalletTransaction,
  GradeLevel,
  AuthorizedStudent,
  Secretary,
  PaymentMethod,
  PlatformSettings,
  Question,
  HonoredStudent,
  RegisteredAccount,
  StudentActivity,
  ExamSubmission,
  StudentDossier,
  PaymentReceiptRequest,
  BroadcastNotification,
  LiveLoginAlert,
  SubscriptionType,
  TeacherProfile,
} from '../types';
import {
  INITIAL_REGISTERED_USERS,
  INITIAL_CURRICULUM_LECTURES,
  INITIAL_CURRICULUM_EXAMS,
  INITIAL_CURRICULUM_HOMEWORKS,
  INITIAL_EXAM_SUBMISSIONS,
  INITIAL_STUDENT_ACCESS,
  INITIAL_STUDENT_ACTIVITIES,
  INITIAL_BROADCAST_NOTIFICATIONS,
  StudentAccessState,
} from '../data/studentAnalyticsData';
import {
  subscribeToCollection,
  saveDocument,
  updateDocument,
  deleteDocument,
  bulkSaveDocuments,
  findStudentProfileInSupabase,
  fetchAllProfilesFromSupabase,
  upsertStudentProfileInSupabase,
  deleteStudentProfileInSupabase,
  clearAllStudentProfilesInSupabase,
  purgeLegacyLocalCaches,
  ensureUuid,
} from '../services/supabaseService';

export const ADMIN_EMAIL = 'amr12345@gmail.com';
export const TEACHER_PHONE = '+20 10 69780486';
export const TEACHER_PHONE_LOCAL = '01069780486';

export const DEFAULT_TEACHER_PROFILE: TeacherProfile = {
  name: 'مستر عمرو السيد',
  title: 'خبير مادة الكيمياء للثانوية العامة والأزهرية',
  bio: 'المنصة الرسمية والوحيدة لمستر عمرو السيد لتدريس الكيمياء للثانوية العامة بنظام حديث وخرائط ذهنية شاملة.',
  phone: '01069780486',
  whatsapp: '+201069780486',
  email: 'Amr.ElSayed@Chemistry.Edu',
  officeAddress: 'محافظة الدقهلية / المنصورة / القاهرة',
  avatarUrl: '/assets/aistudio/image_5a8c23d0_ad0df768.jpg',
  announcementText: 'أهلاً بكم في منصة الكيمياء لعام 2026 - تواصل مباشر مع مستر عمرو والسكرتارية عبر الواتساب ورادار المنصة.',
};

const DEFAULT_SETTINGS: PlatformSettings = {
  themeMode: 'dark',
  primaryColor: 'cyan',
  fontFamily: 'Alexandria',
  layoutRadius: 'rounded-2xl',
};

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pay_voda',
    name: 'فودافون كاش / المحافظ الإلكترونية',
    accountNumber: TEACHER_PHONE_LOCAL,
    instructions: 'يرجى تحويل المبلغ المطلوب إلى رقم فودافون كاش ثم إرسال صورة التحويل عبر واتساب للتفعيل الفوري.',
    iconType: 'vodafone',
    isEnabled: true,
  },
  {
    id: 'pay_instapay',
    name: 'إنستاباي (InstaPay)',
    accountNumber: 'amr.elsayed@instapay',
    instructions: 'تحويل لحظي مباشر عبر خدمة إنستاباي لاسم المستخدم الموضح، والتفعيل خلال دقائق.',
    iconType: 'instapay',
    isEnabled: true,
  },
  {
    id: 'pay_fawry',
    name: 'فوري (Fawry)',
    accountNumber: 'كود الخدمة: 7894',
    instructions: 'الدفع عبر أي ماكينة فوري بكود الخدمة، واستلام إيصال فوري لتأكيد الاشتراك.',
    iconType: 'fawry',
    isEnabled: true,
  },
  {
    id: 'pay_center',
    name: 'كروت الشحن وسنتر مستر عمرو السيد',
    accountNumber: 'سنتر المنصورة / القاهرة',
    instructions: 'شراء كارت الشحن من السنتر وإدخال كود الكارت مباشرة في خانة "شحن الكود" بالمنصة.',
    iconType: 'card',
    isEnabled: true,
  },
];

interface PlatformContextType {
  currentUser: UserProfile | null;
  activeGrade: GradeLevel | 'all';
  setActiveGrade: (grade: GradeLevel | 'all') => void;
  login: (emailOrPhone: string, name?: string, phone?: string, grade?: GradeLevel, code?: string) => boolean;
  logout: () => void;
  // Lectures / Videos
  lectures: Lecture[];
  addLecture: (lecture: Omit<Lecture, 'id' | 'dateAdded'>) => Promise<{ success: boolean; error?: any; errorMessage?: string }> | void;
  updateLecture: (id: string, updated: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;
  // Homework
  homeworks: Homework[];
  addHomework: (hw: Omit<Homework, 'id' | 'dateAdded'>) => void;
  updateHomework: (id: string, updated: Partial<Homework>) => void;
  deleteHomework: (id: string) => void;
  // Files (PDF / Word / Excel / Images)
  files: FileDocument[];
  addFile: (file: Omit<FileDocument, 'id' | 'dateAdded'>) => Promise<{ success: boolean; error?: any; errorMessage?: string }> | void;
  updateFile: (id: string, updated: Partial<FileDocument>) => void;
  deleteFile: (id: string) => void;
  // Exams
  exams: Exam[];
  addExam: (exam: Omit<Exam, 'id' | 'dateAdded'>) => void;
  updateExam: (id: string, updated: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  // Honor Board
  honoredStudents: HonoredStudent[];
  addHonoredStudent: (student: Omit<HonoredStudent, 'id' | 'dateAdded'>) => void;
  deleteHonoredStudent: (id: string) => void;
  // Recharge Codes & Wallet
  rechargeCodes: RechargeCode[];
  transactions: WalletTransaction[];
  generateRechargeCode: (code: string, value: number) => boolean;
  generateBulkRechargeCodes: (
    count: number,
    value: number,
    maxUses?: 1 | 2,
    prefix?: string,
    courseId?: string,
    courseTitle?: string
  ) => Promise<{ success: boolean; count: number; codes: RechargeCode[] }>;
  deleteRechargeCode: (code: string) => void;
  redeemCode: (code: string) => { success: boolean; message: string; amount?: number };
  // Access Control & Direct Teacher Free Pass
  authorizedStudents: AuthorizedStudent[];
  addAuthorizedStudent: (phone: string, studentCode: string, studentName: string, lectureId: string) => void;
  removeAuthorizedStudent: (id: string) => void;
  grantFreeAccess: (studentIdOrPhone: string, lectureId?: string) => void;
  hasAccessToLecture: (lectureId: string) => boolean;
  purchaseLecture: (lectureId: string) => { success: boolean; message: string };
  verifyPhoneAndCodeAccess: (phone: string, studentCode: string, lectureId: string) => { success: boolean; message: string };
  // Secretaries & Assistants Management
  secretaries: Secretary[];
  addSecretary: (name: string, phone: string, notes?: string) => void;
  deleteSecretary: (id: string) => void;
  // Payment Methods Management
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (id: string, updated: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;
  // Appearance & Styling Settings
  settings: PlatformSettings;
  updateSettings: (newSettings: Partial<PlatformSettings>) => void;
  // In-App Video & Document Viewers
  activeVideo: Lecture | { title: string; videoUrl: string } | null;
  setActiveVideo: (video: Lecture | { title: string; videoUrl: string } | null) => void;
  activeDocument: { title: string; fileUrl: string; fileName?: string; fileType?: string } | null;
  setActiveDocument: (doc: { title: string; fileUrl: string; fileName?: string; fileType?: string } | null) => void;
  // Modals
  isAdminPanelOpen: boolean;
  setIsAdminPanelOpen: (open: boolean) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  selectedCourseForDetails: Lecture | null;
  setSelectedCourseForDetails: (lec: Lecture | null) => void;
  // Strict Case-Sensitive Authentication & Student Directory
  registeredAccounts: RegisteredAccount[];
  loginStrict: (
    identifier: string,
    password: string,
    studentCode?: string,
    parentPhone?: string,
    age?: number,
    subscriptionType?: SubscriptionType
  ) => Promise<{ success: boolean; error?: string }>;
  registerStrict: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    studentCode: string;
    parentPhone: string;
    age?: number;
    subscriptionType?: SubscriptionType;
    grade: GradeLevel;
    governorate: string;
  }) => Promise<{ success: boolean; error?: string }>;
  addRegisteredStudent: (data: {
    name: string;
    phone: string;
    parentPhone: string;
    studentCode: string;
    password?: string;
    email?: string;
    grade: GradeLevel;
    governorate?: string;
    subscriptionType?: SubscriptionType;
    age?: number;
    walletBalance?: number;
  }) => RegisteredAccount;
  updateRegisteredStudent: (id: string, data: Partial<RegisteredAccount>) => void;
  deleteRegisteredStudent: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearAllStudents: () => Promise<void>;
  // Live Student Logins Alerts (إشعارات دخول الطلاب اللحظية للمستر)
  liveLoginAlerts: LiveLoginAlert[];
  dismissLoginAlert: (alertId: string) => void;
  clearAllLoginAlerts: () => void;
  // Real-Time Student Activity Tracking & Matrix
  studentActivities: StudentActivity[];
  examSubmissions: ExamSubmission[];
  studentAccessMap: Record<string, StudentAccessState>;
  recordLectureEntry: (lectureId: string, lectureTitle: string) => void;
  markLectureCompleted: (lectureId: string, lectureTitle: string) => Promise<{ success: boolean; completedAt: string }>;
  isLectureCompleted: (lectureId: string) => boolean;
  recordExamResult: (
    examId: string,
    examTitle: string,
    score: number,
    maxScore: number,
    timeSpentMinutes?: number,
    extraOptions?: {
      assessmentType?: 'exam' | 'sheet' | 'homework';
      lessonTitle?: string;
      autoMcqScore?: number;
      autoMcqMax?: number;
      essayAnswers?: Record<string, string>;
      essayScores?: Record<string, number>;
      blankCount?: number;
      status?: 'pending_teacher_review' | 'fully_graded';
    }
  ) => void;
  updateExamSubmissionGrade: (
    submissionId: string,
    teacherExtraScore: number,
    essayScores?: Record<string, number>
  ) => void;
  recordHomeworkAction: (
    homeworkId: string,
    homeworkTitle: string,
    isSolved: boolean,
    scoreInfo?: { score?: number; maxScore?: number }
  ) => void;
  getExamRankings: (examId: string, typeFilter?: 'exam' | 'sheet') => ExamSubmission[];
  getStudentDossier: (studentId: string) => StudentDossier | null;
  // Payment Verification & Receipt Processing (20-min activation)
  paymentRequests: PaymentReceiptRequest[];
  submitPaymentReceipt: (data: {
    lectureId: string;
    lectureTitle: string;
    amount: number;
    paymentMethodName: string;
    screenshotUrl: string;
    notes?: string;
  }) => { success: boolean; message: string };
  approvePaymentRequest: (id: string) => void;
  rejectPaymentRequest: (id: string, reason?: string) => void;
  addBatchAuthorizedStudents: (students: { studentName: string; phone: string; studentCode: string; lectureId: string }[]) => number;
  // Broadcast Notifications & Global Messaging
  broadcastNotifications: BroadcastNotification[];
  sendBroadcastNotification: (title: string, message: string, targetGrade?: GradeLevel | 'all', priority?: 'normal' | 'urgent') => void;
  deleteBroadcastNotification: (id: string) => void;
  unreadBroadcastCount: number;
  markBroadcastsAsRead: () => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  // Teacher Personal Profile
  teacherProfile: TeacherProfile;
  updateTeacherProfile: (profile: Partial<TeacherProfile>) => void;
  // Auto-save telemetry
  lastAutoSavedAt: string | null;
  isAutoSaving: boolean;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const roleParam = (params.get('role') || params.get('user') || params.get('login') || '').toLowerCase();
        if (roleParam === 'teacher' || roleParam === 'amr' || roleParam === 'admin') {
          const teacherUser: UserProfile = {
            id: 'teacher_amr_owner',
            name: 'مستر عمرو السيد',
            phone: '01069780486',
            email: 'amr12345@gmail.com',
            governorate: 'الدقهلية',
            role: 'admin',
            grade: 'sec3',
            walletBalance: 99999,
            enrolledLectureIds: [],
          };
          localStorage.setItem('amr_chem_user', JSON.stringify(teacherUser));
          return teacherUser;
        }
        if (roleParam === 'secretary') {
          const secUser: UserProfile = {
            id: 'sec_amr_admin',
            name: 'سكرتارية مستر عمرو السيد',
            phone: '01069780486',
            email: 'secretary@amr-chem.com',
            governorate: 'الدقهلية',
            role: 'secretary',
            grade: 'sec3',
            walletBalance: 50000,
            enrolledLectureIds: [],
          };
          localStorage.setItem('amr_chem_user', JSON.stringify(secUser));
          return secUser;
        }
      }
      const saved = localStorage.getItem('amr_chem_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeGrade, setActiveGrade] = useState<GradeLevel | 'all'>('all');

  // Enforce Strict Grade Isolation:
  // A student in Grade 3 NEVER sees Grade 1 or 2, and activeGrade is locked strictly to their enrolled grade.
  useEffect(() => {
    if (currentUser?.role === 'student' && currentUser.grade) {
      if (activeGrade !== currentUser.grade) {
        setActiveGrade(currentUser.grade);
      }
    }
  }, [currentUser, activeGrade]);

  const [settings, setSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Apply theme settings to DOM (Dark, Light, System, Colors, and Fonts)
  useEffect(() => {
    try {
      localStorage.setItem('amr_chem_settings', JSON.stringify(settings));

      const applyTheme = (isDark: boolean) => {
        if (isDark) {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      };

      // Apply primary color accent to HTML attribute and custom font
      document.documentElement.setAttribute('data-color', settings.primaryColor || 'cyan');
      document.body.style.fontFamily = `'${settings.fontFamily || 'Alexandria'}', system-ui, sans-serif`;

      if (settings.themeMode === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(systemPrefersDark);

        const mediaListener = (e: MediaQueryListEvent) => applyTheme(e.matches);
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        mql.addEventListener('change', mediaListener);
        return () => mql.removeEventListener('change', mediaListener);
      } else {
        applyTheme(settings.themeMode === 'dark');
      }
    } catch {
      // fallback
    }
  }, [settings]);

  const [lectures, setLectures] = useState<Lecture[]>(INITIAL_CURRICULUM_LECTURES);
  const [homeworks, setHomeworks] = useState<Homework[]>(INITIAL_CURRICULUM_HOMEWORKS);
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [exams, setExams] = useState<Exam[]>(INITIAL_CURRICULUM_EXAMS);
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>(INITIAL_REGISTERED_USERS);
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>(INITIAL_STUDENT_ACTIVITIES);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>(INITIAL_EXAM_SUBMISSIONS);
  const [studentAccessMap, setStudentAccessMap] = useState<Record<string, StudentAccessState>>(INITIAL_STUDENT_ACCESS);
  const [paymentRequests, setPaymentRequests] = useState<PaymentReceiptRequest[]>([]);
  const [honoredStudents, setHonoredStudents] = useState<HonoredStudent[]>([]);
  const [rechargeCodes, setRechargeCodes] = useState<RechargeCode[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [authorizedStudents, setAuthorizedStudents] = useState<AuthorizedStudent[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENT_METHODS);

  const [activeVideo, setActiveVideo] = useState<Lecture | { title: string; videoUrl: string } | null>(null);
  const [activeDocument, setActiveDocument] = useState<{
    title: string;
    fileUrl: string;
    fileName?: string;
    fileType?: string;
  } | null>(null);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<Lecture | null>(null);

  const [broadcastNotifications, setBroadcastNotifications] = useState<BroadcastNotification[]>(INITIAL_BROADCAST_NOTIFICATIONS);

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_read_notifs_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [liveLoginAlerts, setLiveLoginAlerts] = useState<LiveLoginAlert[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(DEFAULT_TEACHER_PROFILE);

  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const syncServerStorePatch = async (patch: Record<string, any>) => {
    setIsAutoSaving(true);
    try {
      await fetch('/api/platform-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      setLastAutoSavedAt(new Date().toISOString());
    } catch {
      // Non-blocking fallback
    } finally {
      setIsAutoSaving(false);
    }
  };

  const patchServerCollection = async (
    collection: string,
    action: 'upsert' | 'update' | 'delete' | 'replace',
    payload: { item?: any; id?: string; keyField?: string }
  ) => {
    setIsAutoSaving(true);
    try {
      await fetch('/api/platform-data/patch-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, action, ...payload }),
      });
      setLastAutoSavedAt(new Date().toISOString());
    } catch {
      // Non-blocking when offline/static
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Boot-time Cloud Hydration: Purge legacy localStorage DB caches and load 100% fresh state from Supabase & Server Store
  useEffect(() => {
    let mounted = true;
    purgeLegacyLocalCaches();

    const hydrateCloudState = async () => {
      try {
        const [serverRes, supaProfiles] = await Promise.all([
          fetch('/api/platform-data')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetchAllProfilesFromSupabase().catch(() => []),
        ]);

        if (!mounted) return;
        const data = serverRes?.data;

        if (data) {
          if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
          if (data.teacherProfile) setTeacherProfile((prev) => ({ ...prev, ...data.teacherProfile }));
          if (Array.isArray(data.lectures) && data.lectures.length > 0) {
            setLectures((prev) => {
              const map = new Map<string, Lecture>();
              prev.forEach((l) => map.set(ensureUuid(l.id), l));
              data.lectures.forEach((inc: Lecture) => {
                const k = ensureUuid(inc.id);
                const ex = map.get(k);
                map.set(
                  k,
                  ex
                    ? {
                        ...ex,
                        ...inc,
                        lessons: inc.lessons && inc.lessons.length > 0 ? inc.lessons : ex.lessons,
                        coverImageUrl: inc.coverImageUrl || ex.coverImageUrl,
                        instructions: inc.instructions ?? ex.instructions,
                        scheduleText: inc.scheduleText || ex.scheduleText,
                      }
                    : inc
                );
              });
              return Array.from(map.values());
            });
          }
          if (Array.isArray(data.homeworks) && data.homeworks.length > 0) setHomeworks(data.homeworks);
          if (Array.isArray(data.files) && data.files.length > 0) setFiles(data.files);
          if (Array.isArray(data.exams) && data.exams.length > 0) setExams(data.exams);
          if (Array.isArray(data.studentActivities)) setStudentActivities(data.studentActivities);
          if (Array.isArray(data.examSubmissions)) setExamSubmissions(data.examSubmissions);
          if (data.studentAccessMap && typeof data.studentAccessMap === 'object') {
            setStudentAccessMap(data.studentAccessMap);
          }
          if (Array.isArray(data.paymentRequests)) setPaymentRequests(data.paymentRequests);
          if (Array.isArray(data.honoredStudents)) setHonoredStudents(data.honoredStudents);
          if (Array.isArray(data.rechargeCodes)) setRechargeCodes(data.rechargeCodes);
          if (Array.isArray(data.transactions)) setTransactions(data.transactions);
          if (Array.isArray(data.authorizedStudents)) setAuthorizedStudents(data.authorizedStudents);
          if (Array.isArray(data.secretaries)) setSecretaries(data.secretaries);
          if (Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
            setPaymentMethods(data.paymentMethods);
          }
          if (Array.isArray(data.broadcastNotifications) && data.broadcastNotifications.length > 0) {
            setBroadcastNotifications(data.broadcastNotifications);
          }
          if (Array.isArray(data.liveLoginAlerts)) setLiveLoginAlerts(data.liveLoginAlerts);
        }

        // Merge INITIAL_REGISTERED_USERS + server + live Supabase profiles
        const accMap = new Map<string, RegisteredAccount>();
        INITIAL_REGISTERED_USERS.forEach((u) => accMap.set(ensureUuid(u.id), u));
        if (Array.isArray(data?.registeredAccounts)) {
          data.registeredAccounts.forEach((u: RegisteredAccount) => accMap.set(ensureUuid(u.id), u));
        }
        supaProfiles.forEach((sp) => {
          const key = ensureUuid(sp.id);
          const prev = accMap.get(key);
          accMap.set(
            key,
            prev
              ? {
                  ...prev,
                  ...sp,
                  id: prev.id || sp.id,
                  password: sp.password || prev.password,
                  parentPhone: sp.parentPhone || prev.parentPhone,
                  studentCode: sp.studentCode || prev.studentCode,
                }
              : sp
          );
        });
        const mergedAccounts = Array.from(accMap.values());
        setRegisteredAccounts(mergedAccounts);

        // Refresh active logged-in student profile against cloud so walletBalance/grade/role stay synced across phones
        setCurrentUser((prevUser) => {
          if (!prevUser || prevUser.role !== 'student') return prevUser;
          const liveAcc = mergedAccounts.find(
            (a) =>
              ensureUuid(a.id) === ensureUuid(prevUser.id) ||
              (a.email && prevUser.email && a.email.toLowerCase() === prevUser.email.toLowerCase()) ||
              (a.phone && prevUser.phone && a.phone.replace(/\D/g, '') === prevUser.phone.replace(/\D/g, ''))
          );
          if (!liveAcc) return prevUser;
          return {
            ...prevUser,
            id: liveAcc.id,
            name: liveAcc.name || prevUser.name,
            email: liveAcc.email || prevUser.email,
            phone: liveAcc.phone || prevUser.phone,
            parentPhone: liveAcc.parentPhone || prevUser.parentPhone,
            studentCode: liveAcc.studentCode || prevUser.studentCode,
            grade: liveAcc.grade || prevUser.grade,
            governorate: liveAcc.governorate || prevUser.governorate,
            walletBalance: liveAcc.walletBalance ?? prevUser.walletBalance,
          };
        });
      } catch (err) {
        console.warn('[Cloud Hydration] Notice:', err);
      }
    };

    hydrateCloudState();
    return () => {
      mounted = false;
    };
  }, []);

  const updateTeacherProfile = (updated: Partial<TeacherProfile>) => {
    setTeacherProfile((prev) => {
      const next = { ...prev, ...updated, updatedAt: new Date().toISOString() };
      saveDocument('teacher_profile', 'mr_amr', next);
      syncServerStorePatch({ teacherProfile: next });
      return next;
    });
  };

  const triggerLiveLoginAlert = (account: RegisteredAccount) => {
    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newAlert: LiveLoginAlert = {
      id: `alert_login_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: account.id,
      studentName: account.name,
      studentPhone: account.phone,
      parentPhone: account.parentPhone || account.phone,
      studentCode: account.studentCode,
      grade: account.grade,
      governorate: account.governorate,
      subscriptionType: account.subscriptionType || 'course',
      age: account.age,
      timestamp: now.toISOString(),
      timeFormatted: `اليوم ${timeFormatted}`,
      unreadByAdmin: true,
    };
    setLiveLoginAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
    saveDocument('live_login_alerts', newAlert.id, newAlert);
    patchServerCollection('liveLoginAlerts', 'upsert', { item: newAlert });
  };

  const dismissLoginAlert = (alertId: string) => {
    setLiveLoginAlerts((prev) => prev.filter((a) => a.id !== alertId));
    deleteDocument('live_login_alerts', alertId);
    patchServerCollection('liveLoginAlerts', 'delete', { id: alertId });
  };

  const clearAllLoginAlerts = () => {
    liveLoginAlerts.forEach((a) => deleteDocument('live_login_alerts', a.id));
    setLiveLoginAlerts([]);
    patchServerCollection('liveLoginAlerts', 'replace', { item: [] });
  };

  const addRegisteredStudent = (studentData: {
    name: string;
    phone: string;
    parentPhone: string;
    studentCode: string;
    password?: string;
    email?: string;
    grade: GradeLevel;
    governorate?: string;
    subscriptionType?: SubscriptionType;
    age?: number;
    walletBalance?: number;
  }): RegisteredAccount => {
    const cleanPhone = studentData.phone.trim();
    const cleanParentPhone = studentData.parentPhone.trim();
    const cleanCode = studentData.studentCode.trim().toUpperCase();
    const cleanName = studentData.name.trim();

    const newStudent: RegisteredAccount = {
      id: generateUuid(),
      name: cleanName,
      phone: cleanPhone,
      parentPhone: cleanParentPhone,
      studentCode: cleanCode,
      password: studentData.password?.trim() || cleanCode,
      email: studentData.email?.trim() || `${cleanCode.toLowerCase()}@amr-chem.com`,
      grade: studentData.grade,
      governorate: studentData.governorate?.trim() || 'القاهرة',
      subscriptionType: studentData.subscriptionType || 'course',
      age: studentData.age || 18,
      role: 'student',
      walletBalance: studentData.walletBalance || 0,
      registeredAt: new Date().toISOString().split('T')[0],
      isOnline: false,
    };

    setRegisteredAccounts((prev) => [newStudent, ...prev]);
    upsertStudentProfileInSupabase(newStudent).then(() => {
      setLastAutoSavedAt(new Date().toISOString());
    });
    return newStudent;
  };

  const updateRegisteredStudent = (id: string, data: Partial<RegisteredAccount>) => {
    let updatedFull: RegisteredAccount | null = null;
    setRegisteredAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          updatedFull = { ...acc, ...data };
          return updatedFull;
        }
        return acc;
      })
    );
    if (updatedFull) {
      upsertStudentProfileInSupabase(updatedFull).then(() => {
        setLastAutoSavedAt(new Date().toISOString());
      });
    } else {
      updateDocument('registered_accounts', id, data);
      patchServerCollection('registeredAccounts', 'update', { id, item: data });
    }
  };

  const deleteRegisteredStudent = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const cleanTargetUuid = ensureUuid(id);
    const targetAcc = registeredAccounts.find(
      (acc) => acc.id === id || ensureUuid(acc.id) === cleanTargetUuid
    );

    // 1. Immediate optimistic UI update matching both raw ID and UUID
    setRegisteredAccounts((prev) =>
      prev.filter((acc) => acc.id !== id && ensureUuid(acc.id) !== cleanTargetUuid)
    );
    setLiveLoginAlerts((prev) =>
      prev.filter((a) => a.studentId !== id && ensureUuid(a.studentId) !== cleanTargetUuid)
    );
    setAuthorizedStudents((prev) =>
      prev.filter(
        (a) =>
          a.id !== id &&
          a.phone !== id &&
          (!targetAcc?.phone || a.phone !== targetAcc.phone)
      )
    );
    setStudentActivities((prev) =>
      prev.filter((act) => act.studentId !== id && ensureUuid(act.studentId) !== cleanTargetUuid)
    );
    setExamSubmissions((prev) =>
      prev.filter((sub) => sub.studentId !== id && ensureUuid(sub.studentId) !== cleanTargetUuid)
    );
    setStudentAccessMap((prev) => {
      const nextMap = { ...prev };
      delete nextMap[id];
      delete nextMap[cleanTargetUuid];
      return nextMap;
    });

    // 2. Persist deletion across both Supabase `profiles` and `/api/platform-data`
    setIsAutoSaving(true);
    try {
      const [supaRes] = await Promise.all([
        deleteStudentProfileInSupabase({
          id,
          email: targetAcc?.email,
          phone: targetAcc?.phone,
        }),
        patchServerCollection('registeredAccounts', 'delete', {
          id,
          item: targetAcc ? { id: targetAcc.id, email: targetAcc.email, phone: targetAcc.phone } : { id },
        }),
      ]);
      setLastAutoSavedAt(new Date().toISOString());
      return { success: true, error: supaRes.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء حذف الطالب' };
    } finally {
      setIsAutoSaving(false);
    }
  };

  const clearAllStudents = async () => {
    setIsAutoSaving(true);
    setRegisteredAccounts(INITIAL_REGISTERED_USERS);
    setStudentActivities([]);
    setExamSubmissions([]);
    setStudentAccessMap({});
    setAuthorizedStudents([]);
    setLiveLoginAlerts([]);
    try {
      await Promise.all([
        clearAllStudentProfilesInSupabase(),
        syncServerStorePatch({
          registeredAccounts: INITIAL_REGISTERED_USERS,
          studentActivities: [],
          examSubmissions: [],
          studentAccessMap: {},
          authorizedStudents: [],
          liveLoginAlerts: [],
        }),
      ]);
      setLastAutoSavedAt(new Date().toISOString());
    } finally {
      setIsAutoSaving(false);
    }
  };

  const unreadBroadcastCount = broadcastNotifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const markBroadcastsAsRead = () => {
    const allIds = broadcastNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('amr_chem_read_notifs_v3', JSON.stringify(updated));
    } catch {}
  };

  const sendBroadcastNotification = (
    title: string,
    message: string,
    targetGrade: GradeLevel | 'all' = 'all',
    priority: 'normal' | 'urgent' = 'normal'
  ) => {
    const newNotif: BroadcastNotification = {
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      senderName: currentUser?.name || 'مستر عمرو السيد',
      senderRole: currentUser?.role === 'secretary' ? 'secretary' : 'admin',
      targetGrade,
      createdAt: new Date().toISOString(),
      priority,
    };
    setBroadcastNotifications((prev) => [newNotif, ...prev]);
    saveDocument('broadcast_notifications', newNotif.id, newNotif);
    patchServerCollection('broadcastNotifications', 'upsert', { item: newNotif });
  };

  const deleteBroadcastNotification = (id: string) => {
    deleteDocument('broadcast_notifications', id);
    patchServerCollection('broadcastNotifications', 'delete', { id });
    setBroadcastNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('amr_chem_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('amr_chem_user');
      }
    } catch {}
  }, [currentUser]);

  // Real-Time Cloud Supabase Synchronizer across all browsers, students, and devices
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const mergeByKey = <T extends Record<string, any>>(existing: T[], incoming: T[], key = 'id'): T[] => {
      const map = new Map<string, T>();
      existing.forEach((it) => map.set(ensureUuid(String(it[key] || '')), it));
      incoming.forEach((it) => {
        const k = ensureUuid(String(it[key] || ''));
        const prev = map.get(k);
        if (!prev) {
          map.set(k, it);
          return;
        }
        const cleanedIncoming: Record<string, any> = {};
        for (const [prop, val] of Object.entries(it)) {
          if (val !== undefined) cleanedIncoming[prop] = val;
        }
        const merged: Record<string, any> = { ...prev, ...cleanedIncoming, id: prev.id || it.id };
        if (Array.isArray(prev.lessons) && prev.lessons.length > 0 && (!Array.isArray(it.lessons) || it.lessons.length === 0)) {
          merged.lessons = prev.lessons;
        }
        if (prev.coverImageUrl && !it.coverImageUrl) merged.coverImageUrl = prev.coverImageUrl;
        if (prev.instructions && !it.instructions) merged.instructions = prev.instructions;
        if (prev.scheduleText && !it.scheduleText) merged.scheduleText = prev.scheduleText;
        map.set(k, merged as T);
      });
      return Array.from(map.values());
    };

    try {
      unsubscribes.push(
        subscribeToCollection<Lecture>('lectures', (items) => {
          if (items.length > 0) setLectures((prev) => mergeByKey(prev, items));
        }, INITIAL_CURRICULUM_LECTURES)
      );

      unsubscribes.push(
        subscribeToCollection<Homework>('homeworks', (items) => {
          if (items.length > 0) setHomeworks((prev) => mergeByKey(prev, items));
        }, INITIAL_CURRICULUM_HOMEWORKS)
      );

      unsubscribes.push(
        subscribeToCollection<Exam>('exams', (items) => {
          if (items.length > 0) setExams((prev) => mergeByKey(prev, items));
        }, INITIAL_CURRICULUM_EXAMS)
      );

      unsubscribes.push(
        subscribeToCollection<FileDocument>('files', (items) => {
          if (items.length > 0) setFiles((prev) => mergeByKey(prev, items));
        })
      );

      unsubscribes.push(
        subscribeToCollection<RegisteredAccount>('registered_accounts', (items) => {
          if (items.length > 0) {
            setRegisteredAccounts((prev) => mergeByKey(prev, items));
          }
        }, INITIAL_REGISTERED_USERS)
      );

      unsubscribes.push(
        subscribeToCollection<Secretary>('secretaries', (items) => {
          setSecretaries(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<RechargeCode>('recharge_codes', (items) => {
          setRechargeCodes(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<PaymentReceiptRequest>('payment_requests', (items) => {
          setPaymentRequests(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<PaymentMethod>('payment_methods', (items) => {
          if (items.length > 0) setPaymentMethods(items);
        }, DEFAULT_PAYMENT_METHODS)
      );

      unsubscribes.push(
        subscribeToCollection<BroadcastNotification>('broadcast_notifications', (items) => {
          if (items.length > 0) setBroadcastNotifications(items);
        }, INITIAL_BROADCAST_NOTIFICATIONS)
      );

      unsubscribes.push(
        subscribeToCollection<StudentActivity>('student_activities', (items) => {
          if (items.length > 0) setStudentActivities(items);
        }, INITIAL_STUDENT_ACTIVITIES)
      );

      unsubscribes.push(
        subscribeToCollection<LiveLoginAlert>('live_login_alerts', (items) => {
          setLiveLoginAlerts(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<HonoredStudent>('honored_students', (items) => {
          setHonoredStudents(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<AuthorizedStudent>('authorized_students', (items) => {
          setAuthorizedStudents(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<TeacherProfile>('teacher_profile', (items) => {
          if (items.length > 0) setTeacherProfile(items[0]);
        }, [DEFAULT_TEACHER_PROFILE])
      );
    } catch (e) {
      console.warn('[Firestore] Error attaching listeners:', e);
    }

    return () => {
      unsubscribes.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, []);

  // Helper to record an activity entry in real-time
  const recordActivity = (activity: Omit<StudentActivity, 'id' | 'timestamp' | 'timeAgo'>) => {
    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newAct: StudentActivity = {
      ...activity,
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString().replace('T', ' ').substring(0, 16),
      timeAgo: `اليوم ${timeFormatted}`,
    };
    setStudentActivities((prev) => [newAct, ...prev.slice(0, 49)]);
    saveDocument('student_activities', newAct.id, newAct);
    patchServerCollection('studentActivities', 'upsert', { item: newAct });
  };

  // Cloud-Authoritative Authentication (Searches live Supabase `profiles` + server store across any device)
  const loginStrict = async (
    identifier: string,
    password: string,
    studentCode?: string,
    parentPhone?: string,
    age?: number,
    subscriptionType?: SubscriptionType
  ): Promise<{ success: boolean; error?: string }> => {
    const rawId = identifier.trim();
    const rawPass = password.trim();
    const rawCode = studentCode ? studentCode.trim() : '';

    if (!rawId) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل.' };
    }

    // 1. Direct Master Admin: Mr. Amr El-Sayed
    const isAmrDirectAdmin =
      rawId.toLowerCase() === 'amr12345@gmail.com' ||
      rawId.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      rawId === 'Amr.ElSayed@Chemistry.Edu';

    if (isAmrDirectAdmin || rawId === TEACHER_PHONE_LOCAL || rawId === TEACHER_PHONE) {
      const adminProfile: UserProfile = {
        id: 'admin_amr_sayed',
        name: 'مستر عمرو السيد',
        email: 'Amr.ElSayed@Chemistry.Edu',
        phone: TEACHER_PHONE_LOCAL,
        governorate: 'المنصورة / القاهرة',
        grade: 'sec3',
        role: 'admin',
        walletBalance: 9999,
        enrolledLectureIds: [],
      };
      setCurrentUser(adminProfile);
      setIsAdminPanelOpen(true);
      return { success: true };
    }

    // Secretary Direct Bypass
    const cleanRawDigits = rawId.replace(/\D/g, '');
    const isSecretaryDirect =
      rawId.toLowerCase().includes('secretary') ||
      secretaries.some((s) => {
        const cleanSPhoneDigits = (s.phone || '').replace(/\D/g, '');
        return (
          s.phone.trim() === rawId ||
          (cleanRawDigits.length >= 8 && cleanSPhoneDigits.length >= 8 && cleanRawDigits === cleanSPhoneDigits) ||
          s.name.toLowerCase() === rawId.toLowerCase()
        );
      });

    if (isSecretaryDirect) {
      const secProfile: UserProfile = {
        id: 'sec_' + Math.random().toString(36).substring(2, 7),
        name: 'سكرتارية مستر عمرو السيد',
        email: rawId.includes('@') ? rawId : 'secretary@amr-chem.com',
        phone: rawId,
        governorate: 'المنصورة / القاهرة',
        grade: 'sec3',
        role: 'secretary',
        walletBalance: 0,
        enrolledLectureIds: [],
      };
      setCurrentUser(secProfile);
      setIsAdminPanelOpen(true);
      return { success: true };
    }

    if (!rawPass) {
      return { success: false, error: 'يرجى كتابة كلمة المرور الخاصة بحسابك للدخول.' };
    }

    // 2. Always query LIVE Supabase `profiles` + shared server store so any second phone finds the account immediately
    const rawLower = rawId.toLowerCase();
    const cleanDigits = rawId.replace(/\D/g, '');
    const cleanUpperCode = rawId.toUpperCase();

    const cloudAccount = await findStudentProfileInSupabase(rawId);

    const memoryAccount = registeredAccounts.find((acc) => {
      const accEmail = (acc.email || '').toLowerCase();
      const accPhoneDigits = (acc.phone || '').replace(/\D/g, '');
      const accCode = (acc.studentCode || '').toUpperCase();

      return (
        accEmail === rawLower ||
        (cleanDigits.length >= 8 && accPhoneDigits.length >= 8 && accPhoneDigits === cleanDigits) ||
        (accCode && accCode === cleanUpperCode)
      );
    });

    const exactAccount: RegisteredAccount | null = cloudAccount
      ? {
          ...(memoryAccount || {}),
          ...cloudAccount,
          id: cloudAccount.id || memoryAccount?.id || generateUuid(),
          password: cloudAccount.password || memoryAccount?.password || '',
          parentPhone: cloudAccount.parentPhone || memoryAccount?.parentPhone || '',
          studentCode: cloudAccount.studentCode || memoryAccount?.studentCode || '',
        }
      : memoryAccount || null;

    if (!exactAccount) {
      return {
        success: false,
        error: 'لم يتم العثور على حساب مسجل بهذا البريد أو الهاتف في السحابة. يرجى التأكد من البيانات أو إنشاء حساب جديد.',
      };
    }

    // 3. Strict Password Verification against cloud/account password
    if (exactAccount.password && exactAccount.password !== rawPass) {
      return {
        success: false,
        error: 'كلمة المرور غير صحيحة! يرجى كتابة كلمة المرور الخاصة بحسابك بدقة.',
      };
    }

    // 4. Student Code Verification (if explicitly provided)
    if (rawCode && exactAccount.studentCode && exactAccount.studentCode.toUpperCase() !== rawCode.toUpperCase()) {
      return {
        success: false,
        error: `كود الطالب (${rawCode}) غير متطابق مع الكود المسجل لهذا الحساب.`,
      };
    }

    // 5. Update lastLoginAt & merge account cleanly into cloud + state
    const updatedAccount: RegisteredAccount = {
      ...exactAccount,
      parentPhone: parentPhone?.trim() || exactAccount.parentPhone || '',
      age: age || exactAccount.age,
      subscriptionType: subscriptionType || exactAccount.subscriptionType || 'course',
      lastLoginAt: new Date().toISOString(),
      isOnline: true,
    };

    setRegisteredAccounts((prev) => {
      const idx = prev.findIndex((a) => ensureUuid(a.id) === ensureUuid(updatedAccount.id));
      if (idx >= 0) {
        return prev.map((a, i) => (i === idx ? updatedAccount : a));
      }
      return [updatedAccount, ...prev];
    });
    upsertStudentProfileInSupabase(updatedAccount);

    const studentProfile: UserProfile = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      email: updatedAccount.email,
      phone: updatedAccount.phone,
      studentCode: updatedAccount.studentCode,
      parentPhone: updatedAccount.parentPhone,
      age: updatedAccount.age,
      subscriptionType: updatedAccount.subscriptionType,
      lastLoginAt: updatedAccount.lastLoginAt,
      isOnline: true,
      governorate: updatedAccount.governorate,
      grade: updatedAccount.grade,
      role: updatedAccount.role,
      walletBalance: updatedAccount.walletBalance,
      enrolledLectureIds: [],
    };
    setCurrentUser(studentProfile);

    triggerLiveLoginAlert(updatedAccount);

    recordActivity({
      studentId: updatedAccount.id,
      studentName: updatedAccount.name,
      studentPhone: updatedAccount.phone,
      studentCode: updatedAccount.studentCode,
      grade: updatedAccount.grade,
      type: 'login',
      itemId: 'auth_login',
      itemTitle: 'تسجيل الدخول إلى المنصة',
      status: 'completed',
    });

    return { success: true };
  };

  // Cloud Registration: Saves directly to Supabase `profiles` & server store and awaits confirmation
  const registerStrict = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    studentCode: string;
    parentPhone: string;
    age?: number;
    subscriptionType?: SubscriptionType;
    grade: GradeLevel;
    governorate: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = data.phone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const cleanEmail = data.email.trim();
    const cleanEmailLower = cleanEmail.toLowerCase();

    // 1. Check duplicate both locally and live in Supabase `profiles`
    const existingLocal = registeredAccounts.find((a) => {
      const aDigits = (a.phone || '').replace(/\D/g, '');
      const phoneDup = a.phone === cleanPhone || (cleanDigits.length >= 8 && aDigits === cleanDigits);
      const emailDup = Boolean(cleanEmailLower && (a.email || '').toLowerCase() === cleanEmailLower);
      return phoneDup || emailDup;
    });
    if (existingLocal) {
      return {
        success: false,
        error: 'هذا البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة.',
      };
    }

    const [cloudByPhone, cloudByEmail] = await Promise.all([
      findStudentProfileInSupabase(cleanPhone),
      cleanEmail ? findStudentProfileInSupabase(cleanEmail) : Promise.resolve(null),
    ]);
    if (cloudByPhone || cloudByEmail) {
      return {
        success: false,
        error: 'هذا البريد الإلكتروني أو رقم الهاتف مسجل بالفعل في قاعدة البيانات. يرجى تسجيل الدخول مباشرة.',
      };
    }

    const newAcc: RegisteredAccount = {
      id: generateUuid(),
      name: data.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: data.password.trim(),
      studentCode: data.studentCode.trim().toUpperCase(),
      parentPhone: data.parentPhone.trim(),
      age: data.age || 18,
      subscriptionType: data.subscriptionType || 'course',
      lastLoginAt: new Date().toISOString(),
      isOnline: true,
      grade: data.grade,
      governorate: data.governorate.trim() || 'القاهرة',
      role: 'student',
      walletBalance: 0,
      registeredAt: new Date().toISOString().split('T')[0],
    };

    // 2. Persist immediately to Supabase `profiles` + `/api/platform-data` before confirming
    const saveResult = await upsertStudentProfileInSupabase(newAcc);
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error || 'تعذر حفظ بيانات الطالب في قاعدة البيانات السحابية. يرجى التحقق من الاتصال والمحاولة مرة أخرى.',
      };
    }

    setRegisteredAccounts((prev) => [newAcc, ...prev]);

    const initialAccess: StudentAccessState = {
      lectures: {},
      exams: {},
      homeworks: {},
    };
    setStudentAccessMap((prev) => ({
      ...prev,
      [newAcc.id]: initialAccess,
    }));
    patchServerCollection('studentAccessMap', 'upsert', { id: newAcc.id, item: initialAccess });

    // 3. Activate student session immediately with exact cloud ID & attributes
    const studentProfile: UserProfile = {
      id: newAcc.id,
      name: newAcc.name,
      email: newAcc.email,
      phone: newAcc.phone,
      studentCode: newAcc.studentCode,
      parentPhone: newAcc.parentPhone,
      age: newAcc.age,
      subscriptionType: newAcc.subscriptionType,
      lastLoginAt: newAcc.lastLoginAt,
      isOnline: true,
      governorate: newAcc.governorate,
      grade: newAcc.grade,
      role: newAcc.role,
      walletBalance: newAcc.walletBalance,
      enrolledLectureIds: [],
    };
    setCurrentUser(studentProfile);

    triggerLiveLoginAlert(newAcc);

    recordActivity({
      studentId: newAcc.id,
      studentName: newAcc.name,
      studentPhone: newAcc.phone,
      studentCode: newAcc.studentCode,
      grade: newAcc.grade,
      type: 'login',
      itemId: 'auth_register',
      itemTitle: 'إنشاء حساب طالب جديد وحفظه سحابياً',
      status: 'completed',
    });

    return { success: true };
  };

  // Backwards-compatible synchronous login helper
  const login = (
    emailOrPhone: string,
    name?: string,
    phone?: string,
    grade: GradeLevel = 'sec3',
    code?: string
  ): boolean => {
    const cleanPhone = (phone || emailOrPhone).trim();
    const matched = registeredAccounts.find(
      (a) =>
        (a.email && a.email.toLowerCase() === emailOrPhone.trim().toLowerCase()) ||
        (a.phone && a.phone.trim() === cleanPhone)
    );
    const studentProfile: UserProfile = matched
      ? {
          id: matched.id,
          name: matched.name,
          email: matched.email,
          phone: matched.phone,
          studentCode: matched.studentCode,
          parentPhone: matched.parentPhone,
          governorate: matched.governorate,
          grade: matched.grade,
          role: matched.role,
          walletBalance: matched.walletBalance,
          enrolledLectureIds: [],
        }
      : {
          id: generateUuid(),
          name: name?.trim() || 'طالب جديد',
          email: emailOrPhone.trim(),
          phone: cleanPhone,
          studentCode: code?.trim(),
          governorate: 'القاهرة',
          grade,
          role: 'student',
          walletBalance: 0,
          enrolledLectureIds: [],
        };
    setCurrentUser(studentProfile);
    return true;
  };

  // Live Tracking: Record lecture entry
  const recordLectureEntry = (lectureId: string, lectureTitle: string) => {
    if (!currentUser) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const entryState = { lectures: { [lectureId]: { entered: true, date: nowStr } } };
    setStudentAccessMap((prev) => {
      const current = prev[currentUser.id] || { lectures: {}, exams: {}, homeworks: {} };
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          lectures: {
            ...current.lectures,
            [lectureId]: { entered: true, date: nowStr },
          },
        },
      };
    });
    patchServerCollection('studentAccessMap', 'upsert', { id: currentUser.id, item: entryState });

    recordActivity({
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentPhone: currentUser.phone,
      studentCode: currentUser.studentCode,
      grade: currentUser.grade,
      type: 'lecture_enter',
      itemId: lectureId,
      itemTitle: lectureTitle,
      status: 'entered',
    });
  };

  // Live Tracking: Mark lecture completed by student & update Supabase + Server Store
  const markLectureCompleted = async (
    lectureId: string,
    lectureTitle: string
  ): Promise<{ success: boolean; completedAt: string }> => {
    const studentId = currentUser ? currentUser.id : 'guest_student';
    const studentName = currentUser ? currentUser.name : 'طالب المنصة';
    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dateFormatted = `${now.toLocaleDateString('ar-EG')} - ${timeFormatted}`;
    const nowIso = now.toISOString();

    setStudentAccessMap((prev) => {
      const current = prev[studentId] || { lectures: {}, exams: {}, homeworks: {} };
      const currentLec = current.lectures[lectureId] || { entered: true };
      const updatedLec = {
        ...currentLec,
        completed: true,
        completedAt: dateFormatted,
      };
      patchServerCollection('studentAccessMap', 'upsert', {
        id: studentId,
        item: { lectures: { [lectureId]: updatedLec } },
      });
      return {
        ...prev,
        [studentId]: {
          ...current,
          lectures: {
            ...current.lectures,
            [lectureId]: updatedLec,
          },
        },
      };
    });

    try {
      await saveDocument('student_progress', `${studentId}_${lectureId}`, {
        studentId,
        studentName,
        studentPhone: currentUser?.phone || '',
        studentCode: currentUser?.studentCode || '',
        grade: currentUser?.grade || 'sec3',
        lectureId,
        lectureTitle,
        completedAt: nowIso,
        completedAtFormatted: dateFormatted,
        status: 'completed',
      });
    } catch (e) {
      console.warn('[Supabase] Failed saving student_progress:', e);
    }

    if (currentUser) {
      recordActivity({
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentPhone: currentUser.phone,
        studentCode: currentUser.studentCode,
        grade: currentUser.grade,
        type: 'lecture_enter',
        itemId: lectureId,
        itemTitle: `إتمام حضور: ${lectureTitle}`,
        status: 'completed',
      });
    }

    return { success: true, completedAt: dateFormatted };
  };

  const isLectureCompleted = (lectureId: string): boolean => {
    const studentId = currentUser ? currentUser.id : 'guest_student';
    return !!studentAccessMap[studentId]?.lectures[lectureId]?.completed;
  };

  // Live Tracking: Record assessment submission (Exam / Sheet / Homework) with smart MCQ + Essay grading
  const recordExamResult = (
    examId: string,
    examTitle: string,
    score: number,
    maxScore: number,
    timeSpentMinutes: number = 1,
    extraOptions?: {
      assessmentType?: 'exam' | 'sheet' | 'homework';
      lessonTitle?: string;
      autoMcqScore?: number;
      autoMcqMax?: number;
      essayAnswers?: Record<string, string>;
      essayScores?: Record<string, number>;
      blankCount?: number;
      status?: 'pending_teacher_review' | 'fully_graded';
    }
  ) => {
    if (!currentUser) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const safeMax = maxScore > 0 ? maxScore : 1;
    const percentage = Math.round((score / safeMax) * 100);
    const assessmentType = extraOptions?.assessmentType || 'exam';

    const submission: ExamSubmission = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      examId,
      examTitle,
      assessmentType,
      lessonTitle: extraOptions?.lessonTitle,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentPhone: currentUser.phone,
      studentCode: currentUser.studentCode,
      grade: currentUser.grade,
      governorate: currentUser.governorate,
      score,
      maxScore,
      percentage,
      timeSpentMinutes,
      submittedAt: nowStr,
      autoMcqScore: extraOptions?.autoMcqScore !== undefined ? extraOptions.autoMcqScore : score,
      autoMcqMax: extraOptions?.autoMcqMax !== undefined ? extraOptions.autoMcqMax : maxScore,
      essayAnswers: extraOptions?.essayAnswers || {},
      essayScores: extraOptions?.essayScores,
      blankCount: extraOptions?.blankCount ?? 0,
      status: extraOptions?.status || 'fully_graded',
      teacherGraded: false,
    };

    // Replace previous submission by same student for the same exam/sheet/homework if re-graded or updated
    setExamSubmissions((prev) => {
      const filtered = prev.filter(
        (s) => !(s.examId === examId && s.studentId === currentUser.id && (s.assessmentType || 'exam') === assessmentType)
      );
      return [submission, ...filtered];
    });
    saveDocument('exam_submissions', submission.id, submission);
    patchServerCollection('examSubmissions', 'upsert', { item: submission });

    setStudentAccessMap((prev) => {
      const current = prev[currentUser.id] || { lectures: {}, exams: {}, homeworks: {} };
      if (assessmentType === 'sheet' || assessmentType === 'homework') {
        const hwUpdate = { [examId]: { solved: true, score, maxScore, percentage, date: nowStr } };
        patchServerCollection('studentAccessMap', 'upsert', {
          id: currentUser.id,
          item: { homeworks: hwUpdate },
        });
        return {
          ...prev,
          [currentUser.id]: {
            ...current,
            homeworks: {
              ...current.homeworks,
              ...hwUpdate,
            },
          },
        };
      }
      const exUpdate = { [examId]: { taken: true, score, maxScore, percentage, date: nowStr } };
      patchServerCollection('studentAccessMap', 'upsert', {
        id: currentUser.id,
        item: { exams: exUpdate },
      });
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          exams: {
            ...current.exams,
            ...exUpdate,
          },
        },
      };
    });

    recordActivity({
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentPhone: currentUser.phone,
      studentCode: currentUser.studentCode,
      grade: currentUser.grade,
      type: assessmentType === 'exam' ? 'exam_submit' : 'homework_submit',
      itemId: examId,
      itemTitle: examTitle,
      score,
      maxScore,
      percentage,
      status: 'completed',
    });
  };

  // Teacher Review: Update essay score (per-question or aggregate) on top of auto MCQ score
  const updateExamSubmissionGrade = (
    submissionId: string,
    teacherExtraScore: number,
    essayScores?: Record<string, number>
  ) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let updatedSub: ExamSubmission | null = null;

    setExamSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId) {
          const autoScore = sub.autoMcqScore !== undefined ? sub.autoMcqScore : 0;
          const finalScore = Number((autoScore + teacherExtraScore).toFixed(2));
          const safeMax = sub.maxScore > 0 ? sub.maxScore : 1;
          const percentage = Math.round((finalScore / safeMax) * 100);
          updatedSub = {
            ...sub,
            score: finalScore,
            percentage,
            teacherExtraScore,
            essayScores: essayScores ?? sub.essayScores,
            teacherGraded: true,
            status: 'fully_graded',
            gradedBy: currentUser?.name || 'مستر عمرو السيد',
            gradedAt: nowStr,
          };
          return updatedSub;
        }
        return sub;
      })
    );

    if (updatedSub) {
      const target: ExamSubmission = updatedSub;
      saveDocument('exam_submissions', target.id, target);
      patchServerCollection('examSubmissions', 'upsert', { item: target });

      setStudentAccessMap((prev) => {
        const studentId = target.studentId;
        const examId = target.examId;
        const current = prev[studentId] || { lectures: {}, exams: {}, homeworks: {} };
        if (target.assessmentType === 'sheet' || target.assessmentType === 'homework') {
          const hwUpdate = {
            [examId]: {
              solved: true,
              score: target.score,
              maxScore: target.maxScore,
              percentage: target.percentage,
              date: nowStr,
            },
          };
          patchServerCollection('studentAccessMap', 'upsert', {
            id: studentId,
            item: { homeworks: hwUpdate },
          });
          return {
            ...prev,
            [studentId]: {
              ...current,
              homeworks: {
                ...current.homeworks,
                ...hwUpdate,
              },
            },
          };
        }
        const exUpdate = {
          [examId]: {
            taken: true,
            score: target.score,
            maxScore: target.maxScore,
            percentage: target.percentage,
            date: nowStr,
          },
        };
        patchServerCollection('studentAccessMap', 'upsert', {
          id: studentId,
          item: { exams: exUpdate },
        });
        return {
          ...prev,
          [studentId]: {
            ...current,
            exams: {
              ...current.exams,
              ...exUpdate,
            },
          },
        };
      });
    }
  };

  // Live Tracking: Record homework submission
  const recordHomeworkAction = (
    homeworkId: string,
    homeworkTitle: string,
    isSolved: boolean,
    scoreInfo?: { score?: number; maxScore?: number }
  ) => {
    if (!currentUser) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const percentage =
      scoreInfo?.score !== undefined && scoreInfo?.maxScore
        ? Math.round((scoreInfo.score / scoreInfo.maxScore) * 100)
        : undefined;

    const hwUpdate = {
      [homeworkId]: {
        solved: isSolved,
        score: scoreInfo?.score,
        maxScore: scoreInfo?.maxScore,
        percentage,
        date: nowStr,
      },
    };
    setStudentAccessMap((prev) => {
      const current = prev[currentUser.id] || { lectures: {}, exams: {}, homeworks: {} };
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          homeworks: {
            ...current.homeworks,
            ...hwUpdate,
          },
        },
      };
    });
    patchServerCollection('studentAccessMap', 'upsert', {
      id: currentUser.id,
      item: { homeworks: hwUpdate },
    });

    if (isSolved) {
      recordActivity({
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentPhone: currentUser.phone,
        studentCode: currentUser.studentCode,
        grade: currentUser.grade,
        type: 'homework_submit',
        itemId: homeworkId,
        itemTitle: homeworkTitle,
        score: scoreInfo?.score,
        maxScore: scoreInfo?.maxScore,
        percentage,
        status: 'completed',
      });
    }
  };

  // Ranking: تفنيد وترتيب أعلى الدرجات في الامتحان أو الشيت الواحد من الأول للأخير بدون أي حد أقصى
  const getExamRankings = (examId: string, typeFilter?: 'exam' | 'sheet'): ExamSubmission[] => {
    return examSubmissions
      .filter((sub) => {
        if (sub.examId !== examId) return false;
        const subType = sub.assessmentType || 'exam';
        if (subType === 'homework') return false; // لا تظهر الواجبات العادية في الأوائل
        if (typeFilter) {
          return subType === typeFilter;
        }
        return true;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.timeSpentMinutes - b.timeSpentMinutes; // الأسرع في الإنهاء يتقدم عند التعادل
      })
      .map((sub, index) => ({
        ...sub,
        rank: index + 1,
      }));
  };

  // Individual Student Complete Dossier (بيانات كاملة لكل طالب تشمل الامتحانات والشيتات والواجبات والحضور)
  const getStudentDossier = (studentId: string): StudentDossier | null => {
    const student = registeredAccounts.find((a) => a.id === studentId);
    if (!student) return null;

    const access = studentAccessMap[studentId] || { lectures: {}, exams: {}, homeworks: {} };

    const lectureRecords = lectures.map((lec) => ({
      lectureId: lec.id,
      lectureTitle: lec.title,
      entered: !!access.lectures?.[lec.id]?.entered,
      date: access.lectures?.[lec.id]?.date,
    }));

    const examRecords = exams.map((ex) => {
      const exState = access.exams?.[ex.id];
      const latestSub = examSubmissions.find(
        (s) => s.studentId === studentId && s.examId === ex.id && (s.assessmentType || 'exam') === 'exam'
      );
      const isTaken = !!exState?.taken || !!latestSub;
      const finalScore = latestSub?.score ?? exState?.score;
      const finalMax = latestSub?.maxScore ?? exState?.maxScore ?? ex.totalMarks;
      const finalPct =
        latestSub?.percentage ??
        (finalScore !== undefined && finalMax ? Math.round((finalScore / finalMax) * 100) : undefined);

      return {
        examId: ex.id,
        examTitle: ex.title,
        lessonTitle: ex.lessonTitle,
        taken: isTaken,
        score: finalScore,
        maxScore: finalMax,
        percentage: finalPct,
        status: latestSub?.status,
        date: latestSub?.submittedAt || exState?.date,
      };
    });

    const homeworkRecords = homeworks.map((hw) => {
      const hwState = access.homeworks?.[hw.id];
      const kind: 'homework' | 'sheet' = hw.kind === 'sheet' ? 'sheet' : 'homework';
      const latestSub = examSubmissions.find(
        (s) => s.studentId === studentId && s.examId === hw.id && s.assessmentType !== 'exam'
      );
      const isSolved = !!hwState?.solved || !!latestSub;
      const fallbackMax =
        hw.totalMarks ||
        (hw.questions && hw.questions.length > 0
          ? hw.questions.reduce((sum, q) => sum + (q.points ?? 1), 0)
          : undefined);
      const finalScore = latestSub?.score ?? hwState?.score;
      const finalMax = latestSub?.maxScore ?? hwState?.maxScore ?? fallbackMax;
      const finalPct =
        latestSub?.percentage ??
        hwState?.percentage ??
        (finalScore !== undefined && finalMax ? Math.round((finalScore / finalMax) * 100) : undefined);

      return {
        homeworkId: hw.id,
        homeworkTitle: hw.title,
        kind,
        lessonTitle: hw.lessonTitle,
        solved: isSolved,
        score: finalScore,
        maxScore: finalMax,
        percentage: finalPct,
        status: latestSub?.status,
        date: latestSub?.submittedAt || hwState?.date,
      };
    });

    const totalLectures = lectures.length;
    const enteredLectures = lectureRecords.filter((r) => r.entered).length;
    const attendanceRate = totalLectures > 0 ? Math.round((enteredLectures / totalLectures) * 100) : 0;

    const totalExams = exams.length;
    const takenExamsRecords = examRecords.filter((r) => r.taken);
    const takenExams = takenExamsRecords.length;
    const avgScore =
      takenExams > 0
        ? Math.round(
            takenExamsRecords.reduce((acc, cur) => acc + (cur.percentage || 0), 0) / takenExams
          )
        : 0;

    const sheetRecords = homeworkRecords.filter((r) => r.kind === 'sheet');
    const totalSheets = sheetRecords.length;
    const solvedSheetRecords = sheetRecords.filter((r) => r.solved);
    const solvedSheets = solvedSheetRecords.length;
    const scoredSheets = solvedSheetRecords.filter((r) => r.percentage !== undefined);
    const averageSheetScore =
      scoredSheets.length > 0
        ? Math.round(scoredSheets.reduce((acc, cur) => acc + (cur.percentage || 0), 0) / scoredSheets.length)
        : 0;

    const onlyHomeworkRecords = homeworkRecords.filter((r) => r.kind === 'homework');
    const totalHomeworks = onlyHomeworkRecords.length;
    const solvedHomeworks = onlyHomeworkRecords.filter((r) => r.solved).length;
    const homeworkRate = totalHomeworks > 0 ? Math.round((solvedHomeworks / totalHomeworks) * 100) : 0;

    return {
      student,
      totalLectures,
      enteredLectures,
      attendanceRate,
      totalExams,
      takenExams,
      averageExamScore: avgScore,
      totalSheets,
      solvedSheets,
      averageSheetScore,
      totalHomeworks,
      solvedHomeworks,
      homeworkCompletionRate: homeworkRate,
      lectureRecords,
      examRecords,
      homeworkRecords,
    };
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAdminPanelOpen(false);
  };

  const generateUuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Add / Update / Delete Lecture
  const addLecture = async (lec: Omit<Lecture, 'id' | 'dateAdded'>) => {
    const newLec: Lecture = {
      ...lec,
      id: generateUuid(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setLectures((prev) => [newLec, ...prev]);
    setIsAutoSaving(true);
    const [res] = await Promise.all([
      saveDocument('lectures', newLec.id, newLec),
      patchServerCollection('lectures', 'upsert', { item: newLec }),
    ]);
    setIsAutoSaving(false);
    setLastAutoSavedAt(new Date().toISOString());
    return res;
  };

  const updateLecture = (id: string, updated: Partial<Lecture>) => {
    let mergedItem: Lecture | null = null;
    setLectures((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          mergedItem = { ...l, ...updated };
          return mergedItem;
        }
        return l;
      })
    );
    setIsAutoSaving(true);
    const op = mergedItem ? saveDocument('lectures', id, mergedItem) : updateDocument('lectures', id, updated);
    patchServerCollection('lectures', 'update', { id, item: mergedItem || updated });
    Promise.resolve(op).finally(() => {
      setIsAutoSaving(false);
      setLastAutoSavedAt(new Date().toISOString());
    });
  };

  const deleteLecture = (id: string) => {
    deleteDocument('lectures', id);
    patchServerCollection('lectures', 'delete', { id });
    setLectures((prev) => prev.filter((item) => item.id !== id));
    if (activeVideo && 'id' in activeVideo && activeVideo.id === id) {
      setActiveVideo(null);
    }
    setLastAutoSavedAt(new Date().toISOString());
  };

  // Add / Update / Delete Homework
  const addHomework = (hw: Omit<Homework, 'id' | 'dateAdded'>) => {
    const newHw: Homework = {
      ...hw,
      id: generateUuid(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setHomeworks((prev) => [newHw, ...prev]);
    setIsAutoSaving(true);
    patchServerCollection('homeworks', 'upsert', { item: newHw });
    saveDocument('homeworks', newHw.id, newHw).finally(() => {
      setIsAutoSaving(false);
      setLastAutoSavedAt(new Date().toISOString());
    });
  };

  const updateHomework = (id: string, updated: Partial<Homework>) => {
    let mergedItem: Homework | null = null;
    setHomeworks((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          mergedItem = { ...h, ...updated };
          return mergedItem;
        }
        return h;
      })
    );
    setIsAutoSaving(true);
    const op = mergedItem ? saveDocument('homeworks', id, mergedItem) : updateDocument('homeworks', id, updated);
    patchServerCollection('homeworks', 'update', { id, item: mergedItem || updated });
    Promise.resolve(op).finally(() => {
      setIsAutoSaving(false);
      setLastAutoSavedAt(new Date().toISOString());
    });
  };

  const deleteHomework = (id: string) => {
    deleteDocument('homeworks', id);
    patchServerCollection('homeworks', 'delete', { id });
    setHomeworks((prev) => prev.filter((item) => item.id !== id));
    setLastAutoSavedAt(new Date().toISOString());
  };

  // Add / Delete File
  const addFile = async (file: Omit<FileDocument, 'id' | 'dateAdded'>) => {
    const newFile: FileDocument = {
      ...file,
      id: generateUuid(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setFiles((prev) => [newFile, ...prev]);
    setIsAutoSaving(true);
    const [res] = await Promise.all([
      saveDocument('files', newFile.id, newFile),
      patchServerCollection('files', 'upsert', { item: newFile }),
    ]);
    setIsAutoSaving(false);
    setLastAutoSavedAt(new Date().toISOString());
    return res;
  };

  const deleteFile = (id: string) => {
    deleteDocument('files', id);
    patchServerCollection('files', 'delete', { id });
    setFiles((prev) => prev.filter((item) => item.id !== id));
    if (activeDocument && activeDocument.fileUrl === files.find((f) => f.id === id)?.fileUrl) {
      setActiveDocument(null);
    }
    setLastAutoSavedAt(new Date().toISOString());
  };

  const updateFile = (id: string, updated: Partial<FileDocument>) => {
    let mergedItem: FileDocument | null = null;
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          mergedItem = { ...f, ...updated };
          return mergedItem;
        }
        return f;
      })
    );
    setIsAutoSaving(true);
    const op = mergedItem ? saveDocument('files', id, mergedItem) : updateDocument('files', id, updated);
    patchServerCollection('files', 'update', { id, item: mergedItem || updated });
    Promise.resolve(op).finally(() => {
      setIsAutoSaving(false);
      setLastAutoSavedAt(new Date().toISOString());
    });
  };

  // Add / Update / Delete Exam
  const addExam = (exam: Omit<Exam, 'id' | 'dateAdded'>) => {
    const newExam: Exam = {
      ...exam,
      id: generateUuid(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setExams((prev) => [newExam, ...prev]);
    setIsAutoSaving(true);
    patchServerCollection('exams', 'upsert', { item: newExam });
    saveDocument('exams', newExam.id, newExam).finally(() => {
      setIsAutoSaving(false);
      setLastAutoSavedAt(new Date().toISOString());
    });
  };

  const updateExam = (id: string, updated: Partial<Exam>) => {
    let mergedItem: Exam | null = null;
    setExams((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          mergedItem = { ...e, ...updated };
          return mergedItem;
        }
        return e;
      })
    );
    setIsAutoSaving(true);
    const op = mergedItem ? saveDocument('exams', id, mergedItem) : updateDocument('exams', id, updated);
    patchServerCollection('exams', 'update', { id, item: mergedItem || updated });
    Promise.resolve(op).finally(() => {
      setIsAutoSaving(false);
      setLastAutoSavedAt(new Date().toISOString());
    });
  };

  const deleteExam = (id: string) => {
    deleteDocument('exams', id);
    patchServerCollection('exams', 'delete', { id });
    setExams((prev) => prev.filter((item) => item.id !== id));
    setLastAutoSavedAt(new Date().toISOString());
  };

  // Add / Delete Honored Students
  const addHonoredStudent = (student: Omit<HonoredStudent, 'id' | 'dateAdded'>) => {
    const newStudent: HonoredStudent = {
      ...student,
      id: 'honor_' + Date.now(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setHonoredStudents((prev) => [newStudent, ...prev]);
    saveDocument('honored_students', newStudent.id, newStudent);
    patchServerCollection('honoredStudents', 'upsert', { item: newStudent });
  };

  const deleteHonoredStudent = (id: string) => {
    deleteDocument('honored_students', id);
    patchServerCollection('honoredStudents', 'delete', { id });
    setHonoredStudents((prev) => prev.filter((s) => s.id !== id));
  };

  // Add / Delete Secretary
  const addSecretary = (name: string, phone: string, notes?: string) => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;
    const newSec: Secretary = {
      id: 'sec_' + Date.now(),
      name: name.trim() || 'سكرتارية مستر عمرو',
      phone: cleanPhone,
      notes,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setSecretaries((prev) => [newSec, ...prev]);
    saveDocument('secretaries', newSec.id, newSec);
    patchServerCollection('secretaries', 'upsert', { item: newSec });
  };

  const deleteSecretary = (id: string) => {
    deleteDocument('secretaries', id);
    patchServerCollection('secretaries', 'delete', { id });
    setSecretaries((prev) => prev.filter((s) => s.id !== id));
  };

  // Payment Methods
  const addPaymentMethod = (method: Omit<PaymentMethod, 'id'>) => {
    const newMethod: PaymentMethod = {
      ...method,
      id: 'pay_' + Date.now(),
    };
    setPaymentMethods((prev) => [...prev, newMethod]);
    saveDocument('payment_methods', newMethod.id, newMethod);
    patchServerCollection('paymentMethods', 'upsert', { item: newMethod });
  };

  const updatePaymentMethod = (id: string, updated: Partial<PaymentMethod>) => {
    setPaymentMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    updateDocument('payment_methods', id, updated);
    patchServerCollection('paymentMethods', 'update', { id, item: updated });
  };

  const deletePaymentMethod = (id: string) => {
    deleteDocument('payment_methods', id);
    patchServerCollection('paymentMethods', 'delete', { id });
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  };

  // Settings (Auto-saved immediately to DOM, Supabase cache, and server store)
  const updateSettings = (newSettings: Partial<PlatformSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      try {
        localStorage.setItem('amr_chem_settings', JSON.stringify(next));
      } catch {}
      saveDocument('platform_settings', 'global_settings', next);
      syncServerStorePatch({ settings: next });
      return next;
    });
  };

  // Whitelist Authorization: requires BOTH phone AND registered code
  const addAuthorizedStudent = (
    phone: string,
    studentCode: string,
    studentName: string,
    lectureId: string
  ) => {
    const cleanPhone = phone.trim();
    const cleanCode = studentCode.trim().toUpperCase();
    if (!cleanPhone || !cleanCode) return;

    const newAuth: AuthorizedStudent = {
      id: 'auth_' + Date.now(),
      phone: cleanPhone,
      studentCode: cleanCode,
      studentName: studentName.trim() || 'طالب مصرح له',
      lectureId,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setAuthorizedStudents((prev) => [newAuth, ...prev]);
    saveDocument('authorized_students', newAuth.id, newAuth);
    patchServerCollection('authorizedStudents', 'upsert', { item: newAuth });

    if (currentUser && currentUser.phone === cleanPhone) {
      setCurrentUser({
        ...currentUser,
        studentCode: cleanCode,
        enrolledLectureIds: Array.from(new Set([...currentUser.enrolledLectureIds, lectureId])),
      });
    }
  };

  const removeAuthorizedStudent = (id: string) => {
    deleteDocument('authorized_students', id);
    patchServerCollection('authorizedStudents', 'delete', { id });
    const target = authorizedStudents.find((a) => a.id === id);
    setAuthorizedStudents((prev) => prev.filter((item) => item.id !== id));

    if (target && currentUser && currentUser.phone === target.phone) {
      setCurrentUser({
        ...currentUser,
        enrolledLectureIds: currentUser.enrolledLectureIds.filter(
          (lid) => lid !== target.lectureId && lid !== 'all'
        ),
      });
    }
  };

  // Access check: Free courses are open to all; Authorized students (phone + code) enter free; others must pay
  const hasAccessToLecture = (lectureId: string): boolean => {
    // 1. Free courses are completely open without subscription
    const lecture = lectures.find((l) => l.id === lectureId);
    if (lecture?.isFree || (lecture && lecture.price === 0)) {
      return true;
    }

    if (!currentUser) return false;

    // 2. Admin & Secretary access
    if (currentUser.role === 'admin' || currentUser.role === 'secretary' || currentUser.email === ADMIN_EMAIL) {
      return true;
    }

    // 3. User purchased via wallet balance
    if (currentUser.enrolledLectureIds?.includes(lectureId) || currentUser.enrolledLectureIds?.includes('all')) {
      return true;
    }

    // 4. Authorized students via Teacher Phone + Code
    if (currentUser.phone && currentUser.studentCode) {
      const match = authorizedStudents.some(
        (a) =>
          a.phone === currentUser.phone &&
          a.studentCode === currentUser.studentCode &&
          (a.lectureId === lectureId || a.lectureId === 'all')
      );
      if (match) return true;
    }

    // 5. Payment receipt approved OR auto-activated after 20 minutes (ثلث ساعة)
    const matchedPayment = paymentRequests.find(
      (p) => p.studentId === currentUser.id && p.lectureId === lectureId
    );
    if (matchedPayment) {
      if (matchedPayment.status === 'approved' || matchedPayment.status === 'auto_activated') {
        return true;
      }
      if (matchedPayment.status === 'pending_review') {
        const deadline = new Date(matchedPayment.activationDeadline).getTime();
        if (Date.now() >= deadline) {
          return true; // Auto-activated after 20 minutes
        }
      }
    }

    return false;
  };

  // Submit payment receipt with screenshot and 20-min countdown
  const submitPaymentReceipt = (data: {
    lectureId: string;
    lectureTitle: string;
    amount: number;
    paymentMethodName: string;
    screenshotUrl: string;
    notes?: string;
  }): { success: boolean; message: string } => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return { success: false, message: 'يرجى تسجيل الدخول أولاً للمتابعة' };
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now (ثلث ساعة)
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const deadlineStr = deadline.toISOString().replace('T', ' ').substring(0, 16);

    const newReq: PaymentReceiptRequest = {
      id: 'pay_req_' + Date.now(),
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentPhone: currentUser.phone,
      lectureId: data.lectureId,
      lectureTitle: data.lectureTitle,
      amount: data.amount,
      paymentMethodName: data.paymentMethodName,
      screenshotUrl: data.screenshotUrl,
      submittedAt: nowStr,
      activationDeadline: deadlineStr,
      status: 'pending_review',
      notes: data.notes,
    };

    setPaymentRequests((prev) => [newReq, ...prev]);
    saveDocument('payment_requests', newReq.id, newReq);
    patchServerCollection('paymentRequests', 'upsert', { item: newReq });

    return {
      success: true,
      message: 'تم إرسال إيصال الدفع وسكرين شوت التحويل بنجاح! يتم تفعيل الكورس فوراً بمراجعة المعلم أو تلقائياً بعد ثلث ساعة (20 دقيقة).',
    };
  };

  const approvePaymentRequest = (id: string) => {
    const revTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setPaymentRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status: 'approved', reviewedAt: revTime }
          : req
      )
    );
    updateDocument('payment_requests', id, { status: 'approved', reviewedAt: revTime });
    patchServerCollection('paymentRequests', 'update', { id, item: { status: 'approved', reviewedAt: revTime } });
  };

  const rejectPaymentRequest = (id: string, reason?: string) => {
    const revTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const reasonText = reason || 'الإيصال غير واضح أو لم يتم استلام التحويل';
    setPaymentRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status: 'rejected', notes: reasonText, reviewedAt: revTime }
          : req
      )
    );
    updateDocument('payment_requests', id, { status: 'rejected', notes: reasonText, reviewedAt: revTime });
    patchServerCollection('paymentRequests', 'update', { id, item: { status: 'rejected', notes: reasonText, reviewedAt: revTime } });
  };

  const addBatchAuthorizedStudents = (
    students: { studentName: string; phone: string; studentCode: string; lectureId: string }[]
  ): number => {
    const nowStr = new Date().toISOString().split('T')[0];
    const newItems: AuthorizedStudent[] = students.map((s, idx) => ({
      id: 'auth_' + Date.now() + '_' + idx,
      studentName: s.studentName.trim(),
      phone: s.phone.trim(),
      studentCode: s.studentCode.trim().toUpperCase(),
      lectureId: s.lectureId || 'all',
      dateAdded: nowStr,
    }));

    setAuthorizedStudents((prev) => {
      const merged = [...newItems, ...prev];
      syncServerStorePatch({ authorizedStudents: merged });
      return merged;
    });
    bulkSaveDocuments('authorized_students', newItems);
    setLastAutoSavedAt(new Date().toISOString());
    return newItems.length;
  };

  // Purchase lecture
  const purchaseLecture = (lectureId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return { success: false, message: 'يرجى تسجيل الدخول أولاً للمتابعة' };
    }

    const lecture = lectures.find((l) => l.id === lectureId);
    if (!lecture) return { success: false, message: 'الكورس غير موجود' };

    const price = lecture.price || 0;
    if (currentUser.walletBalance < price) {
      return {
        success: false,
        message: `رصيد محفظتك (${currentUser.walletBalance} ج.م) لا يكفي لشراء الكورس (${price} ج.م). يرجى شحن الرصيد من طرق الدفع المتاحة.`,
      };
    }

    const updatedBalance = currentUser.walletBalance - price;
    const updatedEnrolled = Array.from(new Set([...currentUser.enrolledLectureIds, lectureId]));

    setCurrentUser({
      ...currentUser,
      walletBalance: updatedBalance,
      enrolledLectureIds: updatedEnrolled,
    });
    updateRegisteredStudent(currentUser.id, { walletBalance: updatedBalance });

    const tx: WalletTransaction = {
      id: 'tx_' + Date.now(),
      type: 'purchase',
      amount: price,
      date: new Date().toLocaleString('ar-EG'),
      description: `شراء كورس: ${lecture.title}`,
    };
    setTransactions((prev) => [tx, ...prev]);
    patchServerCollection('transactions', 'upsert', { item: tx });

    return { success: true, message: 'تم شراء الكورس بنجاح! يمكنك الآن مشاهدته في أي وقت.' };
  };

  // Verify access using BOTH phone number AND registered code
  const verifyPhoneAndCodeAccess = (phone: string, studentCode: string, lectureId: string) => {
    const cleanPhone = phone.trim();
    const cleanCode = studentCode.trim().toUpperCase();

    if (!cleanPhone || !cleanCode) {
      return { success: false, message: 'يرجى إدخال كلٍ من رقم الهاتف والكود المسجل معاً' };
    }

    const matchedAuth = authorizedStudents.find(
      (a) =>
        a.phone === cleanPhone &&
        a.studentCode === cleanCode &&
        (a.lectureId === lectureId || a.lectureId === 'all')
    );

    if (matchedAuth) {
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          phone: cleanPhone,
          studentCode: cleanCode,
          enrolledLectureIds: Array.from(new Set([...currentUser.enrolledLectureIds, lectureId])),
        });
      } else {
        login(
          `${cleanPhone}@platform.student`,
          matchedAuth.studentName,
          cleanPhone,
          'sec3',
          cleanCode
        );
      }
      return {
        success: true,
        message: 'تم التحقق بنجاح من رقم الهاتف والكود المسجل! مصرح لك الآن بدخول ومشاهدة هذا الكورس.',
      };
    } else {
      return {
        success: false,
        message: 'رقم الهاتف أو الكود المسجل غير صحيح أو غير مسجل لدى مسؤول المنصة.',
      };
    }
  };

  // Generate single recharge code
  const generateRechargeCode = (code: string, value: number) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;
    const exists = rechargeCodes.some((c) => c.code === cleanCode);
    if (exists) return false;

    const newCode: RechargeCode = {
      code: cleanCode,
      value: Number(value),
      isUsed: false,
      maxUses: 1,
      usedCount: 0,
      dateCreated: new Date().toISOString().split('T')[0],
    };
    setRechargeCodes((prev) => [newCode, ...prev]);
    saveDocument('recharge_codes', cleanCode, newCode);
    patchServerCollection('rechargeCodes', 'upsert', { item: newCode, keyField: 'code' });
    return true;
  };

  // Bulk Recharge / Access Codes Generator (1 up to 10,000 codes, with 1 or 2 uses max)
  const generateBulkRechargeCodes = async (
    count: number,
    value: number,
    maxUses: 1 | 2 = 1,
    prefix: string = 'AMR',
    courseId?: string,
    courseTitle?: string
  ): Promise<{ success: boolean; count: number; codes: RechargeCode[] }> => {
    try {
      const totalCount = Math.min(10000, Math.max(1, Number(count) || 10));
      const codeValue = Math.max(0, Number(value) || 50);
      const codePrefix = String(prefix || 'AMR').toUpperCase().trim();
      const nowStr = new Date().toISOString().split('T')[0];

      const newCodes: RechargeCode[] = [];
      for (let i = 0; i < totalCount; i++) {
        const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeStr = `${codePrefix}-${randPart}-${i + 1}`;
        newCodes.push({
          code: codeStr,
          value: codeValue,
          isUsed: false,
          maxUses,
          usedCount: 0,
          courseId: courseId || undefined,
          courseTitle: courseTitle || undefined,
          dateCreated: nowStr,
        });
      }

      setRechargeCodes((prev) => {
        const merged = [...newCodes, ...prev];
        syncServerStorePatch({ rechargeCodes: merged });
        return merged;
      });
      bulkSaveDocuments('recharge_codes', newCodes.map((c) => ({ ...c, id: c.code })));
      return { success: true, count: newCodes.length, codes: newCodes };
    } catch (err) {
      console.error('Error generating bulk codes:', err);
      return { success: false, count: 0, codes: [] };
    }
  };

  const deleteRechargeCode = (code: string) => {
    deleteDocument('recharge_codes', code);
    patchServerCollection('rechargeCodes', 'delete', { id: code, keyField: 'code' });
    setRechargeCodes((prev) => prev.filter((c) => c.code !== code));
  };

  // Direct Teacher Free Pass (إعطاء تصريح مجاني مباشر لأي طالب بدون دفع)
  const grantFreeAccess = (studentIdOrPhone: string, lectureId: string = 'all') => {
    const student = registeredAccounts.find(
      (a) => a.id === studentIdOrPhone || a.phone === studentIdOrPhone
    );
    const sName = student?.name || 'طالب مصرح له';
    const sPhone = student?.phone || studentIdOrPhone;
    const sCode = student?.studentCode || `AMR-${Math.floor(100 + Math.random() * 900)}`;

    addAuthorizedStudent(sPhone, sCode, sName, lectureId);

    if (currentUser && (currentUser.id === studentIdOrPhone || currentUser.phone === sPhone)) {
      setCurrentUser({
        ...currentUser,
        enrolledLectureIds: Array.from(new Set([...currentUser.enrolledLectureIds, lectureId])),
      });
    }
  };

  // Redeem recharge / course access code (supports 1 or 2 max uses as defined by teacher)
  const redeemCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = rechargeCodes.find((c) => c.code.toUpperCase() === cleanCode);
    if (!found) {
      return { success: false, message: 'كود الشحن أو التفعيل غير صحيح أو غير موجود' };
    }

    const maxUses = found.maxUses || 1;
    const currentUsed = found.usedCount || (found.isUsed ? 1 : 0);

    if (currentUsed >= maxUses) {
      return {
        success: false,
        message: `هذا الكود تم استخدامه بالكامل (${currentUsed} من ${maxUses} مرة) ولم يعد صالحاً.`,
      };
    }

    const nextUsedCount = currentUsed + 1;
    const isNowFullyUsed = nextUsedCount >= maxUses;

    const codeUpdate = {
      usedCount: nextUsedCount,
      isUsed: isNowFullyUsed,
      usedBy: currentUser?.phone || currentUser?.email || 'طالب',
    };
    setRechargeCodes((prev) =>
      prev.map((c) => (c.code.toUpperCase() === cleanCode ? { ...c, ...codeUpdate } : c))
    );
    updateDocument('recharge_codes', cleanCode, codeUpdate);
    patchServerCollection('rechargeCodes', 'update', { id: cleanCode, keyField: 'code', item: codeUpdate });

    let courseUnlockedNotice = '';
    if (found.courseId && currentUser) {
      const updatedEnrolled = Array.from(new Set([...currentUser.enrolledLectureIds, found.courseId]));
      setCurrentUser({
        ...currentUser,
        enrolledLectureIds: updatedEnrolled,
      });
      courseUnlockedNotice = found.courseTitle ? ` لكورس: (${found.courseTitle})` : ' للكورس المحدد';
    }

    if (currentUser && found.value > 0) {
      const updatedBalance = currentUser.walletBalance + found.value;
      setCurrentUser({
        ...currentUser,
        walletBalance: updatedBalance,
        ...(found.courseId
          ? { enrolledLectureIds: Array.from(new Set([...currentUser.enrolledLectureIds, found.courseId])) }
          : {}),
      });
      updateRegisteredStudent(currentUser.id, { walletBalance: updatedBalance });
    }

    const tx: WalletTransaction = {
      id: 'tx_' + Date.now(),
      type: 'deposit',
      amount: found.value,
      date: new Date().toLocaleString('ar-EG'),
      description: `شحن / تفعيل كود (${cleanCode})${courseUnlockedNotice}`,
      code: cleanCode,
    };
    setTransactions((prev) => [tx, ...prev]);
    patchServerCollection('transactions', 'upsert', { item: tx });

    return {
      success: true,
      message: found.courseId
        ? `🎉 تم تفعيل الكود بنجاح${courseUnlockedNotice}! يمكنك الآن مشاهدة المحاضرة فوراً.`
        : `🎉 تم شحن رصيدك بنجاح بمبلغ ${found.value} جنيه مصري! (الاستخدام ${nextUsedCount} من أصل ${maxUses})`,
      amount: found.value,
    };
  };

  return (
    <PlatformContext.Provider
      value={{
        currentUser,
        activeGrade,
        setActiveGrade,
        login,
        logout,
        lectures,
        addLecture,
        updateLecture,
        deleteLecture,
        homeworks,
        addHomework,
        updateHomework,
        deleteHomework,
        files,
        addFile,
        updateFile,
        deleteFile,
        exams,
        addExam,
        updateExam,
        deleteExam,
        honoredStudents,
        addHonoredStudent,
        deleteHonoredStudent,
        rechargeCodes,
        transactions,
        generateRechargeCode,
        generateBulkRechargeCodes,
        deleteRechargeCode,
        redeemCode,
        authorizedStudents,
        addAuthorizedStudent,
        removeAuthorizedStudent,
        grantFreeAccess,
        hasAccessToLecture,
        purchaseLecture,
        verifyPhoneAndCodeAccess,
        secretaries,
        addSecretary,
        deleteSecretary,
        paymentMethods,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        settings,
        updateSettings,
        activeVideo,
        setActiveVideo,
        activeDocument,
        setActiveDocument,
        isAdminPanelOpen,
        setIsAdminPanelOpen,
        isLoginModalOpen,
        setIsLoginModalOpen,
        selectedCourseForDetails,
        setSelectedCourseForDetails,
        registeredAccounts,
        loginStrict,
        registerStrict,
        addRegisteredStudent,
        updateRegisteredStudent,
        deleteRegisteredStudent,
        clearAllStudents,
        liveLoginAlerts,
        dismissLoginAlert,
        clearAllLoginAlerts,
        studentActivities,
        examSubmissions,
        studentAccessMap,
        recordLectureEntry,
        markLectureCompleted,
        isLectureCompleted,
        recordExamResult,
        updateExamSubmissionGrade,
        recordHomeworkAction,
        getExamRankings,
        getStudentDossier,
        paymentRequests,
        submitPaymentReceipt,
        approvePaymentRequest,
        rejectPaymentRequest,
        addBatchAuthorizedStudents,
        broadcastNotifications,
        sendBroadcastNotification,
        deleteBroadcastNotification,
        unreadBroadcastCount,
        markBroadcastsAsRead,
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        teacherProfile,
        updateTeacherProfile,
        lastAutoSavedAt,
        isAutoSaving,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};
