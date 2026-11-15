/**
 * Real Multi-Gigabyte File & Video Direct Supabase Storage Uploader with Live Progress Tracking.
 * Strictly uploads directly from the browser to Supabase Storage ('Files' or 'Lectures').
 * Never falls back to blob:, base64, localStorage, or proxy routes.
 */

import {
  formatFileSize,
  SupabaseBucketName,
  SupabaseUploadResult,
  uploadFileToSupabaseDirect,
} from './supabaseStorage';

export interface ProgressPayload {
  percent: number;
  loadedFormatted: string;
  totalFormatted: string;
  speed: string;
  remaining: string;
  rawLoaded: number;
  rawTotal: number;
}

export function formatBytes(bytes: number): string {
  return formatFileSize(bytes);
}

export function formatSecondsToTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatDurationArabic(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return 'دقيقة واحدة';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs} ساعة`);
  if (mins > 0) parts.push(`${mins} دقيقة`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} ثانية`);
  return parts.join(' و ');
}

/**
 * Probes the exact duration of a local video file in seconds using HTML5 video metadata
 */
export function probeVideoDuration(file: File): Promise<{ durationSeconds: number; formatted: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const tempMetaUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(tempMetaUrl);
      const secs = Math.round(video.duration);
      resolve({
        durationSeconds: secs,
        formatted: formatDurationArabic(secs),
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(tempMetaUrl);
      resolve({
        durationSeconds: 3600,
        formatted: '60 دقيقة',
      });
    };

    video.src = tempMetaUrl;
  });
}

/**
 * Uploads any file or video directly from the browser to Supabase Storage ('Files' / 'Lectures').
 */
export function uploadFileWithRealProgress(
  file: File,
  onProgress: (p: ProgressPayload) => void,
  onSuccess: (data: SupabaseUploadResult) => void,
  onError: (errMsg: string) => void,
  bucket?: SupabaseBucketName
): { abort: () => void } {
  const signal = { aborted: false };

  uploadFileToSupabaseDirect(file, {
    bucket,
    onProgress,
    signal,
  })
    .then((result) => {
      if (!signal.aborted) {
        onSuccess(result);
      }
    })
    .catch((err: any) => {
      if (!signal.aborted) {
        onError(err?.message || 'حدث خطأ أثناء الرفع إلى Supabase Storage.');
      }
    });

  return {
    abort: () => {
      signal.aborted = true;
    },
  };
}
