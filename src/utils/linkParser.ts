/**
 * linkParser.ts
 * 
 * Pure client-side Regex Link Parser for YouTube and Google Drive.
 * NO fetch calls. NO external network requests.
 * Extracts provider, external_id, original_url, and direct embed URLs.
 */

export interface ParsedLinkResult {
  isValid: boolean;
  provider: 'youtube' | 'drive' | 'unknown';
  external_id?: string;
  original_url: string;
  embed_url: string;
  clean_display_url: string;
  error?: string;
  titleSuggestion?: string;
}

/**
 * Validates and parses YouTube URLs using strict regex only:
 * - watch?v=ID
 * - youtu.be/ID
 * - /embed/ID
 * - /shorts/ID
 */
export function parseYouTubeUrl(input: string): ParsedLinkResult {
  const raw = (input || '').trim();
  if (!raw) {
    return {
      isValid: false,
      provider: 'unknown',
      original_url: '',
      embed_url: '',
      clean_display_url: '',
      error: 'الرجاء إدخال رابط فيديو يوتيوب',
    };
  }

  // Regex covering watch?v=ID, youtu.be/ID, embed/ID, shorts/ID, v/ID
  const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/i;
  const match = raw.match(ytRegex);

  if (match && match[1]) {
    const id = match[1];
    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?controls=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&cc_load_policy=0`;
    const cleanDisplayUrl = `https://www.youtube.com/watch?v=${id}`;

    return {
      isValid: true,
      provider: 'youtube',
      external_id: id,
      original_url: raw,
      embed_url: embedUrl,
      clean_display_url: cleanDisplayUrl,
      titleSuggestion: `محاضرة يوتيوب (${id})`,
    };
  }

  return {
    isValid: false,
    provider: 'unknown',
    original_url: raw,
    embed_url: '',
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
      clean_display_url: '',
      error: 'الرجاء إدخال رابط جوجل درايف',
    };
  }

  // Regex covering /file/d/ID, ?id=ID, /open?id=ID, docs.google.com/.../d/ID
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/i;
  const match = raw.match(driveRegex);

  if (match && match[1]) {
    const id = match[1];
    const embedUrl = `https://drive.google.com/file/d/${id}/preview`;
    const cleanDisplayUrl = `https://drive.google.com/file/d/${id}/view`;

    return {
      isValid: true,
      provider: 'drive',
      external_id: id,
      original_url: raw,
      embed_url: embedUrl,
      clean_display_url: cleanDisplayUrl,
      titleSuggestion: `مستند جوجل درايف (${id.substring(0, 8)})`,
    };
  }

  return {
    isValid: false,
    provider: 'unknown',
    original_url: raw,
    embed_url: '',
    clean_display_url: raw,
    error: 'عذراً، صيغة رابط جوجل درايف غير صالحة. يرجى إدخال رابط درايف صحيح (مثال: /file/d/ID أو /open?id=ID أو ?id=ID)',
  };
}

/**
 * Universal parser checking both YouTube and Drive
 */
export function parseUniversalLink(input: string, expectedType: 'video' | 'file'): ParsedLinkResult {
  if (expectedType === 'video') {
    return parseYouTubeUrl(input);
  } else {
    return parseDriveUrl(input);
  }
}
