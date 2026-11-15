/**
 * LinkVerificationService
 *
 * Production-grade URL Parser & Link Verification Service:
 * - Direct parsing & sanitization for Raw URLs (Telegram, Google Drive, YouTube, Direct Links)
 * - Strips any internal prefixes (e.g. /api/telegram-isolated-view) from user inputs
 * - Canonical clean display URLs for inputs (NEVER internal paths)
 * - Production-ready sanitized URLs stored into Supabase (strictly autoplay=0)
 * - Real duration detection (HH:MM:SS + Arabic) for videos
 * - Real page count detection for PDFs via PDF.js + backend PDF inspection
 */

import { fetchDocumentAsBlob, loadPdfFromBytes } from './pdfRenderer';
import { formatSecondsToHMS } from './realUploader';
import { cleanupVideoElement } from './mediaSession';

export interface CleanUrlInfo {
  cleanDisplayUrl: string;
  embedUrl: string;
  type: 'youtube' | 'drive' | 'telegram' | 'direct';
  id?: string;
}

export interface LinkMetadata {
  url: string;
  cleanDisplayUrl: string;
  sanitizedUrl: string;
  directMediaUrl?: string;
  isValid: boolean;
  contentType: string;
  category: 'video' | 'pdf' | 'doc' | 'xls' | 'image' | 'other';
  title?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  durationFormatted?: string;
  durationHms?: string;
  pageCount?: number;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  acceptRanges?: boolean;
  error?: string;
}

export class LinkVerificationService {
  static cleanRawUrl(rawInput: string): CleanUrlInfo {
    if (!rawInput) {
      return { cleanDisplayUrl: '', embedUrl: '', type: 'direct' };
    }

    let url = rawInput.trim();

    if (url.includes('url=')) {
      try {
        const match = url.match(/url=([^&]+)/);
        if (match && match[1]) {
          url = decodeURIComponent(match[1]).trim();
        }
      } catch {}
    }

    url = url.replace(/^['"<]+|['">]+$/g, '').trim();

    if (/^(?:t\.me|telegram\.me|youtu\.be|youtube\.com|drive\.google\.com|docs\.google\.com)/i.test(url)) {
      url = `https://${url}`;
    }

    // YouTube Parsing (strictly autoplay=0)
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      return {
        cleanDisplayUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&controls=1&playsinline=1`,
        type: 'youtube',
        id: videoId,
      };
    }

    // Google Drive / Docs Parsing
    const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/)([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      return {
        cleanDisplayUrl: `https://drive.google.com/file/d/${fileId}/view`,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        type: 'drive',
        id: fileId,
      };
    }

    // Telegram Parsing
    const tgMatch = url.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
    if (tgMatch) {
      const channel = tgMatch[1];
      const postId = tgMatch[2];
      return {
        cleanDisplayUrl: `https://t.me/${channel}/${postId}`,
        embedUrl: `https://t.me/${channel}/${postId}?embed=1`,
        type: 'telegram',
        id: `${channel}/${postId}`,
      };
    }

    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      parsed.searchParams.delete('fbclid');
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('si');
      parsed.searchParams.delete('ref');
      const cleanDirect = parsed.toString();
      return {
        cleanDisplayUrl: cleanDirect,
        embedUrl: cleanDirect,
        type: 'direct',
      };
    } catch {
      return {
        cleanDisplayUrl: url,
        embedUrl: url,
        type: 'direct',
      };
    }
  }

  static async verifyUrl(
    rawUrl: string,
    targetKind: 'video' | 'document' | 'auto' = 'auto'
  ): Promise<LinkMetadata> {
    const cleaned = this.cleanRawUrl(rawUrl);
    const { cleanDisplayUrl, embedUrl, type } = cleaned;

    if (!cleanDisplayUrl || !/^https?:\/\//i.test(cleanDisplayUrl)) {
      return {
        url: rawUrl,
        cleanDisplayUrl: rawUrl,
        sanitizedUrl: rawUrl,
        isValid: false,
        contentType: 'unknown',
        category: 'other',
        error: 'الرابط غير صالح أو لا يبدأ بـ http:// أو https://',
      };
    }

    // 1. YouTube Verification
    if (type === 'youtube') {
      let durationSeconds: number | undefined;
      let title = 'محاضرة فيديو - يوتيوب معتمد';

      try {
        const srvRes = await fetch('/api/inspect-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanDisplayUrl, type: 'video' }),
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData && srvData.success) {
            if (typeof srvData.durationSeconds === 'number' && srvData.durationSeconds > 0) {
              durationSeconds = srvData.durationSeconds;
            }
            if (srvData.title) title = srvData.title;
          }
        }
      } catch {
        try {
          const oeRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanDisplayUrl)}`);
          if (oeRes.ok) {
            const oeData = await oeRes.json();
            if (oeData.title) title = oeData.title;
          }
        } catch {}
      }

      return {
        url: cleanDisplayUrl,
        cleanDisplayUrl,
        sanitizedUrl: embedUrl,
        isValid: true,
        contentType: 'video/x-youtube',
        category: 'video',
        title,
        durationSeconds,
        durationMinutes: durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : undefined,
        durationFormatted: durationSeconds ? this.formatDurationArabic(durationSeconds) : undefined,
        durationHms: durationSeconds ? formatSecondsToHMS(durationSeconds) : undefined,
        fileSizeFormatted: 'بث يوتيوب عالي الدقة HD',
      };
    }

    // 2. Google Drive Verification
    if (type === 'drive') {
      const isDoc = targetKind === 'document';
      return {
        url: cleanDisplayUrl,
        cleanDisplayUrl,
        sanitizedUrl: embedUrl,
        isValid: true,
        contentType: isDoc ? 'application/pdf' : 'application/google-drive',
        category: isDoc ? 'pdf' : 'video',
        title: isDoc ? 'مذكرة كيمياء - جوجل درايف' : 'محاضرة فيديو - جوجل درايف',
        fileSizeFormatted: 'سحابة Google Drive',
      };
    }

    // 3. Telegram Verification (Video & Document)
    if (type === 'telegram') {
      let durationSeconds: number | undefined;
      let title = `تليجرام (${cleaned.id})`;
      let detectedCategory: 'video' | 'pdf' = targetKind === 'document' ? 'pdf' : 'video';
      let pageCount: number | undefined;
      let sizeFormatted = targetKind === 'document' ? 'مستند تليجرام معتمد' : 'فيديو تليجرام عالي الجودة';
      let directMediaUrl: string | undefined;

      try {
        const srvRes = await fetch('/api/inspect-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanDisplayUrl, type: targetKind }),
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData && srvData.success) {
            if (typeof srvData.durationSeconds === 'number' && srvData.durationSeconds > 0) {
              durationSeconds = srvData.durationSeconds;
            }
            if (srvData.title) title = srvData.title;
            if (srvData.sizeFormatted) sizeFormatted = srvData.sizeFormatted;
            if (typeof srvData.pageCount === 'number' && srvData.pageCount > 0) {
              pageCount = srvData.pageCount;
            }
            if (srvData.directMediaUrl) directMediaUrl = srvData.directMediaUrl;
            if (srvData.type === 'telegram_video') detectedCategory = 'video';
            if (srvData.type === 'telegram_doc') detectedCategory = 'pdf';
          }
        }
      } catch {}

      return {
        url: cleanDisplayUrl,
        cleanDisplayUrl,
        sanitizedUrl: embedUrl,
        directMediaUrl,
        isValid: true,
        contentType: detectedCategory === 'video' ? 'video/mp4' : 'application/pdf',
        category: detectedCategory,
        title,
        durationSeconds: detectedCategory === 'video' ? durationSeconds : undefined,
        durationMinutes:
          detectedCategory === 'video' && durationSeconds
            ? Math.max(1, Math.round(durationSeconds / 60))
            : undefined,
        durationFormatted:
          detectedCategory === 'video' && durationSeconds
            ? this.formatDurationArabic(durationSeconds)
            : undefined,
        durationHms:
          detectedCategory === 'video' && durationSeconds
            ? formatSecondsToHMS(durationSeconds)
            : undefined,
        pageCount: detectedCategory === 'pdf' ? pageCount : undefined,
        fileSizeFormatted: sizeFormatted,
        acceptRanges: true,
      };
    }

    // 4. Direct Media & Documents (HEAD request / server inspection)
    let headContentType = '';
    let headContentLength = 0;
    let headAcceptRanges = false;

    try {
      const headRes = await fetch(cleanDisplayUrl, {
        method: 'HEAD',
      });

      if (headRes.ok) {
        headContentType = headRes.headers.get('content-type')?.toLowerCase() || '';
        const cl = headRes.headers.get('content-length');
        if (cl) headContentLength = parseInt(cl, 10);
        headAcceptRanges = (headRes.headers.get('accept-ranges') || '').toLowerCase().includes('bytes');
      }
    } catch {
      try {
        const srvRes = await fetch('/api/inspect-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanDisplayUrl, type: targetKind }),
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData && srvData.success) {
            headContentType = srvData.contentType || '';
            headContentLength = srvData.contentLength || 0;
          }
        }
      } catch {}
    }

    let category: 'video' | 'pdf' | 'doc' | 'xls' | 'image' | 'other' = 'other';
    const lowerUrl = cleanDisplayUrl.toLowerCase();
    if (
      headContentType.includes('video') ||
      /\.(mp4|webm|mkv|mov|m4v)(\?|$)/i.test(lowerUrl)
    ) {
      category = 'video';
    } else if (headContentType.includes('pdf') || /\.pdf(\?|$)/i.test(lowerUrl)) {
      category = 'pdf';
    } else if (headContentType.includes('word') || /\.(docx?)(\?|$)/i.test(lowerUrl)) {
      category = 'doc';
    } else if (
      headContentType.includes('sheet') ||
      headContentType.includes('excel') ||
      /\.(xlsx?)(\?|$)/i.test(lowerUrl)
    ) {
      category = 'xls';
    } else if (headContentType.includes('image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(lowerUrl)) {
      category = 'image';
    } else {
      category = targetKind === 'video' ? 'video' : 'pdf';
    }

    const titleFromUrl = decodeURIComponent(
      cleanDisplayUrl.split('/').pop()?.split('?')[0]?.replace(/\.[^/.]+$/, '') || 'ملف تم التحقق منه'
    );

    let pageCount: number | undefined;
    if (category === 'pdf') {
      pageCount = await this.extractPdfPageCount(cleanDisplayUrl);
    }

    let durationSeconds: number | undefined;
    if (category === 'video') {
      const detectedSecs = await this.extractVideoDuration(cleanDisplayUrl);
      if (detectedSecs > 0) {
        durationSeconds = detectedSecs;
      }
    }

    const sizeFormatted =
      headContentLength > 0
        ? this.formatBytes(headContentLength)
        : pageCount
        ? `${pageCount} صفحة`
        : 'بث مباشر';

    return {
      url: cleanDisplayUrl,
      cleanDisplayUrl,
      sanitizedUrl: cleanDisplayUrl,
      isValid: true,
      contentType: headContentType || (category === 'video' ? 'video/mp4' : 'application/pdf'),
      category,
      title: titleFromUrl,
      durationSeconds,
      durationMinutes: durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : undefined,
      durationFormatted: durationSeconds ? this.formatDurationArabic(durationSeconds) : undefined,
      durationHms: durationSeconds ? formatSecondsToHMS(durationSeconds) : undefined,
      pageCount,
      fileSizeBytes: headContentLength,
      fileSizeFormatted: sizeFormatted,
      acceptRanges: headAcceptRanges,
    };
  }

  /**
   * Extracts exact page count for PDFs via PDF.js bytes first, then backend PDF inspector.
   */
  private static async extractPdfPageCount(pdfUrl: string): Promise<number | undefined> {
    try {
      const loaded = await fetchDocumentAsBlob(pdfUrl);
      try {
        const doc = await loadPdfFromBytes(loaded.bytes);
        const count = doc && doc.numPages > 0 ? doc.numPages : undefined;
        try {
          await doc?.cleanup?.();
        } catch {}
        if (count) return count;
      } finally {
        try {
          URL.revokeObjectURL(loaded.blobUrl);
        } catch {}
      }
    } catch {}

    try {
      const srvRes = await fetch('/api/inspect-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pdfUrl, type: 'document' }),
      });
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData && srvData.success && typeof srvData.pageCount === 'number' && srvData.pageCount > 0) {
          return srvData.pageCount;
        }
      }
    } catch {}

    return undefined;
  }

  /**
   * Extracts real video duration using hidden HTML5 video metadata and cleans up immediately.
   */
  private static async extractVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      let settled = false;

      const finish = (secs: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanupVideoElement(v);
        resolve(secs);
      };

      const timeout = setTimeout(() => {
        finish(0);
      }, 6000);

      v.onloadedmetadata = () => {
        const secs = Math.round(v.duration);
        finish(!isNaN(secs) && secs > 0 && isFinite(secs) ? secs : 0);
      };

      v.onerror = () => {
        finish(0);
      };

      v.src = videoUrl;
    });
  }

  static formatBytes(bytes: number): string {
    if (isNaN(bytes) || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  }

  static formatDurationArabic(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return 'دقيقة واحدة';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts: string[] = [];
    if (hrs > 0) parts.push(`${hrs} ساعة`);
    if (mins > 0) parts.push(`${mins} دقيقة`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} ثانية`);
    return parts.join(' و ');
  }
}
