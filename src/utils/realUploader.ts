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
import { loadPdfFromBytes } from './pdfRenderer';
import { cleanupVideoElement } from './mediaSession';

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

export function formatSecondsToHMS(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00:00';
  }
  const total = Math.floor(totalSeconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
 * and cleanly releases the temporary video element afterwards.
 */
export function probeVideoDuration(
  file: File
): Promise<{ durationSeconds: number; formatted: string; hms: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const tempMetaUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      cleanupVideoElement(video);
      try {
        URL.revokeObjectURL(tempMetaUrl);
      } catch {}
    };

    const done = (secs: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      if (secs > 0) {
        resolve({
          durationSeconds: secs,
          formatted: formatDurationArabic(secs),
          hms: formatSecondsToHMS(secs),
        });
      } else {
        resolve({
          durationSeconds: 0,
          formatted: '',
          hms: '',
        });
      }
    };

    const timeoutId = setTimeout(() => done(0), 8000);

    video.onloadedmetadata = () => {
      const secs = Math.round(video.duration);
      done(Number.isFinite(secs) && secs > 0 ? secs : 0);
    };

    video.onerror = () => {
      done(0);
    };

    video.src = tempMetaUrl;
  });
}

/**
 * Reads exact page count of a local PDF file using PDF.js.
 */
export async function probePdfPageCount(file: File): Promise<number | null> {
  const isPdf =
    file.type === 'application/pdf' ||
    /\.pdf$/i.test(file.name);
  if (!isPdf) return null;

  try {
    const buffer = await file.arrayBuffer();
    const doc = await loadPdfFromBytes(new Uint8Array(buffer));
    const count = doc && typeof doc.numPages === 'number' && doc.numPages > 0 ? doc.numPages : null;
    try {
      await doc?.cleanup?.();
    } catch {}
    return count;
  } catch (err) {
    console.warn('[PDF Page Count Probe] failed:', err);
    return null;
  }
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
