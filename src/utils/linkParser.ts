/**
 * linkParser.ts
 * 
 * Pure client-side Regex Link Parser for YouTube and Google Drive.
 * NO fetch calls. NO external network requests.
 * Extracts provider, external_id, original_url, and direct embed URLs.
 */

export interface ParsedLinkSuccess {
  isValid: true;
  provider: 'youtube' | 'drive';
  external_id: string;
  id: string; // alias for external_id
  original_url: string;
  embed_url: string;
  embedUrl: string; // alias for embed_url
  previewUrl: string; // alias for Google Drive preview
  clean_display_url: string;
  error?: undefined;
  titleSuggestion?: string;
}

export interface ParsedLinkFailure {
  isValid: false;
  provider: 'unknown';
  external_id?: undefined;
  id?: undefined;
  original_url: string;
  embed_url: string;
  embedUrl: string;
  previewUrl: string;
  clean_display_url: string;
  error: string;
  titleSuggestion?: undefined;
}

export type ParsedLinkResult = ParsedLinkSuccess | ParsedLinkFailure;

/**
 * Validates and parses YouTube URLs using strict regex only:
 * - youtube.com (with or without www.), m.youtube.com, music.youtube.com, youtube-nocookie.com, youtu.be
 * - watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, /live/ID, /v/ID
 * - Extra query parameters (?si=, &t=, &list=, etc.)
 */
export function parseYouTubeUrl(input: string): ParsedLinkResult {
  const raw = (input || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!raw) {
    return {
      isValid: false,
      provider: 'unknown',
      original_url: '',
      embed_url: '',
      embedUrl: '',
      previewUrl: '',
      clean_display_url: '',
      error: 'الرجاء إدخال رابط فيديو يوتيوب',
    };
  }

  // Regex covering youtu.be/ID and (www.|m.|music.)youtube(-nocookie).com/(watch?v=|embed/|shorts/|live/|v/)ID with any query params (?si=, &t=, &list=, etc.)
  const ytRegex = /^(?:https?:\/\/)?(?:(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\/?\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?=[?&#/\s]|$)/i;
  const match = raw.match(ytRegex);

  if (match && match[1]) {
    const id = match[1];
    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?controls=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&cc_load_policy=0`;
    const cleanDisplayUrl = `https://www.youtube.com/watch?v=${id}`;

    return {
      isValid: true,
      provider: 'youtube',
      external_id: id,
      id,
      original_url: raw,
      embed_url: embedUrl,
      embedUrl,
      previewUrl: embedUrl,
      clean_display_url: cleanDisplayUrl,
      titleSuggestion: `محاضرة يوتيوب (${id})`,
    };
  }

  return {
    isValid: false,
    provider: 'unknown',
    original_url: raw,
    embed_url: '',
    embedUrl: '',
    previewUrl: '',
    clean_display_url: raw,
    error: 'عذراً، صيغة رابط يوتيوب غير صالحة. يرجى إدخال رابط يوتيوب صحيح (مثال: watch?v=ID أو youtu.be/ID أو /shorts/ID أو /embed/ID)',
  };
}

/**
 * Validates and parses Google Drive URLs using strict regex only:
 * - /file/d/ID
 * - ?id=ID or &id=ID
 * - /open?id=ID
 * - docs.google.com/.../d/ID
 */
export function parseDriveUrl(input: string): ParsedLinkResult {
  const raw = (input || '').trim();
  if (!raw) {
    return {
      isValid: false,
      provider: 'unknown',
      original_url: '',
      embed_url: '',
      embedUrl: '',
      previewUrl: '',
      clean_display_url: '',
      error: 'الرجاء إدخال رابط جوجل درايف',
    };
  }

  // Regex covering /file/d/ID, ?id=ID, /open?id=ID, /download?id=ID, docs.google.com/.../d/ID
  const driveRegex = /(?:(?:drive\.google\.com|drive\.usercontent\.google\.com)\/(?:file\/d\/|open\?id=|uc\?id=|download\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/i;
  const match = raw.match(driveRegex);

  if (match && match[1]) {
    const id = match[1];
    const embedUrl = `https://drive.google.com/file/d/${id}/preview`;
    const cleanDisplayUrl = `https://drive.google.com/file/d/${id}/view`;

    return {
      isValid: true,
      provider: 'drive',
      external_id: id,
      id,
      original_url: raw,
      embed_url: embedUrl,
      embedUrl,
      previewUrl: embedUrl,
      clean_display_url: cleanDisplayUrl,
      titleSuggestion: `مستند جوجل درايف (${id.substring(0, 8)})`,
    };
  }

  return {
    isValid: false,
    provider: 'unknown',
    original_url: raw,
    embed_url: '',
    embedUrl: '',
    previewUrl: '',
    clean_display_url: raw,
    error: 'عذراً، صيغة رابط جوجل درايف غير صالحة. يرجى إدخال رابط درايف صحيح (مثال: /file/d/ID أو /open?id=ID أو ?id=ID)',
  };
}

/**
 * Extracts Google Drive FILE_ID and converts share/download links to the official
 * Google Drive iframe preview URL: https://drive.google.com/file/d/FILE_ID/preview
 */
export function convertGoogleDriveLink(url: string): string {
  const raw = (url || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!raw) return raw;
  const regex = /(?:\/d\/|id=)([a-zA-Z0-9_-]{10,})/i;
  const match = raw.match(regex);
  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return raw;
}

/**
 * Parses video URLs supporting BOTH YouTube and Google Drive share/direct links.
 * Keeps YouTube detection identical, and converts Google Drive videos to /preview iframe URL.
 */
export function parseVideoUrl(input: string): ParsedLinkResult {
  const raw = (input || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!raw) {
    return {
      isValid: false,
      provider: 'unknown',
      original_url: '',
      embed_url: '',
      embedUrl: '',
      previewUrl: '',
      clean_display_url: '',
      error: 'الرجاء إدخال رابط فيديو يوتيوب أو جوجل درايف',
    };
  }

  // 1. Try YouTube first
  const ytResult = parseYouTubeUrl(raw);
  if (ytResult.isValid) {
    return ytResult;
  }

  // 2. Try Google Drive video link
  if (/drive\.google\.com|drive\.usercontent\.google\.com/i.test(raw)) {
    const driveResult = parseDriveUrl(raw);
    if (driveResult.isValid) {
      const previewUrl = `https://drive.google.com/file/d/${driveResult.id}/preview`;
      return {
        isValid: true,
        provider: 'drive',
        external_id: driveResult.id,
        id: driveResult.id,
        original_url: raw,
        embed_url: previewUrl,
        embedUrl: previewUrl,
        previewUrl,
        clean_display_url: `https://drive.google.com/file/d/${driveResult.id}/view`,
        titleSuggestion: `محاضرة جوجل درايف (${driveResult.id.substring(0, 8)})`,
      };
    }
  }

  return {
    isValid: false,
    provider: 'unknown',
    original_url: raw,
    embed_url: '',
    embedUrl: '',
    previewUrl: '',
    clean_display_url: raw,
    error: '⚠️ صيغة الرابط غير صحيحة. يرجى إدخال رابط يوتيوب (watch?v= أو youtu.be/ أو /shorts/) أو رابط جوجل درايف (/file/d/ID أو ?id=ID).',
  };
}

/**
 * Universal parser checking both YouTube and Drive
 */
export function parseUniversalLink(input: string, expectedType: 'video' | 'file'): ParsedLinkResult {
  if (expectedType === 'video') {
    return parseVideoUrl(input);
  } else {
    return parseDriveUrl(input);
  }
}
