import React, { useState, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { ProgressPayload } from '../utils/realUploader';
import {
  SUPABASE_FILES_BUCKET,
  SUPABASE_LECTURES_BUCKET,
  uploadFileToSupabaseDirect,
} from '../utils/supabaseStorage';
import { GradeLevel } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Plus,
  Cloud,
} from 'lucide-react';

interface UniversalPlusUploaderProps {
  onUploadComplete?: (uploadedFile: {
    url: string;
    fileName: string;
    fileSize: string;
    fileType: 'video' | 'pdf' | 'doc' | 'xls' | 'image' | 'other';
    storageProvider?: 'supabase' | 'server';
    bucket?: string;
    path?: string;
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
    diagnosticMessage: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(
        `⚠️ حجم الملف (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد الأقصى المسموح للرفع المباشر (50 ميجابايت). يُرجى استخدام خيار الإضافة بالرابط.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const inferredType: 'video' | 'pdf' | 'doc' | 'xls' | 'image' | 'other' =
      file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mkv|mov|avi|m4v)$/i)
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

    const targetBucket =
      inferredType === 'video' ? SUPABASE_LECTURES_BUCKET : SUPABASE_FILES_BUCKET;

    setCurrentFileName(file.name);
    setIsUploading(true);
    setErrorMessage(null);
    setLastUploaded(null);
    setStatusMessage(`جاري الرفع المباشر إلى Supabase (${targetBucket})...`);

    try {
      const uploaded = await uploadFileToSupabaseDirect(file, {
        bucket: targetBucket,
        onProgress: (p) => setProgress(p),
      });

      const gradeToUse: GradeLevel =
        activeGrade !== 'all'
          ? activeGrade
          : currentUser?.grade || 'sec3';

      if (inferredType === 'video') {
        const dbRes = await addLecture({
          title: file.name.replace(/\.[^/.]+$/, ''),
          chapterTitle: 'محاضرات مرفوعة حديثاً',
          grade: gradeToUse,
          durationMinutes: 45,
          videoUrl: uploaded.url,
          videoFileName: uploaded.fileName,
          videoFileSize: uploaded.fileSize,
          description: `محاضرة فيديو مرفوعة بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
          price: 0,
          isFree: true,
          provider: 'other',
          original_url: uploaded.url,
        });

        if (dbRes && !dbRes.success) {
          throw new Error(
            dbRes.errorMessage || 'تم رفع الفيديو للتخزين لكن فشل حفظه في جدول الكورسات.'
          );
        }
      } else {
        const dbRes = await addFile({
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: defaultCategory,
          grade: gradeToUse,
          fileUrl: uploaded.url,
          fileName: uploaded.fileName,
          fileType: inferredType as any,
          sizeMb: parseFloat(uploaded.fileSize.replace(' MB', '')) || 1,
          description: `ملف مرفوع بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
          provider: 'other',
          original_url: uploaded.url,
        });

        if (dbRes && !dbRes.success) {
          throw new Error(
            dbRes.errorMessage || 'تم رفع الملف للتخزين لكن فشل حفظه في جدول الملفات.'
          );
        }
      }

      setIsUploading(false);
      setStatusMessage(uploaded.diagnosticMessage);
      setLastUploaded({
        url: uploaded.url,
        name: uploaded.fileName,
        size: uploaded.fileSize,
        type: inferredType,
        diagnosticMessage: uploaded.diagnosticMessage,
      });

      if (onUploadComplete) {
        onUploadComplete({
          url: uploaded.url,
          fileName: uploaded.fileName,
          fileSize: uploaded.fileSize,
          fileType: inferredType,
          storageProvider: 'supabase',
          bucket: uploaded.bucket,
          path: uploaded.path,
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'فشل الرفع المباشر إلى Supabase Storage.';
      console.error('[UniversalPlusUploader Error]:', err);
      setIsUploading(false);
      setErrorMessage(msg);
      setStatusMessage(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <span>
            رفع مباشر إلى Supabase Storage (Files للملفات · Lectures للفيديوهات)
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Interactive Plus Upload Area */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
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
          اضغط لرفع أي ملف أو فيديو مباشرة إلى Supabase (+)
        </h4>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          يرفع الفيديوهات إلى bucket (Lectures) والملفات والمذكرات إلى bucket (Files) مع شريط تقدم ونسبة مئوية % وحفظ فوري بالرابط العام.
        </p>

        <div className="flex items-center gap-2 text-[11px] text-cyan-400/90 font-medium mt-1">
          <HardDrive className="w-3.5 h-3.5" />
          <span>رفع مباشر من المتصفح · روابط Supabase دائمة</span>
        </div>
      </div>

      {/* Real Live Progress Bar */}
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
            <div className="min-w-0">
              <span className="font-bold text-white block truncate">{lastUploaded.name}</span>
              <span className="text-[11px] text-emerald-300 block truncate">
                {lastUploaded.diagnosticMessage} ({lastUploaded.size})
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0 border border-emerald-500/30">
            تم الحفظ ⚡
          </span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 bg-red-950/70 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="break-all">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
