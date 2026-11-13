import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RegisteredAccount } from '../types';

// Dynamic Supabase Credentials manager:
// Priority: 1) Optional admin override ('amr_chem_supabase_config') 2) import.meta.env 3) Default Project
export const DEFAULT_SUPABASE_URL = 'https://drnpfyolgmkcarpsjvmn.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_WkxrLhhy5TWPZ7lP8B-bxQ_GO7BrKLR';

export function getActiveSupabaseCredentials(): { url: string; key: string } {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('amr_chem_supabase_config') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          url: parsed.supabaseUrl.trim().replace(/\/rest\/v1\/?$/, ''),
          key: parsed.supabaseAnonKey.trim(),
        };
      }
    }
  } catch {
    // Ignore parse error
  }

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: String(envUrl).trim().replace(/\/rest\/v1\/?$/, ''),
    key: String(envKey).trim(),
  };
}

let supabaseInstance: SupabaseClient | null = null;
let lastInitUrl = '';
let lastInitKey = '';

export function getSupabase(): SupabaseClient {
  const { url, key } = getActiveSupabaseCredentials();

  if (!supabaseInstance || lastInitUrl !== url || lastInitKey !== key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      lastInitUrl = url;
      lastInitKey = key;
    } catch (err) {
      console.warn('⚠️ Supabase client initialization notice:', err);
    }
  }
  return supabaseInstance!;
}

/**
 * Update Supabase credentials at runtime from the UI or code
 */
export function updateActiveSupabaseCredentials(newUrl: string, newKey: string, bucketName?: string): boolean {
  if (!newUrl || !newKey) return false;
  try {
    const cleanUrl = newUrl.trim().replace(/\/rest\/v1\/?$/, '');
    const cleanKey = newKey.trim();
    localStorage.setItem(
      'amr_chem_supabase_config',
      JSON.stringify({
        supabaseUrl: cleanUrl,
        supabaseAnonKey: cleanKey,
        bucketName: bucketName?.trim() || 'platform-files',
      })
    );
    supabaseInstance = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastInitUrl = cleanUrl;
    lastInitKey = cleanKey;
    return true;
  } catch (e) {
    console.error('Failed to save Supabase credentials:', e);
    return false;
  }
}

/**
 * Reset Supabase credentials back to default project
 */
export function resetActiveSupabaseCredentials(): void {
  try {
    localStorage.removeItem('amr_chem_supabase_config');
    supabaseInstance = null;
    getSupabase();
  } catch {
    // Ignore
  }
}

/**
 * Ensures any string ID is formatted as a valid RFC-4122 UUID for Supabase uuid primary keys.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureUuid(rawId: string): string {
  const s = String(rawId || '').trim();
  if (UUID_REGEX.test(s)) return s;

  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  let h3 = 0x1b873593 ^ s.length;
  let h4 = 0x85ebca6b ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const full = hex(h1) + hex(h2) + hex(h3) + hex(h4);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

/**
 * Sanitize values cleanly before saving
 */
function sanitizeForSupabase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForSupabase);
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = sanitizeForSupabase(val);
    }
  }
  return clean;
}

/**
 * Pure runtime in-memory cache (NO localStorage database persistence so phones never fall out of sync)
 */
const memoryCache = new Map<string, any[]>();

function getMemoryCache<T>(collectionName: string): T[] | null {
  return (memoryCache.get(collectionName) as T[]) || null;
}

function setMemoryCache<T>(collectionName: string, items: T[]): void {
  memoryCache.set(collectionName, items);
}

/**
 * Clear legacy bloated localStorage database caches on startup so no device relies on stale local stores
 */
export function purgeLegacyLocalCaches(): void {
  if (typeof localStorage === 'undefined') return;
  const legacyKeys = [
    'amr_chem_lectures',
    'amr_chem_homeworks',
    'amr_chem_files',
    'amr_chem_exams',
    'amr_chem_registered_accounts_v2',
    'amr_chem_student_activities_v2',
    'amr_chem_exam_submissions_v2',
    'amr_chem_student_access_map_v2',
    'amr_chem_payment_requests_v2',
    'amr_chem_payment_requests_v3',
    'amr_chem_honored_students',
    'amr_chem_codes',
    'amr_chem_transactions',
    'amr_chem_authorized_students',
    'amr_chem_secretaries',
    'amr_chem_payment_methods',
    'amr_chem_broadcast_notifs_v3',
    'amr_chem_live_logins_v1',
    'amr_chem_teacher_profile',
    'amr_chem_pure_purge_v7',
    'platform_registered_students',
  ];
  legacyKeys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('amr_chem_cache_') || key.startsWith('amr_chem_completed_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

/**
 * Maps internal app collection names to actual existing Supabase PostgreSQL tables.
 */
const TABLE_MAPPINGS: Record<string, string[]> = {
  lectures: ['courses'],
  courses: ['courses'],
  files: ['documents'],
  documents: ['documents'],
  registered_accounts: ['profiles'],
  profiles: ['profiles'],
  homeworks: ['assignments'],
  exams: ['assignments'],
  assignments: ['assignments'],
  payment_requests: ['payment_requests'],
};

/**
 * Maps app domain object to PostgreSQL columns for Supabase table.
 */
function mapPayloadForTable(tbl: string, collectionName: string, id: string, data: any): Record<string, any> {
  const validId = ensureUuid(id);

  if (tbl === 'courses') {
    return {
      id: validId,
      title: String(data.title || ''),
      description: String(data.description || ''),
      price: Number(data.price ?? 0),
      grade: String(data.grade || 'sec3'),
      video_url: String(data.videoUrl || data.video_url || ''),
      provider: data.provider || 'youtube',
      external_id: data.external_id || null,
      original_url: data.original_url || data.videoUrl || data.video_url || null,
      cover_image_url: data.coverImageUrl || data.cover_image_url || undefined,
      instructions: data.instructions || undefined,
      schedule_text: data.scheduleText || data.schedule_text || undefined,
      lessons: Array.isArray(data.lessons) ? data.lessons : undefined,
    };
  }

  if (tbl === 'documents') {
    return {
      id: validId,
      title: String(data.title || ''),
      grade: String(data.grade || 'sec3'),
      file_url: String(data.fileUrl || data.file_url || ''),
      allow_download: data.allow_download !== undefined ? Boolean(data.allow_download) : true,
      provider: data.provider || 'drive',
      external_id: data.external_id || null,
      original_url: data.original_url || data.fileUrl || data.file_url || null,
      category: data.category || undefined,
      lesson_title: data.lessonTitle || data.lesson_title || undefined,
      course_id: data.courseId || data.course_id || undefined,
    };
  }

  if (tbl === 'assignments') {
    return {
      id: validId,
      title: String(data.title || ''),
      grade: String(data.grade || 'sec3'),
      type: collectionName === 'exams' ? 'exam' : data.kind === 'sheet' ? 'sheet' : 'homework',
      questions: Array.isArray(data.questions) ? data.questions : [],
      description: data.description || '',
      lesson_title: data.lessonTitle || '',
      time_limit_minutes: data.timeLimitMinutes ? Number(data.timeLimitMinutes) : null,
      total_marks: data.totalMarks ? Number(data.totalMarks) : null,
      kind: data.kind || (collectionName === 'exams' ? 'exam' : 'homework'),
    };
  }

  if (tbl === 'profiles') {
    return {
      id: validId,
      full_name: String(data.name || data.full_name || 'طالب جديد').trim(),
      email: String(data.email || '').trim(),
      phone: String(data.phone || '').trim(),
      grade: String(data.grade || 'sec3'),
      role: String(data.role || 'student'),
      wallet_balance: Number(data.walletBalance ?? data.wallet_balance ?? 0),
      password: data.password ? String(data.password) : undefined,
      parent_phone: data.parentPhone ? String(data.parentPhone) : undefined,
      student_code: data.studentCode ? String(data.studentCode) : undefined,
      governorate: data.governorate ? String(data.governorate) : undefined,
      age: data.age !== undefined ? Number(data.age) : undefined,
      subscription_type: data.subscriptionType ? String(data.subscriptionType) : undefined,
    };
  }

  if (tbl === 'payment_requests') {
    return {
      id: validId,
      user_id: data.user_id || data.studentId ? ensureUuid(String(data.user_id || data.studentId)) : null,
      amount: Number(data.amount ?? 0),
      status: String(data.status || 'pending_review'),
      receipt_url: String(data.screenshotUrl || data.receipt_url || ''),
    };
  }

  return { id: validId, ...data };
}

/**
 * Extracts missing column name from Postgres / PostgREST errors (42703 / PGRST204)
 */
function extractMissingColumnFromError(error: any): string | null {
  const msg = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch && pgrstMatch[1]) return pgrstMatch[1];
  const pgMatch = msg.match(/column "([^"]+)" of relation/i) || msg.match(/column ([a-zA-Z0-9_]+) does not exist/i);
  if (pgMatch && pgMatch[1]) return pgMatch[1];
  return null;
}

/**
 * Resilient upsert: strips missing optional columns automatically if schema hasn't added them yet
 */
async function smartUpsertRow(
  supabase: SupabaseClient,
  tbl: string,
  payload: Record<string, any>
): Promise<{ error: any; strippedColumns: string[] }> {
  const working: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) working[k] = v;
  }

  const strippedColumns: string[] = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await supabase.from(tbl).upsert(working, { onConflict: 'id' });
    if (!error) {
      return { error: null, strippedColumns };
    }
    const missingCol = extractMissingColumnFromError(error);
    if (missingCol && missingCol in working && missingCol !== 'id') {
      delete working[missingCol];
      strippedColumns.push(missingCol);
      continue;
    }
    return { error, strippedColumns };
  }
  return { error: new Error('Max schema retries exceeded'), strippedColumns };
}

/**
 * Maps partial updates to exact PostgreSQL columns for the target Supabase table.
 */
function mapPartialForTable(tbl: string, partial: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (tbl === 'courses') {
    if (partial.title !== undefined) out.title = String(partial.title);
    if (partial.description !== undefined) out.description = String(partial.description);
    if (partial.price !== undefined) out.price = Number(partial.price);
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    if (partial.videoUrl !== undefined || partial.video_url !== undefined) {
      out.video_url = String(partial.videoUrl ?? partial.video_url);
    }
    if (partial.provider !== undefined) out.provider = partial.provider;
    if (partial.external_id !== undefined) out.external_id = partial.external_id;
    if (partial.original_url !== undefined) out.original_url = partial.original_url;
    if (partial.coverImageUrl !== undefined) out.cover_image_url = partial.coverImageUrl;
    if (partial.instructions !== undefined) out.instructions = partial.instructions;
    if (partial.scheduleText !== undefined) out.schedule_text = partial.scheduleText;
    if (partial.lessons !== undefined) out.lessons = partial.lessons;
    return out;
  }

  if (tbl === 'documents') {
    if (partial.title !== undefined) out.title = String(partial.title);
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    if (partial.fileUrl !== undefined || partial.file_url !== undefined) {
      out.file_url = String(partial.fileUrl ?? partial.file_url);
    }
    if (partial.allow_download !== undefined) out.allow_download = Boolean(partial.allow_download);
    if (partial.provider !== undefined) out.provider = partial.provider;
    if (partial.external_id !== undefined) out.external_id = partial.external_id;
    if (partial.original_url !== undefined) out.original_url = partial.original_url;
    return out;
  }

  if (tbl === 'assignments') {
    if (partial.title !== undefined) out.title = String(partial.title);
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    if (partial.questions !== undefined) out.questions = partial.questions;
    if (partial.description !== undefined) out.description = partial.description;
    if (partial.lessonTitle !== undefined) out.lesson_title = partial.lessonTitle;
    if (partial.timeLimitMinutes !== undefined) out.time_limit_minutes = partial.timeLimitMinutes;
    if (partial.totalMarks !== undefined) out.total_marks = partial.totalMarks;
    return out;
  }

  if (tbl === 'profiles') {
    if (partial.name !== undefined || partial.full_name !== undefined) {
      out.full_name = String(partial.name ?? partial.full_name);
    }
    if (partial.email !== undefined) out.email = String(partial.email);
    if (partial.phone !== undefined) out.phone = String(partial.phone);
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    if (partial.role !== undefined) out.role = String(partial.role);
    if (partial.walletBalance !== undefined || partial.wallet_balance !== undefined) {
      out.wallet_balance = Number(partial.walletBalance ?? partial.wallet_balance);
    }
    if (partial.password !== undefined) out.password = String(partial.password);
    if (partial.parentPhone !== undefined) out.parent_phone = String(partial.parentPhone);
    if (partial.studentCode !== undefined) out.student_code = String(partial.studentCode);
    if (partial.governorate !== undefined) out.governorate = String(partial.governorate);
    if (partial.age !== undefined) out.age = Number(partial.age);
    if (partial.subscriptionType !== undefined) out.subscription_type = String(partial.subscriptionType);
    return out;
  }

  if (tbl === 'payment_requests') {
    if (partial.status !== undefined) out.status = String(partial.status);
    if (partial.amount !== undefined) out.amount = Number(partial.amount);
    if (partial.screenshotUrl !== undefined) out.receipt_url = String(partial.screenshotUrl);
    return out;
  }

  return partial;
}

/**
 * Converts a Supabase snake_case row back into the app's camelCase structure.
 */
export function mapRowFromTable(tbl: string, row: any, existing?: any): any {
  if (!row || typeof row !== 'object') return row;
  const base = existing && typeof existing === 'object' ? existing : {};

  if (tbl === 'courses') {
    const extId = row.external_id || base.external_id || undefined;
    const rawCandidate = String(row.video_url || row.videoUrl || row.original_url || base.videoUrl || '');
    const isDrive =
      row.provider === 'drive' ||
      base.provider === 'drive' ||
      /drive\.google\.com|drive\.usercontent\.google\.com/i.test(rawCandidate);
    const driveIdMatch = rawCandidate.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{10,})/i);
    const resolvedDriveId = extId || (driveIdMatch ? driveIdMatch[1] : undefined);
    const videoUrl =
      isDrive && resolvedDriveId
        ? `https://drive.google.com/file/d/${resolvedDriveId}/preview`
        : row.video_url ||
          row.videoUrl ||
          base.videoUrl ||
          (extId
            ? `https://www.youtube-nocookie.com/embed/${extId}?controls=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&cc_load_policy=0&hl=ar`
            : '');

    return {
      ...base,
      id: base.id || String(row.id),
      title: row.title || base.title || 'محاضرة كيمياء',
      description: row.description ?? base.description ?? '',
      chapterTitle: row.chapterTitle || row.chapter_title || base.chapterTitle || 'الباب الأول',
      grade: row.grade || base.grade || 'sec3',
      durationMinutes: Number(row.durationMinutes ?? row.duration_minutes ?? base.durationMinutes ?? 60),
      videoUrl,
      videoFileName: base.videoFileName || (extId ? (isDrive ? `drive_${extId}.mp4` : `youtube_${extId}.mp4`) : 'lecture.mp4'),
      videoFileSize:
        row.provider === 'drive' || isDrive
          ? 'Google Drive HD'
          : row.provider === 'youtube'
          ? 'YouTube HD'
          : base.videoFileSize,
      price: Number(row.price ?? base.price ?? 0),
      isFree: Number(row.price ?? base.price ?? 0) === 0,
      dateAdded: row.created_at ? String(row.created_at).split('T')[0] : base.dateAdded || new Date().toISOString().split('T')[0],
      provider: row.provider || base.provider || (isDrive ? 'drive' : extId ? 'youtube' : 'other'),
      external_id: resolvedDriveId || extId,
      original_url: row.original_url || base.original_url || videoUrl,
      coverImageUrl: row.cover_image_url || row.coverImageUrl || base.coverImageUrl || undefined,
      instructions: row.instructions ?? base.instructions ?? undefined,
      scheduleText: row.schedule_text || row.scheduleText || base.scheduleText || undefined,
      lessons: Array.isArray(row.lessons) && row.lessons.length > 0 ? row.lessons : base.lessons || undefined,
    };
  }

  if (tbl === 'documents') {
    const extId = row.external_id || base.external_id || undefined;
    const fileUrl =
      row.file_url ||
      row.fileUrl ||
      base.fileUrl ||
      (extId ? `https://drive.google.com/file/d/${extId}/preview` : '');

    return {
      ...base,
      id: base.id || String(row.id),
      title: row.title || base.title || 'مذكرة كيمياء',
      category: row.category || base.category || 'مذكرات الشرح',
      lessonTitle: row.lesson_title || row.lessonTitle || base.lessonTitle || undefined,
      courseId: row.course_id || row.courseId || base.courseId || undefined,
      grade: row.grade || base.grade || 'sec3',
      fileUrl,
      fileName: row.file_name || base.fileName || `${row.title || 'document'}.pdf`,
      fileType: row.file_type || base.fileType || 'pdf',
      sizeMb: Number(row.size_mb ?? base.sizeMb ?? 5.0),
      description: row.description || base.description || 'مذكرة كيمياء معتمدة',
      dateAdded: row.created_at ? String(row.created_at).split('T')[0] : base.dateAdded || new Date().toISOString().split('T')[0],
      provider: row.provider || base.provider || (extId ? 'drive' : 'other'),
      external_id: extId,
      original_url: row.original_url || base.original_url || fileUrl,
    };
  }

  if (tbl === 'assignments') {
    const questions = Array.isArray(row.questions) && row.questions.length > 0 ? row.questions : base.questions || [];
    return {
      ...base,
      id: base.id || String(row.id),
      title: row.title || base.title || 'اختبار كيمياء',
      description: row.description ?? base.description ?? '',
      lessonTitle: row.lesson_title ?? base.lessonTitle ?? 'الباب الأول',
      grade: row.grade || base.grade || 'sec3',
      kind: row.kind || (row.type === 'sheet' ? 'sheet' : base.kind || 'homework'),
      questions,
      timeLimitMinutes: Number(row.time_limit_minutes ?? base.timeLimitMinutes ?? 30),
      totalMarks: Number(row.total_marks ?? base.totalMarks ?? questions.reduce((s: number, q: any) => s + (q.points ?? 1), 0)),
      isPublished: row.is_published ?? base.isPublished ?? true,
      dateAdded: row.created_at ? String(row.created_at).split('T')[0] : base.dateAdded || new Date().toISOString().split('T')[0],
    };
  }

  if (tbl === 'profiles') {
    return {
      ...base,
      id: base.id || String(row.id),
      name: row.full_name || row.name || base.name || 'طالب منصة',
      email: row.email || base.email || '',
      phone: row.phone || base.phone || '',
      password: row.password || base.password || '',
      parentPhone: row.parent_phone || base.parentPhone || row.phone || '',
      studentCode: row.student_code || base.studentCode || `AMR-${String(row.id).slice(0, 4).toUpperCase()}`,
      grade: row.grade || base.grade || 'sec3',
      governorate: row.governorate || base.governorate || 'القاهرة',
      age: row.age !== undefined && row.age !== null ? Number(row.age) : base.age,
      subscriptionType: row.subscription_type || base.subscriptionType || 'course',
      role: row.role || base.role || 'student',
      walletBalance: Number(row.wallet_balance ?? base.walletBalance ?? 0),
      registeredAt: row.created_at ? String(row.created_at).split('T')[0] : base.registeredAt || new Date().toISOString().split('T')[0],
      isOnline: base.isOnline ?? false,
      lastLoginAt: base.lastLoginAt,
    };
  }

  if (tbl === 'payment_requests') {
    return {
      ...base,
      id: base.id || String(row.id),
      studentId: base.studentId || String(row.user_id || ''),
      amount: Number(row.amount ?? base.amount ?? 0),
      status: row.status || base.status || 'pending_review',
      screenshotUrl: row.receipt_url || base.screenshotUrl || '',
      submittedAt: base.submittedAt || (row.created_at ? String(row.created_at).replace('T', ' ').substring(0, 16) : ''),
    };
  }

  return { ...base, ...row };
}

/**
 * Direct Live Query in Supabase `profiles` (plus `/api/platform-data` metadata hydration)
 * Works seamlessly across any mobile phone or browser worldwide.
 */
export async function findStudentProfileInSupabase(identifier: string): Promise<RegisteredAccount | null> {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');
  const upperCode = raw.toUpperCase();

  let supaMatch: RegisteredAccount | null = null;
  let serverMatch: RegisteredAccount | null = null;

  // 1. Live query Supabase `profiles`
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && Array.isArray(data)) {
        const hit = data.find((r: any) => {
          const rEmail = String(r.email || '').trim().toLowerCase();
          const rPhoneDigits = String(r.phone || '').replace(/\D/g, '');
          const rCode = String(r.student_code || '').trim().toUpperCase();
          return (
            (rEmail && rEmail === lower) ||
            (digits.length >= 8 && rPhoneDigits.length >= 8 && rPhoneDigits === digits) ||
            (rCode && rCode === upperCode)
          );
        });
        if (hit) {
          supaMatch = mapRowFromTable('profiles', hit);
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase] Profile query notice:', err);
  }

  // 2. Cross-check backend shared store `/api/platform-data` to restore extended fields if DB columns weren't added yet
  try {
    const res = await fetch('/api/platform-data');
    if (res.ok) {
      const json = await res.json();
      const accounts: any[] = json?.data?.registeredAccounts || [];
      const hit = accounts.find((acc: any) => {
        const aEmail = String(acc.email || '').trim().toLowerCase();
        const aPhoneDigits = String(acc.phone || '').replace(/\D/g, '');
        const aCode = String(acc.studentCode || '').trim().toUpperCase();
        return (
          (aEmail && aEmail === lower) ||
          (digits.length >= 8 && aPhoneDigits.length >= 8 && aPhoneDigits === digits) ||
          (aCode && aCode === upperCode)
        );
      });
      if (hit) {
        serverMatch = hit;
      }
    }
  } catch {
    // Static deployment or offline server — rely solely on Supabase
  }

  if (supaMatch && serverMatch) {
    return {
      ...serverMatch,
      ...supaMatch,
      id: serverMatch.id || supaMatch.id,
      password: supaMatch.password || serverMatch.password || '',
      parentPhone: supaMatch.parentPhone || serverMatch.parentPhone || supaMatch.phone,
      studentCode: supaMatch.studentCode || serverMatch.studentCode,
      governorate: supaMatch.governorate || serverMatch.governorate || 'القاهرة',
    };
  }

  return supaMatch || serverMatch || null;
}

/**
 * Fetch ALL registered profiles live from Supabase (merged with backend extended metadata if available)
 */
export async function fetchAllProfilesFromSupabase(): Promise<RegisteredAccount[]> {
  let supaRows: RegisteredAccount[] = [];
  let serverRows: RegisteredAccount[] = [];

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && Array.isArray(data)) {
        supaRows = data.map((r: any) => mapRowFromTable('profiles', r));
      }
    }
  } catch {}

  try {
    const res = await fetch('/api/platform-data');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data?.registeredAccounts)) {
        serverRows = json.data.registeredAccounts;
      }
    }
  } catch {}

  const merged = new Map<string, RegisteredAccount>();
  serverRows.forEach((acc) => {
    merged.set(ensureUuid(acc.id), acc);
  });
  supaRows.forEach((sAcc) => {
    const key = ensureUuid(sAcc.id);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...sAcc, id: existing.id || sAcc.id, password: sAcc.password || existing.password } : sAcc);
  });

  return Array.from(merged.values());
}

/**
 * Directly save/upsert a student account to Supabase `profiles` AND server store
 */
export async function upsertStudentProfileInSupabase(
  account: RegisteredAccount
): Promise<{
  success: boolean;
  savedToSupabase: boolean;
  savedToServer: boolean;
  missingColumns?: string[];
  error?: string;
}> {
  let savedToSupabase = false;
  let savedToServer = false;
  let missingColumns: string[] = [];
  let supaErrorMsg = '';

  try {
    const supabase = getSupabase();
    if (supabase) {
      const payload = mapPayloadForTable('profiles', 'registered_accounts', account.id, account);
      const { error, strippedColumns } = await smartUpsertRow(supabase, 'profiles', payload);
      missingColumns = strippedColumns;
      if (!error) {
        savedToSupabase = true;
      } else {
        supaErrorMsg = error.message || 'فشل الحفظ في Supabase profiles';
        console.error('[Supabase profiles upsert error]:', error);
      }
    }
  } catch (err: any) {
    supaErrorMsg = err?.message || 'استثناء أثناء الحفظ في Supabase';
  }

  try {
    const res = await fetch('/api/platform-data/patch-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: 'registeredAccounts',
        action: 'upsert',
        item: account,
      }),
    });
    if (res.ok) savedToServer = true;
  } catch {}

  return {
    success: savedToSupabase || savedToServer,
    savedToSupabase,
    savedToServer,
    missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
    error: !savedToSupabase && !savedToServer ? supaErrorMsg || 'تعذر الحفظ في قاعدة البيانات السحابية' : undefined,
  };
}

/**
 * Permanently delete a student profile from Supabase `profiles` (plus dependent rows) and memory cache
 */
export async function deleteStudentProfileInSupabase(student: {
  id: string;
  email?: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string }> {
  const cleanUuid = ensureUuid(student.id);
  const cleanPhone = (student.phone || '').trim();
  const cleanEmail = (student.email || '').trim().toLowerCase();

  try {
    const existing = getMemoryCache<RegisteredAccount>('registered_accounts') || [];
    const filtered = existing.filter((acc) => {
      if (acc.id === student.id || ensureUuid(acc.id) === cleanUuid) return false;
      if (cleanEmail && acc.email?.toLowerCase() === cleanEmail && acc.role !== 'admin') return false;
      if (cleanPhone && acc.phone?.trim() === cleanPhone && acc.role !== 'admin') return false;
      return true;
    });
    setMemoryCache('registered_accounts', filtered);
  } catch {}

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: true };
    }

    // 1. Clean dependent payment_requests first so foreign keys never block profile deletion
    try {
      await supabase.from('payment_requests').delete().eq('user_id', cleanUuid);
    } catch {}

    // 2. Delete from profiles by UUID (and phone/email safeguards for non-admin accounts)
    const { error: idErr } = await supabase.from('profiles').delete().eq('id', cleanUuid);

    if (cleanPhone && cleanPhone !== '01069780486') {
      try {
        await supabase.from('profiles').delete().eq('phone', cleanPhone).neq('role', 'admin');
      } catch {}
    }

    if (cleanEmail && cleanEmail !== 'amr12345@gmail.com' && cleanEmail !== 'amr.elsayed@chemistry.edu') {
      try {
        await supabase.from('profiles').delete().eq('email', cleanEmail).neq('role', 'admin');
      } catch {}
    }

    if (idErr) {
      console.warn('[Supabase profiles delete notice]:', idErr);
      return { success: false, error: idErr.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر حذف الطالب من Supabase' };
  }
}

/**
 * Clear all non-admin student profiles from Supabase `profiles` and memory cache
 */
export async function clearAllStudentProfilesInSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = getMemoryCache<RegisteredAccount>('registered_accounts') || [];
    setMemoryCache(
      'registered_accounts',
      existing.filter((acc) => acc.role === 'admin' || acc.role === 'secretary')
    );
  } catch {}

  try {
    const supabase = getSupabase();
    if (!supabase) return { success: true };
    try {
      await supabase.from('payment_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {}
    const { error } = await supabase.from('profiles').delete().eq('role', 'student');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر إفراغ جدول الطلاب في Supabase' };
  }
}

/**
 * Live schema diagnostic for Admin Supabase Tab
 */
export async function testSupabaseSchemaHealth(): Promise<{
  connected: boolean;
  profilesReadable: boolean;
  profilesWritable: boolean;
  hasPasswordColumn: boolean;
  hasParentPhoneColumn: boolean;
  hasStudentCodeColumn: boolean;
  assignmentsWritable: boolean;
  details: string;
}> {
  const result = {
    connected: false,
    profilesReadable: false,
    profilesWritable: false,
    hasPasswordColumn: false,
    hasParentPhoneColumn: false,
    hasStudentCodeColumn: false,
    assignmentsWritable: false,
    details: '',
  };

  try {
    const supabase = getSupabase();
    if (!supabase) return { ...result, details: 'عميل Supabase غير مهيأ' };

    const { error: readErr } = await supabase.from('profiles').select('id').limit(1);
    if (!readErr) {
      result.connected = true;
      result.profilesReadable = true;
    }

    const { error: passErr } = await supabase.from('profiles').select('password').limit(1);
    result.hasPasswordColumn = !passErr;

    const { error: parentErr } = await supabase.from('profiles').select('parent_phone').limit(1);
    result.hasParentPhoneColumn = !parentErr;

    const { error: codeErr } = await supabase.from('profiles').select('student_code').limit(1);
    result.hasStudentCodeColumn = !codeErr;

    // Test probe insert + immediate cleanup on profiles
    const probeId = ensureUuid(`probe_${Date.now()}`);
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: probeId,
      full_name: '__health_probe__',
      email: `probe_${Date.now()}@probe.test`,
      phone: '00000000000',
      grade: 'sec3',
      role: 'student',
      wallet_balance: 0,
    });
    if (!insertErr) {
      result.profilesWritable = true;
      await supabase.from('profiles').delete().eq('id', probeId);
    }

    // Test probe on assignments
    const probeAssignId = ensureUuid(`probe_assign_${Date.now()}`);
    const { error: assignErr } = await supabase.from('assignments').insert({
      id: probeAssignId,
      title: '__health_probe__',
      grade: 'sec3',
      type: 'exam',
    });
    if (!assignErr) {
      result.assignmentsWritable = true;
      await supabase.from('assignments').delete().eq('id', probeAssignId);
    }

    result.details = result.profilesWritable
      ? 'الاتصال بجدول profiles نشط ويعمل من أي جهاز.'
      : 'جدول profiles غير قابل للكتابة — تأكد من تشغيل كود SQL.';
  } catch (err: any) {
    result.details = err?.message || 'تعذر فحص حالة الاتصال';
  }

  return result;
}

/**
 * Real-time listener using Supabase postgres_changes + memory cache hydration
 */
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  initialSeed?: T[]
): () => void {
  let isMounted = true;

  const mem = getMemoryCache<T>(collectionName);
  if (mem && mem.length > 0) {
    onUpdate(mem);
  } else if (initialSeed && initialSeed.length > 0) {
    onUpdate(initialSeed);
    setMemoryCache(collectionName, initialSeed);
  }

  const candidateTables = TABLE_MAPPINGS[collectionName];
  if (!candidateTables || candidateTables.length === 0) {
    return () => {
      isMounted = false;
    };
  }

  const fetchFromSupabase = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let foundData: any[] | null = null;

      for (const tbl of candidateTables) {
        try {
          let query = supabase.from(tbl).select('*');
          if (tbl === 'assignments') {
            if (collectionName === 'exams') {
              query = query.eq('type', 'exam');
            } else if (collectionName === 'homeworks') {
              query = query.in('type', ['homework', 'sheet']);
            }
          }
          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const latestMem = getMemoryCache<any>(collectionName) || [];
            const memById = new Map<string, any>();
            latestMem.forEach((it) => {
              const rawKey = String(it?.id || it?.code || '');
              if (rawKey) {
                memById.set(rawKey, it);
                memById.set(ensureUuid(rawKey), it);
              }
            });
            foundData = data.map((r) => {
              const matchedExisting = memById.get(String(r.id)) || memById.get(ensureUuid(String(r.id)));
              return mapRowFromTable(tbl, r, matchedExisting);
            });
            break;
          }
        } catch {
          // continue checking next table
        }
      }

      if (!isMounted) return;

      if (foundData && foundData.length > 0) {
        setMemoryCache(collectionName, foundData as unknown as T[]);
        onUpdate(foundData as unknown as T[]);
      }
    } catch {
      console.log(`[Supabase] Sync notice for ${collectionName}`);
    }
  };

  fetchFromSupabase();

  const channels: any[] = [];
  try {
    const supabase = getSupabase();
    if (supabase) {
      candidateTables.forEach((tbl) => {
        const chan = supabase
          .channel(`public:${tbl}:${collectionName}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tbl },
            () => {
              if (isMounted) {
                fetchFromSupabase();
              }
            }
          )
          .subscribe();
        channels.push(chan);
      });
    }
  } catch (channelErr) {
    console.warn(`[Supabase] Realtime channel setup notice for ${collectionName}:`, channelErr);
  }

  return () => {
    isMounted = false;
    channels.forEach((ch) => {
      try {
        const supabase = getSupabase();
        if (supabase) supabase.removeChannel(ch);
      } catch {}
    });
  };
}

/**
 * Save or overwrite a document by ID in Supabase
 */
export async function saveDocument(
  collectionName: string,
  id: string,
  data: any
): Promise<{ success: boolean; error?: any; errorMessage?: string }> {
  const cleanId = ensureUuid(String(id));
  const cleanData = sanitizeForSupabase(data);

  try {
    const existing = getMemoryCache<any>(collectionName) || [];
    const idx = existing.findIndex((item) => String(item.id || item.code) === String(id) || String(item.id) === cleanId);
    const itemWithId = { ...cleanData, id: String(id) };
    const updatedList =
      idx >= 0 ? existing.map((it, i) => (i === idx ? itemWithId : it)) : [itemWithId, ...existing];
    setMemoryCache(collectionName, updatedList);
  } catch {}

  const tables = TABLE_MAPPINGS[collectionName];
  if (!tables || tables.length === 0) {
    return { success: true };
  }

  let lastError: any = null;
  let hasSuccess = false;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          const payload = mapPayloadForTable(tbl, collectionName, cleanId, cleanData);
          const { error } = await smartUpsertRow(supabase, tbl, payload);
          if (error) {
            lastError = error;
            console.error(`[Supabase Error on table '${tbl}']`, error.message, error);
          } else {
            hasSuccess = true;
          }
        } catch (tblErr: any) {
          lastError = tblErr;
          console.error(`[Supabase Exception on table '${tbl}']`, tblErr?.message || tblErr, tblErr);
        }
      }
    }
  } catch (err: any) {
    lastError = err;
    console.error(`[Supabase saveDocument Error for ${collectionName}/${cleanId}]:`, err?.message || err, err);
  }

  if (!hasSuccess && lastError) {
    return { success: false, error: lastError, errorMessage: lastError.message || 'حدث خطأ في قاعدة البيانات' };
  }
  return { success: true };
}

/**
 * Update partial fields of a document in Supabase
 */
export async function updateDocument(collectionName: string, id: string, partial: any): Promise<{ success: boolean; error?: any }> {
  const cleanId = ensureUuid(String(id));
  const cleanPartial = sanitizeForSupabase(partial);

  let mergedFullItem: any = null;
  try {
    const existing = getMemoryCache<any>(collectionName) || [];
    const idx = existing.findIndex((item) => String(item.id || item.code) === String(id) || String(item.id) === cleanId);
    if (idx >= 0) {
      mergedFullItem = { ...existing[idx], ...cleanPartial, id: existing[idx].id || String(id) };
      const updatedList = [...existing];
      updatedList[idx] = mergedFullItem;
      setMemoryCache(collectionName, updatedList);
    } else if (cleanPartial && typeof cleanPartial === 'object') {
      mergedFullItem = { ...cleanPartial, id: String(id) };
    }
  } catch {}

  const tables = TABLE_MAPPINGS[collectionName];
  if (!tables || tables.length === 0) return { success: true };

  let hasSuccess = false;
  let lastError: any = null;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          const mappedPartial = mapPartialForTable(tbl, cleanPartial);
          if (Object.keys(mappedPartial).length > 0) {
            const working: Record<string, any> = { ...mappedPartial };
            let updatedOk = false;
            for (let attempt = 0; attempt < 8; attempt++) {
              const { error } = await supabase.from(tbl).update(working).eq('id', cleanId);
              if (!error) {
                updatedOk = true;
                break;
              }
              const missingCol = extractMissingColumnFromError(error);
              if (missingCol && missingCol in working) {
                delete working[missingCol];
                if (Object.keys(working).length === 0) break;
                continue;
              }
              lastError = error;
              break;
            }
            if (updatedOk) {
              hasSuccess = true;
              continue;
            }
          }
          if (mergedFullItem) {
            const fullPayload = mapPayloadForTable(tbl, collectionName, cleanId, mergedFullItem);
            const { error } = await smartUpsertRow(supabase, tbl, fullPayload);
            if (!error) hasSuccess = true;
            else lastError = error;
          }
        } catch (tblErr) {
          lastError = tblErr;
        }
      }
    }
  } catch (err) {
    lastError = err;
    console.warn(`[Supabase] updateDocument notice for ${collectionName}/${cleanId}:`, err);
  }

  return hasSuccess ? { success: true } : { success: false, error: lastError };
}

/**
 * Delete a document by ID from Supabase
 */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const cleanId = ensureUuid(String(id));

  try {
    const existing = getMemoryCache<any>(collectionName) || [];
    const updatedList = existing.filter((item) => String(item.id || item.code) !== String(id) && String(item.id) !== cleanId);
    setMemoryCache(collectionName, updatedList);
  } catch {}

  const tables = TABLE_MAPPINGS[collectionName];
  if (!tables || tables.length === 0) return;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          await supabase.from(tbl).delete().eq('id', cleanId);
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`[Supabase] deleteDocument notice for ${collectionName}/${cleanId}:`, err);
  }
}

/**
 * Bulk save documents in Supabase
 */
export async function bulkSaveDocuments(collectionName: string, items: any[]): Promise<void> {
  if (!items || items.length === 0) return;

  const cleanItems = items.map((it) => ({
    id: String(it.id || it.code || Math.random().toString(36).slice(2)),
    ...sanitizeForSupabase(it),
  }));

  try {
    const existing = getMemoryCache<any>(collectionName) || [];
    const existingMap = new Map(existing.map((item) => [String(item.id || item.code), item]));
    cleanItems.forEach((newItem) => existingMap.set(String(newItem.id), newItem));
    setMemoryCache(collectionName, Array.from(existingMap.values()));
  } catch {}

  const tables = TABLE_MAPPINGS[collectionName];
  if (!tables || tables.length === 0) return;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          const mappedItems = cleanItems.map((it) => mapPayloadForTable(tbl, collectionName, it.id, it));
          for (const mapped of mappedItems) {
            await smartUpsertRow(supabase, tbl, mapped);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`[Supabase] bulkSaveDocuments notice for ${collectionName}:`, err);
  }
}
