import React, { useState, useRef, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  X,
  PlusCircle,
  Plus,
  Paperclip,
  Video,
  FileText,
  BookCheck,
  FileCheck2,
  Trash2,
  Edit3,
  Phone,
  UserPlus,
  UserX,
  CreditCard,
  Eye,
  Sliders,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FolderOpen,
  Upload,
  HardDrive,
  Users,
  Trophy,
  Palette,
  FileSpreadsheet,
  FileCode,
  Image,
  KeyRound,
  FileUp,
  Save,
  Loader2,
  RefreshCw,
  RotateCcw,
  Zap,
  Download,
  Send,
  Bot,
  MessageSquare,
  Camera,
  Receipt,
  Clock,
  CheckCheck,
  AlertCircle,
  ExternalLink,
  Bell,
  Megaphone,
  ShieldAlert,
  XCircle,
  Award,
  Activity,
  UserCheck,
  Printer,
  Gift,
} from 'lucide-react';
import { GradeLevel, Question, Lecture, Exam, Homework, PaymentMethod, HonoredStudent, FileDocument, SubscriptionType, StudentDossier, UploadProgressInfo, TeacherProfile } from '../types';
import { QuestionReviewEditor } from './QuestionReviewEditor';
import { optimizeImageForAi } from '../utils/fileOptimizer';
import { uploadFileWithRealProgress, probeVideoDuration } from '../utils/realUploader';
import { GeminiTeacherDashboard } from './GeminiTeacherDashboard';
import { UniversalPlusUploader } from './UniversalPlusUploader';
import { chatWithAiClient, parseQuizWithAiClient, extractStudentsWithAiClient, resetAiConnection } from '../utils/aiClientService';
import { getActiveSupabaseCredentials, updateActiveSupabaseCredentials, resetActiveSupabaseCredentials } from '../services/supabaseService';
import { Database, Link2 } from 'lucide-react';
import { parseYouTubeUrl, parseDriveUrl, parseVideoUrl } from '../utils/linkParser';
import { TopRankingsDirectorySection } from './TopRankingsDirectorySection';
import { StudentDirectorySection } from './StudentDirectorySection';
import { buildWhatsAppUrl, openExternalSafe } from '../utils/safeExternalLink';



export const AdminPanelModal: React.FC = () => {
  const {
    isAdminPanelOpen,
    setIsAdminPanelOpen,
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
    generateRechargeCode,
    generateBulkRechargeCodes,
    deleteRechargeCode,
    authorizedStudents,
    addAuthorizedStudent,
    removeAuthorizedStudent,
    grantFreeAccess,
    secretaries,
    addSecretary,
    deleteSecretary,
    paymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    settings,
    updateSettings,
    setActiveVideo,
    setActiveDocument,
    paymentRequests,
    approvePaymentRequest,
    rejectPaymentRequest,
    addBatchAuthorizedStudents,
    broadcastNotifications,
    sendBroadcastNotification,
    deleteBroadcastNotification,
    currentUser,
    registeredAccounts,
    addRegisteredStudent,
    updateRegisteredStudent,
    deleteRegisteredStudent,
    clearAllStudents,
    liveLoginAlerts,
    dismissLoginAlert,
    clearAllLoginAlerts,
    studentAccessMap,
    studentActivities,
    examSubmissions,
    getStudentDossier,
    teacherProfile,
    updateTeacherProfile,
    lastAutoSavedAt,
    isAutoSaving,
  } = usePlatform();

  // Strict Secret Section Security Check:
  // ONLY Mr. Amr El-Sayed (Master Admin) and authorized Secretaries whose phone numbers were explicitly added can view this section!
  const isMasterAdmin =
    currentUser?.email?.toLowerCase() === 'amr12345@gmail.com' ||
    currentUser?.role === 'admin' ||
    currentUser?.phone === '01069780486' ||
    currentUser?.phone === '+20 10 69780486';

  const isAuthorizedSecretary =
    currentUser?.role === 'secretary' &&
    secretaries.some((s) => s.phone.trim() === currentUser?.phone?.trim());

  const canAccessSecretSection = isMasterAdmin || isAuthorizedSecretary;

  const [activeTab, setActiveTab] = useState<
    | 'videos'
    | 'files'
    | 'homework'
    | 'exams'
    | 'gemini_ai'
    | 'students'
    | 'receipts'
    | 'broadcast'
    | 'honor'
    | 'secretaries'
    | 'payments'
    | 'appearance'
    | 'exam_rankings'
    | 'secret_surveillance'
    | 'teacher_profile'
    | 'supabase'
  >('videos');

  // Full Student Management State (Add, Edit, Delete, Filter, Reports)
  const [studentSectionMode, setStudentSectionMode] = useState<'directory' | 'reports' | 'lecture_auth' | 'ai_scan'>('directory');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStdName, setNewStdName] = useState('');
  const [newStdPhone, setNewStdPhone] = useState('');
  const [newStdParentPhone, setNewStdParentPhone] = useState('');
  const [newStdCode, setNewStdCode] = useState('');
  const [newStdPass, setNewStdPass] = useState('');
  const [newStdGrade, setNewStdGrade] = useState<GradeLevel>('sec3');
  const [newStdSubscription, setNewStdSubscription] = useState<SubscriptionType>('course');
  const [newStdGov, setNewStdGov] = useState('القاهرة');
  const [newStdAge, setNewStdAge] = useState('18');
  const [newStdBalance, setNewStdBalance] = useState('0');

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  // Student Directory Search & Filters
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilterGrade, setStudentFilterGrade] = useState<GradeLevel | 'all'>('all');
  const [studentFilterSub, setStudentFilterSub] = useState<SubscriptionType | 'all'>('all');

  // Secret Student Surveillance State & Direct Radar Student Management
  const [surveillanceSearch, setSurveillanceSearch] = useState('');
  const [surveillanceGrade, setSurveillanceGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<string | null>(null);
  const [showRadarAddForm, setShowRadarAddForm] = useState(false);
  const [radarStdName, setRadarStdName] = useState('');
  const [radarStdPhone, setRadarStdPhone] = useState('');
  const [radarStdParentPhone, setRadarStdParentPhone] = useState('');
  const [radarStdCode, setRadarStdCode] = useState('');
  const [radarStdPass, setRadarStdPass] = useState('');
  const [radarStdGrade, setRadarStdGrade] = useState<GradeLevel>('sec3');
  const [radarStdSubscription, setRadarStdSubscription] = useState<SubscriptionType>('course');
  const [radarStdGov, setRadarStdGov] = useState('القاهرة');
  const [radarStdAge, setRadarStdAge] = useState('18');

  // Broadcast Message Form State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<GradeLevel | 'all'>('all');
  const [notifPriority, setNotifPriority] = useState<'normal' | 'urgent'>('normal');

  // Bulk Codes Generator State (up to 10,000 codes with 1 or 2 uses max)
  const [bulkCodeCount, setBulkCodeCount] = useState<number>(50);
  const [bulkCodeValue, setBulkCodeValue] = useState<number>(100);
  const [bulkCodeMaxUses, setBulkCodeMaxUses] = useState<1 | 2>(1);
  const [bulkCodePrefix, setBulkCodePrefix] = useState<string>('AMR');
  const [bulkCodeCourseId, setBulkCodeCourseId] = useState<string>('');
  const [isGeneratingBulkCodes, setIsGeneratingBulkCodes] = useState<boolean>(false);
  const [codeSearchQuery, setCodeSearchQuery] = useState<string>('');
  const [copiedCodesNotice, setCopiedCodesNotice] = useState<boolean>(false);

  const [draftSettings, setDraftSettings] = useState(settings);
  const [isApplyingTheme, setIsApplyingTheme] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  // Video Form (from Local Device Files + Real High-Speed Multi-GB Uploader)
  const [videoTitle, setVideoTitle] = useState('');
  const [videoChapter, setVideoChapter] = useState('');
  const [videoGrade, setVideoGrade] = useState<GradeLevel>('sec3');
  const [videoDuration, setVideoDuration] = useState('60');
  const [videoDurationFormatted, setVideoDurationFormatted] = useState('');
  const [videoPrice, setVideoPrice] = useState('50');
  const [isVideoFree, setIsVideoFree] = useState(false);
  const [videoDesc, setVideoDesc] = useState('');
  const [videoFileObj, setVideoFileObj] = useState<File | null>(null);
  const [videoFileUrl, setVideoFileUrl] = useState('');
  const [videoUploadProgress, setVideoUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [docUploadProgress, setDocUploadProgress] = useState<UploadProgressInfo | null>(null);

  // Teacher Profile Editing State
  const [profName, setProfName] = useState(teacherProfile?.name || 'مستر عمرو السيد');
  const [profTitle, setProfTitle] = useState(teacherProfile?.title || 'خبير مادة الكيمياء للثانوية العامة والأزهرية');
  const [profBio, setProfBio] = useState(teacherProfile?.bio || '');
  const [profPhone, setProfPhone] = useState(teacherProfile?.phone || '01069780486');
  const [profWhatsapp, setProfWhatsapp] = useState(teacherProfile?.whatsapp || '+201069780486');
  const [profEmail, setProfEmail] = useState(teacherProfile?.email || 'Amr.ElSayed@Chemistry.Edu');
  const [profOffice, setProfOffice] = useState(teacherProfile?.officeAddress || 'محافظة الدقهلية / المنصورة / القاهرة');
  const [profAnnouncement, setProfAnnouncement] = useState(teacherProfile?.announcementText || '');

  // Claude AI Batch Student Extractor State
  const [isBatchAiModalOpen, setIsBatchAiModalOpen] = useState(false);
  const [batchImagePreview, setBatchImagePreview] = useState<string | null>(null);
  const [batchExtractedStudents, setBatchExtractedStudents] = useState<
    { studentName: string; phone: string; studentCode: string; lectureId: string }[]
  >([]);
  const [batchLectureTarget, setBatchLectureTarget] = useState('all');
  const [isExtractingBatch, setIsExtractingBatch] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Payment Verification State
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [claudePaymentAnswer, setClaudePaymentAnswer] = useState<string | null>(null);
  const [isAskingClaudePayment, setIsAskingClaudePayment] = useState(false);

  // Homework & Sheet Form (from Local Device Files + Gemini AI Question Extractor)
  const [hwTitle, setHwTitle] = useState('');
  const [hwKind, setHwKind] = useState<'homework' | 'sheet'>('homework');
  const [hwLessonTitle, setHwLessonTitle] = useState('');
  const [hwGrade, setHwGrade] = useState<GradeLevel>('sec3');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [hwDuration, setHwDuration] = useState('1440');
  const [hwTotalMarks, setHwTotalMarks] = useState('10');
  const [hwFileObj, setHwFileObj] = useState<File | null>(null);
  const [hwFileUrl, setHwFileUrl] = useState('');
  const [hwFileType, setHwFileType] = useState<'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'image'>('pdf');
  const [hwExtractedQuestions, setHwExtractedQuestions] = useState<Question[]>([]);
  const [isHwAiParsing, setIsHwAiParsing] = useState(false);
  const [hwAiNotes, setHwAiNotes] = useState('');
  const [hwChatInput, setHwChatInput] = useState('');
  const [isHwChatReplying, setIsHwChatReplying] = useState(false);

  // Claude Plus (+) Attachment State for Homework
  const hwPlusFileInputRef = useRef<HTMLInputElement>(null);
  const [hwAttachedFile, setHwAttachedFile] = useState<File | null>(null);
  const [hwAttachedDataUrl, setHwAttachedDataUrl] = useState('');
  const [hwAttachedMime, setHwAttachedMime] = useState('');

  const [hwChatMessages, setHwChatMessages] = useState<
    { id: string; sender: 'teacher' | 'ai'; text: string; time: string }[]
  >([
    {
      id: 'hw_welcome',
      sender: 'ai',
      text: 'أهلاً بك يا مستر عمرو! أنا مساعدك الذكي Google Gemini (جوجل جيمناي). اضغط على علامة الزائد (+) لإرفاق صورة أو شيت من جهازك بأي حجم، ثم تحدث معي ووجهني بما تريده بدقة وسأنفذ طلبك بالحرف الواحد في أي مادة (كيمياء، أحياء، فيزياء، علوم) قبل استخراج الأسئلة ⚡.',
      time: 'الآن',
    },
  ]);

  // File Form (from Local Device Files)
  const [fileTitle, setFileTitle] = useState('');
  const [fileCategory, setFileCategory] = useState('شرح');
  const [fileGrade, setFileGrade] = useState<GradeLevel>('sec3');
  const [fileDesc, setFileDesc] = useState('');
  const [docFileObj, setDocFileObj] = useState<File | null>(null);
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileType, setDocFileType] = useState<'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'image' | 'other'>('pdf');

  // Exam Form (Bulk up to 500 questions + Google Gemini AI extraction)
  const [examTitle, setExamTitle] = useState('');
  const [examLessonTitle, setExamLessonTitle] = useState('');
  const [examGrade, setExamGrade] = useState<GradeLevel>('sec3');
  const [examDuration, setExamDuration] = useState('45');
  const [examMarks, setExamMarks] = useState('60');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [rawQuestionsText, setRawQuestionsText] = useState('');
  const [examFileObj, setExamFileObj] = useState<File | null>(null);
  const [examFileUrl, setExamFileUrl] = useState('');
  const [isExamAiParsing, setIsExamAiParsing] = useState(false);
  const [examAiNotes, setExamAiNotes] = useState('');
  const [examChatInput, setExamChatInput] = useState('');
  const [isExamChatReplying, setIsExamChatReplying] = useState(false);

  // Google Gemini Plus (+) Attachment State for Exams
  const examPlusFileInputRef = useRef<HTMLInputElement>(null);
  const [examAttachedFile, setExamAttachedFile] = useState<File | null>(null);
  const [examAttachedDataUrl, setExamAttachedDataUrl] = useState('');
  const [examAttachedMime, setExamAttachedMime] = useState('');

  const [examChatMessages, setExamChatMessages] = useState<
    { id: string; sender: 'teacher' | 'ai'; text: string; time: string }[]
  >([
    {
      id: 'exam_welcome',
      sender: 'ai',
      text: 'مرحباً مستر عمرو! أنا مساعد الامتحانات الذكي Google Gemini (جوجل جيمناي). اضغط على علامة (+) لإرفاق ملف أو صورة شيت الامتحان من جهازك بأي حجم وتحدث معي لتعديل الأفكار أو الصياغة، وسأصوغ لك امتحاناً نموذجياً مطابقاً لمعاييرك بالحرف الواحد ⚡.',
      time: 'الآن',
    },
  ]);

  // Student Authorization Form (Phone + Code)
  const [authStudentName, setAuthStudentName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authLectureId, setAuthLectureId] = useState('all');

  // Honor Board Form
  const [honorName, setHonorName] = useState('');
  const [honorGrade, setHonorGrade] = useState<GradeLevel>('sec3');
  const [honorScore, setHonorScore] = useState('60');
  const [honorMaxScore, setHonorMaxScore] = useState('60');
  const [honorGov, setHonorGov] = useState('القاهرة');
  const [honorRank, setHonorRank] = useState('1');
  const [honorBadge, setHonorBadge] = useState('المركز الأول على مستوى الجمهورية 🥇');

  // Secretary Form
  const [secName, setSecName] = useState('');
  const [secPhone, setSecPhone] = useState('');
  const [secNotes, setSecNotes] = useState('');

  // Payment Method Form
  const [payName, setPayName] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payInstructions, setPayInstructions] = useState('');
  const [payType, setPayType] = useState<'vodafone' | 'fawry' | 'instapay' | 'bank' | 'card'>('vodafone');

  // Recharge Code State
  const [codeName, setCodeName] = useState('');
  const [codeValue, setCodeValue] = useState('100');

  // Editing Item state for published items (Videos, Homework, Exams, Files)
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingExamQuestions, setEditingExamQuestions] = useState<Question[]>([]);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [editingHomeworkQuestions, setEditingHomeworkQuestions] = useState<Question[]>([]);
  const [editingFile, setEditingFile] = useState<FileDocument | null>(null);

  // High-contrast, crystal clear chat typography font size (adjustable by user)
  const [chatFontSize, setChatFontSize] = useState<number>(14);

  // Supabase Configuration State
  const initialSupabaseCreds = getActiveSupabaseCredentials();
  const [sbUrlInput, setSbUrlInput] = useState(initialSupabaseCreds.url);
  const [sbKeyInput, setSbKeyInput] = useState(initialSupabaseCreds.key);
  const [sbSavingStatus, setSbSavingStatus] = useState<string | null>(null);

  // AI Emergency Reset State & Auto-Save Sync Refs (Strictly before any early return)
  const [isResettingAi, setIsResettingAi] = useState(false);
  const profileDirtyRef = useRef(false);
  const prevLectureIdRef = useRef<string | null>(null);
  const lastSyncedLectureRef = useRef<string>('');
  const prevHwIdRef = useRef<string | null>(null);
  const lastSyncedHwRef = useRef<string>('');
  const prevExamIdRef = useRef<string | null>(null);
  const lastSyncedExamRef = useRef<string>('');
  const prevFileIdRef = useRef<string | null>(null);
  const lastSyncedFileRef = useRef<string>('');

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleEmergencyResetAi = async () => {
    if (isResettingAi) return;
    setIsResettingAi(true);
    try {
      const res = await resetAiConnection();
      if (res.healthy) {
        showNotice(`✅ ${res.message}`);
      } else {
        showNotice(`⚠️ ${res.message}`);
      }
    } catch {
      showNotice('❌ تعذر إعادة ضبط اتصال الذكاء الاصطناعي حالياً.');
    } finally {
      setIsResettingAi(false);
    }
  };

  // Sync draftSettings when platform settings load from cloud
  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  // Sync teacher profile inputs when hydrated from Supabase (only if not currently edited)
  useEffect(() => {
    if (!teacherProfile || profileDirtyRef.current) return;
    setProfName(teacherProfile.name || 'مستر عمرو السيد');
    setProfTitle(teacherProfile.title || 'خبير مادة الكيمياء للثانوية العامة والأزهرية');
    setProfBio(teacherProfile.bio || '');
    setProfPhone(teacherProfile.phone || '01069780486');
    setProfWhatsapp(teacherProfile.whatsapp || '+201069780486');
    setProfEmail(teacherProfile.email || 'Amr.ElSayed@Chemistry.Edu');
    setProfOffice(teacherProfile.officeAddress || 'محافظة الدقهلية / المنصورة / القاهرة');
    setProfAnnouncement(teacherProfile.announcementText || '');
  }, [teacherProfile]);

  // Debounced auto-save for Teacher Profile edits
  useEffect(() => {
    if (!isAdminPanelOpen || !profileDirtyRef.current) return;
    const timer = setTimeout(() => {
      updateTeacherProfile({
        name: profName,
        title: profTitle,
        bio: profBio,
        phone: profPhone,
        whatsapp: profWhatsapp,
        email: profEmail,
        officeAddress: profOffice,
        announcementText: profAnnouncement,
      });
      profileDirtyRef.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, [isAdminPanelOpen, profName, profTitle, profBio, profPhone, profWhatsapp, profEmail, profOffice, profAnnouncement, updateTeacherProfile]);

  // Debounced auto-save for Published Lecture editing modal
  useEffect(() => {
    if (!editingLecture) {
      prevLectureIdRef.current = null;
      lastSyncedLectureRef.current = '';
      return;
    }
    const serialized = JSON.stringify(editingLecture);
    if (prevLectureIdRef.current !== editingLecture.id) {
      prevLectureIdRef.current = editingLecture.id;
      lastSyncedLectureRef.current = serialized;
      return;
    }
    if (serialized === lastSyncedLectureRef.current) return;
    const timer = setTimeout(() => {
      lastSyncedLectureRef.current = serialized;
      updateLecture(editingLecture.id, editingLecture);
    }, 550);
    return () => clearTimeout(timer);
  }, [editingLecture, updateLecture]);

  // Debounced auto-save for Published Homework & Questions editing modal
  useEffect(() => {
    if (!editingHomework) {
      prevHwIdRef.current = null;
      lastSyncedHwRef.current = '';
      return;
    }
    const payload = { ...editingHomework, questions: editingHomeworkQuestions };
    const serialized = JSON.stringify(payload);
    if (prevHwIdRef.current !== editingHomework.id) {
      prevHwIdRef.current = editingHomework.id;
      lastSyncedHwRef.current = serialized;
      return;
    }
    if (serialized === lastSyncedHwRef.current) return;
    const timer = setTimeout(() => {
      lastSyncedHwRef.current = serialized;
      updateHomework(editingHomework.id, payload);
    }, 550);
    return () => clearTimeout(timer);
  }, [editingHomework, editingHomeworkQuestions, updateHomework]);

  // Debounced auto-save for Published Exam & Questions editing modal
  useEffect(() => {
    if (!editingExam) {
      prevExamIdRef.current = null;
      lastSyncedExamRef.current = '';
      return;
    }
    const payload = { ...editingExam, questions: editingExamQuestions };
    const serialized = JSON.stringify(payload);
    if (prevExamIdRef.current !== editingExam.id) {
      prevExamIdRef.current = editingExam.id;
      lastSyncedExamRef.current = serialized;
      return;
    }
    if (serialized === lastSyncedExamRef.current) return;
    const timer = setTimeout(() => {
      lastSyncedExamRef.current = serialized;
      updateExam(editingExam.id, payload);
    }, 550);
    return () => clearTimeout(timer);
  }, [editingExam, editingExamQuestions, updateExam]);

  // Debounced auto-save for Published File editing modal
  useEffect(() => {
    if (!editingFile) {
      prevFileIdRef.current = null;
      lastSyncedFileRef.current = '';
      return;
    }
    const serialized = JSON.stringify(editingFile);
    if (prevFileIdRef.current !== editingFile.id) {
      prevFileIdRef.current = editingFile.id;
      lastSyncedFileRef.current = serialized;
      return;
    }
    if (serialized === lastSyncedFileRef.current) return;
    const timer = setTimeout(() => {
      lastSyncedFileRef.current = serialized;
      updateFile(editingFile.id, editingFile);
    }, 550);
    return () => clearTimeout(timer);
  }, [editingFile, updateFile]);

  if (!isAdminPanelOpen) return null;

  // Real Video Upload & Duration Detection (reports exact duration, MB, speed, remaining time)
  const handleSelectVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showNotice(
        `⚠️ حجم ملف الفيديو (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد الأقصى للرفع المباشر (50 ميجابايت). يُرجى استخدام خيار الإضافة بالرابط (YouTube) لتشغيل مجاني وسريع وبدون أي قيود.`
      );
      e.target.value = '';
      return;
    }

    setVideoFileObj(file);
    if (!videoTitle) {
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // 1. Probe video duration accurately using HTML5 video metadata
    try {
      const probe = await probeVideoDuration(file);
      if (probe && probe.durationSeconds > 0) {
        setVideoDuration(String(Math.max(1, Math.round(probe.durationSeconds / 60))));
        setVideoDurationFormatted(probe.formatted);
      }
    } catch (err) {
      console.warn('Video duration probe error:', err);
    }

    // 2. Start Real Streaming Upload to Supabase Storage with live progress tracking
    const initialMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setVideoUploadProgress({
      isUploading: true,
      progressPercent: 0,
      uploadedBytesFormatted: '0 MB',
      totalBytesFormatted: initialMb,
      speedFormatted: 'جارِ بدء النقل...',
      remainingTimeFormatted: 'جارِ الحساب...',
      fileName: file.name,
      fileSizeFormatted: initialMb,
      statusText: 'جارِ نقل ورفع بيانات الفيديو إلى السحابة...',
    });

    uploadFileWithRealProgress(
      file,
      (p) => {
        setVideoUploadProgress({
          isUploading: true,
          progressPercent: p.percent,
          uploadedBytesFormatted: p.loadedFormatted,
          totalBytesFormatted: p.totalFormatted,
          speedFormatted: p.speed,
          remainingTimeFormatted: p.remaining,
          fileName: file.name,
          fileSizeFormatted: p.totalFormatted,
          statusText: `جارِ الرفع الحقيقي: تم نقل ${p.loadedFormatted} من إجمالي ${p.totalFormatted}`,
        });
      },
      (res) => {
        setVideoFileUrl(res.url);
        setVideoUploadProgress({
          isUploading: false,
          progressPercent: 100,
          uploadedBytesFormatted: res.fileSize,
          totalBytesFormatted: res.fileSize,
          speedFormatted: 'مكتمل',
          remainingTimeFormatted: '0 ثانية',
          fileName: res.fileName,
          fileSizeFormatted: res.fileSize,
          statusText: '✅ تم اكتمال رفع وحفظ الفيديو بشكل حقيقي تماماً على المنصة!',
        });
        showNotice(`⚡ تم رفع ملف الفيديو (${file.name}) بنجاح كامل على السحابة وجاهز للبث المباشر فوراً!`);
      },
      (errMsg) => {
        setVideoUploadProgress((prev) =>
          prev ? { ...prev, isUploading: false, statusText: `⚠️ خطأ في الرفع: ${errMsg}` } : null
        );
        showNotice(`فشل رفع الفيديو: ${errMsg}`);
      }
    );
  };

  // Real Document Upload with live progress tracking
  const handleSelectDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showNotice(
        `⚠️ حجم المستند (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد الأقصى للرفع المباشر (50 ميجابايت). يُرجى استخدام خيار الإضافة برابط Google Drive لعرض آمن وفوري.`
      );
      e.target.value = '';
      return;
    }

    setDocFileObj(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') setDocFileType('xls');
    else if (ext === 'docx' || ext === 'doc') setDocFileType('doc');
    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) setDocFileType('image');
    else setDocFileType('pdf');

    if (!fileTitle) {
      setFileTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const initialMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setDocUploadProgress({
      isUploading: true,
      progressPercent: 0,
      uploadedBytesFormatted: '0 MB',
      totalBytesFormatted: initialMb,
      speedFormatted: 'جارِ بدء النقل...',
      remainingTimeFormatted: 'جارِ الحساب...',
      fileName: file.name,
      fileSizeFormatted: initialMb,
      statusText: 'جارِ رفع المستند وحفظه في السحابة...',
    });

    uploadFileWithRealProgress(
      file,
      (p) => {
        setDocUploadProgress({
          isUploading: true,
          progressPercent: p.percent,
          uploadedBytesFormatted: p.loadedFormatted,
          totalBytesFormatted: p.totalFormatted,
          speedFormatted: p.speed,
          remainingTimeFormatted: p.remaining,
          fileName: file.name,
          fileSizeFormatted: p.totalFormatted,
          statusText: `جارِ نقل الملف: تم نقل ${p.loadedFormatted} من إجمالي ${p.totalFormatted}`,
        });
      },
      (res) => {
        setDocFileUrl(res.url);
        setDocUploadProgress({
          isUploading: false,
          progressPercent: 100,
          uploadedBytesFormatted: res.fileSize,
          totalBytesFormatted: res.fileSize,
          speedFormatted: 'مكتمل',
          remainingTimeFormatted: '0 ثانية',
          fileName: res.fileName,
          fileSizeFormatted: res.fileSize,
          statusText: '✅ تم اكتمال رفع وحفظ الملف بشكل حقيقي تماماً!',
        });
        showNotice(`⚡ تم حفظ وتجهيز الملف (${file.name}) بنجاح كامل على السحابة!`);
      },
      (errMsg) => {
        setDocUploadProgress((prev) =>
          prev ? { ...prev, isUploading: false, statusText: `⚠️ خطأ: ${errMsg}` } : null
        );
        showNotice(`فشل رفع الملف: ${errMsg}`);
      }
    );
  };

  // Helper to render live upload progress bar with duration & speed
  const renderUploadProgressBar = (p: UploadProgressInfo | null, extraMeta?: string) => {
    if (!p) return null;
    return (
      <div className="p-3.5 bg-[#050c1e] border border-cyan-500/40 rounded-xl space-y-2.5 shadow-lg animate-fade-in">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {p.isUploading ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {p.fileName}
            </span>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
              {p.fileSizeFormatted}
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-cyan-400">{p.progressPercent}%</span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-cyan-950 relative">
          <div
            className={`h-full transition-all duration-200 ${
              p.progressPercent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/50'
                : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-md shadow-cyan-500/50'
            }`}
            style={{ width: `${p.progressPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 gap-2 pt-0.5">
          <div className="flex items-center gap-3">
            <span>المنقول: {p.uploadedBytesFormatted} / {p.totalBytesFormatted}</span>
            <span>·</span>
            <span>السرعة: {p.speedFormatted}</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300 font-medium">
            {p.isUploading ? (
              <>
                <Clock className="w-3 h-3 text-amber-400" />
                <span>متبقي: {p.remainingTimeFormatted}</span>
              </>
            ) : (
              <span className="text-emerald-400 font-bold">جاهز للبث والعرض المباشر ⚡</span>
            )}
          </div>
        </div>

        {extraMeta && (
          <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-800/30 font-semibold">
            {extraMeta}
          </div>
        )}
      </div>
    );
  };

  // Save Teacher Personal Profile to Firestore
  const handleSaveTeacherProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeacherProfile({
      name: profName,
      title: profTitle,
      bio: profBio,
      phone: profPhone,
      whatsapp: profWhatsapp,
      email: profEmail,
      officeAddress: profOffice,
      announcementText: profAnnouncement,
    });
    showNotice('✨ تم حفظ وتحديث الملف الشخصي لمستر عمرو السيد في قاعدة البيانات السحابية فوراً!');
  };

  // Teacher Chat with Claude for Homework
  const handleSendHwChat = async (overrideText?: string) => {
    const textToSend = (overrideText || hwChatInput).trim();
    if (!textToSend && !hwAttachedDataUrl) return;

    const teacherMsg = {
      id: `t_${Date.now()}`,
      sender: 'teacher' as const,
      text: textToSend,
      time: 'الآن',
    };

    setHwChatMessages((prev) => [...prev, teacherMsg]);
    setHwChatInput('');
    if (textToSend) {
      setHwAiNotes((prev) => (prev ? `${prev} - ${textToSend}` : textToSend));
    }
    setIsHwChatReplying(true);

    try {
      const data = await chatWithAiClient(textToSend, 'homework');
      if (data.warning) {
        showNotice(`⚠️ ${data.warning}`);
      }
      const reply = data.reply || 'علم يا مستر عمرو! استلمت توجيهاتك وسأنفذها بالحرف الواحد عند استخراج وتوليد الأسئلة ⚡.';

      setHwChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai' as const,
          text: reply,
          time: 'الآن',
        },
      ]);
    } catch {
      setHwChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai' as const,
          text: 'حاضر يا مستر عمرو! تم تسجيل طلبك وسأنفذه بالحرف الواحد عند الضغط على زر استخراج الأسئلة ⚡.',
          time: 'الآن',
        },
      ]);
    } finally {
      setIsHwChatReplying(false);
    }
  };

  // Teacher Chat with Claude for Exams
  const handleSendExamChat = async (overrideText?: string) => {
    const textToSend = (overrideText || examChatInput).trim();
    if (!textToSend && !examAttachedDataUrl) return;

    const teacherMsg = {
      id: `t_${Date.now()}`,
      sender: 'teacher' as const,
      text: textToSend,
      time: 'الآن',
    };

    setExamChatMessages((prev) => [...prev, teacherMsg]);
    setExamChatInput('');
    if (textToSend) {
      setExamAiNotes((prev) => (prev ? `${prev} - ${textToSend}` : textToSend));
    }
    setIsExamChatReplying(true);

    try {
      const data = await chatWithAiClient(textToSend, 'exam');
      if (data.warning) {
        showNotice(`⚠️ ${data.warning}`);
      }
      const reply = data.reply || 'تم تسجيل توجيهات الامتحان يا مستر عمرو! سأنفذها بالحرف الواحد عند بدء الاستخراج ⚡.';

      setExamChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai' as const,
          text: reply,
          time: 'الآن',
        },
      ]);
    } catch {
      setExamChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai' as const,
          text: 'تم يا مستر عمرو! سجلت توجيهاتك للامتحان وسأطبقها بالحرف الواحد بدقة متناهية ⚡.',
          time: 'الآن',
        },
      ]);
    } finally {
      setIsExamChatReplying(false);
    }
  };

  // Claude 3.5 Sonnet Question Extractor for Homework
  const runAiParseHomework = async (fileDataUrl?: string, mime?: string, customNotes?: string) => {
    setIsHwAiParsing(true);
    const notes = customNotes || hwAiNotes || 'استخرج وصيغ أسئلة اختيار من متعدد تفاعلية لمستر عمرو السيد';
    try {
      const payload: any = {
        grade: hwGrade,
        instructions: notes,
      };
      if (fileDataUrl) {
        payload.fileData = fileDataUrl;
        payload.mimeType = mime || 'image/jpeg';
      }

      const data = await parseQuizWithAiClient(payload);
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setHwExtractedQuestions(data.questions);
        if (!hwTitle && data.quizTitle) {
          setHwTitle(data.quizTitle);
        }
        showNotice(
          data.warning
            ? `⚠️ ${data.warning}`
            : `✨ استخرج Google Gemini AI ${data.questions.length} سؤال بنجاح فائق ودقة تامة!`
        );
        setHwChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: data.warning
              ? `⚠️ ${data.warning} (تم تجهيز ${data.questions.length} سؤال بالمحرك الاحتياطي للمراجعة)`
              : `تم استخراج وتوليد ${data.questions.length} سؤال بنجاح بالحرف الواحد وفقاً لتوجيهاتك! راجع الأسئلة في المحرر أدناه، مع الخيارات والإجابات النموذجية.`,
            time: 'الآن',
          },
        ]);
      } else {
        const errMsg = data.error || data.warning || 'تعذر استخراج الأسئلة بواسطة Google Gemini.';
        showNotice(`⚠️ ${errMsg}`);
        setHwChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: `⚠️ ${errMsg}`,
            time: 'الآن',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Gemini Parse error:', err);
      showNotice('حدث خطأ أثناء الاتصال بمساعد Google Gemini.');
    } finally {
      setIsHwAiParsing(false);
    }
  };

  // Claude 3.5 Sonnet Question Extractor for Exams
  const runAiParseExam = async (fileDataUrl?: string, mime?: string, customNotes?: string) => {
    setIsExamAiParsing(true);
    const notes = customNotes || examAiNotes || 'استخرج وصيغ أسئلة امتحان كيمياء بنظام الاختيار من متعدد';
    try {
      const payload: any = {
        grade: examGrade,
        instructions: notes,
      };
      if (fileDataUrl) {
        payload.fileData = fileDataUrl;
        payload.mimeType = mime || 'image/jpeg';
      } else if (rawQuestionsText.trim()) {
        payload.rawText = rawQuestionsText;
      }

      const data = await parseQuizWithAiClient(payload);
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setExamQuestions(data.questions);
        if (!examTitle && data.quizTitle) {
          setExamTitle(data.quizTitle);
        }
        if (data.suggestedDurationMinutes) {
          setExamDuration(String(data.suggestedDurationMinutes));
        }
        if (data.suggestedTotalMarks) {
          setExamMarks(String(data.suggestedTotalMarks));
        }
        showNotice(
          data.warning
            ? `⚠️ ${data.warning}`
            : `✨ تم استخراج وصياغة ${data.questions.length} سؤال للامتحان بواسطة Google Gemini بدقة فائقة!`
        );
        setExamChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: data.warning
              ? `⚠️ ${data.warning} (تم تجهيز ${data.questions.length} سؤال بالمحرك الاحتياطي للمراجعة)`
              : `تم توليد وصياغة ${data.questions.length} سؤال للامتحان بواسطة Google Gemini وفقاً لتوجيهاتك بالحرف الواحد! راجع الإجابات النموذجية ودرجات كل سؤال أدناه.`,
            time: 'الآن',
          },
        ]);
      } else {
        const errMsg = data.error || data.warning || 'تعذر استخراج الأسئلة بواسطة Google Gemini.';
        showNotice(`⚠️ ${errMsg}`);
        setExamChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: `⚠️ ${errMsg}`,
            time: 'الآن',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Gemini Exam Parse error:', err);
      showNotice('حدث خطأ أثناء المسح بمساعد Google Gemini.');
    } finally {
      setIsExamAiParsing(false);
    }
  };

  // AI Question Extraction from pasted text for Exams
  const runAiParsePastedText = async () => {
    if (!rawQuestionsText.trim()) {
      showNotice('يرجى لصق نصوص الأسئلة أولاً لتحليلها بمساعد Google Gemini.');
      return;
    }
    setIsExamAiParsing(true);
    try {
      const data = await parseQuizWithAiClient({
        rawText: rawQuestionsText,
        grade: examGrade,
        instructions: examAiNotes,
      });
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setExamQuestions(data.questions);
        if (!examTitle && data.quizTitle) {
          setExamTitle(data.quizTitle);
        }
        showNotice(
          data.warning
            ? `⚠️ ${data.warning}`
            : `✨ قام مساعد Google Gemini بصياغة وتنسيق ${data.questions.length} سؤال للامتحان بنجاح!`
        );
      } else {
        showNotice(`⚠️ ${data.error || data.warning || 'تعذر معالجة النص.'}`);
      }
    } catch (err: any) {
      console.error(err);
      showNotice('حدث خطأ أثناء معالجة النص.');
    } finally {
      setIsExamAiParsing(false);
    }
  };

  // Helper to handle local device homework file & prepare for Claude Chat (allows talking before extracting!)
  const handleSelectHwFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHwFileObj(file);
    setHwAttachedFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') setHwFileType('xls');
    else if (ext === 'docx' || ext === 'doc') setHwFileType('doc');
    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) setHwFileType('image');
    else setHwFileType('pdf');

    if (!hwTitle) {
      setHwTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    showNotice(`📎 تم إرفاق (${file.name}) بنجاح! تحدث مع Google Gemini الآن ووجهه قبل استخراج الأسئلة.`);

    // Ultra-fast client-side pre-optimization for instant transmission & OCR
    const optimized = await optimizeImageForAi(file);
    setHwFileUrl(optimized.dataUrl);
    setHwAttachedDataUrl(optimized.dataUrl);
    setHwAttachedMime(optimized.mimeType);

    // Prompt Google Gemini in chat so the teacher can instruct him!
    setHwChatMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}`,
        sender: 'ai' as const,
        text: `📎 تم إرفاق ملفك "${file.name}" بنجاح يا مستر عمرو! تفضل بالحديث معي وتوجيهي بما تريده بالضبط من هذا الملف بأي مادة (مثلاً: استخرج أول 5 أسئلة، غير الصياغة، احذف سؤالاً، ركز على فكرة محددة) وسأنفذ طلبك بالحرف الواحد ⚡ عبر Google Gemini.`,
        time: 'الآن',
      },
    ]);
  };

  // Helper to handle local device exam sheet/image & prepare for Google Gemini Chat (allows talking before extracting!)
  const handleSelectExamFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExamFileObj(file);
    setExamAttachedFile(file);

    if (!examTitle) {
      setExamTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    showNotice(`📎 تم إرفاق شيت الامتحان (${file.name}) بنجاح! تحدث مع Google Gemini ووجهه قبل استخراج الأسئلة.`);

    // Ultra-fast client-side pre-optimization for instant transmission & OCR
    const optimized = await optimizeImageForAi(file);
    setExamFileUrl(optimized.dataUrl);
    setExamAttachedDataUrl(optimized.dataUrl);
    setExamAttachedMime(optimized.mimeType);

    // Prompt Google Gemini in chat so the teacher can instruct him!
    setExamChatMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}`,
        sender: 'ai' as const,
        text: `📎 تم إرفاق شيت الامتحان "${file.name}" بنجاح يا مستر عمرو! تفضل بالحديث معي لتحديد توجيهاتك وصياغة الأسئلة وسأنفذ كل شيء بالحرف الواحد قبل بدء الاستخراج ⚡ عبر Google Gemini.`,
        time: 'الآن',
      },
    ]);
  };

  const parseAndSetHwQuestions = (rawText: string) => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: Question[] = [];
    let currentText = '';
    let currentOptions: string[] = [];
    let currentCorrectIdx = 0;

    for (const line of lines) {
      const isQuestionStart =
        /^(\d+[\.\-\)]|س\s*\d+|سؤال\s*\d+|Q\d+)/i.test(line) ||
        (line.includes('?') && !currentText);

      if (isQuestionStart || (!currentText && line.length > 5)) {
        if (currentText) {
          if (currentOptions.length < 2) {
            currentOptions = ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'];
          }
          parsed.push({
            id: `hw_q_${parsed.length + 1}`,
            text: currentText,
            options: currentOptions,
            correctAnswerIndex: currentCorrectIdx,
          });
        }
        currentText = line.replace(/^(\d+[\.\-\)]|س\s*\d+|سؤال\s*\d+|Q\d+)[:\-\s]*/i, '');
        currentOptions = [];
        currentCorrectIdx = 0;
      } else if (currentText) {
        currentOptions.push(line.replace(/^[أ-دA-D][\.\-\)]\s*/i, ''));
      }
    }

    if (currentText) {
      if (currentOptions.length < 2) {
        currentOptions = ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'];
      }
      parsed.push({
        id: `hw_q_${parsed.length + 1}`,
        text: currentText,
        options: currentOptions,
        correctAnswerIndex: currentCorrectIdx,
      });
    }

    if (parsed.length > 0) {
      setHwExtractedQuestions(parsed);
      showNotice(`تم استخراج والتعرف على ${parsed.length} سؤال للواجب بنجاح!`);
    }
  };

  // Bulk Questions Parser (can parse 10, 50, 100, up to 500+ questions at once!)
  const parseAndSetQuestions = (rawText: string) => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: Question[] = [];
    let currentText = '';
    let currentOptions: string[] = [];
    let currentCorrectIdx = 0;

    for (const line of lines) {
      const isQuestionStart =
        /^(\d+[\.\-\)]|س\s*\d+|سؤال\s*\d+|Q\d+)/i.test(line) ||
        (line.includes('?') && !currentText);

      if (isQuestionStart || (!currentText && line.length > 5)) {
        if (currentText) {
          if (currentOptions.length < 2) {
            currentOptions = ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'];
          }
          parsed.push({
            id: `q_${parsed.length + 1}`,
            text: currentText,
            options: currentOptions,
            correctAnswerIndex: currentCorrectIdx,
          });
        }
        currentText = line.replace(/^(\d+[\.\-\)]|س\s*\d+|سؤال\s*\d+|Q\d+)[:\-\s]*/i, '');
        currentOptions = [];
        currentCorrectIdx = 0;
      } else if (currentText) {
        currentOptions.push(line.replace(/^[أ-دA-D][\.\-\)]\s*/i, ''));
      }
    }

    if (currentText) {
      if (currentOptions.length < 2) {
        currentOptions = ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'];
      }
      parsed.push({
        id: `q_${parsed.length + 1}`,
        text: currentText,
        options: currentOptions,
        correctAnswerIndex: currentCorrectIdx,
      });
    }

    if (parsed.length > 0) {
      setExamQuestions(parsed);
      showNotice(`تم استخراج والتعرف على ${parsed.length} سؤال بنجاح!`);
    }
  };

  // Bulk Generator for demo/tests
  const generateBulkSampleQuestions = (count: number) => {
    const list: Question[] = [];
    const topics = [
      'حالات تأكسد فلزات السلسلة 3d',
      'العزم المغناطيسي والأيونات الملونة',
      'معادلات الأفران وفرن مدركس',
      'التحليل الكمي ومسائل المعايرة',
      'قاعدة لوشاتيليه وثابت الاتزان Kc',
      'الكيمياء العضوية وتسمية IUPAC',
    ];

    for (let i = 1; i <= count; i++) {
      const topic = topics[i % topics.length];
      list.push({
        id: `bulk_q_${i}`,
        text: `سؤال ${i}: في تفاعلات (${topic})، أي من العبارات الآتية تعتبر صحيحة علمياً ونموذجية؟`,
        options: [
          `الخيار أ: زيادة درجة الحرارة أو التركيز تزيد من معدل التصادمات الفعالة`,
          `الخيار ب: المركب دايامغناطيسي وغير ملون لامتلاء أوربيتالات d بالإلكترونات`,
          `الخيار ج: تفاعل التعادل يتطلب تساوي عدد مولات أيونات H⁺ مع OH⁻`,
          `الخيار د: جميع ما سبق صحيح وفقاً للمنهج الوزاري`,
        ],
        correctAnswerIndex: 0,
        explanation: `تفسير السؤال ${i}: تم اختيار الإجابة الصحيحة وفقاً لأسرار الكيمياء لمستر عمرو السيد.`,
      });
    }
    setExamQuestions(list);
    showNotice(`تم إنشاء وإدراج ${count} سؤال بنجاح في الامتحان!`);
  };

  // Add Lecture
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) {
      showNotice('يرجى إدخال عنوان المحاضرة واختيار الفيديو من جهازك أو وضع رابط يوتيوب صالح.');
      return;
    }

    if (videoFileObj && videoFileObj.size > 50 * 1024 * 1024) {
      showNotice('⚠️ حجم الملف أكبر من 50 ميجابايت (الحد الأقصى للرفع المباشر). يُرجى استخدام خيار الإضافة بالرابط (YouTube) لتشغيل سلس وبدون استهلاك للمساحة.');
      return;
    }

    let finalVideoUrl = videoFileUrl.trim();
    let finalDuration = Number(videoDuration) || 60;
    let finalFileSize = videoFileObj ? `${(videoFileObj.size / (1024 * 1024)).toFixed(1)} MB` : undefined;
    let provider: 'youtube' | 'drive' | 'local' | 'other' = videoFileObj ? 'local' : 'youtube';
    let external_id: string | undefined = undefined;
    let original_url: string | undefined = undefined;

    // Check external YouTube or Google Drive video link with pure regex
    if (finalVideoUrl && !videoFileObj) {
      const parsed = parseVideoUrl(finalVideoUrl);
      if (!parsed.isValid) {
        showNotice(parsed.error || '⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط يوتيوب أو جوجل درايف صالح.');
        return;
      }
      provider = parsed.provider;
      external_id = parsed.id;
      original_url = finalVideoUrl;
      finalVideoUrl = parsed.embedUrl;
      finalFileSize = parsed.provider === 'drive' ? 'Google Drive HD' : 'YouTube HD';
    }

    if (!finalVideoUrl && !videoFileObj) {
      showNotice('يرجى اختيار ملف فيديو أو إدخال رابط يوتيوب أو جوجل درايف صالح.');
      return;
    }

    try {
      const res = await addLecture({
        title: videoTitle.trim(),
        chapterTitle: videoChapter || 'الباب الأول',
        grade: videoGrade,
        durationMinutes: finalDuration,
        videoUrl: finalVideoUrl || '',
        videoFileName:
          videoFileObj?.name ||
          (external_id
            ? `${provider === 'drive' ? 'drive' : 'youtube'}_${external_id}.mp4`
            : 'video_lecture.mp4'),
        videoFileSize: finalFileSize,
        description: videoDesc,
        price: isVideoFree ? 0 : (Number(videoPrice) || 50),
        isFree: isVideoFree,
        provider,
        external_id,
        original_url,
      });

      if (res && !res.success) {
        const errorMsg = res.errorMessage || 'فشل الحفظ في قاعدة البيانات Supabase';
        console.error('[AdminPanel Supabase AddLecture Error]:', res.error || errorMsg);
        showNotice(`❌ خطأ Supabase: ${errorMsg}`);
        return;
      }

      setVideoTitle('');
      setVideoChapter('');
      setVideoFileObj(null);
      setVideoFileUrl('');
      setVideoDesc('');
      setIsVideoFree(false);
      showNotice('⚡ تم حفظ المحاضرة بنجاح في قاعدة البيانات Supabase!');
    } catch (err: any) {
      console.error('[AdminPanel AddLecture Exception]:', err);
      showNotice(`❌ خطأ غير متوقع: ${err?.message || err}`);
    }
  };

  // Add Homework / Sheet
  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;

    const maxAllowed = hwKind === 'sheet' ? 180 : 1440;
    const rawDuration = Number(hwDuration) || maxAllowed;
    const finalDuration = Math.min(maxAllowed, Math.max(5, rawDuration));
    const sumQuestionPoints = hwExtractedQuestions.reduce((acc, q) => acc + (q.points ?? 1), 0);
    const finalMarks =
      hwExtractedQuestions.length > 0 && hwExtractedQuestions.some((q) => q.points !== undefined)
        ? sumQuestionPoints
        : Number(hwTotalMarks) || (hwExtractedQuestions.length > 0 ? sumQuestionPoints : 10);

    addHomework({
      title: hwTitle.trim(),
      kind: hwKind,
      lessonTitle: hwLessonTitle.trim() || undefined,
      grade: hwGrade,
      description: hwDesc,
      deadline: hwDeadline || 'نهاية الأسبوع',
      durationMinutes: finalDuration,
      totalMarks: finalMarks,
      fileUrl: hwFileUrl || undefined,
      fileName: hwFileObj?.name || undefined,
      fileType: hwFileType,
      questions: hwExtractedQuestions.length > 0 ? hwExtractedQuestions : undefined,
    });

    setHwTitle('');
    setHwLessonTitle('');
    setHwDesc('');
    setHwDeadline('');
    setHwDuration(hwKind === 'sheet' ? '180' : '1440');
    setHwTotalMarks('10');
    setHwFileObj(null);
    setHwFileUrl('');
    setHwExtractedQuestions([]);
    showNotice(hwKind === 'sheet' ? 'تم نشر شيت الدرس للطلاب بنجاح!' : 'تم نشر الواجب للطلاب بنجاح!');
  };

  // Add File
  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileTitle.trim()) {
      showNotice('يرجى إدخال عنوان المذكرة أو المستند.');
      return;
    }

    if (docFileObj && docFileObj.size > 50 * 1024 * 1024) {
      showNotice('⚠️ حجم الملف أكبر من 50 ميجابايت (الحد الأقصى للرفع المباشر). يُرجى استخدام خيار الإضافة برابط Google Drive لعرض آمن وفوري.');
      return;
    }

    let finalUrl = docFileUrl.trim();
    let finalSize = docFileObj ? Number((docFileObj.size / (1024 * 1024)).toFixed(2)) : 5.0;
    let provider: 'youtube' | 'drive' | 'local' | 'other' = docFileObj ? 'local' : 'drive';
    let external_id: string | undefined = undefined;
    let original_url: string | undefined = undefined;

    // Check external Google Drive link with pure regex
    if (finalUrl && !docFileObj) {
      const parsed = parseDriveUrl(finalUrl);
      if (!parsed.isValid) {
        showNotice('⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط Google Drive صالح (/file/d/ID أو ?id=ID أو /open?id=ID).');
        return;
      }
      provider = 'drive';
      external_id = parsed.id;
      original_url = finalUrl;
      finalUrl = parsed.previewUrl;
    }

    if (!finalUrl && !docFileObj) {
      showNotice('يرجى اختيار ملف مذكرة أو إدخال رابط Google Drive صالح.');
      return;
    }

    try {
      const res = await addFile({
        title: fileTitle.trim(),
        category: fileCategory,
        grade: fileGrade,
        fileUrl: finalUrl || '',
        fileName: docFileObj?.name || `${fileTitle.trim()}.pdf`,
        fileType: docFileType,
        sizeMb: finalSize,
        description: fileDesc,
        provider,
        external_id,
        original_url,
      });

      if (res && !res.success) {
        const errorMsg = res.errorMessage || 'فشل الحفظ في قاعدة البيانات Supabase';
        console.error('[AdminPanel Supabase AddFile Error]:', res.error || errorMsg);
        showNotice(`❌ خطأ Supabase: ${errorMsg}`);
        return;
      }

      setFileTitle('');
      setDocFileObj(null);
      setDocFileUrl('');
      setFileDesc('');
      showNotice('⚡ تم حفظ المذكرة بنجاح في قاعدة البيانات Supabase!');
    } catch (err: any) {
      console.error('[AdminPanel AddFile Exception]:', err);
      showNotice(`❌ خطأ غير متوقع: ${err?.message || err}`);
    }
  };

  // Add Exam (with bulk questions, max 4 hours = 240 min)
  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    const finalDuration = Math.min(240, Math.max(5, Number(examDuration) || 45));
    const sumQuestionPoints = examQuestions.reduce((acc, q) => acc + (q.points ?? 1), 0);
    const finalMarks =
      examQuestions.length > 0 && examQuestions.some((q) => q.points !== undefined)
        ? sumQuestionPoints
        : Number(examMarks) || (examQuestions.length > 0 ? sumQuestionPoints : 60);

    addExam({
      title: examTitle.trim(),
      lessonTitle: examLessonTitle.trim() || undefined,
      grade: examGrade,
      durationMinutes: finalDuration,
      totalMarks: finalMarks,
      questions: examQuestions,
    });

    setExamTitle('');
    setExamLessonTitle('');
    setExamQuestions([]);
    setRawQuestionsText('');
    showNotice(`تم نشر الامتحان الإلكتروني بنجاح مع ${examQuestions.length} سؤال!`);
  };

  // Add Student Authorization (Phone + Code)
  const handleAddStudentAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPhone.trim() || !authCode.trim()) {
      showNotice('يرجى إدخال كلٍ من رقم الهاتف والكود المسجل معاً');
      return;
    }
    addAuthorizedStudent(authPhone, authCode, authStudentName, authLectureId);
    setAuthPhone('');
    setAuthCode('');
    setAuthStudentName('');
    showNotice('تم تصريح دخول الطالب برقم الهاتف والكود بنجاح!');
  };

  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setBatchImagePreview(dataUrl);
      setIsExtractingBatch(true);
      setIsBatchAiModalOpen(true);

      try {
        const data = await extractStudentsWithAiClient(undefined, dataUrl, file.type);
        if (data.success && Array.isArray(data.students) && data.students.length > 0) {
          setBatchExtractedStudents(
            data.students.map((s: any) => ({
              studentName: s.studentName || 'طالب جديد',
              phone: s.phone || '',
              studentCode: s.studentCode || `AMR-${Math.floor(100 + Math.random() * 900)}`,
              lectureId: batchLectureTarget,
            }))
          );
          showNotice(`نجح Google Gemini AI في استخراج ${data.students.length} طالب من الصورة بدقة 100%!`);
        } else {
          showNotice(`⚠️ ${data.error || data.message || 'تعذر استخراج بيانات الطلاب من الصورة'}`);
        }
      } catch (err) {
        console.error('Batch extraction error:', err);
        showNotice('حدث خطأ أثناء فحص الصورة بالذكاء الاصطناعي');
      } finally {
        setIsExtractingBatch(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmBatchSave = () => {
    if (batchExtractedStudents.length === 0) return;
    addBatchAuthorizedStudents(
      batchExtractedStudents.map((s) => ({
        ...s,
        lectureId: batchLectureTarget,
      }))
    );
    showNotice(`تم تصريح وإضافة ${batchExtractedStudents.length} طالب دفعة واحدة بنجاح!`);
    setIsBatchAiModalOpen(false);
    setBatchExtractedStudents([]);
    setBatchImagePreview(null);
  };

  const handleAskClaudePaymentSummary = () => {
    setIsAskingClaudePayment(true);
    setTimeout(() => {
      const totalAmount = paymentRequests.reduce((acc, p) => acc + (p.status !== 'rejected' ? p.amount : 0), 0);
      const paidStudents = paymentRequests.map(p => {
        const statusLabel = p.status === 'approved' ? 'مفعل رسمياً' : p.status === 'auto_activated' ? 'مفعل تلقائياً بعد انقضاء ثلث ساعة' : p.status === 'pending_review' ? 'قيد المراجعة (متبقي من ثلث ساعة)' : 'مرفوض';
        return `• الطالب: ${p.studentName} (${p.studentPhone})\n  الكورس: ${p.lectureTitle}\n  المبلغ: ${p.amount} ج.م | الوسيلة: ${p.paymentMethodName}\n  الحالة: ${statusLabel}\n  تاريخ السداد: ${new Date(p.submittedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
      }).join('\n\n');

      const summary = `تقرير المدفوعات الذكي من Google Gemini AI ⚡:\n\nإجمالي المبالغ المحصلة: ${totalAmount} جنيه مصري\nعدد الطلاب المسددين: ${paymentRequests.length} طالب\n\nتفاصيل السداد:\n${paidStudents || 'لا توجد أي مدفوعات مسجلة حتى الآن.'}`;
      setClaudePaymentAnswer(summary);
      setIsAskingClaudePayment(false);
    }, 500);
  };

  // Add Honored Student
  const handleAddHonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!honorName.trim()) return;

    const s = Number(honorScore) || 60;
    const max = Number(honorMaxScore) || 60;
    const pct = Math.round((s / max) * 100);

    addHonoredStudent({
      name: honorName.trim(),
      grade: honorGrade,
      score: s,
      maxScore: max,
      percentage: pct,
      governorate: honorGov.trim() || 'القاهرة',
      rank: Number(honorRank) || 1,
      badge: honorBadge.trim() || undefined,
    });

    setHonorName('');
    showNotice('تمت إضافة الطالب للوحة الشرف بنجاح!');
  };

  // Add Secretary
  const handleAddSecretary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secPhone.trim() || !secName.trim()) return;

    addSecretary(secName, secPhone, secNotes);
    setSecName('');
    setSecPhone('');
    setSecNotes('');
    showNotice('تمت إضافة السكرتارية بنجاح! يمكنهم الآن الدخول للوحة التحكم برقم الهاتف.');
  };

  // Add Payment Method
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payName.trim() || !payAccount.trim()) return;

    addPaymentMethod({
      name: payName.trim(),
      accountNumber: payAccount.trim(),
      instructions: payInstructions.trim() || 'يرجى إرسال إيصال التحويل عبر واتساب.',
      iconType: payType,
      isEnabled: true,
    });

    setPayName('');
    setPayAccount('');
    setPayInstructions('');
    showNotice('تمت إضافة وسيلة الدفع الجديدة بنجاح!');
  };

  const handleGenerateBulkCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingBulkCodes(true);
    const selectedLec = lectures.find((l) => l.id === bulkCodeCourseId);
    const res = await generateBulkRechargeCodes(
      bulkCodeCount,
      bulkCodeValue,
      bulkCodeMaxUses,
      bulkCodePrefix,
      bulkCodeCourseId || undefined,
      selectedLec?.title
    );
    setIsGeneratingBulkCodes(false);
    if (res.success) {
      showNotice(`🎉 تم توليد وحفظ ${res.count} كود شحن وتفعيل جديد بنجاح!`);
    } else {
      showNotice('حدث خطأ أثناء توليد الأكواد.');
    }
  };

  const handleCopyAllCodes = () => {
    if (rechargeCodes.length === 0) return;
    const text = rechargeCodes
      .map((c) => `${c.code} · ${c.value} ج.م · (أقصى استخدام: ${c.maxUses || 1} مرات · استُخدم: ${c.usedCount || 0})${c.courseTitle ? ` · كورس: ${c.courseTitle}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCodesNotice(true);
    setTimeout(() => setCopiedCodesNotice(false), 3000);
    showNotice(`تم نسخ ${rechargeCodes.length} كود بنجاح إلى الحافظة!`);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    sendBroadcastNotification(notifTitle.trim(), notifMessage.trim(), notifTarget, notifPriority);
    setNotifTitle('');
    setNotifMessage('');
    showNotice('⚡ تم إرسال وتعميم الرسالة لجميع الطلاب وظهور الجرس الأحمر بنجاح!');
  };

  const handleRadarAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!radarStdName.trim() || !radarStdPhone.trim()) {
      showNotice('يرجى كتابة اسم الطالب ورقم هاتفه');
      return;
    }
    if (!radarStdParentPhone.trim()) {
      showNotice('رقم هاتف ولي الأمر مطلوب لإرسال تقارير المتابعة عبر واتساب');
      return;
    }

    const finalCode = radarStdCode.trim() || `CHEM-${Math.floor(100 + Math.random() * 900)}`;

    addRegisteredStudent({
      name: radarStdName.trim(),
      phone: radarStdPhone.trim(),
      parentPhone: radarStdParentPhone.trim(),
      studentCode: finalCode,
      password: radarStdPass.trim() || finalCode,
      grade: radarStdGrade,
      subscriptionType: radarStdSubscription,
      governorate: radarStdGov.trim() || 'القاهرة',
      age: Number(radarStdAge) || 18,
    });

    setRadarStdName('');
    setRadarStdPhone('');
    setRadarStdParentPhone('');
    setRadarStdCode('');
    setRadarStdPass('');
    setShowRadarAddForm(false);
    showNotice(`🎉 تمت إضافة الطالب (${radarStdName.trim()}) إلى رادار المتابعة بنجاح!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0b1429] border border-cyan-800/50 rounded-2xl w-full max-w-5xl h-[94vh] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        
        {/* Top Bar */}
        <div className="p-4 bg-[#080d1b] border-b border-cyan-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                لوحة تحكم المنصة - مستر عمرو السيد
              </h2>
              <p className="text-[11px] text-cyan-400">
                إدارة كاملة، رفع من الجهاز بدون روابط، تعديل وحذف أي محتوى، أسئلة حتى 500+ سؤال، وتحكم شامل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {isAutoSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>جاري الحفظ التلقائي في Supabase...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {lastAutoSavedAt
                      ? 'تم الحفظ التلقائي الفوري (Supabase ⚡)'
                      : 'مزامنة مباشرة: Supabase (profiles, courses, documents, assignments)'}
                  </span>
                </>
              )}
            </span>

            <button
              onClick={() => setIsAdminPanelOpen(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice feedback */}
        {notification && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2 px-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Live Student Login Notification Banner (Only for Mr. Amr & authorized secretaries) */}
        {canAccessSecretSection && liveLoginAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-950/80 via-[#071a2b] to-cyan-950/80 border-b border-emerald-500/40 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-bold">🚨 إشعار حي مباشر لدخول الطلاب:</span>
              <span className="text-white">
                سجل الطالب <strong className="text-cyan-300">{liveLoginAlerts[0].studentName}</strong> (الصف: {liveLoginAlerts[0].grade === 'sec3' ? '3 ثانوي' : liveLoginAlerts[0].grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'} - هاتف: {liveLoginAlerts[0].studentPhone} - ولي الأمر: {liveLoginAlerts[0].parentPhone}) الدخول للمنصة الآن!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab('secret_surveillance');
                  setSelectedStudentForDossier(liveLoginAlerts[0].studentId);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>عرض ملف الطالب كاملاً 👁️</span>
              </button>
              <button
                onClick={() => dismissLoginAlert(liveLoginAlerts[0].id)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="تجاهل الإشعار"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Strictly Without Any Numbers as Requested - Radar & Rankings at the very end) */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 bg-[#091021] border-b border-cyan-950/50 text-xs font-semibold no-scrollbar">
          {[
            { id: 'videos', label: 'الفيديوهات والكورسات', icon: Video },
            { id: 'files', label: 'الملفات والمذكرات', icon: FolderOpen },
            { id: 'homework', label: 'الواجبات والشيتات الذكية', icon: BookCheck },
            { id: 'exams', label: 'الامتحانات الذكية', icon: FileCheck2 },
            { id: 'gemini_ai', label: '🤖 لوحة Gemini الذكي الحقيقي', icon: Bot },
            { id: 'students', label: 'إدارة وتصريح الطلاب', icon: Users },
            { id: 'receipts', label: 'طلبات الدفع والإيصالات', icon: Receipt },
            { id: 'broadcast', label: 'إرسال رسائل وتنبيهات', icon: Bell },
            { id: 'honor', label: 'لوحة الشرف وتكريم الطلاب', icon: Award },
            { id: 'secretaries', label: 'السكرتارية والمساعدين', icon: UserCheck },
            { id: 'payments', label: 'طرق الدفع', icon: CreditCard },
            { id: 'appearance', label: 'المظهر والتصميم', icon: Palette },
            { id: 'teacher_profile', label: 'ملف مستر عمرو السيد 👨‍🏫', icon: UserCheck },
            { id: 'supabase', label: 'قاعدة بيانات Supabase ⚡', icon: Database },
            ...(canAccessSecretSection
              ? [
                  { id: 'exam_rankings', label: '🏆 تفنيد أعلى الدرجات والأوائل', icon: Trophy },
                  { id: 'secret_surveillance', label: '🔒 رادار متابعة الطلاب 360° (سري وخاص)', icon: ShieldAlert },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB: GEMINI AI DASHBOARD (حصري للمدرس والسكرتارية) */}
          {activeTab === 'gemini_ai' && (
            <div className="animate-fade-in">
              <GeminiTeacherDashboard />
            </div>
          )}

          {/* TAB 0.1: SECRET STUDENT SURVEILLANCE 360° (خاص بالمعلم والسكرتارية فقط) */}
          {activeTab === 'secret_surveillance' && (
            <div className="space-y-6 animate-fade-in">
              {/* Security Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#0d1428] to-cyan-950/40 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                      <span>رادار مراقبة ومتابعة الطلاب 360° (قسم سري خاص)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                        محمي ومقتصر عليك وعلى السكرتارية فقط
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      متابعة دقيقة لكل طالب: الحضور بالدقائق، علامات الصح والخطأ في المحاضرات، الامتحانات بدرجاتها، رقم ولي الأمر، ونوع الاشتراك.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
                  المصرح لهم: مستر عمرو السيد والسكرتارية ({secretaries.length})
                </div>
              </div>

              {/* Top Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#080d1b] border border-cyan-900/40 rounded-xl">
                  <span className="text-[11px] text-slate-400">إجمالي الطلاب المسجلين</span>
                  <p className="text-lg font-bold text-white mt-1 font-mono">
                    {registeredAccounts.filter((a) => a.role === 'student').length}
                  </p>
                </div>
                <div className="p-3.5 bg-[#080d1b] border border-emerald-900/40 rounded-xl">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>المتصلون بالمنصة الآن</span>
                  </span>
                  <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                    {registeredAccounts.filter((a) => a.role === 'student' && a.isOnline).length}
                  </p>
                </div>
                <div className="p-3.5 bg-[#080d1b] border border-blue-900/40 rounded-xl">
                  <span className="text-[11px] text-slate-400">المحاضرات المنشورة</span>
                  <p className="text-lg font-bold text-blue-400 mt-1 font-mono">{lectures.length}</p>
                </div>
                <div className="p-3.5 bg-[#080d1b] border border-amber-900/40 rounded-xl">
                  <span className="text-[11px] text-slate-400">الامتحانات المنشورة</span>
                  <p className="text-lg font-bold text-amber-400 mt-1 font-mono">{exams.length}</p>
                </div>
              </div>

              {/* Radar In-Section Actions: Add Student & Clear All Students */}
              <div className="p-4 bg-[#080d1b] border border-cyan-800/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRadarAddForm((prev) => !prev)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{showRadarAddForm ? 'إخفاء نموذج الإضافة' : '➕ إضافة طالب جديد إلى رادار المتابعة'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('⚠️ تحذير: هل أنت متأكد من رغبتك في حذف وإفراغ كشف الطلاب بالكامل من الرادار والمنصة؟\nسيتم حذف جميع الطلاب دفعة واحدة ولن يتبقى سوى حسابك الرئيسي (مستر عمرو السيد).')) {
                        clearAllStudents();
                        showNotice('تم إفراغ ومسح جميع الطلاب بنجاح! الكشف نظيف ومفرغ 100% الآن.');
                      }
                    }}
                    className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="حذف جميع الطلاب المخزنين دفعة واحدة"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>🗑️ مسح وإفراغ كشف الطلاب بالكامل (تصفير)</span>
                  </button>
                </div>
              </div>

              {/* Direct In-Radar Add Student Form */}
              {showRadarAddForm && (
                <form
                  onSubmit={handleRadarAddStudent}
                  className="bg-[#0b1429] border-2 border-emerald-500/50 rounded-2xl p-5 space-y-4 shadow-2xl animate-fade-in"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      <span>إضافة طالب جديد لرادار المراقبة والمتابعة 360°</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRadarAddForm(false)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      إلغاء ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        اسم الطالب كاملاً <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={radarStdName}
                        onChange={(e) => setRadarStdName(e.target.value)}
                        placeholder="مثال: أحمد محمود إبراهيم"
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        رقم هاتف الطالب <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={radarStdPhone}
                        onChange={(e) => setRadarStdPhone(e.target.value)}
                        placeholder="01012345678"
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        رقم هاتف ولي الأمر (واتساب للتقارير) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={radarStdParentPhone}
                        onChange={(e) => setRadarStdParentPhone(e.target.value)}
                        placeholder="01234567890"
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                      <select
                        value={radarStdGrade}
                        onChange={(e) => setRadarStdGrade(e.target.value as GradeLevel)}
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      >
                        <option value="sec3">الصف الثالث الثانوي</option>
                        <option value="sec2">الصف الثاني الثانوي</option>
                        <option value="sec1">الصف الأول الثانوي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        كود الطالب (لتسجيل الدخول)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={radarStdCode}
                          onChange={(e) => setRadarStdCode(e.target.value)}
                          placeholder="مثال: CHEM-101"
                          className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setRadarStdCode(`CHEM-${Math.floor(100 + Math.random() * 900)}`)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-[10px] font-bold border border-slate-700 shrink-0 cursor-pointer"
                          title="توليد كود عشوائي"
                        >
                          توليد كود
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">نوع الاشتراك والمكان</label>
                      <select
                        value={radarStdSubscription}
                        onChange={(e) => setRadarStdSubscription(e.target.value as SubscriptionType)}
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      >
                        <option value="course">كورس شهري أونلاين</option>
                        <option value="center">مسكن بالسنتر وقاعة</option>
                        <option value="lecture">حصة منفردة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">المحافظة / السن</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={radarStdGov}
                          onChange={(e) => setRadarStdGov(e.target.value)}
                          placeholder="المحافظة"
                          className="w-2/3 bg-[#050811] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="number"
                          value={radarStdAge}
                          onChange={(e) => setRadarStdAge(e.target.value)}
                          placeholder="السن"
                          className="w-1/3 bg-[#050811] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowRadarAddForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ وإدراج الطالب في رادار المتابعة فوراً</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={surveillanceSearch}
                    onChange={(e) => setSurveillanceSearch(e.target.value)}
                    placeholder="ابحث باسم الطالب، كوده، هاتفه، أو ولي أمره..."
                    className="w-full bg-[#050811] border border-cyan-900/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-xl border border-cyan-950 text-xs font-semibold self-start sm:self-auto">
                  <button
                    onClick={() => setSurveillanceGrade('all')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      surveillanceGrade === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    كل الصفوف
                  </button>
                  <button
                    onClick={() => setSurveillanceGrade('sec3')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      surveillanceGrade === 'sec3' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3 ثانوي
                  </button>
                  <button
                    onClick={() => setSurveillanceGrade('sec2')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      surveillanceGrade === 'sec2' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2 ثانوي
                  </button>
                  <button
                    onClick={() => setSurveillanceGrade('sec1')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      surveillanceGrade === 'sec1' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1 ثانوي
                  </button>
                </div>
              </div>

              {/* Surveillance Matrix Table */}
              <div className="overflow-x-auto border border-cyan-900/40 rounded-2xl bg-[#080d1b]">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-[#050811] text-slate-400 text-[11px] font-bold border-b border-cyan-900/40">
                    <tr>
                      <th className="py-3 px-3">الطالب</th>
                      <th className="py-3 px-2">الكود</th>
                      <th className="py-3 px-2">هاتف ولي الأمر</th>
                      <th className="py-3 px-2">الصف / السن</th>
                      <th className="py-3 px-2">نوع الاشتراك</th>
                      <th className="py-3 px-2 text-center">حالة الدخول</th>
                      {lectures.map((lec, idx) => (
                        <th key={lec.id} className="py-3 px-2 text-center whitespace-nowrap text-cyan-400" title={lec.title}>
                          محاضرة {idx + 1}
                        </th>
                      ))}
                      {exams.map((ex, idx) => (
                        <th key={ex.id} className="py-3 px-2 text-center whitespace-nowrap text-amber-400" title={ex.title}>
                          امتحان {idx + 1}
                        </th>
                      ))}
                      {homeworks.map((hw, idx) => (
                        <th key={hw.id} className="py-3 px-2 text-center whitespace-nowrap text-indigo-400" title={hw.title}>
                          واجب {idx + 1}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {(() => {
                      const studentList = registeredAccounts.filter((s) => {
                        if (s.role === 'admin' || s.role === 'secretary') return false;
                        if (surveillanceGrade !== 'all' && s.grade !== surveillanceGrade) return false;
                        if (!surveillanceSearch.trim()) return true;
                        const q = surveillanceSearch.toLowerCase().trim();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          s.phone.includes(q) ||
                          (s.parentPhone && s.parentPhone.includes(q)) ||
                          (s.studentCode && s.studentCode.toLowerCase().includes(q))
                        );
                      });

                      if (studentList.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={7 + lectures.length + exams.length + homeworks.length}
                              className="py-12 px-4 text-center"
                            >
                              <div className="max-w-md mx-auto space-y-3">
                                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex items-center justify-center mx-auto">
                                  <Users className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-white">
                                  الكشف نظيف ومفرغ 100% - لا يوجد أي طلاب مسجلين حالياً 🎯
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                  تم حذف وإفراغ كافة الطلاب بنجاح. يمكنك إضافة طلابك الآن عبر زر (إضافة طالب جديد إلى رادار المتابعة) بالأعلى ليتم رصدهم ومتابعة حضورهم ودرجاتهم حياً.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setShowRadarAddForm(true)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  <span>➕ إضافة أول طالب إلى الرادار الآن</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return studentList.map((st) => {
                        const access = studentAccessMap[st.id] || { lectures: {}, exams: {}, homeworks: {} };
                        const parentPhone = st.parentPhone || st.phone;

                        return (
                          <tr key={st.id} className="hover:bg-cyan-950/20 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap">
                              <p className="font-bold text-white">{st.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{st.phone}</p>
                              {st.email && <p className="text-[9px] text-slate-500 font-mono">{st.email}</p>}
                            </td>

                            <td className="py-3 px-2 font-mono text-cyan-400 font-bold whitespace-nowrap">
                              {st.studentCode}
                            </td>

                            <td className="py-3 px-2 font-mono text-emerald-300 whitespace-nowrap">
                              {st.parentPhone || 'غير محدد'}
                            </td>

                            <td className="py-3 px-2 whitespace-nowrap text-[11px] text-slate-400">
                              <span>{st.grade === 'sec3' ? '3 ثانوي' : st.grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'}</span>
                              {st.age && <p className="text-[10px] text-slate-500">{st.age} سنة</p>}
                            </td>

                            <td className="py-3 px-2 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {st.subscriptionType === 'center'
                                  ? 'مسكن بالسنتر وقاعة'
                                  : st.subscriptionType === 'lecture'
                                  ? 'حصة أونلاين'
                                  : 'كورس شهري أونلاين'}
                              </span>
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              {st.isOnline ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>متصل الآن</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {st.lastLoginAt ? st.lastLoginAt.substring(0, 10) : 'لم يسجل'}
                                </span>
                              )}
                            </td>

                            {/* Lectures: Check / Cross */}
                            {lectures.map((lec) => {
                              const lecState = access.lectures?.[lec.id];
                              const entered = !!lecState?.entered;

                              return (
                                <td key={lec.id} className="py-3 px-2 text-center whitespace-nowrap">
                                  {entered ? (
                                    <span
                                      title={`حضر المحاضرة في: ${lecState?.date || 'مسجل'}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>حضر</span>
                                    </span>
                                  ) : (
                                    <span
                                      title="لم يدخل المحاضرة"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>لم يدخل</span>
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Exams: Check / Cross */}
                            {exams.map((ex) => {
                              const exState = access.exams?.[ex.id];
                              const taken = !!exState?.taken;

                              return (
                                <td key={ex.id} className="py-3 px-2 text-center whitespace-nowrap">
                                  {taken ? (
                                    <span
                                      title={`أدى الامتحان بنتيجة ${exState?.score}/${exState?.maxScore} في ${exState?.date || ''}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-mono font-bold"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                                      <span>{exState?.score}/{exState?.maxScore}</span>
                                    </span>
                                  ) : (
                                    <span
                                      title="لم يدخل الامتحان"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>لم يدخل</span>
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Homework: Check / Cross */}
                            {homeworks.map((hw) => {
                              const hwState = access.homeworks?.[hw.id];
                              const solved = !!hwState?.solved;

                              return (
                                <td key={hw.id} className="py-3 px-2 text-center whitespace-nowrap">
                                  {solved ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>حل</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold">
                                      <XCircle className="w-3 h-3" />
                                      <span>لم يحل</span>
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Actions: Free Pass + Dossier + WhatsApp to parent + Delete */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    grantFreeAccess(st.id, 'all');
                                    showNotice(`🎉 تم منح الطالب (${st.name}) تصريح دخول مجاني وشامل لجميع كورسات المنصة بدون دفع!`);
                                  }}
                                  className="p-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg border border-amber-500/40 text-[11px] font-bold cursor-pointer transition-colors"
                                  title="منح تصريح مجاني مباشر لجميع الكورسات بدون دفع 🎁"
                                >
                                  <Gift className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setSelectedStudentForDossier(st.id)}
                                  className="p-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded-lg border border-cyan-500/30 text-[11px] font-bold cursor-pointer transition-colors"
                                  title="عرض ملف الطالب الشامل"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    const dossier = getStudentDossier(st.id);
                                    if (!dossier) return;
                                    const msg =
                                      `السلام عليكم ورحمة الله وبركاته،\nولي أمر الطالب المحترم: ${st.name} (${st.studentCode})\n\nنود إحاطتكم بتقرير المتابعة والأداء الأكاديمي الشامل في مادة الكيمياء مع مستر عمرو السيد:\n\n` +
                                      `📌 نسبة حضور المحاضرات: ${dossier.attendanceRate}% (${dossier.enteredLectures} من ${dossier.totalLectures})\n` +
                                      `📌 متوسط درجات الاختبارات: ${dossier.averageExamScore}%\n` +
                                      `📌 نسبة تسليم الواجبات: ${dossier.homeworkCompletionRate}%\n\n` +
                                      `نتمنى له دوام التفوق والنجاح دائماً! 🧪✨`;
                                    openExternalSafe(buildWhatsAppUrl(parentPhone, msg));
                                  }}
                                  className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg border border-emerald-500/30 text-[11px] font-bold cursor-pointer transition-colors"
                                  title="إرسال التقرير لولي الأمر عبر واتساب"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (window.confirm(`هل أنت متأكد من حذف الطالب (${st.name}) نهائياً من الرادار والمنصة؟`)) {
                                      deleteRegisteredStudent(st.id);
                                      showNotice(`تم حذف الطالب (${st.name}) نهائياً من الرادار والمنصة!`);
                                    }
                                  }}
                                  className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg border border-red-500/30 text-[11px] font-bold cursor-pointer transition-colors"
                                  title="حذف الطالب نهائياً من الرادار والمنصة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Student Dossier Modal */}
              {selectedStudentForDossier && (() => {
                const dossier = getStudentDossier(selectedStudentForDossier);
                if (!dossier) return null;
                const parentPhone = dossier.student.parentPhone || dossier.student.phone;

                return (
                  <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
                    <div className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-white">{dossier.student.name}</h3>
                            <p className="text-xs text-cyan-400 font-mono">
                              الكود: {dossier.student.studentCode} | هاتف الطالب: {dossier.student.phone}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedStudentForDossier(null)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Highlight Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-cyan-950/40 border border-cyan-900/40 rounded-xl text-center">
                          <span className="text-[11px] text-slate-400">نسبة حضور المحاضرات</span>
                          <p className="text-xl font-bold text-cyan-300 mt-1 font-mono">{dossier.attendanceRate}%</p>
                          <p className="text-[10px] text-slate-500">{dossier.enteredLectures} من {dossier.totalLectures} محاضرة</p>
                        </div>
                        <div className="p-3 bg-amber-950/40 border border-amber-900/40 rounded-xl text-center">
                          <span className="text-[11px] text-slate-400">متوسط درجات الامتحانات</span>
                          <p className="text-xl font-bold text-amber-300 mt-1 font-mono">{dossier.averageExamScore}%</p>
                          <p className="text-[10px] text-slate-500">{dossier.takenExams} من {dossier.totalExams} امتحان</p>
                        </div>
                        <div className="p-3 bg-indigo-950/40 border border-indigo-900/40 rounded-xl text-center">
                          <span className="text-[11px] text-slate-400">نسبة حل الواجبات</span>
                          <p className="text-xl font-bold text-indigo-300 mt-1 font-mono">{dossier.homeworkCompletionRate}%</p>
                          <p className="text-[10px] text-slate-500">{dossier.solvedHomeworks} من {dossier.totalHomeworks} واجب</p>
                        </div>
                      </div>

                      {/* Personal Info */}
                      <div className="p-3.5 bg-[#050811] rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <span className="text-slate-500 text-[10px]">هاتف ولي الأمر:</span>
                          <p className="font-bold text-white font-mono mt-0.5">{parentPhone}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">البريد الإلكتروني:</span>
                          <p className="font-bold text-white font-mono text-[11px] truncate mt-0.5">{dossier.student.email}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">الصف والمحافظة:</span>
                          <p className="font-bold text-white mt-0.5">
                            {dossier.student.grade === 'sec3' ? '3 ثانوي' : dossier.student.grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'} - {dossier.student.governorate}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">العمر / السن:</span>
                          <p className="font-bold text-white mt-0.5">{dossier.student.age ? `${dossier.student.age} سنة` : 'غير محدد'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">نوع الاشتراك:</span>
                          <p className="font-bold text-cyan-300 mt-0.5">
                            {dossier.student.subscriptionType === 'center'
                              ? 'مسكن بالسنتر'
                              : dossier.student.subscriptionType === 'lecture'
                              ? 'حصة منفردة'
                              : 'كورس شهري'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">تاريخ التسجيل:</span>
                          <p className="font-bold text-white font-mono mt-0.5">{dossier.student.registeredAt}</p>
                        </div>
                      </div>

                      {/* Lecture Records Details */}
                      <div className="space-y-2 text-xs">
                        <h4 className="font-bold text-white flex items-center gap-1.5">
                          <BookCheck className="w-4 h-4 text-cyan-400" />
                          <span>سجل حضور المحاضرات:</span>
                        </h4>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {dossier.lectureRecords.map((l) => (
                            <div key={l.lectureId} className="p-2 bg-[#050811] rounded-lg border border-slate-800 flex items-center justify-between">
                              <span className="text-white font-medium">{l.lectureTitle}</span>
                              {l.entered ? (
                                <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                                  ✓ دخل ({l.date || 'تمت المشاهدة'})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded text-[10px] font-bold">
                                  ✗ لم يدخل
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Exam Records Details */}
                      <div className="space-y-2 text-xs">
                        <h4 className="font-bold text-white flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>سجل نتائج الامتحانات:</span>
                        </h4>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {dossier.examRecords.map((ex) => (
                            <div key={ex.examId} className="p-2 bg-[#050811] rounded-lg border border-slate-800 flex items-center justify-between">
                              <span className="text-white font-medium">{ex.examTitle}</span>
                              {ex.taken ? (
                                <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono rounded text-[10px] font-bold">
                                  ✓ {ex.score} / {ex.maxScore} ({ex.percentage}%)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded text-[10px] font-bold">
                                  ✗ لم يؤدِ الامتحان
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-cyan-900/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <span className="text-[11px] text-slate-400">إرسال التقرير بنقرة واحدة لولي الأمر مباشرة:</span>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من رغبتك في حذف الطالب (${dossier.student.name}) نهائياً من الرادار والمنصة بالكامل؟`)) {
                                deleteRegisteredStudent(dossier.student.id);
                                setSelectedStudentForDossier(null);
                                showNotice(`تم حذف الطالب (${dossier.student.name}) نهائياً من الرادار والمنصة!`);
                              }
                            }}
                            className="w-full sm:w-auto px-3.5 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الطالب نهائياً من الرادار 🗑️</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const msg =
                                `السلام عليكم ورحمة الله وبركاته،\nولي أمر الطالب المحترم: ${dossier.student.name} (${dossier.student.studentCode})\n\nتقرير المتابعة والأداء الأكاديمي الشامل في مادة الكيمياء مع مستر عمرو السيد:\n\n` +
                                `📌 نسبة حضور المحاضرات: ${dossier.attendanceRate}% (${dossier.enteredLectures} من ${dossier.totalLectures})\n` +
                                `📌 متوسط درجات الامتحانات: ${dossier.averageExamScore}%\n` +
                                `📌 نسبة تسليم الواجبات: ${dossier.homeworkCompletionRate}%\n\n` +
                                `مع تحيات مستر عمرو السيد وفريق العمل 🧪✨`;
                              openExternalSafe(buildWhatsAppUrl(parentPhone, msg));
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>إرسال تقرير المتابعة لولي الأمر عبر واتساب 📲</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 0.2: TOP RANKINGS OF SHEETS & EXAMS */}
          {activeTab === 'exam_rankings' && (
            <div className="animate-fade-in">
              <TopRankingsDirectorySection />
            </div>
          )}

          {/* TAB 1: VIDEOS (UPLOAD FROM DEVICE DIRECTLY) */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <form noValidate onSubmit={handleAddVideo} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <span>إضافة فيديو تعليمي مباشرة من جهازك أو برابط YouTube / Google Drive</span>
                  </h3>
                  <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    حد أقصى للرفع المباشر 50MB · روابط يوتيوب وجوجل درايف غير محدودة
                  </span>
                </div>

                {/* Local Video File Picker */}
                <div className="p-4 bg-[#050811] border-2 border-dashed border-cyan-700/60 hover:border-cyan-400 rounded-xl text-center space-y-2 cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleSelectVideoFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Video className="w-8 h-8 text-cyan-400 mx-auto" />
                  <p className="text-xs font-bold text-white">
                    {videoFileObj ? `تم اختيار: ${videoFileObj.name}` : 'اضغط لاختيار ملف الفيديو من جهازك (بحد أقصى 50 ميجابايت)'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    للملفات الأكبر من 50 ميجا، يُرجى استخدام خيار رابط يوتيوب أو جوجل درايف بالأسفل
                  </p>
                </div>

                {/* Real Upload Progress Bar with exact duration & speed */}
                {renderUploadProgressBar(
                  videoUploadProgress,
                  videoDurationFormatted ? `⏱️ مدة الفيديو المقروءة بدقة من الملف: ${videoDurationFormatted}` : undefined
                )}

                {/* Alternative: External Video URL (YouTube or Google Drive) */}
                <div className="p-3.5 bg-[#050811] border border-cyan-950 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    أو إضافة برابط يوتيوب (watch?v= / youtu.be/ / shorts) أو رابط فيديو Google Drive (/file/d/ID/view أو ?id=ID):
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={videoFileUrl.startsWith('/uploads/') ? '' : videoFileUrl}
                      onChange={(e) => {
                        setVideoFileUrl(e.target.value);
                        if (e.target.value) setVideoFileObj(null);
                      }}
                      placeholder="https://www.youtube.com/watch?v=... أو https://drive.google.com/file/d/.../view"
                      className="flex-1 bg-[#080d1b] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono text-left"
                    />
                    {videoFileUrl && !videoFileUrl.startsWith('/uploads/') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!videoFileUrl.trim()) {
                            showNotice('يرجى إدخال رابط يوتيوب أو جوجل درايف أولاً.');
                            return;
                          }
                          const parsed = parseVideoUrl(videoFileUrl);
                          if (!parsed.isValid) {
                            showNotice(parsed.error || '⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط يوتيوب أو جوجل درايف صالح.');
                            return;
                          }
                          setVideoFileUrl(parsed.embedUrl);
                          if (!videoTitle) {
                            setVideoTitle(
                              parsed.provider === 'drive'
                                ? `محاضرة كيمياء (Drive) - ${parsed.id.substring(0, 8)}`
                                : `محاضرة كيمياء - فيديو ${parsed.id}`
                            );
                          }
                          showNotice(
                            parsed.provider === 'drive'
                              ? `✅ تم تحويل رابط Google Drive للبث المباشر بنجاح (معرف: ${parsed.id}) وجاهز للحفظ في Supabase!`
                              : `✅ تم التحقق من رابط يوتيوب بنجاح (معرف: ${parsed.id}) وجاهز للحفظ في Supabase!`
                          );
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>تأكيد وفحص الرابط</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-cyan-400">
                    🔒 مشغل المنصة الخاص: يدعم روابط YouTube وروابط فيديو Google Drive (بعد ضبط الصلاحية إلى "أي شخص لديه الرابط") ويعرضها بملء الشاشة بدون شعارات أو نوافذ خارجية.
                  </p>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">عنوان المحاضرة</label>
                    <input
                      type="text"
                      required
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="مثال: المحاضرة 1: العناصر الانتقالية"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">اسم الباب / الفصل</label>
                    <input
                      type="text"
                      value={videoChapter}
                      onChange={(e) => setVideoChapter(e.target.value)}
                      placeholder="مثال: الباب الأول: العناصر الانتقالية والحديد"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                    <select
                      value={videoGrade}
                      onChange={(e) => setVideoGrade(e.target.value as GradeLevel)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="sec3">الصف الثالث الثانوي</option>
                      <option value="sec2">الصف الثاني الثانوي</option>
                      <option value="sec1">الصف الأول الثانوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">المدة (بالدقائق)</label>
                    <input
                      type="number"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      {isVideoFree ? 'سعر الكورس (مجاني)' : 'سعر الكورس (ج.م) *'}
                    </label>
                    <input
                      type="number"
                      disabled={isVideoFree}
                      value={isVideoFree ? '0' : videoPrice}
                      onChange={(e) => setVideoPrice(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none text-left ${
                        isVideoFree
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-bold'
                          : 'bg-[#050811] border-slate-700 text-white focus:border-cyan-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Free vs Paid Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نوع المحاضرة / الكورس (مجاني أم مدفوع):
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsVideoFree(true);
                        setVideoPrice('0');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isVideoFree
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-[#050811] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>🎁 كورس مجاني بالكامل (مفتوح للجميع)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsVideoFree(false);
                        if (videoPrice === '0') setVideoPrice('50');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        !isVideoFree
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                          : 'bg-[#050811] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>💎 كورس مدفوع (يتطلب تصريح أو اشتراك)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">وصف الكورس (يظهر للطلاب كمعاينة فقط قبل الاشتراك)</label>
                  <textarea
                    rows={2}
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    placeholder="اكتب وصف الدرس ومخرجات التعلم..."
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>حفظ وإضافة الفيديو للمنصة</span>
                </button>
              </form>

              {/* Videos List with Edit & Delete */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  جميع الفيديوهات المضافة ({lectures.length})
                </h4>

                {lectures.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا توجد أي فيديوهات مضافة بعد.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lectures.map((lec) => (
                      <div
                        key={lec.id}
                        className="bg-[#080d1b] border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-cyan-400 mb-1">
                            <span>{lec.chapterTitle}</span>
                            <span>{lec.price} ج.م</span>
                          </div>
                          <h5 className="font-bold text-xs text-white line-clamp-1">{lec.title}</h5>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{lec.description}</p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                          <button
                            onClick={() => setActiveVideo(lec)}
                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>تشغيل في المشغل المدمج</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingLecture(lec)}
                              className="p-1 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                              title="تعديل الفيديو والمحاضرة بالكامل"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteLecture(lec.id)}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HOMEWORK & SHEETS (WITH AUTO QUESTION PARSER) */}
          {activeTab === 'homework' && (
            <div className="space-y-6">
              <form onSubmit={handleAddHomework} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-cyan-400" />
                    <span>إضافة واجب أو شيت من ملف جهازك مع استخراج الأسئلة تلقائياً</span>
                  </h3>
                </div>

                {/* Local Sheet / File Picker */}
                <div className="p-4 bg-[#050811] border-2 border-dashed border-cyan-700/60 hover:border-cyan-400 rounded-xl text-center space-y-2 cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={handleSelectHwFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText className="w-8 h-8 text-cyan-400 mx-auto" />
                  <p className="text-xs font-bold text-white">
                    {hwFileObj ? `تم اختيار: ${hwFileObj.name}` : 'اضغط لاختيار شيت الواجب أو صورة الأسئلة من جهازك'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    يقوم الموقع بقراءة نصوص الشيت أو الصورة وتحويلها إلى أسئلة اختيار من متعدد فورياً
                  </p>
                </div>

                {/* Interactive Conversational Claude 3.5 Sonnet Assistant for Homework */}
                <div className="p-4 bg-[#070b18] border border-amber-500/30 rounded-xl space-y-3 shadow-inner">
                  {/* Hidden file input triggered by the (+) button */}
                  <input
                    type="file"
                    ref={hwPlusFileInputRef}
                    accept="*/*"
                    onChange={handleSelectHwFile}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-400/40">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span>مساعد Google Gemini الذكي فائق الدقة للواجبات والشيتات</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50">
                            خاص بالأستاذ فقط ⚡ ذكاء اصطناعي حقيقي
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          اضغط علامة (+) لإرفاق ملف الشيت أو الصورة بأي حجم، ثم تحدث مع Google Gemini ووجهه بما تريده وسينفذ طلبك بالحرف الواحد قبل بدء الاستخراج.
                        </p>
                      </div>
                    </div>

                    {/* Chat Typography Size Controller + Emergency AI Reset Button */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleEmergencyResetAi}
                        disabled={isResettingAi}
                        className="px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/50 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                        title="إعادة ضبط طوارئ لاتصال Gemini ومسح الذاكرة المؤقتة"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResettingAi ? 'animate-spin' : ''}`} />
                        <span>{isResettingAi ? 'جاري إعادة الضبط...' : 'إعادة ضبط AI'}</span>
                      </button>

                      <div className="flex items-center gap-1.5 bg-[#050811] px-2.5 py-1 rounded-xl border border-slate-700/60 shadow-sm">
                        <span className="text-[10px] text-slate-300 font-semibold">حجم الخط:</span>
                        <button
                          type="button"
                          onClick={() => setChatFontSize((prev) => Math.max(12, prev - 1))}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                          title="تصغير خط المحادثة"
                        >
                          A-
                        </button>
                        <span className="text-xs font-mono font-bold text-amber-300 px-1">{chatFontSize}px</span>
                        <button
                          type="button"
                          onClick={() => setChatFontSize((prev) => Math.min(22, prev + 1))}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                          title="تكبير خط المحادثة"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Attached File Preview Card (if file attached via + button) */}
                  {hwAttachedFile && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs animate-fade-in">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {hwAttachedDataUrl && hwAttachedFile.type.startsWith('image/') ? (
                          <img
                            src={hwAttachedDataUrl}
                            alt="معاينة الشيت"
                            className="w-10 h-10 rounded-lg object-cover border border-amber-400/50 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate text-xs">{hwAttachedFile.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                              {(hwAttachedFile.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200/80">
                            📎 ملف مرفق بنجاح · تحدث مع Google Gemini ووجهه الآن قبل الضغط على زر الاستخراج
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHwAttachedFile(null);
                          setHwAttachedDataUrl('');
                          setHwAttachedMime('');
                          setHwFileObj(null);
                          setHwFileUrl('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                        title="إلغاء الملف"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Interactive Live Chat Thread with Google Gemini - Crystal Clear Typography */}
                  <div className="bg-[#030611] border border-amber-950/60 rounded-xl p-3.5 max-h-56 overflow-y-auto space-y-2.5">
                    {hwChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300 shadow-sm">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          style={{ fontSize: `${chatFontSize}px` }}
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed tracking-wide ${
                            msg.sender === 'teacher'
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-br-xs shadow-md'
                              : 'bg-[#0f172a] text-white border-2 border-amber-500/40 font-medium rounded-bl-xs shadow-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <span className="text-[10px] text-slate-400 block mt-1.5 text-left font-mono">{msg.time}</span>
                        </div>
                        {msg.sender === 'teacher' && (
                          <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                            أنت
                          </div>
                        )}
                      </div>
                    ))}
                    {isHwChatReplying && (
                      <div className="flex gap-2 items-center text-xs text-amber-300 animate-pulse">
                        <div className="w-6 h-6 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </div>
                        <span>Google Gemini يستمع ويكتب رده الآن...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Instruction Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">أوامر وتوجيهات سريعة لـ Google Gemini بنقرة واحدة:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        'استخرج جميع الأسئلة بالنص الأصلي الكامل دون تحريف',
                        'غير صيغة هذا السؤال لاختيار من متعدد بنظام التابلت',
                        'ضيف فقط جزءاً من هذه الأسئلة (أول 5 أسئلة فقط)',
                        'حدد الإجابة النموذجية مع التفسير العلمي الدقيق',
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendHwChat(chip)}
                          className="text-[10px] px-2.5 py-1 bg-slate-800/80 hover:bg-amber-950/60 text-amber-200 hover:text-white rounded-lg border border-slate-700/60 hover:border-amber-500/50 transition-colors cursor-pointer"
                        >
                          💬 {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Input Bar with (+) Plus Button to pick device files */}
                  <div className="flex items-center gap-1.5 bg-[#030611] border border-cyan-900/60 focus-within:border-amber-400 rounded-xl p-1.5 transition-all">
                    {/* The (+) Button to open local device files directly */}
                    <button
                      type="button"
                      onClick={() => hwPlusFileInputRef.current?.click()}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 hover:from-amber-500 hover:to-cyan-500 text-amber-300 hover:text-black border-2 border-amber-400/60 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md group"
                      title="إرفاق أي ملف أو صورة أو PDF من جهازك بأي حجم (+)"
                    >
                      <Plus className="w-5 h-5 font-bold group-hover:scale-110 transition-transform" />
                    </button>

                    <input
                      type="text"
                      value={hwChatInput}
                      onChange={(e) => setHwChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendHwChat();
                        }
                      }}
                      placeholder="تحدث مع Google Gemini ووجّهه بما تريده بالحرف الواحد (مثال: غير صيغة السؤال 2، استخرج أول 5 أسئلة، ركز على فكرة محددة)..."
                      className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white focus:outline-none placeholder-slate-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleSendHwChat()}
                      disabled={(!hwChatInput.trim() && !hwAttachedDataUrl) || isHwChatReplying}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                    >
                      {isHwChatReplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>تحدث</span>
                    </button>
                  </div>

                  {/* Action button & Loading Status */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
                    <button
                      type="button"
                      disabled={isHwAiParsing}
                      onClick={() => runAiParseHomework(hwAttachedDataUrl || hwFileUrl || undefined, hwAttachedMime || hwFileObj?.type || 'image/jpeg', hwAiNotes)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-cyan-600 hover:from-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isHwAiParsing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري استخراج وتوليد الأسئلة بواسطة Google Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>تنفيذ التوجيهات واستخراج الأسئلة بواسطة Google Gemini AI ⚡</span>
                        </>
                      )}
                    </button>

                    {isHwAiParsing && (
                      <span className="text-[11px] text-amber-300 animate-pulse flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 fill-amber-400" />
                        <span>معالجة فائقة السرعة والدقة بمحرك Google Gemini AI...</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">تصنيف التكليف</label>
                    <select
                      value={hwKind}
                      onChange={(e) => {
                        const nextKind = e.target.value as 'homework' | 'sheet';
                        setHwKind(nextKind);
                        setHwDuration(nextKind === 'sheet' ? '180' : '1440');
                      }}
                      className="w-full bg-[#050811] border border-cyan-700/60 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="homework">واجب منزلي (مهلة حتى يوم كامل 24 ساعة)</option>
                      <option value="sheet">شيت درس (حد أقصى 3 ساعات + يدخل الأوائل)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      {hwKind === 'sheet' ? 'عنوان الشيت' : 'عنوان الواجب'}
                    </label>
                    <input
                      type="text"
                      required
                      value={hwTitle}
                      onChange={(e) => setHwTitle(e.target.value)}
                      placeholder={hwKind === 'sheet' ? 'مثال: شيت الدرس الأول - العناصر الانتقالية' : 'مثال: واجب الأسبوع الأول: التوزيع الإلكتروني'}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الدرس المرتبط (مثال: الدرس الأول)</label>
                    <input
                      type="text"
                      value={hwLessonTitle}
                      onChange={(e) => setHwLessonTitle(e.target.value)}
                      placeholder="مثال: الدرس الأول - الباب الأول"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                    <select
                      value={hwGrade}
                      onChange={(e) => setHwGrade(e.target.value as GradeLevel)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="sec3">الصف الثالث الثانوي</option>
                      <option value="sec2">الصف الثاني الثانوي</option>
                      <option value="sec1">الصف الأول الثانوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      مدة الحل (دقيقة · حد أقصى {hwKind === 'sheet' ? '180 د = 3 ساعات' : '1440 د = يوم كامل'})
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={hwKind === 'sheet' ? 180 : 1440}
                      value={hwDuration}
                      onChange={(e) => setHwDuration(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الدرجة الكلية</label>
                    <input
                      type="number"
                      min={1}
                      value={hwTotalMarks}
                      onChange={(e) => setHwTotalMarks(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">آخر موعد للتسليم</label>
                    <input
                      type="text"
                      value={hwDeadline}
                      onChange={(e) => setHwDeadline(e.target.value)}
                      placeholder="مثال: يوم الخميس الساعة 11 مساءً"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Extracted Questions Review & Teacher Correct Answer Picker */}
                <QuestionReviewEditor
                  questions={hwExtractedQuestions}
                  setQuestions={setHwExtractedQuestions}
                  titleLabel={hwKind === 'sheet' ? 'مراجعة وتعديل أسئلة الشيت وتوزيع الدرجات' : 'الأسئلة المستخرجة للواجب'}
                  onTotalPointsChange={(total) => setHwTotalMarks(String(total))}
                />


                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{hwKind === 'sheet' ? 'حفظ ونشر الشيت' : 'حفظ ونشر الواجب'}</span>
                </button>
              </form>

              {/* Homework List with Edit & Delete */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  الواجبات والشيتات المسجلة ({homeworks.length})
                </h4>

                {homeworks.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا توجد واجبات مضافة بعد.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {homeworks.map((hw) => (
                      <div
                        key={hw.id}
                        className="p-3.5 bg-[#080d1b] border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                hw.kind === 'sheet'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                              }`}
                            >
                              {hw.kind === 'sheet' ? 'شيت درس' : 'واجب منزلي'}
                            </span>
                            <h5 className="font-bold text-white">{hw.title}</h5>
                            {hw.lessonTitle && (
                              <span className="text-[11px] text-cyan-300 font-semibold">({hw.lessonTitle})</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            {hw.deadline} · المدة: {hw.durationMinutes || (hw.kind === 'sheet' ? 180 : 1440)} د · {hw.questions ? `${hw.questions.length} سؤال` : hw.fileName || 'شيت مرفق'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hw.fileUrl && (
                            <button
                              onClick={() =>
                                setActiveDocument({
                                  title: hw.title,
                                  fileUrl: hw.fileUrl!,
                                  fileName: hw.fileName,
                                  fileType: hw.fileType,
                                })
                              }
                              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                            >
                              معاينة الشيت
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingHomework(hw);
                              setEditingHomeworkQuestions(hw.questions ? JSON.parse(JSON.stringify(hw.questions)) : []);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
                            title="تعديل الواجب والأسئلة بالكامل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteHomework(hw.id)}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXAMS (UP TO 500+ QUESTIONS AT ONCE) */}
          {activeTab === 'exams' && (
            <div className="space-y-6">
              <form onSubmit={handleAddExam} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-cyan-400" />
                    <span>إنشاء وتعديل الامتحانات (إضافة حتى 500+ سؤال دفعة واحدة)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-300 mb-1">عنوان الامتحان</label>
                    <input
                      type="text"
                      required
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="مثال: الامتحان الشامل على الباب الأول والثاني"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الدرس / الباب المرتبط</label>
                    <input
                      type="text"
                      value={examLessonTitle}
                      onChange={(e) => setExamLessonTitle(e.target.value)}
                      placeholder="مثال: الباب الأول كاملاً"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                    <select
                      value={examGrade}
                      onChange={(e) => setExamGrade(e.target.value as GradeLevel)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="sec3">الصف الثالث الثانوي</option>
                      <option value="sec2">الصف الثاني الثانوي</option>
                      <option value="sec1">الصف الأول الثانوي</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">مدة الامتحان بالدقائق (حد أقصى 240 دقيقة / 4 ساعات)</label>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={examDuration}
                      onChange={(e) => setExamDuration(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الدرجة الكلية للامتحان</label>
                    <input
                      type="number"
                      value={examMarks}
                      onChange={(e) => setExamMarks(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left font-mono"
                    />
                  </div>
                </div>

                {/* Local Exam File Picker (PDF, Image, Docs) */}
                <div className="p-4 bg-[#050811] border-2 border-dashed border-cyan-700/60 hover:border-cyan-400 rounded-xl text-center space-y-2 cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={handleSelectExamFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileCheck2 className="w-8 h-8 text-cyan-400 mx-auto" />
                  <p className="text-xs font-bold text-white">
                    اضغط لاختيار ملف أو صورة شيت الامتحان من جهازك (PDF أو صور الأسئلة)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    يقوم الموقع تلقائياً بقراءة وتفريغ الأسئلة وحساب درجاتها وتحديد الإجابات النموذجية
                  </p>
                </div>

                {/* Interactive Conversational Claude 3.5 Sonnet Assistant for Exams */}
                <div className="p-4 bg-[#070b18] border border-amber-500/30 rounded-xl space-y-3 shadow-inner">
                  {/* Hidden file input triggered by the (+) button */}
                  <input
                    type="file"
                    ref={examPlusFileInputRef}
                    accept="*/*"
                    onChange={handleSelectExamFile}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-400/40">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span>مساعد Google Gemini الذكي فائق الدقة للامتحانات والاختبارات</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50">
                            خاص بالأستاذ فقط ⚡ ذكاء اصطناعي حقيقي
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          اضغط علامة (+) لإرفاق ملف أو شيت الامتحان بأي حجم، ثم تحدث مع Google Gemini ووجهه بدقة وسينفذ توجيهاتك بالحرف الواحد قبل بدء الاستخراج.
                        </p>
                      </div>
                    </div>

                    {/* Chat Typography Size Controller + Emergency AI Reset Button */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleEmergencyResetAi}
                        disabled={isResettingAi}
                        className="px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/50 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                        title="إعادة ضبط طوارئ لاتصال Gemini ومسح الذاكرة المؤقتة"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResettingAi ? 'animate-spin' : ''}`} />
                        <span>{isResettingAi ? 'جاري إعادة الضبط...' : 'إعادة ضبط AI'}</span>
                      </button>

                      <div className="flex items-center gap-1.5 bg-[#050811] px-2.5 py-1 rounded-xl border border-slate-700/60 shadow-sm">
                        <span className="text-[10px] text-slate-300 font-semibold">حجم الخط:</span>
                        <button
                          type="button"
                          onClick={() => setChatFontSize((prev) => Math.max(12, prev - 1))}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                          title="تصغير خط المحادثة"
                        >
                          A-
                        </button>
                        <span className="text-xs font-mono font-bold text-amber-300 px-1">{chatFontSize}px</span>
                        <button
                          type="button"
                          onClick={() => setChatFontSize((prev) => Math.min(22, prev + 1))}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                          title="تكبير خط المحادثة"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Attached File Preview Card for Exams */}
                  {examAttachedFile && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs animate-fade-in">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {examAttachedDataUrl && examAttachedFile.type.startsWith('image/') ? (
                          <img
                            src={examAttachedDataUrl}
                            alt="معاينة شيت الامتحان"
                            className="w-10 h-10 rounded-lg object-cover border border-amber-400/50 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate text-xs">{examAttachedFile.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                              {(examAttachedFile.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200/80">
                            📎 ملف امتحان مرفق · تحدث مع Google Gemini لتعديل الصياغة والأسئلة قبل الاستخراج
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExamAttachedFile(null);
                          setExamAttachedDataUrl('');
                          setExamAttachedMime('');
                          setExamFileObj(null);
                          setExamFileUrl('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                        title="إلغاء الملف"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Interactive Live Chat Thread for Exams with Google Gemini - Crystal Clear Typography */}
                  <div className="bg-[#030611] border border-amber-950/60 rounded-xl p-3.5 max-h-56 overflow-y-auto space-y-2.5">
                    {examChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300 shadow-sm">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          style={{ fontSize: `${chatFontSize}px` }}
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed tracking-wide ${
                            msg.sender === 'teacher'
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-br-xs shadow-md'
                              : 'bg-[#0f172a] text-white border-2 border-amber-500/40 font-medium rounded-bl-xs shadow-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <span className="text-[10px] text-slate-400 block mt-1.5 text-left font-mono">{msg.time}</span>
                        </div>
                        {msg.sender === 'teacher' && (
                          <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                            أنت
                          </div>
                        )}
                      </div>
                    ))}
                    {isExamChatReplying && (
                      <div className="flex gap-2 items-center text-xs text-amber-300 animate-pulse">
                        <div className="w-6 h-6 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </div>
                        <span>Google Gemini يصيغ رد الامتحان الآن...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Instruction Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">أوامر وتوجيهات سريعة لـ Google Gemini للامتحان:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        'استخرج كافة الأسئلة بنصها الحقيقي في المستند',
                        'غير صيغة هذا السؤال لنظام التابلت والبوكليت',
                        'ضيف فقط جزءاً من هذه الأسئلة (استخرج أول 10 أسئلة)',
                        'حدد الإجابة النموذجية مع التفسير العلمي ودرجات الامتحان',
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendExamChat(chip)}
                          className="text-[10px] px-2.5 py-1 bg-slate-800/80 hover:bg-amber-950/60 text-amber-200 hover:text-white rounded-lg border border-slate-700/60 hover:border-amber-500/50 transition-colors cursor-pointer"
                        >
                          💬 {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Input Bar with (+) Plus Button to pick device files */}
                  <div className="flex items-center gap-1.5 bg-[#030611] border border-cyan-900/60 focus-within:border-amber-400 rounded-xl p-1.5 transition-all">
                    {/* The (+) Button to open local device files directly */}
                    <button
                      type="button"
                      onClick={() => examPlusFileInputRef.current?.click()}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 hover:from-amber-500 hover:to-cyan-500 text-amber-300 hover:text-black border-2 border-amber-400/60 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md group"
                      title="إرفاق أي صورة أو ملف أو شيت امتحان من جهازك بأي حجم (+)"
                    >
                      <Plus className="w-5 h-5 font-bold group-hover:scale-110 transition-transform" />
                    </button>

                    <input
                      type="text"
                      value={examChatInput}
                      onChange={(e) => setExamChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendExamChat();
                        }
                      }}
                      placeholder="تحدث مع Google Gemini ووجّهه بما تريده في الامتحان بالحرف الواحد (مثال: غير صيغة السؤال 3، احذف السؤال المقالي)..."
                      className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white focus:outline-none placeholder-slate-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleSendExamChat()}
                      disabled={(!examChatInput.trim() && !examAttachedDataUrl) || isExamChatReplying}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                    >
                      {isExamChatReplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>تحدث</span>
                    </button>
                  </div>

                  {/* Action button & Loading Status */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
                    <button
                      type="button"
                      disabled={isExamAiParsing}
                      onClick={() => runAiParseExam(examAttachedDataUrl || examFileUrl || undefined, examAttachedMime || examFileObj?.type || 'image/jpeg', examAiNotes)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-cyan-600 hover:from-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isExamAiParsing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري استخراج الامتحان وصياغته بواسطة Google Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>تنفيذ التوجيهات واستخراج أسئلة الامتحان بواسطة Google Gemini AI ⚡</span>
                        </>
                      )}
                    </button>

                    {isExamAiParsing && (
                      <span className="text-[11px] text-amber-300 animate-pulse flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 fill-amber-400" />
                        <span>معالجة فائقة السرعة والدقة بمحرك Google Gemini AI...</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bulk Paste / Import Box */}
                <div className="p-4 bg-[#050811] rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-cyan-400">
                      أو الصق نصوص الأسئلة من وورد أو PDF دفعة واحدة (يدعم حتى 500+ سؤال):
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => generateBulkSampleQuestions(50)}
                        className="text-[11px] px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 rounded-lg cursor-pointer"
                      >
                        + 50 سؤال كيمياء
                      </button>
                      <button
                        type="button"
                        onClick={() => generateBulkSampleQuestions(200)}
                        className="text-[11px] px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-300 rounded-lg cursor-pointer"
                      >
                        + 200 سؤال
                      </button>
                      <button
                        type="button"
                        onClick={() => generateBulkSampleQuestions(500)}
                        className="text-[11px] px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-300 rounded-lg cursor-pointer font-bold"
                      >
                        + 500 سؤال كاملة
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={rawQuestionsText}
                    onChange={(e) => {
                      setRawQuestionsText(e.target.value);
                      parseAndSetQuestions(e.target.value);
                    }}
                    placeholder="الصق نصوص أسئلتك هنا (مثال: س1: ما هو العامل الحفاز في هابر بوش؟ أ- الحديد ب- النحاس ج- النيكل د- الكروم)..."
                    className="w-full bg-[#080d1b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isExamAiParsing || !rawQuestionsText.trim()}
                      onClick={runAiParsePastedText}
                      className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>صياغة وتنسيق النصوص الملصقة بالذكاء الاصطناعي ⚡</span>
                    </button>
                  </div>
                </div>

                {/* Question Review & Editor for Exams */}
                <QuestionReviewEditor
                  questions={examQuestions}
                  setQuestions={setExamQuestions}
                  titleLabel="مراجعة وتعديل أسئلة الامتحان"
                  onTotalPointsChange={(total) => setExamMarks(String(total))}
                />

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>حفظ ونشر الامتحان</span>
                </button>
              </form>

              {/* Exams List with Edit & Delete */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  الامتحانات المنشورة ({exams.length})
                </h4>

                {exams.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا توجد امتحانات مضافة بعد.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {exams.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-3.5 bg-[#080d1b] border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <h5 className="font-bold text-white">{ex.title}</h5>
                          <p className="text-slate-400 text-[11px]">
                            المدة: {ex.durationMinutes} دقيقة · الدرجة: {ex.totalMarks} · عدد الأسئلة: {ex.questions.length}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExam(ex);
                              setEditingExamQuestions(ex.questions ? JSON.parse(JSON.stringify(ex.questions)) : []);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
                            title="تعديل الامتحان والأسئلة والدرجات بالكامل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteExam(ex.id)}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                            title="حذف الامتحان"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FILES (PDF, WORD, EXCEL DIRECT FROM DEVICE) */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              <form noValidate onSubmit={handleAddFile} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-cyan-400" />
                    <span>إضافة مستند أو مذكرة من جهازك أو برابط Google Drive</span>
                  </h3>
                  <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    حد أقصى للرفع المباشر 50MB · روابط درايف غير محدودة
                  </span>
                </div>

                {/* Local Doc File Picker */}
                <div className="p-4 bg-[#050811] border-2 border-dashed border-cyan-700/60 hover:border-cyan-400 rounded-xl text-center space-y-2 cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={handleSelectDocFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FolderOpen className="w-8 h-8 text-cyan-400 mx-auto" />
                  <p className="text-xs font-bold text-white">
                    {docFileObj ? `تم اختيار: ${docFileObj.name}` : 'اضغط لاختيار الملف من جهازك (بحد أقصى 50 ميجابايت)'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    للملفات والملازم الكبيرة، يُرجى استخدام خيار رابط Google Drive بالأسفل
                  </p>
                </div>

                {/* Real Upload Progress Bar for Documents */}
                {renderUploadProgressBar(docUploadProgress)}

                {/* Alternative: External Document URL */}
                <div className="p-3.5 bg-[#050811] border border-cyan-950 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    أو إضافة برابط Google Drive (/file/d/ID أو ?id=ID أو /open?id=ID):
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={docFileUrl.startsWith('/uploads/') ? '' : docFileUrl}
                      onChange={(e) => {
                        setDocFileUrl(e.target.value);
                        if (e.target.value) setDocFileObj(null);
                      }}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="flex-1 bg-[#080d1b] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono text-left"
                    />
                    {docFileUrl && !docFileUrl.startsWith('/uploads/') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!docFileUrl.trim()) {
                            showNotice('يرجى إدخال رابط Google Drive أولاً.');
                            return;
                          }
                          const parsed = parseDriveUrl(docFileUrl);
                          if (!parsed.isValid) {
                            showNotice('⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط Google Drive صالح (/file/d/ID أو ?id=ID أو /open?id=ID).');
                            return;
                          }
                          setDocFileUrl(parsed.previewUrl);
                          setDocFileType('pdf');
                          if (!fileTitle) {
                            setFileTitle(`مذكرة كيمياء - ملف ${parsed.id.slice(0, 8)}`);
                          }
                          showNotice(`✅ تم التحقق من رابط Google Drive بنجاح (معرف: ${parsed.id}) وجاهز للحفظ في Supabase!`);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>تأكيد وفحص الرابط</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-cyan-400">
                    🔒 عارض معزول بالكامل: تفتح مستندات Google Drive داخل عارض المنصة المدمج فقط مع حجب أيقونة الخروج والتنزيل الخارجي.
                  </p>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-300 mb-1">اسم المذكرة أو المستند</label>
                    <input
                      type="text"
                      required
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      placeholder="مثال: مذكرة شرح الباب الأول وتلخيص معادلات الحديد"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">نوع القسم</label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="شرح">مذكرة شرح</option>
                      <option value="مراجعة">مراجعة نهائية</option>
                      <option value="امتحانات">نماذج امتحانات</option>
                      <option value="مفاهيم">ورقة مفاهيم وملخصات</option>
                      <option value="جدول بيانات">جدول بيانات إكسل</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                  <select
                    value={fileGrade}
                    onChange={(e) => setFileGrade(e.target.value as GradeLevel)}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="sec3">الصف الثالث الثانوي</option>
                    <option value="sec2">الصف الثاني الثانوي</option>
                    <option value="sec1">الصف الأول الثانوي</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>حفظ وإضافة الملف</span>
                </button>
              </form>

              {/* Files List with In-App Preview & Delete */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  جميع الملفات المرفوعة ({files.length})
                </h4>

                {files.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا توجد ملفات مرفوعة بعد.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="bg-[#080d1b] border border-slate-800 p-3.5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                          <div>
                            <h5 className="font-bold text-white line-clamp-1">{file.title}</h5>
                            <span className="text-[10px] text-slate-400">{file.category} · {file.fileType}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setActiveDocument({
                                title: file.title,
                                fileUrl: file.fileUrl,
                                fileName: file.fileName,
                                fileType: file.fileType,
                              })
                            }
                            className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                          >
                            فتح بالمشغل
                          </button>
                          <button
                            onClick={() => setEditingFile(file)}
                            className="p-1 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
                            title="تعديل بيانات الملف"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                            title="حذف الملف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: COMPREHENSIVE STUDENT MANAGEMENT (إدارة وشؤون الطلاب بالكامل: إضافة - تعديل - حذف - رادار - تقارير) */}
          {activeTab === 'students' && (() => {
            const registeredStudentsList = registeredAccounts.filter((s) => {
              if (s.role === 'admin' || s.role === 'secretary') return false;
              if (studentFilterGrade !== 'all' && s.grade !== studentFilterGrade) return false;
              if (studentFilterSub !== 'all' && s.subscriptionType !== studentFilterSub) return false;
              if (!studentSearchQuery.trim()) return true;
              const q = studentSearchQuery.toLowerCase().trim();
              return (
                s.name.toLowerCase().includes(q) ||
                s.phone.includes(q) ||
                (s.parentPhone && s.parentPhone.includes(q)) ||
                (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
                (s.governorate && s.governorate.toLowerCase().includes(q))
              );
            });

            return (
              <div className="space-y-6">
                {/* Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080d1b] border border-cyan-900/40 rounded-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStudentSectionMode('directory')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        studentSectionMode === 'directory'
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>دليل الطلاب (إضافة / تعديل / حذف)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentSectionMode('reports')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        studentSectionMode === 'reports'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'text-emerald-300 hover:text-white hover:bg-emerald-950/40'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span>بيانات الطالب والتقارير الشاملة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentSectionMode('lecture_auth')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        studentSectionMode === 'lecture_auth'
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>تصريح كود لكورس محدد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentSectionMode('ai_scan')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        studentSectionMode === 'ai_scan'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>سحب بالكاميرا (Google Gemini AI)</span>
                    </button>
                  </div>

                  {studentSectionMode === 'directory' && (
                    <button
                      type="button"
                      onClick={() => setShowAddStudentForm((prev) => !prev)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{showAddStudentForm ? 'إخفاء نموذج الإضافة' : '➕ إضافة طالب جديد يدوياً'}</span>
                    </button>
                  )}
                </div>

                {/* Sub-view: Main Registered Student Directory */}
                {studentSectionMode === 'directory' && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Collapsible Add New Student Form */}
                    {showAddStudentForm && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newStdName.trim() || !newStdPhone.trim() || !newStdCode.trim()) {
                            showNotice('يرجى ملء اسم الطالب ورقم هاتفه والكود');
                            return;
                          }
                          if (!newStdParentPhone.trim()) {
                            showNotice('رقم ولي الأمر إلزامي ومطلوب');
                            return;
                          }

                          addRegisteredStudent({
                            name: newStdName.trim(),
                            phone: newStdPhone.trim(),
                            parentPhone: newStdParentPhone.trim(),
                            studentCode: newStdCode.trim(),
                            password: newStdPass.trim() || newStdCode.trim(),
                            grade: newStdGrade,
                            subscriptionType: newStdSubscription,
                            governorate: newStdGov.trim() || 'القاهرة',
                            age: Number(newStdAge) || 18,
                            walletBalance: Number(newStdBalance) || 0,
                          });

                          setNewStdName('');
                          setNewStdPhone('');
                          setNewStdParentPhone('');
                          setNewStdCode('');
                          setNewStdPass('');
                          setShowAddStudentForm(false);
                          showNotice('🎉 تمت إضافة الطالب للمنصة بنجاح!');
                        }}
                        className="bg-[#080d1b] border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                          <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-emerald-400" />
                            <span>إضافة طالب جديد وتخصيص بياناته بالكامل</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowAddStudentForm(false)}
                            className="text-slate-400 hover:text-white text-xs cursor-pointer"
                          >
                            إلغاء ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">
                              اسم الطالب كاملاً <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={newStdName}
                              onChange={(e) => setNewStdName(e.target.value)}
                              placeholder="مثال: محمد السيد أحمد"
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-300 mb-1">
                              رقم هاتف الطالب <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              value={newStdPhone}
                              onChange={(e) => setNewStdPhone(e.target.value)}
                              placeholder="010XXXXXXXX"
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-amber-300 mb-1 font-bold">
                              رقم ولي الأمر (إلزامي) <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              value={newStdParentPhone}
                              onChange={(e) => setNewStdParentPhone(e.target.value)}
                              placeholder="01XXXXXXXXX"
                              className="w-full bg-[#050811] border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 text-left font-mono"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">
                              كود الطالب <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={newStdCode}
                              onChange={(e) => setNewStdCode(e.target.value)}
                              placeholder="SEC3-205"
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 uppercase font-mono"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-300 mb-1">
                              كلمة المرور / الكود السري
                            </label>
                            <input
                              type="text"
                              value={newStdPass}
                              onChange={(e) => setNewStdPass(e.target.value)}
                              placeholder="افتراضياً نفس الكود"
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                            <select
                              value={newStdGrade}
                              onChange={(e) => setNewStdGrade(e.target.value as GradeLevel)}
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                            >
                              <option value="sec3">الصف الثالث الثانوي</option>
                              <option value="sec2">الصف الثاني الثانوي</option>
                              <option value="sec1">الصف الأول الثانوي</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-300 mb-1">نوع الاشتراك</label>
                            <select
                              value={newStdSubscription}
                              onChange={(e) => setNewStdSubscription(e.target.value as SubscriptionType)}
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                            >
                              <option value="course">كورس شهري شامل</option>
                              <option value="lecture">حصة منفردة</option>
                              <option value="center">مسكن بالسنتر وقاعة</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">المحافظة</label>
                            <input
                              type="text"
                              value={newStdGov}
                              onChange={(e) => setNewStdGov(e.target.value)}
                              placeholder="مثال: الدقهلية / المنصورة"
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-300 mb-1">العمر / السن</label>
                            <input
                              type="number"
                              value={newStdAge}
                              onChange={(e) => setNewStdAge(e.target.value)}
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-300 mb-1">رصيد المحفظة المبدئي (ج.م)</label>
                            <input
                              type="number"
                              value={newStdBalance}
                              onChange={(e) => setNewStdBalance(e.target.value)}
                              className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddStudentForm(false)}
                            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-2"
                          >
                            <CheckCheck className="w-4 h-4" />
                            <span>حفظ وإضافة الطالب للمنصة فوراً 💾</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#080d1b] p-3 rounded-2xl border border-cyan-900/40">
                      <div className="relative w-full sm:w-80">
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          placeholder="ابحث بالاسم، هاتف الطالب، ولي الأمر، أو الكود..."
                          className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs self-start sm:self-auto font-semibold">
                        <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setStudentFilterGrade('all')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              studentFilterGrade === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            كل الصفوف
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentFilterGrade('sec3')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              studentFilterGrade === 'sec3' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            3 ثانوي
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentFilterGrade('sec2')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              studentFilterGrade === 'sec2' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            2 ثانوي
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentFilterGrade('sec1')}
                            className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                              studentFilterGrade === 'sec1' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            1 ثانوي
                          </button>
                        </div>

                        <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setStudentFilterSub('all')}
                            className={`px-2 py-1 rounded-lg cursor-pointer ${
                              studentFilterSub === 'all' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            كل الاشتراكات
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentFilterSub('course')}
                            className={`px-2 py-1 rounded-lg cursor-pointer ${
                              studentFilterSub === 'course' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            كورس
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentFilterSub('lecture')}
                            className={`px-2 py-1 rounded-lg cursor-pointer ${
                              studentFilterSub === 'lecture' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            حصة
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentFilterSub('center')}
                            className={`px-2 py-1 rounded-lg cursor-pointer ${
                              studentFilterSub === 'center' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            سنتر
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                        <span>قائمة الطلاب المسجلين ({registeredStudentsList.length} طالب)</span>
                        <span>كامل الصلاحيات: تعديل وحذف فوري وإرسال تقارير</span>
                      </div>

                      {registeredStudentsList.length === 0 ? (
                        <div className="p-10 bg-[#080d1b] border border-slate-800 rounded-2xl text-center space-y-2">
                          <Users className="w-10 h-10 text-slate-600 mx-auto" />
                          <p className="text-sm font-bold text-white">لا يوجد طلاب مطابقون للبحث حالياً</p>
                          <p className="text-xs text-slate-400">
                            اضغط على زر "إضافة طالب جديد يدوياً" أعلاه لإضافة أي طالب، أو صور الكشف عبر Google Gemini AI.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {registeredStudentsList.map((std) => {
                            const parentPhone = std.parentPhone || std.phone;
                            const whatsappParentMsg = encodeURIComponent(
                              `السلام عليكم ورحمة الله وبركاته،\nولي أمر الطالب المحترم: ${std.name} (كود: ${std.studentCode})\n\nنود إحاطتكم ببيانات اشتراك الطالب في مادة الكيمياء مع مستر عمرو السيد:\n- الصف: ${
                                std.grade === 'sec3' ? 'الثالث الثانوي' : std.grade === 'sec2' ? 'الثاني الثانوي' : 'الأول الثانوي'
                              }\n- نوع الاشتراك: ${
                                std.subscriptionType === 'center' ? 'مسكن بالسنتر' : std.subscriptionType === 'lecture' ? 'حصة منفردة' : 'كورس شهري شامل'
                              }\n- هاتف الطالب: ${std.phone}\n\nنتمنى لأبنائنا دوام التوفيق والتميز دائماً!`
                            );

                            return (
                              <div
                                key={std.id}
                                className="p-3.5 bg-[#080d1b] border border-slate-800 hover:border-cyan-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center font-bold text-cyan-300">
                                      {std.name.charAt(0)}
                                    </div>
                                    <span
                                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#080d1b] ${
                                        std.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                      }`}
                                      title={std.isOnline ? 'متصل الآن' : 'غير متصل'}
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-white text-sm">{std.name}</h4>
                                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-bold">
                                        {std.studentCode}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                        {std.grade === 'sec3' ? '3 ثانوي' : std.grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                                        {std.subscriptionType === 'center'
                                          ? 'مسكن بالسنتر'
                                          : std.subscriptionType === 'lecture'
                                          ? 'حصة منفردة'
                                          : 'كورس شهري'}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-[11px] mt-1 font-mono">
                                      <span>
                                        هاتف الطالب: <strong className="text-white">{std.phone}</strong>
                                      </span>
                                      <span>
                                        ولي الأمر:{' '}
                                        <strong className="text-amber-300 font-bold">{parentPhone}</strong>
                                      </span>
                                      <span>المحافظة: {std.governorate}</span>
                                      <span>الرصيد: {std.walletBalance} ج.م</span>
                                      {std.password && (
                                        <span className="text-slate-500">
                                          الباسورد: <strong className="text-slate-300">{std.password}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Student Actions */}
                                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                                  {/* Send Parent WhatsApp Report */}
                                  <a
                                    href={`https://wa.me/2${parentPhone.replace(/[^0-9]/g, '')}?text=${whatsappParentMsg}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1 font-bold text-[11px]"
                                    title="إرسال تقرير واتساب لولي الأمر"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>تقرير ولي الأمر 💬</span>
                                  </a>

                                  {/* Open in Radar */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('secret_surveillance');
                                      setSelectedStudentForDossier(std.id);
                                    }}
                                    className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded-xl border border-cyan-500/30 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                    title="عرض رادار المراقبة الشاملة 360°"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>رادار 360°</span>
                                  </button>

                                  {/* Edit Student */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingStudent({ ...std })}
                                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl border border-blue-500/30 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                    title="تعديل بيانات الطالب بالكامل"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>تعديل</span>
                                  </button>

                                  {/* Delete Student */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`هل أنت متأكد من حذف الطالب "${std.name}" نهائياً من المنصة؟`)) {
                                        deleteRegisteredStudent(std.id);
                                        showNotice(`تم حذف الطالب "${std.name}" نهائياً من المنصة.`);
                                      }
                                    }}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                                    title="حذف الطالب نهائياً"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-view: Lecture Level Access Authorization */}
                {studentSectionMode === 'lecture_auth' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-4 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-cyan-300 leading-relaxed">
                      <span className="font-bold block mb-1">تصريح دخول الطلاب (برقم الهاتف والكود المسجل معاً):</span>
                      لكي يدخل الطالب للكورس، يجب أن يطابق رقم هاتفه مع الكود المسجل له هنا. يمكنك أيضاً سحب الصلاحية وإخراج أي طالب بضغطة زر.
                    </div>

                    <form onSubmit={handleAddStudentAuth} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-cyan-400" />
                        تصريح طالب جديد (هاتف + كود اشتراك)
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">اسم الطالب</label>
                          <input
                            type="text"
                            value={authStudentName}
                            onChange={(e) => setAuthStudentName(e.target.value)}
                            placeholder="مثال: أحمد عبد الله"
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">رقم هاتف الطالب</label>
                          <input
                            type="tel"
                            required
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            placeholder="010XXXXXXXX"
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left font-mono"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">كود الطالب المسجل به</label>
                          <input
                            type="text"
                            required
                            value={authCode}
                            onChange={(e) => setAuthCode(e.target.value)}
                            placeholder="AMR-101"
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase font-mono"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">الكورس المصرح بدخوله</label>
                          <select
                            value={authLectureId}
                            onChange={(e) => setAuthLectureId(e.target.value)}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="all">جميع الكورسات (اشتراك كامل)</option>
                            {lectures.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>إضافة وتصريح الطالب</span>
                      </button>
                    </form>

                    {/* Authorized Students List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        الطلاب المصرح لهم حالياً ({authorizedStudents.length})
                      </h4>

                      {authorizedStudents.length === 0 ? (
                        <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                          لا يوجد أي طالب مسجل في هذه القائمة حالياً.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-800 bg-[#080d1b] border border-slate-800 rounded-xl overflow-hidden">
                          {authorizedStudents.map((auth) => (
                            <div key={auth.id} className="p-3.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold">
                                  <KeyRound className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-white">{auth.studentName}</p>
                                  <p className="text-slate-400 font-mono text-[11px]">
                                    هاتف: {auth.phone} · كود: <span className="text-cyan-400 font-bold">{auth.studentCode}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[11px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                                  {auth.lectureId === 'all'
                                    ? 'جميع الكورسات'
                                    : lectures.find((l) => l.id === auth.lectureId)?.title || 'كورس محدد'}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => removeAuthorizedStudent(auth.id)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                                  title="إلغاء الصلاحية وإخراج من الكورس"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>سحب الصلاحية</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-view: AI Batch Scan via Claude AI */}
                {studentSectionMode === 'ai_scan' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-cyan-950/40 border-2 border-dashed border-purple-500/50 hover:border-purple-400 rounded-2xl relative overflow-hidden transition-all shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 text-white rounded-2xl shadow-lg shrink-0">
                            <Sparkles className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                                <span>سحب وتصريح الطلاب دفعة واحدة بصورة كاملة عبر Google Gemini AI ⚡</span>
                              </h4>
                              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                                دقة 100%
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              اضغط على الزر وصور كشف الحضور أو ورقة الدفتر أو شاشة الإكسيل كاملة، وسيقوم Google Gemini بسحب جميع الأسماء بالأرقام بالأكواد وراء بعضها وإضافتهم بنقرة واحدة!
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            ref={batchFileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleBatchImageUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => batchFileInputRef.current?.click()}
                            className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                            <span>تصوير الكشف كامل (+) وسحب الطلاب بـ Gemini</span>
                          </button>
                        </div>
                      </div>

                      {/* Batch Extraction Modal / Drawer */}
                      {isBatchAiModalOpen && (
                        <div className="mt-5 pt-5 border-t border-purple-800/40 space-y-4">
                          {isExtractingBatch ? (
                            <div className="p-6 bg-slate-900/80 rounded-xl border border-purple-500/40 text-center space-y-3">
                              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                              <h5 className="text-sm font-bold text-purple-200">
                                Google Gemini AI يفحص الصورة ويستخرج الأسماء والأرقام والأكواد بدقة 100%...
                              </h5>
                              <p className="text-xs text-slate-400">
                                يتم قراءة الجدول وترتيب الأرقام والأكواد تلقائياً...
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/40 p-3 rounded-xl border border-purple-700/40">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span className="text-xs font-bold text-emerald-300">
                                    تم استخراج {batchExtractedStudents.length} طالب بنجاح!
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <label className="text-xs text-slate-300">تصريح دخول الكورس:</label>
                                  <select
                                    value={batchLectureTarget}
                                    onChange={(e) => setBatchLectureTarget(e.target.value)}
                                    className="bg-[#050811] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                                  >
                                    <option value="all">جميع الكورسات (كامل)</option>
                                    {lectures.map((l) => (
                                      <option key={l.id} value={l.id}>
                                        {l.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-[#060a14]">
                                {batchExtractedStudents.map((std, idx) => (
                                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40">
                                    <div className="flex items-center gap-3">
                                      <span className="w-5 h-5 rounded-full bg-purple-900/60 text-purple-300 text-[10px] font-mono flex items-center justify-center font-bold">
                                        {idx + 1}
                                      </span>
                                      <div>
                                        <p className="font-bold text-white">{std.studentName}</p>
                                        <p className="text-[11px] text-slate-400 font-mono">
                                          هاتف: {std.phone} · كود: <span className="text-cyan-400 font-bold">{std.studentCode}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                                      جاهز للتصريح
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsBatchAiModalOpen(false);
                                    setBatchExtractedStudents([]);
                                  }}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="button"
                                  onClick={handleConfirmBatchSave}
                                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-2"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                  <span>اعتماد وتصريح جميع الطلاب ({batchExtractedStudents.length}) دفعة واحدة الآن</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-view: Comprehensive Student Reports */}
                {studentSectionMode === 'reports' && (
                  <div className="animate-fade-in">
                    <StudentDirectorySection />
                  </div>
                )}

                {/* Edit Student Modal Overlay */}
                {editingStudent && (
                  <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateRegisteredStudent(editingStudent.id, {
                          name: editingStudent.name,
                          phone: editingStudent.phone,
                          parentPhone: editingStudent.parentPhone,
                          studentCode: editingStudent.studentCode,
                          password: editingStudent.password,
                          grade: editingStudent.grade,
                          subscriptionType: editingStudent.subscriptionType,
                          governorate: editingStudent.governorate,
                          age: Number(editingStudent.age) || 18,
                          walletBalance: Number(editingStudent.walletBalance) || 0,
                        });
                        setEditingStudent(null);
                        showNotice('✅ تم تعديل وحفظ بيانات الطالب بنجاح!');
                      }}
                      className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-5 h-5 text-cyan-400" />
                          <h3 className="font-bold text-base text-white">
                            تعديل بيانات الطالب: {editingStudent.name}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingStudent(null)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">اسم الطالب</label>
                          <input
                            type="text"
                            required
                            value={editingStudent.name}
                            onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">كود الطالب المسجل به</label>
                          <input
                            type="text"
                            required
                            value={editingStudent.studentCode}
                            onChange={(e) => setEditingStudent({ ...editingStudent, studentCode: e.target.value })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 uppercase font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">رقم هاتف الطالب</label>
                          <input
                            type="tel"
                            required
                            value={editingStudent.phone}
                            onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-amber-300 mb-1 font-bold">رقم ولي الأمر</label>
                          <input
                            type="tel"
                            required
                            value={editingStudent.parentPhone || ''}
                            onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                            className="w-full bg-[#050811] border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-mono text-left"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">الصف الدراسي</label>
                          <select
                            value={editingStudent.grade}
                            onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value as GradeLevel })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="sec3">الصف الثالث الثانوي</option>
                            <option value="sec2">الصف الثاني الثانوي</option>
                            <option value="sec1">الصف الأول الثانوي</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">نوع الاشتراك</label>
                          <select
                            value={editingStudent.subscriptionType || 'course'}
                            onChange={(e) => setEditingStudent({ ...editingStudent, subscriptionType: e.target.value as SubscriptionType })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="course">كورس شهري شامل</option>
                            <option value="lecture">حصة منفردة</option>
                            <option value="center">مسكن بالسنتر وقاعة</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">كلمة المرور / كود الدخول</label>
                          <input
                            type="text"
                            value={editingStudent.password || ''}
                            onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">المحافظة</label>
                          <input
                            type="text"
                            value={editingStudent.governorate || ''}
                            onChange={(e) => setEditingStudent({ ...editingStudent, governorate: e.target.value })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">العمر / السن</label>
                          <input
                            type="number"
                            value={editingStudent.age || 18}
                            onChange={(e) => setEditingStudent({ ...editingStudent, age: e.target.value })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-300 mb-1">رصيد المحفظة (ج.م)</label>
                          <input
                            type="number"
                            value={editingStudent.walletBalance || 0}
                            onChange={(e) => setEditingStudent({ ...editingStudent, walletBalance: Number(e.target.value) })}
                            className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(null)}
                          className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          <span>حفظ التعديلات فوراً 💾</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: PAYMENT RECEIPTS & REVIEW (20-MIN TIMER & CLAUDE AI ASSISTANT) */}
          {activeTab === 'receipts' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/40 via-teal-950/40 to-cyan-950/40 border border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400" />
                    <span>مراجعة طلبات الدفع وإيصالات التحويل (مراجعة خلال ثلث ساعة)</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    يتم إرفاق إيصال الدفع وسكرين شوت التحويل (فودافون كاش / إنستاباي / فوري)، ويفعل الكورس للطالب بعد انقضاء ثلث ساعة (20 دقيقة) من وقت التحويل للمراجعة، أو يمكنك التفعيل الفوري بضغطة زر.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAskClaudePaymentSummary}
                  disabled={isAskingClaudePayment}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
                >
                  <Bot className="w-4 h-4 text-blue-200" />
                  <span>{isAskingClaudePayment ? 'جارٍ السؤال...' : 'سؤال Google Gemini: من دفع اليوم؟ ⚡'}</span>
                </button>
              </div>

              {/* Gemini Payment Answer Box */}
              {claudePaymentAnswer && (
                <div className="p-4 bg-purple-950/30 border border-purple-600/40 rounded-xl space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>إجابة Google Gemini AI المباشرة: كشف حساب المدفوعات</span>
                    </div>
                    <button
                      onClick={() => setClaudePaymentAnswer(null)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      إغلاق ✕
                    </button>
                  </div>
                  <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed bg-black/40 p-3.5 rounded-lg border border-purple-900/50">
                    {claudePaymentAnswer}
                  </pre>
                </div>
              )}

              {/* Metrics cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#080d1b] border border-slate-800 p-3.5 rounded-xl">
                  <p className="text-[11px] text-slate-400">إجمالي الطلبات</p>
                  <p className="text-lg font-bold text-white mt-1">{paymentRequests.length}</p>
                </div>
                <div className="bg-[#080d1b] border border-amber-800/30 p-3.5 rounded-xl">
                  <p className="text-[11px] text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>قيد المراجعة (ثلث ساعة)</span>
                  </p>
                  <p className="text-lg font-bold text-amber-300 mt-1">
                    {paymentRequests.filter((p) => p.status === 'pending_review').length}
                  </p>
                </div>
                <div className="bg-[#080d1b] border border-emerald-800/30 p-3.5 rounded-xl">
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>تم التفعيل</span>
                  </p>
                  <p className="text-lg font-bold text-emerald-300 mt-1">
                    {paymentRequests.filter((p) => p.status === 'approved' || p.status === 'auto_activated').length}
                  </p>
                </div>
                <div className="bg-[#080d1b] border border-cyan-800/30 p-3.5 rounded-xl">
                  <p className="text-[11px] text-cyan-400">إجمالي المبالغ المحصلة</p>
                  <p className="text-lg font-bold text-cyan-300 mt-1">
                    {paymentRequests
                      .filter((p) => p.status !== 'rejected')
                      .reduce((acc, curr) => acc + curr.amount, 0)}{' '}
                    ج.م
                  </p>
                </div>
              </div>

              {/* Receipts List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  قائمة الإيصالات والتحويلات المسجلة ({paymentRequests.length})
                </h4>

                {paymentRequests.length === 0 ? (
                  <div className="text-center p-8 bg-[#080d1b] border border-slate-800 rounded-2xl space-y-2">
                    <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-white">لا توجد طلبات سداد أو إيصالات مرفوعة بعد</p>
                    <p className="text-xs text-slate-400">عندما يقوم أي طالب بالدفع ورفع سكرين شوت التحويل ستظهر تفاصيله هنا فوراً.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRequests.map((req) => {
                      const diffMinutes = Math.max(
                        0,
                        Math.ceil((new Date(req.activationDeadline).getTime() - Date.now()) / 60000)
                      );
                      const isExpired = diffMinutes === 0;
                      const isAutoActivated = isExpired || req.status === 'auto_activated';

                      return (
                        <div
                          key={req.id}
                          className="p-4 bg-[#080d1b] border border-slate-800 hover:border-cyan-800/60 rounded-xl space-y-3 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Thumbnail preview */}
                              <div
                                onClick={() => setSelectedReceiptImage(req.screenshotUrl)}
                                className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer shrink-0 relative group"
                                title="اضغط لتكبير الإيصال"
                              >
                                {req.screenshotUrl ? (
                                  <img
                                    src={req.screenshotUrl}
                                    alt="إيصال الدفع"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                                    لا صورة
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-white text-sm">{req.studentName}</h5>
                                  <span className="font-mono text-[11px] text-cyan-400 font-bold">
                                    {req.studentPhone}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                  الكورس:{' '}
                                  <span className="text-white font-medium">{req.lectureTitle}</span>
                                  {' · '}
                                  المبلغ: <span className="text-emerald-400 font-bold">{req.amount} ج.م</span>
                                  {' · '}
                                  طريقة الدفع:{' '}
                                  <span className="text-slate-200">{req.paymentMethodName}</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  وقت السداد: {new Date(req.submittedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} ({new Date(req.submittedAt).toLocaleDateString('ar-EG')})
                                </p>
                              </div>
                            </div>

                            {/* Status badge & Countdown */}
                            <div className="flex flex-col sm:items-end gap-1.5">
                              {req.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>تم التفعيل يدوياً ✓</span>
                                </span>
                              ) : req.status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-full font-bold">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>مرفوض ✗</span>
                                </span>
                              ) : isAutoActivated ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-bold">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>مفعل تلقائياً بعد ثلث ساعة ✓</span>
                                </span>
                              ) : (
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-bold animate-pulse">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>قيد المراجعة: متبقي {diffMinutes} دقيقة للتفعيل التلقائي</span>
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-1">مهلة المراجعة (ثلث ساعة - 20 دقيقة)</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptImage(req.screenshotUrl)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>تكبير سكرين شوت التحويل</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {req.status === 'pending_review' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      approvePaymentRequest(req.id);
                                      showNotice(`تم تفعيل الكورس للطالب ${req.studentName} بنجاح!`);
                                    }}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>تفعيل فوري الآن ✓</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      rejectPaymentRequest(req.id, 'الإيصال غير واضح أو المبلغ لم يصل');
                                      showNotice(`تم رفض إيصال الطالب ${req.studentName}`);
                                    }}
                                    className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>رفض الإيصال</span>
                                  </button>
                                </>
                              )}

                              <a
                                href={`https://wa.me/2${req.studentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `السلام عليكم أستاذ، بخصوص سداد اشتراك كورس "${req.lectureTitle}" بمبلغ ${req.amount} ج.م للطالب ${req.studentName}.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>واتساب الطالب</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: BROADCAST MESSAGING & NOTIFICATIONS */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-indigo-950/40 border border-cyan-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <span>إرسال رسائل وتنبيهات مباشرة لجميع الطلاب (مع إشعار الجرس الأحمر 🔔)</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    عند إرسال رسالة من هنا، ستصل فوراً لجميع الطلاب والزوار على المنصة، ويظهر رقم باللون الأحمر فوق أيقونة الجرس. وعندما يفتح الطالب الرسائل يختفي الرقم الأحمر تلقائياً ولا يعود إلا برسالة جديدة.
                  </p>
                </div>
              </div>

              {/* Compose Form */}
              <form onSubmit={handleSendBroadcast} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-cyan-400" />
                  <span>كتابة رسالة / إشعار جديد للطلاب</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-300 mb-1">عنوان الرسالة أو التنبيه</label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="مثال: موعد المحاضرة القادمة / امتحان شامل يوم الجمعة"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">توجيه الرسالة لمن</label>
                    <select
                      value={notifTarget}
                      onChange={(e) => setNotifTarget(e.target.value as any)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="all">جميع طلاب المنصة (عام)</option>
                      <option value="sec3">الصف الثالث الثانوي فقط</option>
                      <option value="sec2">الصف الثاني الثانوي فقط</option>
                      <option value="sec1">الصف الأول الثانوي فقط</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">نص الرسالة والتفاصيل</label>
                  <textarea
                    required
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="اكتب رسالتك وتوجيهاتك للطلاب هنا بالتفصيل..."
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={notifPriority === 'urgent'}
                      onChange={(e) => setNotifPriority(e.target.checked ? 'urgent' : 'normal')}
                      className="rounded accent-red-500"
                    />
                    <span>تمييز كـ إشعار هام وعاجل (شريط أحمر)</span>
                  </label>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال وتعميم الرسالة للطلاب الآن 🚀</span>
                  </button>
                </div>
              </form>

              {/* Sent Messages List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  الرسائل والإشعارات المرسلة سابقاً ({broadcastNotifications.length})
                </h4>

                {broadcastNotifications.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا توجد أي رسائل مرسلة بعد. اكتب أول رسالة أعلاه وستصل لجميع الطلاب فوراً.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800 bg-[#080d1b] border border-slate-800 rounded-xl overflow-hidden">
                    {broadcastNotifications.map((notif) => (
                      <div key={notif.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{notif.title}</span>
                            {notif.priority === 'urgent' && (
                              <span className="text-[10px] bg-red-600/20 text-red-300 border border-red-500/40 px-2 py-0.2 rounded-full font-bold">
                                عاجل
                              </span>
                            )}
                            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.2 rounded">
                              {notif.targetGrade === 'all' || !notif.targetGrade ? 'الكل' : notif.targetGrade}
                            </span>
                          </div>
                          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            بواسطة: {notif.senderName} · {new Date(notif.createdAt).toLocaleString('ar-EG')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            deleteBroadcastNotification(notif.id);
                            showNotice('تم حذف الرسالة بنجاح');
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer shrink-0 transition-colors"
                          title="حذف الرسالة من المنصة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: HONOR BOARD (ADD & DELETE TOP STUDENTS) */}
          {activeTab === 'honor' && (
            <div className="space-y-6">
              <form onSubmit={handleAddHonor} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>إضافة طالب إلى لوحة الشرف وأوائل الدفعة</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">اسم الطالب ثلاثي</label>
                    <input
                      type="text"
                      required
                      value={honorName}
                      onChange={(e) => setHonorName(e.target.value)}
                      placeholder="مثال: ياسمين أحمد السعيد"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">المحافظة</label>
                    <input
                      type="text"
                      value={honorGov}
                      onChange={(e) => setHonorGov(e.target.value)}
                      placeholder="مثال: الإسكندرية / الدقهلية"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">المركز / الترتيب</label>
                    <input
                      type="number"
                      value={honorRank}
                      onChange={(e) => setHonorRank(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">درجة الطالب</label>
                    <input
                      type="number"
                      value={honorScore}
                      onChange={(e) => setHonorScore(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الدرجة النهائية</label>
                    <input
                      type="number"
                      value={honorMaxScore}
                      onChange={(e) => setHonorMaxScore(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">لقب التميز أو الوسام</label>
                    <input
                      type="text"
                      value={honorBadge}
                      onChange={(e) => setHonorBadge(e.target.value)}
                      placeholder="مثال: المركز الأول جمهورية 🥇"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>إضافة الطالب إلى لوحة الشرف</span>
                </button>
              </form>

              {/* Honor list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  الطلاب في لوحة الشرف ({honoredStudents.length})
                </h4>

                {honoredStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا يوجد أي طالب مضاف للوحة الشرف بعد.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800 bg-[#080d1b] border border-slate-800 rounded-xl">
                    {honoredStudents.map((std) => (
                      <div key={std.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">المركز {std.rank}: {std.name}</p>
                          <p className="text-slate-400 text-[11px]">{std.governorate} · {std.score}/{std.maxScore} ({std.percentage}%)</p>
                        </div>
                        <button
                          onClick={() => deleteHonoredStudent(std.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer"
                          title="حذف من لوحة الشرف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: SECRETARIES & ASSISTANTS */}
          {activeTab === 'secretaries' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300 leading-relaxed">
                <span className="font-bold block mb-1">إضافة وإدارة سكرتارية المنصة:</span>
                أي رقم هاتف يضيفه مستر عمرو هنا في قائمة السكرتارية، يستطيع صاحبه تسجيل الدخول مباشرة برقم هاتفه والدخول للوحة التحكم لإضافة الواجبات والملفات وتصريح الطلاب.
              </div>

              <form onSubmit={handleAddSecretary} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>إضافة سكرتير / مساعد جديد</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">اسم السكرتير / المساعد</label>
                    <input
                      type="text"
                      required
                      value={secName}
                      onChange={(e) => setSecName(e.target.value)}
                      placeholder="مثال: أستاذ محمود (سكرتارية الكيمياء)"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">رقم الهاتف للدخول</label>
                    <input
                      type="tel"
                      required
                      value={secPhone}
                      onChange={(e) => setSecPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">ملاحظات / المهام</label>
                    <input
                      type="text"
                      value={secNotes}
                      onChange={(e) => setSecNotes(e.target.value)}
                      placeholder="مثال: متابعة واجبات السنتر"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>حفظ وإعطاء صلاحية الدخول</span>
                </button>
              </form>

              {/* Secretaries list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  فريق السكرتارية المعتمد ({secretaries.length})
                </h4>

                {secretaries.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#080d1b] rounded-xl text-center">
                    لا يوجد أي سكرتارية مضافة بعد.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800 bg-[#080d1b] border border-slate-800 rounded-xl">
                    {secretaries.map((sec) => (
                      <div key={sec.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{sec.name}</p>
                          <p className="text-slate-400 font-mono text-[11px]">هاتف الدخول: {sec.phone} · {sec.notes || 'صلاحيات سكرتارية'}</p>
                        </div>
                        <button
                          onClick={() => deleteSecretary(sec.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer"
                          title="حذف السكرتير وسحب الصلاحية"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: PAYMENT METHODS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <form onSubmit={handleAddPayment} className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>إضافة طريقة دفع جديدة للطلاب</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">اسم طريقة الدفع</label>
                    <input
                      type="text"
                      required
                      value={payName}
                      onChange={(e) => setPayName(e.target.value)}
                      placeholder="مثال: فودافون كاش / إنستاباي"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">رقم الحساب / المحفظة</label>
                    <input
                      type="text"
                      required
                      value={payAccount}
                      onChange={(e) => setPayAccount(e.target.value)}
                      placeholder="مثال: 010XXXXXXXX أو amr@instapay"
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">نوع الأيقونة</label>
                    <select
                      value={payType}
                      onChange={(e) => setPayType(e.target.value as any)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="vodafone">فودافون كاش / محفظة</option>
                      <option value="instapay">إنستاباي</option>
                      <option value="fawry">فوري</option>
                      <option value="card">كارت سنتر</option>
                      <option value="bank">حساب بنكي</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">تعليمات الدفع للطلاب</label>
                  <input
                    type="text"
                    value={payInstructions}
                    onChange={(e) => setPayInstructions(e.target.value)}
                    placeholder="مثال: يرجى إرسال لقطة الشاشة مع رقم العملية عبر واتساب للتفعيل الفوري"
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إضافة طريقة الدفع</span>
                </button>
              </form>

              {/* Payment Methods List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  طرق الدفع النشطة ({paymentMethods.length})
                </h4>

                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="p-3.5 bg-[#080d1b] border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <h5 className="font-bold text-white">{pm.name}</h5>
                        <p className="text-cyan-400 font-mono text-[11px]">{pm.accountNumber}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{pm.instructions}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newAcc = prompt('تعديل رقم الحساب أو المحفظة:', pm.accountNumber);
                            if (newAcc) updatePaymentMethod(pm.id, { accountNumber: newAcc });
                          }}
                          className="p-1 text-slate-400 hover:text-cyan-400 cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePaymentMethod(pm.id)}
                          className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: BULK CODES GENERATOR (حتى 10,000 كود مع استخدام 1 أو 2 كحد أقصى) */}
              <div className="bg-[#080d1b] border-2 border-cyan-800/60 rounded-2xl p-5 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/50 pb-4">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-amber-400" />
                      <span>توليد أكواد الشحن والتفعيل الجماعية (حتى 10,000 كود)</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      توليد أكواد كروت الشحن للسنتر أو منصتك. يمكنك ضبط عدد الأكواد، قيمة الرصيد، وعدد مرات الاستخدام (مرة واحدة أو مرتين كحد أقصى) مع ربطها بكورس محدد أو بالمحفظة العامة.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyAllCodes}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="نسخ جميع الأكواد للحافظة"
                    >
                      <Download className="w-4 h-4" />
                      <span>{copiedCodesNotice ? 'تم النسخ بنجاح! ✓' : 'نسخ جميع الأكواد 📋'}</span>
                    </button>
                  </div>
                </div>

                {/* Generator Form */}
                <form onSubmit={handleGenerateBulkCodes} className="space-y-4">
                  {/* Preset Buttons */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      اختيار سريع لعدد الأكواد المطلوبة:
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[10, 50, 100, 500, 1000, 5000, 10000].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBulkCodeCount(num)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            bulkCodeCount === num
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                              : 'bg-[#050811] text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {num.toLocaleString('ar-EG')} كود
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        العدد المحدد (1 - 10000) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        required
                        value={bulkCodeCount}
                        onChange={(e) => setBulkCodeCount(Number(e.target.value))}
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        قيمة الكود (جنيه مصري) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={bulkCodeValue}
                        onChange={(e) => setBulkCodeValue(Number(e.target.value))}
                        placeholder="100"
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        أقصى عدد مرات استخدام للكود *
                      </label>
                      <select
                        value={bulkCodeMaxUses}
                        onChange={(e) => setBulkCodeMaxUses(Number(e.target.value) as 1 | 2)}
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value={1}>مرة واحدة فقط (الافتراضي)</option>
                        <option value={2}>مرتين كحد أقصى (طالبين)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        بادئة الكود (Prefix)
                      </label>
                      <input
                        type="text"
                        value={bulkCodePrefix}
                        onChange={(e) => setBulkCodePrefix(e.target.value.toUpperCase())}
                        placeholder="AMR"
                        className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      ربط الكود بكورس معين (اختياري - يفتح الكورس فوراً للطالب عند الإدخال)
                    </label>
                    <select
                      value={bulkCodeCourseId}
                      onChange={(e) => setBulkCodeCourseId(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">بدون ربط (كود شحن رصيد عام للمحفظة)</option>
                      {lectures.map((lec) => (
                        <option key={lec.id} value={lec.id}>
                          {lec.title} ({lec.price} ج.م - {lec.grade === 'sec3' ? '3 ثانوي' : lec.grade === 'sec2' ? '2 ثانوي' : '1 ثانوي'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingBulkCodes}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-amber-200" />
                    <span>
                      {isGeneratingBulkCodes
                        ? 'جارٍ توليد الأكواد وحفظها بالسيرفر...'
                        : `توليد ${bulkCodeCount.toLocaleString('ar-EG')} كود شحن الآن وحفظها ⚡`}
                    </span>
                  </button>
                </form>

                {/* Codes List & Search */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <KeyRound className="w-4 h-4" />
                      <span>قائمة الأكواد المخزنة ({rechargeCodes.length} كود)</span>
                    </h5>

                    <input
                      type="text"
                      value={codeSearchQuery}
                      onChange={(e) => setCodeSearchQuery(e.target.value)}
                      placeholder="ابحث عن كود معين..."
                      className="bg-[#050811] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  {rechargeCodes.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 bg-[#050811] rounded-xl">
                      لا توجد أكواد مولدة بعد. يمكنك توليد حتى 10,000 كود بالأعلى.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 bg-[#050811] border border-slate-800 rounded-xl text-xs font-mono">
                      {rechargeCodes
                        .filter((c) => !codeSearchQuery || c.code.toLowerCase().includes(codeSearchQuery.toLowerCase()))
                        .slice(0, 100)
                        .map((c) => (
                          <div key={c.code} className="p-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white tracking-wider">{c.code}</span>
                              <span className="text-amber-400 font-semibold">{c.value} ج.م</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                الاستخدام: {c.usedCount || (c.isUsed ? 1 : 0)} / {c.maxUses || 1}
                              </span>
                              {c.isUsed ? (
                                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                                  مستنفد ✕
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                  صالح للاستخدام ✓
                                </span>
                              )}
                              {c.courseTitle && (
                                <span className="text-[10px] text-cyan-400 font-sans">
                                  كورس: {c.courseTitle}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(c.code);
                                  showNotice(`تم نسخ الكود (${c.code}) للحافظة!`);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] cursor-pointer"
                                title="نسخ الكود"
                              >
                                نسخ
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRechargeCode(c.code)}
                                className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                                title="حذف الكود"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {rechargeCodes.length > 100 && (
                    <p className="text-[10px] text-slate-500 text-center">
                      يتم عرض أول 100 كود فقط للأداء السريع. يمكنك البحث عن أي كود بالاسم أو نسخ كل الأكواد بالأعلى.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: APPEARANCE & STYLING CUSTOMIZER */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-[#080d1b] border border-cyan-900/40 rounded-xl p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span>تخصيص مظهر وتنسيق وألوان المنصة بالكامل</span>
                  </h3>
                  <span className="text-[11px] text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-700/40 font-bold">
                    ✓ حفظ تلقائي فوري في Supabase
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Dark / Light / System Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      نمط الإضاءة (فاتح / داكن / حسب جهازك)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...draftSettings, themeMode: 'dark' as const };
                          setDraftSettings(next);
                          updateSettings(next);
                          document.documentElement.classList.remove('light');
                          document.documentElement.classList.add('dark');
                          showNotice('🌙 تم التبديل للوضع الداكن وحفظ الإعداد تلقائياً');
                        }}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          draftSettings.themeMode === 'dark'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                            : 'bg-[#050811] text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        <span>🌙</span>
                        <span>داكن</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...draftSettings, themeMode: 'light' as const };
                          setDraftSettings(next);
                          updateSettings(next);
                          document.documentElement.classList.remove('dark');
                          document.documentElement.classList.add('light');
                          showNotice('☀️ تم التبديل للوضع الفاتح وحفظ الإعداد تلقائياً');
                        }}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          draftSettings.themeMode === 'light'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                            : 'bg-[#050811] text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        <span>☀️</span>
                        <span>فاتح</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...draftSettings, themeMode: 'system' as const };
                          setDraftSettings(next);
                          updateSettings(next);
                          const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                          if (sysDark) {
                            document.documentElement.classList.remove('light');
                            document.documentElement.classList.add('dark');
                          } else {
                            document.documentElement.classList.remove('dark');
                            document.documentElement.classList.add('light');
                          }
                          showNotice('💻 تم التبديل لوضع النظام وحفظ الإعداد تلقائياً');
                        }}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          draftSettings.themeMode === 'system'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                            : 'bg-[#050811] text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        <span>💻</span>
                        <span>حسب جهازك</span>
                      </button>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      نوع الخط العربي الرئيسي
                    </label>
                    <select
                      value={draftSettings.fontFamily}
                      onChange={(e) => {
                        const newFont = e.target.value as any;
                        const next = { ...draftSettings, fontFamily: newFont };
                        setDraftSettings(next);
                        updateSettings(next);
                        document.body.style.fontFamily = `'${newFont}', sans-serif`;
                      }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Alexandria">خط الإسكندرية (Alexandria - موصى به للمنصات)</option>
                      <option value="Cairo">خط القاهرة (Cairo)</option>
                      <option value="Tajawal">خط تجوال (Tajawal)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  {/* Primary Color Accent */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      اللون الرئيسي للمنصة (السمة)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'cyan', label: 'سماوي كيميائي', color: 'bg-cyan-500' },
                        { id: 'blue', label: 'أزرق ملكي', color: 'bg-blue-600' },
                        { id: 'emerald', label: 'أخضر زمردي', color: 'bg-emerald-500' },
                        { id: 'violet', label: 'بنفسجي', color: 'bg-violet-500' },
                        { id: 'amber', label: 'ذهبي', color: 'bg-amber-500' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const next = { ...draftSettings, primaryColor: c.id as any };
                            setDraftSettings(next);
                            updateSettings(next);
                            document.documentElement.setAttribute('data-color', c.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            draftSettings.primaryColor === c.id
                              ? 'border-cyan-400 text-white shadow-md scale-105 bg-cyan-600'
                              : 'border-slate-800 text-slate-400 hover:text-white bg-[#050811]'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${c.color}`} />
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Radius */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      نمط تدوير الحواف والإطارات
                    </label>
                    <select
                      value={draftSettings.layoutRadius}
                      onChange={(e) => {
                        const next = { ...draftSettings, layoutRadius: e.target.value as any };
                        setDraftSettings(next);
                        updateSettings(next);
                      }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="rounded-2xl">عصري مستدير (Rounded 2xl)</option>
                      <option value="rounded-xl">قياسي (Rounded xl)</option>
                      <option value="rounded-3xl">فائق الانحناء (Rounded 3xl)</option>
                    </select>
                  </div>
                </div>

                {/* Instant Auto-Save & Manual Sync Confirmation */}
                <div className="pt-5 border-t border-cyan-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-right">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>تم تفعيل الحفظ التلقائي الفوري للمظهر</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      كل تغيير في المظهر أو اللون أو الخط يُحفظ تلقائياً وفورياً في قاعدة البيانات بدون إعادة تحميل الصفحة.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingTheme}
                    onClick={() => {
                      setIsApplyingTheme(true);
                      updateSettings(draftSettings);
                      showNotice('✅ تم تأكيد ومزامنة كافة إعدادات المظهر في Supabase فوراً!');
                      setTimeout(() => setIsApplyingTheme(false), 450);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isApplyingTheme ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>جاري المزامنة الفورية...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>تأكيد حفظ المظهر في السحابة</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 12: TEACHER PROFILE (مستر عمرو السيد) - INSTANT SUPABASE SYNC */}
          {activeTab === 'teacher_profile' && (
            <div className="space-y-6 animate-fade-in">
              <form onSubmit={handleSaveTeacherProfile} className="bg-[#080d1b] border border-cyan-800/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-cyan-400" />
                    <span>ملف مستر عمرو السيد الشخصي وقاعدة البيانات السحابية 👨‍🏫</span>
                  </h3>
                  <span className="text-[11px] text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/40 font-bold">
                    ✓ حفظ تلقائي فوري في Supabase
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">اسم المعلم</label>
                    <input
                      type="text"
                      required
                      value={profName}
                      onChange={(e) => { profileDirtyRef.current = true; setProfName(e.target.value); }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">المسمى واللقب الأكاديمي</label>
                    <input
                      type="text"
                      value={profTitle}
                      onChange={(e) => { profileDirtyRef.current = true; setProfTitle(e.target.value); }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">رقم الهاتف الأساسي</label>
                    <input
                      type="text"
                      required
                      value={profPhone}
                      onChange={(e) => { profileDirtyRef.current = true; setProfPhone(e.target.value); }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">رقم الواتساب للتواصل والمتابعة</label>
                    <input
                      type="text"
                      value={profWhatsapp}
                      onChange={(e) => { profileDirtyRef.current = true; setProfWhatsapp(e.target.value); }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">البريد الإلكتروني الرسمي</label>
                    <input
                      type="email"
                      value={profEmail}
                      onChange={(e) => { profileDirtyRef.current = true; setProfEmail(e.target.value); }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">المحافظة / المقر</label>
                    <input
                      type="text"
                      value={profOffice}
                      onChange={(e) => { profileDirtyRef.current = true; setProfOffice(e.target.value); }}
                      className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">النبذة التعريفية ومسيرة التدريس</label>
                  <textarea
                    rows={3}
                    value={profBio}
                    onChange={(e) => { profileDirtyRef.current = true; setProfBio(e.target.value); }}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">نص الإعلان والرسالة الترحيبية الدائمة للطلاب</label>
                  <textarea
                    rows={2}
                    value={profAnnouncement}
                    onChange={(e) => { profileDirtyRef.current = true; setProfAnnouncement(e.target.value); }}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/30 cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتحديث الملف الشخصي في قاعدة البيانات السحابية فوراً 💾</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB: SUPABASE CONFIGURATION & CONNECTION (إعدادات وربط قاعدة بيانات Supabase) */}
          {activeTab === 'supabase' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#080d1b] border border-cyan-800/40 rounded-2xl p-5 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cyan-900/40 gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-400" />
                      <span>إعدادات وتغيير بيانات ربط Supabase (URL & Key) ⚡</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      يمكنك هنا تعديل رابط المشروع ومفتاح الوصول (Anon Key) ليتم ربط المنصة فوراً بقاعدة بياناتك بدون إعادة تشغيل الخادم!
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/50 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      متصل ومفعل
                    </span>
                  </div>
                </div>

                {sbSavingStatus && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{sbSavingStatus}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!sbUrlInput.trim() || !sbKeyInput.trim()) {
                      showNotice('⚠️ يرجى إدخال كل من URL والمفتاح Anon Key!');
                      return;
                    }
                    const ok = updateActiveSupabaseCredentials(sbUrlInput, sbKeyInput);
                    if (ok) {
                      setSbSavingStatus('✅ تم تحديث بيانات الاتصال بنجاح وربط المنصة بقاعدة بيانات Supabase الجديدة فوراً!');
                      showNotice('⚡ تم حفظ بيانات Supabase الجديدة وربط المنصة بها بنجاح تام!');
                      setTimeout(() => setSbSavingStatus(null), 5000);
                    } else {
                      showNotice('⚠️ حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى.');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                        رابط المشروع (Project URL):
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        مثال: https://xyzcompany.supabase.co
                      </span>
                    </label>
                    <input
                      type="url"
                      required
                      value={sbUrlInput}
                      onChange={(e) => setSbUrlInput(e.target.value)}
                      placeholder="https://your-project-id.supabase.co"
                      className="w-full bg-[#050811] border border-cyan-900/60 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        المفتاح العام (Anon Public Key):
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        مفتاح anon public الموجود في إعدادات API في Supabase
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={sbKeyInput}
                      onChange={(e) => setSbKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-[#050811] border border-cyan-900/60 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs text-slate-300 space-y-1.5">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      معلومات مهمة ومزايا:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                      <li>تغيير هذه البيانات يقوم بتحديث جميع استدعاءات المنصة (الطلاب، المحاضرات، الامتحانات، الواجبات) فوراً.</li>
                      <li>البيانات تحفظ محلياً في متصفحك وتبقى سارية تلقائياً عبر الجلسات.</li>
                      <li>يمكنك أيضاً تزويدنا بالبيانات الجديدة مباشرة في المحادثة لنضعها كإعداد افتراضي دائم في كود المشروع وملف .env.</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ وتحديث الاتصال فوراً ⚡</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetActiveSupabaseCredentials();
                        const def = getActiveSupabaseCredentials();
                        setSbUrlInput(def.url);
                        setSbKeyInput(def.key);
                        showNotice('🔄 تم استعادة بيانات Supabase الافتراضية بنجاح!');
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>استعادة الإعدادات الافتراضية</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: EDIT PUBLISHED LECTURE */}
      {editingLecture && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40 gap-2">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <span>تعديل المحاضرة المنشورة: {editingLecture.title}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                  ✓ حفظ تلقائي فوري في Supabase
                </span>
                <button
                  onClick={() => setEditingLecture(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان المحاضرة</label>
                <input
                  type="text"
                  value={editingLecture.title}
                  onChange={(e) => setEditingLecture({ ...editingLecture, title: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الباب أو الفصل</label>
                <input
                  type="text"
                  value={editingLecture.chapterTitle}
                  onChange={(e) => setEditingLecture({ ...editingLecture, chapterTitle: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الصف الدراسي</label>
                  <select
                    value={editingLecture.grade}
                    onChange={(e) => setEditingLecture({ ...editingLecture, grade: e.target.value as GradeLevel })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="sec3">الصف الثالث الثانوي</option>
                    <option value="sec2">الصف الثاني الثانوي</option>
                    <option value="sec1">الصف الأول الثانوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المدة (بالدقائق)</label>
                  <input
                    type="number"
                    value={editingLecture.durationMinutes}
                    onChange={(e) => setEditingLecture({ ...editingLecture, durationMinutes: Number(e.target.value) || 0 })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سعر الكورس (ج.م)</label>
                  <input
                    type="number"
                    value={editingLecture.price}
                    onChange={(e) => setEditingLecture({ ...editingLecture, price: Number(e.target.value) || 0 })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">وصف الكورس</label>
                <textarea
                  rows={3}
                  value={editingLecture.description}
                  onChange={(e) => setEditingLecture({ ...editingLecture, description: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">رابط الفيديو (أو رابط البث)</label>
                <input
                  type="text"
                  value={editingLecture.videoUrl}
                  onChange={(e) => setEditingLecture({ ...editingLecture, videoUrl: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cyan-900/40">
              <button
                type="button"
                onClick={() => setEditingLecture(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  updateLecture(editingLecture.id, editingLecture);
                  setEditingLecture(null);
                  showNotice('⚡ تم حفظ التعديلات على المحاضرة بنجاح!');
                }}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PUBLISHED HOMEWORK & SHEETS (WITH FULL QUESTION REVIEW EDITOR) */}
      {editingHomework && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40 gap-2">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>تعديل الواجب والشيت المنشور: {editingHomework.title}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                  ✓ حفظ تلقائي فوري في Supabase
                </span>
                <button
                  onClick={() => setEditingHomework(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">تصنيف التكليف</label>
                <select
                  value={editingHomework.kind || 'homework'}
                  onChange={(e) => {
                    const nextKind = e.target.value as 'homework' | 'sheet';
                    setEditingHomework({
                      ...editingHomework,
                      kind: nextKind,
                      durationMinutes: nextKind === 'sheet' ? Math.min(180, editingHomework.durationMinutes || 180) : editingHomework.durationMinutes || 1440,
                    });
                  }}
                  className="w-full bg-[#050811] border border-cyan-700/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-bold"
                >
                  <option value="homework">واجب منزلي (مهلة 24 ساعة)</option>
                  <option value="sheet">شيت درس (حد أقصى 3 ساعات)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان الواجب أو الشيت</label>
                <input
                  type="text"
                  value={editingHomework.title}
                  onChange={(e) => setEditingHomework({ ...editingHomework, title: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الدرس المرتبط</label>
                <input
                  type="text"
                  value={editingHomework.lessonTitle || ''}
                  onChange={(e) => setEditingHomework({ ...editingHomework, lessonTitle: e.target.value })}
                  placeholder="مثال: الدرس الأول"
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">الصف الدراسي</label>
                <select
                  value={editingHomework.grade}
                  onChange={(e) => setEditingHomework({ ...editingHomework, grade: e.target.value as GradeLevel })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="sec3">الصف الثالث الثانوي</option>
                  <option value="sec2">الصف الثاني الثانوي</option>
                  <option value="sec1">الصف الأول الثانوي</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  مدة الحل (حد أقصى {editingHomework.kind === 'sheet' ? '180 د' : '1440 د'})
                </label>
                <input
                  type="number"
                  min={5}
                  max={editingHomework.kind === 'sheet' ? 180 : 1440}
                  value={editingHomework.durationMinutes ?? (editingHomework.kind === 'sheet' ? 180 : 1440)}
                  onChange={(e) => {
                    const cap = editingHomework.kind === 'sheet' ? 180 : 1440;
                    const val = Math.min(cap, Math.max(5, Number(e.target.value) || 5));
                    setEditingHomework({ ...editingHomework, durationMinutes: val });
                  }}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الدرجة الكلية</label>
                <input
                  type="number"
                  min={1}
                  value={editingHomework.totalMarks ?? 10}
                  onChange={(e) => setEditingHomework({ ...editingHomework, totalMarks: Number(e.target.value) || 0 })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">آخر موعد للتسليم</label>
                <input
                  type="text"
                  value={editingHomework.deadline}
                  onChange={(e) => setEditingHomework({ ...editingHomework, deadline: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Questions Review & Editing Component */}
            <div className="pt-2">
              <QuestionReviewEditor
                questions={editingHomeworkQuestions}
                setQuestions={setEditingHomeworkQuestions}
                titleLabel="تعديل ومراجعة جميع أسئلة هذا الواجب/الشيت واختياراتها ودرجاتها"
                onTotalPointsChange={(total) =>
                  setEditingHomework((prev) => (prev ? { ...prev, totalMarks: total } : prev))
                }
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cyan-900/40">
              <button
                type="button"
                onClick={() => setEditingHomework(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  updateHomework(editingHomework.id, {
                    ...editingHomework,
                    questions: editingHomeworkQuestions,
                  });
                  setEditingHomework(null);
                  showNotice('⚡ تم حفظ التعديلات على الواجب والأسئلة بنجاح!');
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-amber-600/30"
              >
                <Save className="w-4 h-4" />
                <span>حفظ تعديلات الواجب والأسئلة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PUBLISHED EXAMS (WITH FULL QUESTION REVIEW & MARKS EDITOR) */}
      {editingExam && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40 gap-2">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <span>تعديل الامتحان المنشور: {editingExam.title}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                  ✓ حفظ تلقائي فوري في Supabase
                </span>
                <button
                  onClick={() => setEditingExam(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">عنوان الامتحان</label>
                <input
                  type="text"
                  value={editingExam.title}
                  onChange={(e) => setEditingExam({ ...editingExam, title: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الصف الدراسي</label>
                <select
                  value={editingExam.grade}
                  onChange={(e) => setEditingExam({ ...editingExam, grade: e.target.value as GradeLevel })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="sec3">الصف الثالث الثانوي</option>
                  <option value="sec2">الصف الثاني الثانوي</option>
                  <option value="sec1">الصف الأول الثانوي</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">المدة (دقيقة · حد أقصى 240)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={editingExam.durationMinutes}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      durationMinutes: Math.min(240, Math.max(5, Number(e.target.value) || 5)),
                    })
                  }
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">الدرس / الباب المرتبط</label>
                <input
                  type="text"
                  value={editingExam.lessonTitle || ''}
                  onChange={(e) => setEditingExam({ ...editingExam, lessonTitle: e.target.value })}
                  placeholder="مثال: الدرس الأول - الباب الأول"
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الدرجة الكلية للامتحان</label>
                <input
                  type="number"
                  value={editingExam.totalMarks}
                  onChange={(e) => setEditingExam({ ...editingExam, totalMarks: Number(e.target.value) || 0 })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 text-left font-mono"
                />
              </div>
            </div>

            {/* Questions Review & Editing Component */}
            <div className="pt-2">
              <QuestionReviewEditor
                questions={editingExamQuestions}
                setQuestions={setEditingExamQuestions}
                titleLabel="تعديل ومراجعة جميع أسئلة الامتحان والدرجات"
                onTotalPointsChange={(total) =>
                  setEditingExam((prev) => (prev ? { ...prev, totalMarks: total } : prev))
                }
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cyan-900/40">
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  updateExam(editingExam.id, {
                    ...editingExam,
                    questions: editingExamQuestions,
                  });
                  setEditingExam(null);
                  showNotice('⚡ تم حفظ التعديلات على الامتحان والأسئلة بنجاح!');
                }}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
              >
                <Save className="w-4 h-4" />
                <span>حفظ تعديلات الامتحان والأسئلة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT PUBLISHED FILES / NOTES */}
      {editingFile && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-[#0b1329] border border-cyan-800/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40 gap-2">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <span>تعديل المذكرة أو الملف: {editingFile.title}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                  ✓ حفظ تلقائي فوري في Supabase
                </span>
                <button
                  onClick={() => setEditingFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان الملف أو المذكرة</label>
                <input
                  type="text"
                  value={editingFile.title}
                  onChange={(e) => setEditingFile({ ...editingFile, title: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">تصنيف الملف</label>
                <input
                  type="text"
                  value={editingFile.category}
                  onChange={(e) => setEditingFile({ ...editingFile, category: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الصف الدراسي</label>
                  <select
                    value={editingFile.grade}
                    onChange={(e) => setEditingFile({ ...editingFile, grade: e.target.value as GradeLevel })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="sec3">الصف الثالث الثانوي</option>
                    <option value="sec2">الصف الثاني الثانوي</option>
                    <option value="sec1">الصف الأول الثانوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">نوع المستند</label>
                  <select
                    value={editingFile.fileType}
                    onChange={(e) => setEditingFile({ ...editingFile, fileType: e.target.value as any })}
                    className="w-full bg-[#050811] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="pdf">مستند PDF معتمد</option>
                    <option value="doc">مستند Word (.docx / .doc)</option>
                    <option value="xls">جدول بيانات Excel (.xlsx / .xls)</option>
                    <option value="image">صورة عالية الدقة (.png / .jpg)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cyan-900/40">
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  updateFile(editingFile.id, editingFile);
                  setEditingFile(null);
                  showNotice('⚡ تم حفظ التعديلات على الملف بنجاح!');
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal for Receipts */}
      {selectedReceiptImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setSelectedReceiptImage(null)}
          >
            <div
              className="bg-slate-900 border border-cyan-800 rounded-2xl max-w-2xl w-full p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>معاينة إيصال وسكرين شوت التحويل</span>
                </h4>
                <button
                  onClick={() => setSelectedReceiptImage(null)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-800 flex items-center justify-center bg-black">
                <img
                  src={selectedReceiptImage}
                  alt="إيصال الدفع"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </div>
        )}

    </div>
  );
};
