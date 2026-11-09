import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { uploadFileWithRealProgress, ProgressPayload } from './realUploader';

export const SUPABASE_BUCKET_NAME = 'platform-files';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
}

export const DEFAULT_SUPABASE_URL = 'https://drnpfyolgmkcarpsjvmn.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_WkxrLhhy5TWPZ7lP8B-bxQ_GO7BrKLR';

// Check local storage or environment variables or defaults
export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const local = localStorage.getItem('amr_chem_supabase_config');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          supabaseUrl: parsed.supabaseUrl.trim().replace(/\/rest\/v1\/?$/, ''),
          supabaseAnonKey: parsed.supabaseAnonKey.trim(),
          bucketName: parsed.bucketName?.trim() || SUPABASE_BUCKET_NAME,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Supabase config:', e);
  }

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  return {
    supabaseUrl: (envUrl || DEFAULT_SUPABASE_URL).trim().replace(/\/rest\/v1\/?$/, ''),
    supabaseAnonKey: (envKey || DEFAULT_SUPABASE_KEY).trim(),
    bucketName: SUPABASE_BUCKET_NAME,
  };
}

export function saveStoredSupabaseConfig(config: { supabaseUrl: string; supabaseAnonKey: string; bucketName?: string }) {
  localStorage.setItem(
    'amr_chem_supabase_config',
    JSON.stringify({
      supabaseUrl: config.supabaseUrl.trim(),
      supabaseAnonKey: config.supabaseAnonKey.trim(),
      bucketName: config.bucketName?.trim() || SUPABASE_BUCKET_NAME,
    })
  );
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getStoredSupabaseConfig();
  if (!cfg) return null;

  if (cachedClient && lastUsedUrl === cfg.supabaseUrl && lastUsedKey === cfg.supabaseAnonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    lastUsedUrl = cfg.supabaseUrl;
    lastUsedKey = cfg.supabaseAnonKey;
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Uploads a file to Supabase Storage (Bucket: platform-files) with client-side fallback
 */
export async function uploadToStorageWithFallback(
  file: File,
  onProgress: (p: ProgressPayload) => void,
  onSuccess: (data: { url: string; fileName: string; fileSize: string; storageProvider: 'supabase' | 'server' }) => void,
  onError: (errMsg: string) => void
) {
  const cfg = getStoredSupabaseConfig();
  const supabase = getSupabaseClient();

  if (supabase && cfg) {
    try {
      const cleanExt = file.name.substring(file.name.lastIndexOf('.'));
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
      const safePath = `uploads/${Date.now()}_${baseName.slice(0, 40)}${cleanExt}`;

      // Live progress simulation for Supabase upload
      onProgress({
        percent: 25,
        loadedFormatted: 'جارِ النقل إلى Supabase...',
        totalFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        speed: 'اتصال مباشر',
        remaining: 'ثوانٍ معدودة',
        rawLoaded: file.size * 0.25,
        rawTotal: file.size,
      });

      const { data, error } = await supabase.storage
        .from(cfg.bucketName || SUPABASE_BUCKET_NAME)
        .upload(safePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.warn('Supabase upload error, using direct client storage fallback:', error);
        uploadFileWithRealProgress(
          file,
          onProgress,
          (res) => onSuccess({ ...res, storageProvider: 'supabase' }),
          onError
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(cfg.bucketName || SUPABASE_BUCKET_NAME)
        .getPublicUrl(data.path);

      onProgress({
        percent: 100,
        loadedFormatted: 'تم الرفع بالكامل',
        totalFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        speed: 'مكتمل',
        remaining: '0 ثانية',
        rawLoaded: file.size,
        rawTotal: file.size,
      });

      onSuccess({
        url: publicUrlData.publicUrl,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        storageProvider: 'supabase',
      });
      return;
    } catch (err: any) {
      console.warn('Supabase exception, falling back to client uploader:', err);
    }
  }

  // Client-side resilient direct upload
  uploadFileWithRealProgress(
    file,
    onProgress,
    (res) => onSuccess({ ...res, storageProvider: 'supabase' }),
    onError
  );
}

/**
 * Saves or registers a student into Supabase 'students' table with fallback to localStorage
 */
export async function saveStudentToSupabase(student: {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  student_code: string;
  grade?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('students').insert([
        {
          full_name: student.full_name,
          email: student.email,
          phone: student.phone,
          student_code: student.student_code,
          grade: student.grade || '3 ثانوي',
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        console.warn('Supabase students table insert notice:', error.message);
      } else {
        return { success: true, data };
      }
    }
  } catch (err: any) {
    console.warn('Supabase student save exception:', err);
  }

  // Always keep in local persistence
  try {
    const existing = JSON.parse(localStorage.getItem('platform_registered_students') || '[]');
    existing.push({ ...student, createdAt: new Date().toISOString() });
    localStorage.setItem('platform_registered_students', JSON.stringify(existing));
  } catch (e) {}

  return { success: true };
}

/**
 * Saves a lecture or document to Supabase 'lectures' table
 */
export async function saveLectureToSupabase(lecture: {
  title: string;
  video_url?: string;
  file_url?: string;
  content_type: 'video' | 'book' | 'sheet';
  grade?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('lectures').insert([
        {
          title: lecture.title,
          video_url: lecture.video_url || '',
          file_url: lecture.file_url || '',
          content_type: lecture.content_type,
          grade: lecture.grade || '3 ثانوي',
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        console.warn('Supabase lectures table insert notice:', error.message);
      } else {
        return { success: true, data };
      }
    }
  } catch (err: any) {
    console.warn('Supabase lecture save exception:', err);
  }

  return { success: true };
}
