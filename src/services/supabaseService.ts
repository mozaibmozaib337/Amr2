import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dynamic Supabase Credentials manager:
// Priority: 1) localStorage ('amr_chem_supabase_config') 2) import.meta.env 3) Default Project
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

  // If credentials changed or not yet initialized, instantiate fresh client
  if (!supabaseInstance || lastInitUrl !== url || lastInitKey !== key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      lastInitUrl = url;
      lastInitKey = key;
      console.log('✅ Connected to Supabase directly:', url);
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
    // Force re-create client
    supabaseInstance = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastInitUrl = cleanUrl;
    lastInitKey = cleanKey;
    console.log('⚡ Successfully updated Supabase credentials to:', cleanUrl);
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

  // Deterministic UUID v4-shaped hash from arbitrary string ID
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
 * Sanitize data for JSON / localStorage
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
 * Cache helpers to guarantee 0% black screen, instant loading, and 100% reliability
 */
function getLocalCache<T>(collectionName: string): T[] | null {
  try {
    const raw = localStorage.getItem(`amr_chem_cache_${collectionName}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

function setLocalCache<T>(collectionName: string, items: T[]): void {
  try {
    localStorage.setItem(`amr_chem_cache_${collectionName}`, JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Maps internal app collection names to actual existing Supabase PostgreSQL tables.
 * Non-mapped collections remain strictly in localStorage without hitting missing tables.
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
 * Maps app domain object to the exact PostgreSQL columns of the target Supabase table,
 * preventing PGRST204 (unknown column) and 22P02 (invalid uuid) errors.
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
    };
  }

  if (tbl === 'documents') {
    return {
      id: validId,
      title: String(data.title || ''),
      grade: String(data.grade || 'sec3'),
      file_url: String(data.fileUrl || data.file_url || ''),
      provider: data.provider || 'drive',
      external_id: data.external_id || null,
      original_url: data.original_url || data.fileUrl || data.file_url || null,
    };
  }

  if (tbl === 'assignments') {
    return {
      id: validId,
      title: String(data.title || ''),
      grade: String(data.grade || 'sec3'),
      type: collectionName === 'exams' ? 'exam' : 'homework',
    };
  }

  if (tbl === 'profiles') {
    return {
      id: validId,
      grade: String(data.grade || 'sec3'),
    };
  }

  if (tbl === 'payment_requests') {
    return {
      id: validId,
      user_id: data.user_id || data.studentId ? ensureUuid(String(data.user_id || data.studentId)) : null,
      status: String(data.status || 'pending'),
    };
  }

  return { id: validId, ...data };
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
    return out;
  }

  if (tbl === 'documents') {
    if (partial.title !== undefined) out.title = String(partial.title);
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    if (partial.fileUrl !== undefined || partial.file_url !== undefined) {
      out.file_url = String(partial.fileUrl ?? partial.file_url);
    }
    if (partial.provider !== undefined) out.provider = partial.provider;
    if (partial.external_id !== undefined) out.external_id = partial.external_id;
    if (partial.original_url !== undefined) out.original_url = partial.original_url;
    return out;
  }

  if (tbl === 'assignments') {
    if (partial.title !== undefined) out.title = String(partial.title);
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    return out;
  }

  if (tbl === 'profiles') {
    if (partial.grade !== undefined) out.grade = String(partial.grade);
    return out;
  }

  if (tbl === 'payment_requests') {
    if (partial.status !== undefined) out.status = String(partial.status);
    return out;
  }

  return partial;
}

/**
 * Converts a Supabase snake_case row back into the app's camelCase structure.
 */
function mapRowFromTable(tbl: string, row: any): any {
  if (!row || typeof row !== 'object') return row;

  if (tbl === 'courses') {
    const extId = row.external_id || undefined;
    const rawCandidate = String(row.video_url || row.videoUrl || row.original_url || '');
    const isDrive = row.provider === 'drive' || /drive\.google\.com|drive\.usercontent\.google\.com/i.test(rawCandidate);
    const driveIdMatch = rawCandidate.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{10,})/i);
    const resolvedDriveId = extId || (driveIdMatch ? driveIdMatch[1] : undefined);
    const videoUrl = isDrive && resolvedDriveId
      ? `https://drive.google.com/file/d/${resolvedDriveId}/preview`
      : row.video_url ||
        row.videoUrl ||
        (extId
          ? `https://www.youtube-nocookie.com/embed/${extId}?controls=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&cc_load_policy=0&hl=ar`
          : '');

    return {
      id: String(row.id),
      title: row.title || 'محاضرة كيمياء',
      description: row.description || '',
      chapterTitle: row.chapterTitle || row.chapter_title || 'الباب الأول',
      grade: row.grade || 'sec3',
      durationMinutes: Number(row.durationMinutes ?? row.duration_minutes ?? 60),
      videoUrl,
      videoFileName: extId ? (isDrive ? `drive_${extId}.mp4` : `youtube_${extId}.mp4`) : 'lecture.mp4',
      videoFileSize: row.provider === 'drive' || isDrive ? 'Google Drive HD' : row.provider === 'youtube' ? 'YouTube HD' : undefined,
      price: Number(row.price ?? 0),
      isFree: Number(row.price ?? 0) === 0,
      dateAdded: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
      provider: row.provider || (isDrive ? 'drive' : extId ? 'youtube' : 'other'),
      external_id: resolvedDriveId || extId,
      original_url: row.original_url || videoUrl,
    };
  }

  if (tbl === 'documents') {
    const extId = row.external_id || undefined;
    const fileUrl =
      row.file_url ||
      row.fileUrl ||
      (extId ? `https://drive.google.com/file/d/${extId}/preview` : '');

    return {
      id: String(row.id),
      title: row.title || 'مذكرة كيمياء',
      category: row.category || 'مذكرات الشرح',
      grade: row.grade || 'sec3',
      fileUrl,
      fileName: row.file_name || `${row.title || 'document'}.pdf`,
      fileType: row.file_type || 'pdf',
      sizeMb: Number(row.size_mb ?? 5.0),
      description: row.description || 'مذكرة كيمياء معتمدة',
      dateAdded: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
      provider: row.provider || (extId ? 'drive' : 'other'),
      external_id: extId,
      original_url: row.original_url || fileUrl,
    };
  }

  return row;
}

/**
 * Real-time listener using Supabase postgres_changes with instant local cache fallback
 */
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  initialSeed?: T[]
): () => void {
  let isMounted = true;

  // 1. Instantly deliver local cache or initial seed so the screen is NEVER black or empty
  const cached = getLocalCache<T>(collectionName);
  if (cached && cached.length > 0) {
    onUpdate(cached);
  } else if (initialSeed && initialSeed.length > 0) {
    onUpdate(initialSeed);
    setLocalCache(collectionName, initialSeed);
  }

  const candidateTables = TABLE_MAPPINGS[collectionName];
  if (!candidateTables || candidateTables.length === 0) {
    // Local-only collection; do not query nonexistent Supabase tables
    return () => {
      isMounted = false;
    };
  }

  // 2. Fetch fresh data from Supabase asynchronously
  const fetchFromSupabase = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let foundData: any[] | null = null;

      for (const tbl of candidateTables) {
        try {
          let query = supabase.from(tbl).select('*');
          if (tbl === 'assignments') {
            const targetType = collectionName === 'exams' ? 'exam' : 'homework';
            query = query.eq('type', targetType);
          }
          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            foundData = data.map((r) => mapRowFromTable(tbl, r));
            break;
          }
        } catch {
          // continue checking other table
        }
      }

      if (!isMounted) return;

      if (foundData && foundData.length > 0) {
        onUpdate(foundData as unknown as T[]);
        setLocalCache(collectionName, foundData as unknown as T[]);
      }
    } catch {
      console.log(`[Supabase] Sync notice for ${collectionName}`);
    }
  };

  fetchFromSupabase();

  // 3. Realtime Supabase Channel subscriptions for candidate tables
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

  // 1. Update local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const idx = existing.findIndex((item) => String(item.id || item.code) === String(id) || String(item.id) === cleanId);
    const itemWithId = { ...cleanData, id: String(id) };
    let updatedList;
    if (idx >= 0) {
      updatedList = [...existing];
      updatedList[idx] = itemWithId;
    } else {
      updatedList = [itemWithId, ...existing];
    }
    setLocalCache(collectionName, updatedList);
  } catch {}

  // 2. Persist to Supabase only if collection maps to an actual Supabase table
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
          const { error } = await supabase.from(tbl).upsert(payload, { onConflict: 'id' });
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
export async function updateDocument(collectionName: string, id: string, partial: any): Promise<void> {
  const cleanId = ensureUuid(String(id));
  const cleanPartial = sanitizeForSupabase(partial);

  // 1. Update local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const idx = existing.findIndex((item) => String(item.id || item.code) === String(id) || String(item.id) === cleanId);
    if (idx >= 0) {
      const updatedList = [...existing];
      updatedList[idx] = { ...updatedList[idx], ...cleanPartial };
      setLocalCache(collectionName, updatedList);
    }
  } catch {}

  const tables = TABLE_MAPPINGS[collectionName];
  if (!tables || tables.length === 0) return;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          const mappedPartial = mapPartialForTable(tbl, cleanPartial);
          if (Object.keys(mappedPartial).length > 0) {
            await supabase.from(tbl).update(mappedPartial).eq('id', cleanId);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`[Supabase] updateDocument notice for ${collectionName}/${cleanId}:`, err);
  }
}

/**
 * Delete a document by ID from Supabase
 */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const cleanId = ensureUuid(String(id));

  // 1. Remove from local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const updatedList = existing.filter((item) => String(item.id || item.code) !== String(id) && String(item.id) !== cleanId);
    setLocalCache(collectionName, updatedList);
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

  // 1. Update local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const existingMap = new Map(existing.map((item) => [String(item.id || item.code), item]));
    cleanItems.forEach((newItem) => existingMap.set(String(newItem.id), newItem));
    setLocalCache(collectionName, Array.from(existingMap.values()));
  } catch {}

  const tables = TABLE_MAPPINGS[collectionName];
  if (!tables || tables.length === 0) return;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          const mappedItems = cleanItems.map((it) => mapPayloadForTable(tbl, collectionName, it.id, it));
          await supabase.from(tbl).upsert(mappedItems, { onConflict: 'id' });
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`[Supabase] bulkSaveDocuments notice for ${collectionName}:`, err);
  }
}
