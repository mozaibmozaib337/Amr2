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

function formatRemainingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'أقل من ثانية';
  const total = Math.ceil(seconds);
  if (total < 60) return `${total} ث`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return secs > 0 ? `${mins} د ${secs} ث` : `${mins} دقيقة`;
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
 * Direct browser-to-Supabase Storage upload via XMLHttpRequest with genuine byte progress.
 * Strictly uses 'Files' or 'Lectures' (case-sensitive).
 * Never uses blob:, base64, localStorage, or proxy routes.
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

  let authToken = creds.key;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      authToken = sessionData.session.access_token;
    }
  } catch {
    // Fallback to anon key if no active user session token
  }

  const baseUrl = creds.url.replace(/\/+$/, '');
  const encodedPath = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
  const uploadEndpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
  const startedAt = Date.now();

  options?.onProgress?.({
    percent: 0,
    loadedFormatted: '0 B',
    totalFormatted,
    speed: 'جارِ بدء النقل...',
    remaining: 'جارِ الحساب...',
    rawLoaded: 0,
    rawTotal: file.size,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let abortPollTimer: ReturnType<typeof setInterval> | null = null;
    let settled = false;

    const finishReject = (err: Error) => {
      if (settled) return;
      settled = true;
      if (abortPollTimer) clearInterval(abortPollTimer);
      reject(err);
    };

    const finishResolve = () => {
      if (settled) return;
      settled = true;
      if (abortPollTimer) clearInterval(abortPollTimer);
      resolve();
    };

    if (options?.signal) {
      abortPollTimer = setInterval(() => {
        if (options.signal?.aborted) {
          try {
            xhr.abort();
          } catch {}
          finishReject(new Error('تم إلغاء عملية الرفع.'));
        }
      }, 200);
    }

    xhr.open('POST', uploadEndpoint, true);
    xhr.setRequestHeader('apikey', creds.key);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (ev: ProgressEvent) => {
      if (options?.signal?.aborted) {
        try {
          xhr.abort();
        } catch {}
        return;
      }
      const total = ev.lengthComputable && ev.total > 0 ? ev.total : file.size || 1;
      const loaded = Math.min(ev.loaded, total);
      const rawPct = total > 0 ? Math.round((loaded / total) * 100) : 0;
      const percent = Math.min(99, Math.max(0, rawPct));
      const elapsedSec = Math.max(0.15, (Date.now() - startedAt) / 1000);
      const speedBps = loaded / elapsedSec;
      const speedStr = speedBps > 0 ? `${formatFileSize(speedBps)}/ث` : 'جارِ النقل...';
      const remainingSec = speedBps > 0 ? (total - loaded) / speedBps : 0;

      options?.onProgress?.({
        percent,
        loadedFormatted: formatFileSize(loaded),
        totalFormatted: formatFileSize(total),
        speed: speedStr,
        remaining: loaded >= total ? 'جاري التأكيد...' : formatRemainingTime(remainingSec),
        rawLoaded: loaded,
        rawTotal: total,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finishResolve();
        return;
      }

      let realErrorMessage = `HTTP ${xhr.status} (${xhr.statusText || 'Upload Failed'})`;
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        realErrorMessage =
          parsed.message ||
          parsed.error_description ||
          parsed.error ||
          realErrorMessage;
      } catch {
        if (xhr.responseText) {
          realErrorMessage = `${realErrorMessage}: ${xhr.responseText.slice(0, 180)}`;
        }
      }

      console.error('[Supabase Storage Upload Failed]', {
        bucket,
        path,
        status: xhr.status,
        fileName: file.name,
        contentType,
        realErrorMessage,
      });
      finishReject(new Error(`${bucket}/${path}: ${realErrorMessage}`));
    };

    xhr.onerror = () => {
      const msg = `تعذر الاتصال بـ Supabase Storage (${bucket}/${path}) — تحقق من الشبكة أو صلاحيات الـ Bucket.`;
      console.error('[Supabase Storage Network Error]', { bucket, path, fileName: file.name });
      finishReject(new Error(msg));
    };

    xhr.onabort = () => {
      finishReject(new Error('تم إلغاء عملية الرفع.'));
    };

    xhr.send(file);
  });

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  const publicUrl = publicUrlData?.publicUrl || '';
  if (!publicUrl) {
    const urlErr = `تم الرفع إلى ${bucket}/${path} لكن تعذر جلب الرابط العام (getPublicUrl).`;
    console.error('[Supabase Storage PublicUrl Error]', { bucket, path });
    throw new Error(urlErr);
  }

  const diagnosticMessage = `تم الرفع إلى ${bucket}/${path}`;
  console.log('[Supabase Storage Upload Success]', {
    diagnosticMessage,
    bucket,
    path,
    publicUrl,
  });

  options?.onProgress?.({
    percent: 100,
    loadedFormatted: totalFormatted,
    totalFormatted,
    speed: 'مكتمل',
    remaining: '0 ثانية',
    rawLoaded: file.size,
    rawTotal: file.size,
  });

  return {
    url: publicUrl,
    bucket,
    path,
    fileName: file.name,
    fileSize: totalFormatted,
    sizeBytes: file.size,
    diagnosticMessage,
    storageProvider: 'supabase',
  };
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
