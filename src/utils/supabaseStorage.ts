import type { ProgressPayload } from './realUploader';
import {
  getActiveSupabaseCredentials,
  getSupabase,
} from '../services/supabaseService';

export const SUPABASE_FILES_BUCKET = 'Files' as const;
export const SUPABASE_LECTURES_BUCKET = 'Lectures' as const;
export type SupabaseBucketName =
  | typeof SUPABASE_FILES_BUCKET
  | typeof SUPABASE_LECTURES_BUCKET;

export interface SupabaseUploadResult {
  url: string;
  bucket: SupabaseBucketName;
  path: string;
  fileName: string;
  fileSize: string;
  sizeBytes: number;
  diagnosticMessage: string;
  storageProvider: 'supabase';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function resolveTargetBucket(
  file: Pick<File, 'name' | 'type'>,
  explicitBucket?: SupabaseBucketName
): SupabaseBucketName {
  if (explicitBucket === SUPABASE_FILES_BUCKET || explicitBucket === SUPABASE_LECTURES_BUCKET) {
    return explicitBucket;
  }
  const isVideo =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|mkv|mov|avi|m4v|3gp)$/i.test(file.name);
  return isVideo ? SUPABASE_LECTURES_BUCKET : SUPABASE_FILES_BUCKET;
}

/**
 * Builds a unique ASCII English-only object key without spaces.
 */
export function buildUniqueEnglishStoragePath(fileName: string): string {
  const dotIdx = fileName.lastIndexOf('.');
  const rawExt = dotIdx > 0 ? fileName.slice(dotIdx + 1) : '';
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const rawBase = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const englishBase =
    rawBase
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'file';
  const rand = Math.random().toString(36).slice(2, 7);
  return `${Date.now()}_${rand}_${englishBase}.${cleanExt}`;
}

/**
 * Direct browser-to-Supabase Storage upload (strictly uses 'Files' or 'Lectures').
 * Never falls back to blob:, base64, localStorage, or proxy routes.
 */
export async function uploadFileToSupabaseDirect(
  file: File,
  options?: {
    bucket?: SupabaseBucketName;
    onProgress?: (payload: ProgressPayload) => void;
    signal?: { aborted: boolean };
  }
): Promise<SupabaseUploadResult> {
  const bucket = resolveTargetBucket(file, options?.bucket);
  const path = buildUniqueEnglishStoragePath(file.name);
  const totalFormatted = formatFileSize(file.size);
  const contentType = file.type || 'application/octet-stream';

  const creds = getActiveSupabaseCredentials();
  const supabase = getSupabase();

  if (!supabase || !creds.url || !creds.key) {
    const configErr = new Error(
      'بيانات اتصال Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) غير متوفرة.'
    );
    console.error('[Supabase Storage Upload Error]', {
      bucket,
      path,
      error: configErr.message,
    });
    throw configErr;
  }

  let simulatedPercent = 8;
  const startedAt = Date.now();

  const emitProgress = (percent: number, speedText: string, remainingText: string) => {
    const rawLoaded = Math.round((file.size * percent) / 100);
    options?.onProgress?.({
      percent,
      loadedFormatted: formatFileSize(rawLoaded),
      totalFormatted,
      speed: speedText,
      remaining: remainingText,
      rawLoaded,
      rawTotal: file.size,
    });
  };

  emitProgress(simulatedPercent, 'اتصال بـ Supabase...', 'جارِ التقدير...');

  const progressTimer = setInterval(() => {
    if (options?.signal?.aborted) {
      clearInterval(progressTimer);
      return;
    }
    const elapsedSec = Math.max(0.5, (Date.now() - startedAt) / 1000);
    simulatedPercent = Math.min(92, simulatedPercent + (simulatedPercent < 50 ? 9 : 4));
    const estimatedBytes = (file.size * simulatedPercent) / 100;
    const speedBps = estimatedBytes / elapsedSec;
    const speedStr = `${formatFileSize(speedBps)}/ث`;
    const remainingSec = speedBps > 0 ? Math.max(1, Math.round((file.size - estimatedBytes) / speedBps)) : 5;
    emitProgress(simulatedPercent, speedStr, `${remainingSec} ث`);
  }, 350);

  try {
    console.log('[Supabase Storage Upload Start]', {
      bucket,
      path,
      fileName: file.name,
      fileSize: file.size,
      contentType,
      supabaseUrl: creds.url,
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        contentType,
      });

    clearInterval(progressTimer);

    if (options?.signal?.aborted) {
      throw new Error('تم إلغاء عملية الرفع.');
    }

    if (error || !data?.path) {
      const realErrorMessage =
        error?.message ||
        (error as any)?.error_description ||
        (error as any)?.error ||
        (!data?.path ? 'لم يرجع Supabase مسار الملف المرفوع' : 'فشل الرفع إلى Supabase Storage');

      console.error('[Supabase Storage Upload Failed]', {
        bucket,
        path,
        fileName: file.name,
        contentType,
        error,
        realErrorMessage,
      });

      throw new Error(`${bucket}/${path}: ${realErrorMessage}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData?.publicUrl || '';
    if (!publicUrl) {
      const urlErr = `تم الرفع إلى ${bucket}/${data.path} لكن تعذر جلب الرابط العام (getPublicUrl).`;
      console.error('[Supabase Storage PublicUrl Error]', { bucket, path: data.path });
      throw new Error(urlErr);
    }

    const diagnosticMessage = `تم الرفع إلى ${bucket}/${data.path}`;
    console.log('[Supabase Storage Upload Success]', {
      diagnosticMessage,
      bucket,
      path: data.path,
      publicUrl,
    });

    emitProgress(100, 'مكتمل', '0 ثانية');

    return {
      url: publicUrl,
      bucket,
      path: data.path,
      fileName: file.name,
      fileSize: totalFormatted,
      sizeBytes: file.size,
      diagnosticMessage,
      storageProvider: 'supabase',
    };
  } catch (err: any) {
    clearInterval(progressTimer);
    console.error('[Supabase Storage Upload Exception]', {
      bucket,
      path,
      fileName: file.name,
      err,
    });
    throw err instanceof Error ? err : new Error(String(err || 'فشل الرفع إلى Supabase'));
  }
}

export function getStoredSupabaseConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const creds = getActiveSupabaseCredentials();
  return {
    supabaseUrl: creds.url,
    supabaseAnonKey: creds.key,
  };
}

export async function uploadToStorageWithFallback(
  file: File,
  onProgress: (p: ProgressPayload) => void,
  onSuccess: (data: SupabaseUploadResult) => void,
  onError: (errMsg: string) => void,
  bucket?: SupabaseBucketName
) {
  try {
    const result = await uploadFileToSupabaseDirect(file, {
      bucket,
      onProgress,
    });
    onSuccess(result);
  } catch (err: any) {
    onError(err?.message || 'فشل الرفع المباشر إلى Supabase Storage');
  }
}
