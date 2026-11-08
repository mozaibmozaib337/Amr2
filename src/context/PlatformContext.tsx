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
  addLecture: (lecture: Omit<Lecture, 'id' | 'dateAdded'>) => void;
  updateLecture: (id: string, updated: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;
  // Homework
  homeworks: Homework[];
  addHomework: (hw: Omit<Homework, 'id' | 'dateAdded'>) => void;
  updateHomework: (id: string, updated: Partial<Homework>) => void;
  deleteHomework: (id: string) => void;
  // Files (PDF / Word / Excel / Images)
  files: FileDocument[];
  addFile: (file: Omit<FileDocument, 'id' | 'dateAdded'>) => void;
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
  ) => { success: boolean; error?: string };
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
  }) => { success: boolean; error?: string };
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
  deleteRegisteredStudent: (id: string) => void;
  clearAllStudents: () => void;
  // Live Student Logins Alerts (إشعارات دخول الطلاب اللحظية للمستر)
  liveLoginAlerts: LiveLoginAlert[];
  dismissLoginAlert: (alertId: string) => void;
  clearAllLoginAlerts: () => void;
  // Real-Time Student Activity Tracking & Matrix
  studentActivities: StudentActivity[];
  examSubmissions: ExamSubmission[];
  studentAccessMap: Record<string, StudentAccessState>;
  recordLectureEntry: (lectureId: string, lectureTitle: string) => void;
  recordExamResult: (
    examId: string,
    examTitle: string,
    score: number,
    maxScore: number,
    timeSpentMinutes?: number,
    extraOptions?: {
      autoMcqScore?: number;
      autoMcqMax?: number;
      essayAnswers?: Record<string, string>;
      status?: 'pending_teacher_review' | 'fully_graded';
    }
  ) => void;
  updateExamSubmissionGrade: (submissionId: string, teacherExtraScore: number) => void;
  recordHomeworkAction: (homeworkId: string, homeworkTitle: string, isSolved: boolean) => void;
  getExamRankings: (examId: string) => ExamSubmission[];
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

  const [lectures, setLectures] = useState<Lecture[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_lectures');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_CURRICULUM_LECTURES;
    } catch {
      return INITIAL_CURRICULUM_LECTURES;
    }
  });

  const [homeworks, setHomeworks] = useState<Homework[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_homeworks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_CURRICULUM_HOMEWORKS;
    } catch {
      return INITIAL_CURRICULUM_HOMEWORKS;
    }
  });

  const [files, setFiles] = useState<FileDocument[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_files');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_exams');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_CURRICULUM_EXAMS;
    } catch {
      return INITIAL_CURRICULUM_EXAMS;
    }
  });

  // Strict User Accounts Directory
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_registered_accounts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_REGISTERED_USERS;
    } catch {
      return INITIAL_REGISTERED_USERS;
    }
  });

  // Real-Time Student Activity Stream
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_student_activities_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_STUDENT_ACTIVITIES;
    } catch {
      return INITIAL_STUDENT_ACTIVITIES;
    }
  });

  // Per-Exam Submissions and Ranking Store
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_exam_submissions_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_EXAM_SUBMISSIONS;
    } catch {
      return INITIAL_EXAM_SUBMISSIONS;
    }
  });

  // Student Access & Matrix Map (studentId -> lectures, exams, homeworks)
  const [studentAccessMap, setStudentAccessMap] = useState<Record<string, StudentAccessState>>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_student_access_map_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      }
      return INITIAL_STUDENT_ACCESS;
    } catch {
      return INITIAL_STUDENT_ACCESS;
    }
  });

  // Payment Verification Requests (with screenshots and 20-min activation countdown)
  const [paymentRequests, setPaymentRequests] = useState<PaymentReceiptRequest[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_payment_requests_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [honoredStudents, setHonoredStudents] = useState<HonoredStudent[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_honored_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rechargeCodes, setRechargeCodes] = useState<RechargeCode[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [authorizedStudents, setAuthorizedStudents] = useState<AuthorizedStudent[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_authorized_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [secretaries, setSecretaries] = useState<Secretary[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_secretaries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_payment_methods');
      return saved ? JSON.parse(saved) : DEFAULT_PAYMENT_METHODS;
    } catch {
      return DEFAULT_PAYMENT_METHODS;
    }
  });

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

  // Broadcast Notifications State
  const [broadcastNotifications, setBroadcastNotifications] = useState<BroadcastNotification[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_broadcast_notifs_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_BROADCAST_NOTIFICATIONS;
    } catch {
      return INITIAL_BROADCAST_NOTIFICATIONS;
    }
  });

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_read_notifs_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Live Login Alerts (إشعارات دخول الطلاب اللحظية للمستر)
  const [liveLoginAlerts, setLiveLoginAlerts] = useState<LiveLoginAlert[]>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_live_logins_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Teacher Personal Profile State
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() => {
    try {
      const saved = localStorage.getItem('amr_chem_teacher_profile');
      return saved ? { ...DEFAULT_TEACHER_PROFILE, ...JSON.parse(saved) } : DEFAULT_TEACHER_PROFILE;
    } catch {
      return DEFAULT_TEACHER_PROFILE;
    }
  });

  const updateTeacherProfile = (updated: Partial<TeacherProfile>) => {
    setTeacherProfile((prev) => {
      const next = { ...prev, ...updated, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem('amr_chem_teacher_profile', JSON.stringify(next));
      } catch {}
      saveDocument('teacher_profile', 'mr_amr', next);
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('amr_chem_live_logins_v1', JSON.stringify(liveLoginAlerts));
  }, [liveLoginAlerts]);

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
  };

  const dismissLoginAlert = (alertId: string) => {
    setLiveLoginAlerts((prev) => prev.filter((a) => a.id !== alertId));
    deleteDocument('live_login_alerts', alertId);
  };

  const clearAllLoginAlerts = () => {
    liveLoginAlerts.forEach((a) => deleteDocument('live_login_alerts', a.id));
    setLiveLoginAlerts([]);
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
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
    saveDocument('registered_accounts', newStudent.id, newStudent);
    return newStudent;
  };

  const updateRegisteredStudent = (id: string, data: Partial<RegisteredAccount>) => {
    setRegisteredAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...data } : acc))
    );
    updateDocument('registered_accounts', id, data);
  };

  const deleteRegisteredStudent = (id: string) => {
    deleteDocument('registered_accounts', id);
    setRegisteredAccounts((prev) => prev.filter((acc) => acc.id !== id));
    setLiveLoginAlerts((prev) => prev.filter((a) => a.studentId !== id));
    setAuthorizedStudents((prev) => prev.filter((a) => a.id !== id && a.phone !== id));
    setStudentActivities((prev) => prev.filter((act) => act.studentId !== id));
    setExamSubmissions((prev) => prev.filter((sub) => sub.studentId !== id));
    setStudentAccessMap((prev) => {
      const nextMap = { ...prev };
      delete nextMap[id];
      return nextMap;
    });
  };

  const clearAllStudents = () => {
    setRegisteredAccounts(INITIAL_REGISTERED_USERS);
    setStudentActivities([]);
    setExamSubmissions([]);
    setStudentAccessMap({});
    setAuthorizedStudents([]);
    setLiveLoginAlerts([]);
    localStorage.removeItem('amr_chem_registered_accounts_v2');
    localStorage.removeItem('amr_chem_student_activities_v2');
    localStorage.removeItem('amr_chem_exam_submissions_v2');
    localStorage.removeItem('amr_chem_student_access_map_v2');
    localStorage.removeItem('amr_chem_authorized_students');
    localStorage.removeItem('amr_chem_live_logins_v1');
    localStorage.setItem('amr_chem_registered_accounts_v2', JSON.stringify(INITIAL_REGISTERED_USERS));
  };

  // Immediate purge of any mock/unwanted students so platform starts 100% clean
  useEffect(() => {
    try {
      const isPureV7 = localStorage.getItem('amr_chem_pure_purge_v7');
      if (!isPureV7) {
        localStorage.removeItem('amr_chem_registered_accounts_v2');
        localStorage.removeItem('amr_chem_student_activities_v2');
        localStorage.removeItem('amr_chem_exam_submissions_v2');
        localStorage.removeItem('amr_chem_student_access_map_v2');
        localStorage.removeItem('amr_chem_authorized_students');
        localStorage.removeItem('amr_chem_live_logins_v1');
        localStorage.setItem('amr_chem_pure_purge_v7', 'true');
        setRegisteredAccounts(INITIAL_REGISTERED_USERS);
        setStudentActivities([]);
        setExamSubmissions([]);
        setStudentAccessMap({});
        setAuthorizedStudents([]);
        setLiveLoginAlerts([]);
      }
    } catch (e) {}
  }, []);

  const unreadBroadcastCount = broadcastNotifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const markBroadcastsAsRead = () => {
    const allIds = broadcastNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
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
  };

  const deleteBroadcastNotification = (id: string) => {
    deleteDocument('broadcast_notifications', id);
    setBroadcastNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('amr_chem_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('amr_chem_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('amr_chem_lectures', JSON.stringify(lectures));
  }, [lectures]);

  useEffect(() => {
    localStorage.setItem('amr_chem_homeworks', JSON.stringify(homeworks));
  }, [homeworks]);

  useEffect(() => {
    localStorage.setItem('amr_chem_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('amr_chem_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('amr_chem_honored_students', JSON.stringify(honoredStudents));
  }, [honoredStudents]);

  useEffect(() => {
    localStorage.setItem('amr_chem_codes', JSON.stringify(rechargeCodes));
  }, [rechargeCodes]);

  useEffect(() => {
    localStorage.setItem('amr_chem_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('amr_chem_authorized_students', JSON.stringify(authorizedStudents));
  }, [authorizedStudents]);

  useEffect(() => {
    localStorage.setItem('amr_chem_secretaries', JSON.stringify(secretaries));
  }, [secretaries]);

  useEffect(() => {
    localStorage.setItem('amr_chem_payment_methods', JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    localStorage.setItem('amr_chem_registered_accounts_v2', JSON.stringify(registeredAccounts));
  }, [registeredAccounts]);

  useEffect(() => {
    localStorage.setItem('amr_chem_student_activities_v2', JSON.stringify(studentActivities));
  }, [studentActivities]);

  useEffect(() => {
    localStorage.setItem('amr_chem_exam_submissions_v2', JSON.stringify(examSubmissions));
  }, [examSubmissions]);

  useEffect(() => {
    localStorage.setItem('amr_chem_student_access_map_v2', JSON.stringify(studentAccessMap));
  }, [studentAccessMap]);

  useEffect(() => {
    localStorage.setItem('amr_chem_payment_requests_v2', JSON.stringify(paymentRequests));
  }, [paymentRequests]);

  // Real-Time Cloud Firestore Synchronizer across all browsers, students, and devices
  // Guarantees instant sub-second synchronization whenever the admin or any user changes content.
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    try {
      unsubscribes.push(
        subscribeToCollection<Lecture>('lectures', (items) => {
          if (items.length > 0) setLectures(items);
        }, INITIAL_CURRICULUM_LECTURES)
      );

      unsubscribes.push(
        subscribeToCollection<Homework>('homeworks', (items) => {
          if (items.length > 0) setHomeworks(items);
        }, INITIAL_CURRICULUM_HOMEWORKS)
      );

      unsubscribes.push(
        subscribeToCollection<Exam>('exams', (items) => {
          if (items.length > 0) setExams(items);
        }, INITIAL_CURRICULUM_EXAMS)
      );

      unsubscribes.push(
        subscribeToCollection<FileDocument>('files', (items) => {
          setFiles(items);
        })
      );

      unsubscribes.push(
        subscribeToCollection<RegisteredAccount>('registered_accounts', (items) => {
          if (items.length > 0) setRegisteredAccounts(items);
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
    setStudentActivities((prev) => [newAct, ...prev.slice(0, 49)]); // keep latest 50 activities
    saveDocument('student_activities', newAct.id, newAct);
  };

  // Strict Case-Sensitive Authentication (دقيق في كل حرف وكل رقم وحالة الأحرف الكبيرة والصغيرة)
  const loginStrict = (
    identifier: string,
    password: string,
    studentCode?: string,
    parentPhone?: string,
    age?: number,
    subscriptionType?: SubscriptionType
  ): { success: boolean; error?: string } => {
    const rawId = identifier.trim();
    const rawPass = password.trim();
    const rawCode = studentCode ? studentCode.trim() : '';

    if (!rawId) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل.' };
    }

    // 1. Direct Master Admin: Mr. Amr El-Sayed (amr12345@gmail.com enters directly without password)
    const isAmrDirectAdmin =
      rawId.toLowerCase() === 'amr12345@gmail.com' ||
      rawId.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      rawId === 'Amr.ElSayed@Chemistry.Edu';

    if (isAmrDirectAdmin) {
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

    const isTeacherPhone = rawId === TEACHER_PHONE_LOCAL || rawId === TEACHER_PHONE;
    if (isTeacherPhone) {
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

    // Secretary Direct Bypass (No password needed for Secretary)
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

    // 2. Search registeredAccounts (email case-insensitive, phone matching digits, or student code)
    const rawLower = rawId.toLowerCase();
    const cleanDigits = rawId.replace(/\D/g, '');
    const cleanUpperCode = rawId.toUpperCase();

    const exactAccount = registeredAccounts.find((acc) => {
      const accEmail = (acc.email || '').toLowerCase();
      const accPhoneDigits = (acc.phone || '').replace(/\D/g, '');
      const accCode = (acc.studentCode || '').toUpperCase();

      const matchEmail = accEmail === rawLower;
      const matchPhone = cleanDigits.length >= 8 && accPhoneDigits.length >= 8 && accPhoneDigits === cleanDigits;
      const matchCode = accCode && accCode === cleanUpperCode;

      return matchEmail || matchPhone || matchCode;
    });

    if (!exactAccount) {
      return {
        success: false,
        error: 'بيانات الدخول غير صحيحة! لم يتم العثور على حساب بهذا البريد أو الهاتف. يرجى التأكد من البيانات أو إنشاء حساب جديد.',
      };
    }

    // 3. Strict Password Verification
    if (exactAccount.password !== rawPass) {
      return {
        success: false,
        error: 'كلمة المرور غير صحيحة! يرجى كتابة كلمة المرور الخاصة بحسابك بدقة.',
      };
    }

    // 4. Student Code Verification (if provided)
    if (rawCode && exactAccount.studentCode && exactAccount.studentCode.toUpperCase() !== rawCode.toUpperCase()) {
      return {
        success: false,
        error: `كود الطالب (${rawCode}) غير متطابق مع الكود المسجل لهذا الحساب.`,
      };
    }

    // 5. Successful Login & update live attributes
    const updatedAccount: RegisteredAccount = {
      ...exactAccount,
      parentPhone: parentPhone?.trim() || exactAccount.parentPhone || '',
      age: age || exactAccount.age,
      subscriptionType: subscriptionType || exactAccount.subscriptionType || 'course',
      lastLoginAt: new Date().toISOString(),
      isOnline: true,
    };

    setRegisteredAccounts((prev) =>
      prev.map((acc) => (acc.id === exactAccount.id ? updatedAccount : acc))
    );
    saveDocument('registered_accounts', updatedAccount.id, updatedAccount);

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

    // Trigger Live Login Alert for Mr. Amr
    triggerLiveLoginAlert(updatedAccount);

    // Log Activity
    recordActivity({
      studentId: exactAccount.id,
      studentName: exactAccount.name,
      studentPhone: exactAccount.phone,
      studentCode: exactAccount.studentCode,
      grade: exactAccount.grade,
      type: 'login',
      itemId: 'auth_login',
      itemTitle: 'تسجيل الدخول إلى المنصة',
      status: 'completed',
    });

    return { success: true };
  };

  // Register with exact casing and store in registered accounts
  const registerStrict = (data: {
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
  }): { success: boolean; error?: string } => {
    // Check if duplicate
    const exists = registeredAccounts.find(
      (a) => a.email === data.email || a.phone === data.phone
    );
    if (exists) {
      return {
        success: false,
        error: 'هذا البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة.',
      };
    }

    const newAcc: RegisteredAccount = {
      id: 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: data.name.trim(),
      email: data.email.trim(), // Exact casing preserved
      phone: data.phone.trim(),
      password: data.password.trim(), // Exact casing preserved
      studentCode: data.studentCode.trim(), // Exact casing preserved
      parentPhone: data.parentPhone.trim(),
      age: data.age,
      subscriptionType: data.subscriptionType || 'course',
      lastLoginAt: new Date().toISOString(),
      isOnline: true,
      grade: data.grade,
      governorate: data.governorate.trim(),
      role: 'student',
      walletBalance: 0,
      registeredAt: new Date().toISOString().split('T')[0],
    };

    setRegisteredAccounts((prev) => [newAcc, ...prev]);
    saveDocument('registered_accounts', newAcc.id, newAcc);

    // Trigger Live Login Alert for Mr. Amr
    triggerLiveLoginAlert(newAcc);

    // Initialize access records
    setStudentAccessMap((prev) => ({
      ...prev,
      [newAcc.id]: {
        lectures: {},
        exams: {},
        homeworks: {},
      },
    }));

    return { success: true };
  };

  // Backwards-compatible login
  const login = (
    emailOrPhone: string,
    name?: string,
    phone?: string,
    grade: GradeLevel = 'sec3',
    code?: string
  ): boolean => {
    // Try strict first
    const res = loginStrict(emailOrPhone, '123456', code);
    if (res.success) return true;

    // Fallback for immediate guest/demo access
    const cleanPhone = (phone || emailOrPhone).trim();
    const studentProfile: UserProfile = {
      id: 'std_' + Math.random().toString(36).substring(2, 9),
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

  // Live Tracking: Record exam submission and score with smart MCQ + Essay double grading
  const recordExamResult = (
    examId: string,
    examTitle: string,
    score: number,
    maxScore: number,
    timeSpentMinutes: number = 25,
    extraOptions?: {
      autoMcqScore?: number;
      autoMcqMax?: number;
      essayAnswers?: Record<string, string>;
      status?: 'pending_teacher_review' | 'fully_graded';
    }
  ) => {
    if (!currentUser) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const percentage = Math.round((score / (maxScore || 1)) * 100);

    const submission: ExamSubmission = {
      id: 'sub_' + Date.now(),
      examId,
      examTitle,
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
      status: extraOptions?.status || 'fully_graded',
      teacherGraded: false,
    };

    setExamSubmissions((prev) => [submission, ...prev]);
    saveDocument('exam_submissions', submission.id, submission);

    setStudentAccessMap((prev) => {
      const current = prev[currentUser.id] || { lectures: {}, exams: {}, homeworks: {} };
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          exams: {
            ...current.exams,
            [examId]: { taken: true, score, maxScore, date: nowStr },
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
      type: 'exam_submit',
      itemId: examId,
      itemTitle: examTitle,
      score,
      maxScore,
      percentage,
      status: 'completed',
    });
  };

  // Teacher Review: Add essay score on top of AI auto MCQ score
  const updateExamSubmissionGrade = (submissionId: string, teacherExtraScore: number) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let updatedSub: ExamSubmission | null = null;

    setExamSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId) {
          const autoScore = sub.autoMcqScore !== undefined ? sub.autoMcqScore : sub.score;
          const finalScore = autoScore + teacherExtraScore;
          const percentage = Math.round((finalScore / (sub.maxScore || 1)) * 100);
          updatedSub = {
            ...sub,
            score: finalScore,
            percentage,
            teacherExtraScore,
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

      setStudentAccessMap((prev) => {
        const studentId = target.studentId;
        const examId = target.examId;
        const current = prev[studentId] || { lectures: {}, exams: {}, homeworks: {} };
        return {
          ...prev,
          [studentId]: {
            ...current,
            exams: {
              ...current.exams,
              [examId]: { taken: true, score: target.score, maxScore: target.maxScore, date: nowStr },
            },
          },
        };
      });
    }
  };

  // Live Tracking: Record homework submission
  const recordHomeworkAction = (homeworkId: string, homeworkTitle: string, isSolved: boolean) => {
    if (!currentUser) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setStudentAccessMap((prev) => {
      const current = prev[currentUser.id] || { lectures: {}, exams: {}, homeworks: {} };
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          homeworks: {
            ...current.homeworks,
            [homeworkId]: { solved: isSolved, date: nowStr },
          },
        },
      };
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
        status: 'completed',
      });
    }
  };

  // Ranking: تفنيد وترتيب أعلى الدرجات في الامتحان الواحد من الأعلى للأقل
  const getExamRankings = (examId: string): ExamSubmission[] => {
    return examSubmissions
      .filter((sub) => sub.examId === examId)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeSpentMinutes - b.timeSpentMinutes; // Faster completion time wins tie
      })
      .map((sub, index) => ({
        ...sub,
        rank: index + 1,
      }));
  };

  // Individual Student Complete Dossier (بيانات كاملة لكل طالب لوحده)
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
      const isTaken = !!exState?.taken;
      return {
        examId: ex.id,
        examTitle: ex.title,
        taken: isTaken,
        score: exState?.score,
        maxScore: ex.totalMarks,
        percentage: exState?.score !== undefined ? Math.round((exState.score / ex.totalMarks) * 100) : undefined,
        date: exState?.date,
      };
    });

    const homeworkRecords = homeworks.map((hw) => ({
      homeworkId: hw.id,
      homeworkTitle: hw.title,
      solved: !!access.homeworks?.[hw.id]?.solved,
      date: access.homeworks?.[hw.id]?.date,
    }));

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

    const totalHomeworks = homeworks.length;
    const solvedHomeworks = homeworkRecords.filter((r) => r.solved).length;
    const homeworkRate = totalHomeworks > 0 ? Math.round((solvedHomeworks / totalHomeworks) * 100) : 0;

    return {
      student,
      totalLectures,
      enteredLectures,
      attendanceRate,
      totalExams,
      takenExams,
      averageExamScore: avgScore,
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

  // Add / Update / Delete Lecture
  const addLecture = (lec: Omit<Lecture, 'id' | 'dateAdded'>) => {
    const newLec: Lecture = {
      ...lec,
      id: 'lec_' + Date.now(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setLectures((prev) => [newLec, ...prev]);
    saveDocument('lectures', newLec.id, newLec);
  };

  const updateLecture = (id: string, updated: Partial<Lecture>) => {
    setLectures((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    updateDocument('lectures', id, updated);
  };

  const deleteLecture = (id: string) => {
    deleteDocument('lectures', id);
    setLectures((prev) => prev.filter((item) => item.id !== id));
    if (activeVideo && 'id' in activeVideo && activeVideo.id === id) {
      setActiveVideo(null);
    }
  };

  // Add / Update / Delete Homework
  const addHomework = (hw: Omit<Homework, 'id' | 'dateAdded'>) => {
    const newHw: Homework = {
      ...hw,
      id: 'hw_' + Date.now(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setHomeworks((prev) => [newHw, ...prev]);
    saveDocument('homeworks', newHw.id, newHw);
  };

  const updateHomework = (id: string, updated: Partial<Homework>) => {
    setHomeworks((prev) => prev.map((h) => (h.id === id ? { ...h, ...updated } : h)));
    updateDocument('homeworks', id, updated);
  };

  const deleteHomework = (id: string) => {
    deleteDocument('homeworks', id);
    setHomeworks((prev) => prev.filter((item) => item.id !== id));
  };

  // Add / Delete File
  const addFile = (file: Omit<FileDocument, 'id' | 'dateAdded'>) => {
    const newFile: FileDocument = {
      ...file,
      id: 'file_' + Date.now(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setFiles((prev) => [newFile, ...prev]);
    saveDocument('files', newFile.id, newFile);
  };

  const deleteFile = (id: string) => {
    deleteDocument('files', id);
    setFiles((prev) => prev.filter((item) => item.id !== id));
    if (activeDocument && activeDocument.fileUrl === files.find((f) => f.id === id)?.fileUrl) {
      setActiveDocument(null);
    }
  };

  const updateFile = (id: string, updated: Partial<FileDocument>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)));
    updateDocument('files', id, updated);
  };

  // Add / Update / Delete Exam
  const addExam = (exam: Omit<Exam, 'id' | 'dateAdded'>) => {
    const newExam: Exam = {
      ...exam,
      id: 'exam_' + Date.now(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setExams((prev) => [newExam, ...prev]);
    saveDocument('exams', newExam.id, newExam);
  };

  const updateExam = (id: string, updated: Partial<Exam>) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    updateDocument('exams', id, updated);
  };

  const deleteExam = (id: string) => {
    deleteDocument('exams', id);
    setExams((prev) => prev.filter((item) => item.id !== id));
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
  };

  const deleteHonoredStudent = (id: string) => {
    deleteDocument('honored_students', id);
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
  };

  const deleteSecretary = (id: string) => {
    deleteDocument('secretaries', id);
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
  };

  const updatePaymentMethod = (id: string, updated: Partial<PaymentMethod>) => {
    setPaymentMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    updateDocument('payment_methods', id, updated);
  };

  const deletePaymentMethod = (id: string) => {
    deleteDocument('payment_methods', id);
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  };

  // Settings
  const updateSettings = (newSettings: Partial<PlatformSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
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

    setAuthorizedStudents((prev) => [...newItems, ...prev]);
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

    const tx: WalletTransaction = {
      id: 'tx_' + Date.now(),
      type: 'purchase',
      amount: price,
      date: new Date().toLocaleString('ar-EG'),
      description: `شراء كورس: ${lecture.title}`,
    };
    setTransactions((prev) => [tx, ...prev]);

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

      setRechargeCodes((prev) => [...newCodes, ...prev]);
      bulkSaveDocuments('recharge_codes', newCodes.map((c) => ({ ...c, id: c.code })));
      return { success: true, count: newCodes.length, codes: newCodes };
    } catch (err) {
      console.error('Error generating bulk codes:', err);
      return { success: false, count: 0, codes: [] };
    }
  };

  const deleteRechargeCode = (code: string) => {
    deleteDocument('recharge_codes', code);
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

    setRechargeCodes((prev) =>
      prev.map((c) =>
        c.code.toUpperCase() === cleanCode
          ? {
              ...c,
              usedCount: nextUsedCount,
              isUsed: isNowFullyUsed,
              usedBy: currentUser?.phone || currentUser?.email || 'طالب',
            }
          : c
      )
    );
    updateDocument('recharge_codes', cleanCode, {
      usedCount: nextUsedCount,
      isUsed: isNowFullyUsed,
      usedBy: currentUser?.phone || currentUser?.email || 'طالب',
    });

    // If code has an attached course, immediately unlock it for current student
    let courseUnlockedNotice = '';
    if (found.courseId && currentUser) {
      const updatedEnrolled = Array.from(new Set([...currentUser.enrolledLectureIds, found.courseId]));
      setCurrentUser({
        ...currentUser,
        enrolledLectureIds: updatedEnrolled,
      });
      courseUnlockedNotice = found.courseTitle ? ` لكورس: (${found.courseTitle})` : ' للكورس المحدد';
    }

    // If code has wallet value, credit student's wallet
    if (currentUser && found.value > 0) {
      const updatedBalance = currentUser.walletBalance + found.value;
      setCurrentUser({
        ...currentUser,
        walletBalance: updatedBalance,
        ...(found.courseId
          ? { enrolledLectureIds: Array.from(new Set([...currentUser.enrolledLectureIds, found.courseId])) }
          : {}),
      });
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
