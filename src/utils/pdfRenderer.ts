import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getSupabase } from '../services/supabaseService';
import { parseDriveUrl } from './linkParser';

let workerConfigured = false;
function ensurePdfWorkerConfigured() {
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    workerConfigured = true;
  }
}

export type DocumentKind = 'drive' | 'pdf' | 'image' | 'office' | 'iframe';

export interface ClassifiedDocument {
  rawUrl: string;
  embedUrl: string;
  kind: DocumentKind;
  driveId: string;
  isDrive: boolean;
  isSupabaseStorage: boolean;
  mimeHint: string;
}

export function unwrapFileUrl(input?: string | null): string {
  let raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.includes('url=')) {
    try {
      const match = raw.match(/[?&]url=([^&]+)/);
      if (match && match[1]) {
        raw = decodeURIComponent(match[1]);
      }
    } catch {
      // ignore malformed query
    }
  }
  return raw.trim();
}

export function extractDriveFileId(rawUrl: string): string {
  const parsed = parseDriveUrl(rawUrl);
  if (parsed.isValid) return parsed.id;
  const fallbackMatch = rawUrl.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^#]*id=|download\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/i
  );
  return fallbackMatch?.[1] || '';
}

export function classifyDocument(
  fileUrl: string,
  fileName?: string,
  fileType?: string
): ClassifiedDocument {
  const rawUrl = unwrapFileUrl(fileUrl);
  const cleanLower = rawUrl.split('?')[0].toLowerCase();
  const fileNameLower = String(fileName || '').toLowerCase();
  const typeLower = String(fileType || '').toLowerCase();

  const driveId = extractDriveFileId(rawUrl);
  const isDrive =
    Boolean(driveId) || /drive\.google\.com|docs\.google\.com/i.test(rawUrl);

  const isSupabaseStorage = /supabase\.co\/storage\/v1\/object\//i.test(rawUrl);

  if (isDrive) {
    const previewUrl = driveId
      ? `https://drive.google.com/file/d/${driveId}/preview`
      : rawUrl.replace(/\/view(\?.*)?$/, '/preview');
    return {
      rawUrl,
      embedUrl: previewUrl,
      kind: 'drive',
      driveId,
      isDrive: true,
      isSupabaseStorage: false,
      mimeHint: 'application/pdf',
    };
  }

  const isImage =
    typeLower === 'image' ||
    rawUrl.startsWith('data:image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(cleanLower) ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileNameLower);

  if (isImage) {
    return {
      rawUrl,
      embedUrl: rawUrl,
      kind: 'image',
      driveId: '',
      isDrive: false,
      isSupabaseStorage,
      mimeHint: 'image/*',
    };
  }

  const isOffice =
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(typeLower) ||
    /\.(docx?|xlsx?|pptx?)$/i.test(cleanLower) ||
    /\.(docx?|xlsx?|pptx?)$/i.test(fileNameLower);

  if (isOffice) {
    const isHttpPublic = /^https?:\/\//i.test(rawUrl);
    return {
      rawUrl,
      embedUrl: isHttpPublic
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`
        : rawUrl,
      kind: 'office',
      driveId: '',
      isDrive: false,
      isSupabaseStorage,
      mimeHint: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  const isPdf =
    typeLower === 'pdf' ||
    rawUrl.startsWith('data:application/pdf') ||
    cleanLower.endsWith('.pdf') ||
    fileNameLower.endsWith('.pdf') ||
    rawUrl.startsWith('/uploads/') ||
    rawUrl.startsWith('blob:') ||
    isSupabaseStorage;

  if (isPdf) {
    return {
      rawUrl,
      embedUrl: rawUrl,
      kind: 'pdf',
      driveId: '',
      isDrive: false,
      isSupabaseStorage,
      mimeHint: 'application/pdf',
    };
  }

  return {
    rawUrl,
    embedUrl: rawUrl,
    kind: 'iframe',
    driveId: '',
    isDrive: false,
    isSupabaseStorage,
    mimeHint: 'application/octet-stream',
  };
}

export function dataUrlToBytesAndBlob(dataUrl: string): {
  bytes: Uint8Array;
  blob: Blob;
  mimeType: string;
} {
  const headerMatch = dataUrl.match(/^data:([^;]+);base64,/i);
  const mimeType = headerMatch?.[1] || 'application/pdf';
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/i, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return { bytes, blob, mimeType };
}

async function resolveSupabaseSignedUrl(rawUrl: string): Promise<string | null> {
  try {
    const match = rawUrl.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/i
    );
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    const objectPath = decodeURIComponent(match[2]);
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 300);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // ignore signed url fallback errors
  }
  return null;
}

export interface LoadedBinaryDocument {
  bytes: Uint8Array;
  blob: Blob;
  blobUrl: string;
  mimeType: string;
}

/**
 * Fetches an uploaded / Supabase / data / blob file cleanly inside the app into memory
 * and converts it into a Blob + object URL so it never opens a new tab or leaks raw paths.
 */
export async function fetchDocumentAsBlob(
  rawUrl: string,
  fallbackMime = 'application/pdf'
): Promise<LoadedBinaryDocument> {
  if (!rawUrl) {
    throw new Error('رابط الملف غير متوفر.');
  }

  if (rawUrl.startsWith('data:')) {
    const { bytes, blob, mimeType } = dataUrlToBytesAndBlob(rawUrl);
    const blobUrl = URL.createObjectURL(blob);
    return { bytes, blob, blobUrl, mimeType };
  }

  let targetFetchUrl = rawUrl;
  let response = await fetch(targetFetchUrl, { credentials: 'omit' }).catch(() => null);

  if ((!response || !response.ok) && /supabase\.co\/storage\/v1\/object\//i.test(rawUrl)) {
    const signedUrl = await resolveSupabaseSignedUrl(rawUrl);
    if (signedUrl) {
      targetFetchUrl = signedUrl;
      response = await fetch(targetFetchUrl, { credentials: 'omit' }).catch(() => null);
    }
  }

  if (!response || !response.ok) {
    const statusCode = response ? ` (${response.status})` : '';
    throw new Error(`تعذر تحميل الملف من الخادم${statusCode}. تأكد من اتصال الإنترنت ثم أعد المحاولة.`);
  }

  const buffer = await response.arrayBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('الملف الذي تم استلامه فارغ أو تالف.');
  }

  const mimeType = response.headers.get('content-type') || fallbackMime;
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);

  return { bytes, blob, blobUrl, mimeType };
}

/**
 * Loads a PDFDocumentProxy from raw bytes with full Arabic CMap + standard font support
 * and disableFontFace: false so embedded Arabic glyphs render sharply on canvas.
 */
export async function loadPdfFromBytes(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  ensurePdfWorkerConfigured();
  const dataCopy = new Uint8Array(bytes);
  const loadingTask = pdfjsLib.getDocument({
    data: dataCopy,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    disableFontFace: false,
    useSystemFonts: false,
  });
  return loadingTask.promise;
}

/**
 * Safe in-app file download without calling window.open or target="_blank".
 */
export async function downloadDocumentSafely(
  rawUrl: string,
  fileName: string,
  existingBlobUrl?: string | null
): Promise<void> {
  if (typeof document === 'undefined' || !rawUrl) return;
  const cleanName = fileName || 'document.pdf';
  const driveId = extractDriveFileId(rawUrl);

  if (existingBlobUrl) {
    const a = document.createElement('a');
    a.href = existingBlobUrl;
    a.download = cleanName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (driveId) {
    const hiddenFrame = document.createElement('iframe');
    hiddenFrame.style.display = 'none';
    hiddenFrame.src = `https://drive.google.com/uc?export=download&id=${driveId}`;
    document.body.appendChild(hiddenFrame);
    setTimeout(() => {
      try {
        document.body.removeChild(hiddenFrame);
      } catch {
        // ignore
      }
    }, 15000);
    return;
  }

  try {
    const loaded = await fetchDocumentAsBlob(rawUrl);
    const a = document.createElement('a');
    a.href = loaded.blobUrl;
    a.download = cleanName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(loaded.blobUrl), 5000);
  } catch {
    const a = document.createElement('a');
    a.href = rawUrl;
    a.download = cleanName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
