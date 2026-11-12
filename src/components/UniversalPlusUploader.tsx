import React, { useState, useRef, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { ProgressPayload } from '../utils/realUploader';
import {
  uploadToStorageWithFallback,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  SUPABASE_BUCKET_NAME,
} from '../utils/supabaseStorage';
import { GradeLevel } from '../types';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Video,
  FileSpreadsheet,
  Image,
  Sparkles,
  HardDrive,
  RefreshCw,
  Plus,
  Cloud,
  Settings,
  Database,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';

interface UniversalPlusUploaderProps {
  onUploadComplete?: (uploadedFile: {
    url: string;
    fileName: string;
    fileSize: string;
    fileType: 'video' | 'pdf' | 'doc' | 'xls' | 'image' | 'other';
    storageProvider?: 'supabase' | 'server';
  }) => void;
  defaultCategory?: string;
  className?: string;
}

export const UniversalPlusUploader: React.FC<UniversalPlusUploaderProps> = ({
  onUploadComplete,
  defaultCategory = 'عام',
  className = '',
}) => {
  const { addLecture, addFile, currentUser, activeGrade } = usePlatform();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [progress, setProgress] = useState<ProgressPayload>({
    percent: 0,
    loadedFormatted: '0 B',
    totalFormatted: '0 B',
    speed: '0 KB/ث',
    remaining: 'ثوانٍ معدودة',
    rawLoaded: 0,
    rawTotal: 0,
  });
  const [lastUploaded, setLastUploaded] = useState<{
    url: string;
    name: string;
    size: string;
    type: string;
    provider?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Supabase Configuration Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    const cfg = getStoredSupabaseConfig();
    if (cfg) {
      setSupabaseUrl(cfg.supabaseUrl);
      setSupabaseAnonKey(cfg.supabaseAnonKey);
      setHasConfig(true);
    }
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      alert('يرجى إدخال كلٍ من رابط مشروع Supabase والمفتاح Anon Key');
      return;
    }
    saveStoredSupabaseConfig({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      bucketName: SUPABASE_BUCKET_NAME,
    });
    setHasConfig(true);
    setIsConfigOpen(false);
    alert('تم حفظ وتفعيل ربط مساحة التخزين في Supabase (Bucket: platform-files) بنجاح!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(
        `⚠️ حجم الملف (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد الأقصى المسموح للرفع المباشر (50 ميجابايت). يُرجى استخدام خيار الإضافة بالرابط (YouTube للفيديوهات أو Google Drive للمذكرات) لتوفير المساحة وتشغيل سريع وفوري.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCurrentFileName(file.name);
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(`جاري رفع وحفظ (${file.name}) إلى مساحة التخزين الدائمة...`);

    const inferredType: 'video' | 'pdf' | 'doc' | 'xls' | 'image' | 'other' =
      file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mkv|mov|avi)$/i)
        ? 'video'
        : file.name.endsWith('.pdf') || file.type === 'application/pdf'
        ? 'pdf'
        : file.name.match(/\.(xlsx|xls|csv)$/i)
        ? 'xls'
        : file.name.match(/\.(docx|doc)$/i)
        ? 'doc'
        : file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
        ? 'image'
        : 'other';

    uploadToStorageWithFallback(
      file,
      (p) => {
        setProgress(p);
      },
      (res) => {
        setIsUploading(false);
        setStatusMessage('تم الرفع والحفظ الدائم بنجاح!');
        setLastUploaded({
          url: res.url,
          name: res.fileName,
          size: res.fileSize,
          type: inferredType,
          provider: res.storageProvider === 'supabase' ? 'Supabase Storage (platform-files)' : 'السيرفر السحابي الدائم',
        });

        // Automatically persist into the correct collection in Firestore & platform
        const gradeToUse: GradeLevel = currentUser?.grade ? currentUser.grade : (activeGrade === 'all' ? 'sec3' : activeGrade);

        if (inferredType === 'video') {
          addLecture({
            title: file.name.replace(/\.[^/.]+$/, ''),
            chapterTitle: 'محاضرات مرفوعة حديثاً',
            grade: gradeToUse,
            durationMinutes: 45,
            videoUrl: res.url,
            videoFileName: res.fileName,
            videoFileSize: res.fileSize,
            description: `محاضرة فيديو مرفوعة بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
            price: 0,
            isFree: true,
          });
        } else {
          addFile({
            title: file.name.replace(/\.[^/.]+$/, ''),
            category: defaultCategory,
            grade: gradeToUse,
            fileUrl: res.url,
            fileName: res.fileName,
            fileType: inferredType as any,
            sizeMb: parseFloat(res.fileSize.replace(' MB', '')) || 2,
            description: `ملف مرفوع بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
          });
        }

        if (onUploadComplete) {
          onUploadComplete({
            url: res.url,
            fileName: res.fileName,
            fileSize: res.fileSize,
            fileType: inferredType,
            storageProvider: res.storageProvider,
          });
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      (err) => {
        setIsUploading(false);
        setErrorMessage(err);
        setStatusMessage(null);
      }
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Storage Status Badge & Config Toggle */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <span>
            {hasConfig ? 'مربوط بـ Supabase Storage (Bucket: platform-files)' : 'مساحة تخزين سحابية نشطة (Bucket: platform-files)'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700 cursor-pointer transition-colors"
          title="إعدادات مفاتيح Supabase Storage"
        >
          <Settings className="w-3 h-3 text-cyan-400" />
          <span>إعدادات Supabase</span>
        </button>
      </div>

      {/* Interactive Plus Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-cyan-700/60 hover:border-cyan-400 bg-[#091326] hover:bg-[#0c1830] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group shadow-lg flex flex-col items-center justify-center gap-2 select-none"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        <div className="w-16 h-16 rounded-full bg-cyan-950/80 border-2 border-cyan-500/50 flex items-center justify-center group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-md shadow-cyan-500/20">
          <Plus className="w-8 h-8 text-cyan-400 font-bold" />
        </div>

        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
          اضغط لرفع أي ملف أو فيديو للسيرفر الدائم (+)
        </h4>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          يدعم فيديوهات 4K، مذكرات PDF، شيتات إكسل Word، وصور الواجبات مع شريط تقدم ونسبة مئوية دقيقة % وحفظ دائم في قاعدة البيانات.
        </p>

        <div className="flex items-center gap-2 text-[11px] text-cyan-400/90 font-medium mt-1">
          <HardDrive className="w-3.5 h-3.5" />
          <span>تخزين سحابي مباشر ودائم دون انقطاع · روابط ثابتة للأبد</span>
        </div>
      </div>

      {/* Real Live Progress Bar with % and transferred MB */}
      {isUploading && (
        <div className="p-4 bg-[#060b18] border border-cyan-800/60 rounded-2xl space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white line-clamp-1 max-w-[70%]">
              {statusMessage || `جاري رفع: ${currentFileName}`}
            </span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {progress.percent}%
            </span>
          </div>

          {/* Progress Track */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              {progress.loadedFormatted} من {progress.totalFormatted}
            </span>
            <span>السرعة: {progress.speed}</span>
            <span>المتبقي: {progress.remaining}</span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {lastUploaded && !isUploading && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-white block truncate">{lastUploaded.name}</span>
              <span className="text-[11px] text-emerald-300">
                تم الرفع والحفظ الدائم بنجاح ({lastUploaded.size}) · {lastUploaded.provider}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0 border border-emerald-500/30">
            جاهز ومحفوظ
          </span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 bg-red-950/70 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Supabase Storage Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091224] border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-7 w-full max-w-lg space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Database className="w-5 h-5" />
                <span>إعدادات تخزين Supabase Storage (Bucket: {SUPABASE_BUCKET_NAME})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يمكنك ربط مشروع Supabase الخاص بك لحفظ روابط الفيديوهات وملفات الـ PDF والصور بشكل دائم في الـ Bucket المسمى <code className="text-cyan-300 font-mono bg-cyan-950 px-1.5 py-0.5 rounded">platform-files</code>:
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  رابط مشروع Supabase (Project URL):
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  المفتاح العام (anon / public Key):
                </label>
                <textarea
                  rows={3}
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-[11px] text-cyan-200/90 space-y-1">
                <div className="flex items-center gap-1 font-bold text-cyan-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ملاحظة أمان وتوافق:</span>
                </div>
                <p>
                  يتم حفظ المفاتيح محلياً على جهازك، وفي حال عدم إدخالها يعمل النظام تلقائياً عبر السيرفر السحابي الدائم ويحفظ روابط الملفات في Cloud Firestore للأبد.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
                >
                  حفظ وتفعيل التخزين الدائم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
