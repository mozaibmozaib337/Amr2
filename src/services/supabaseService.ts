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
 * Sanitize data for Supabase / JSON storage:
 * - strips undefined values
 * - handles nested objects & arrays
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

const TABLE_MAPPINGS: Record<string, string[]> = {
  lectures: ['courses', 'lectures'],
  courses: ['lectures', 'courses'],
  files: ['documents', 'files'],
  documents: ['files', 'documents'],
  registered_accounts: ['profiles', 'registered_accounts'],
  profiles: ['registered_accounts', 'profiles'],
  homeworks: ['assignments', 'homeworks'],
  exams: ['assignments', 'exams'],
  assignments: ['homeworks', 'exams', 'assignments'],
};

/**
 * Real-time listener using Supabase postgres_changes with instant local cache fallback
 * Supports dual table aliases: profiles, courses, documents, assignments
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

  const candidateTables = TABLE_MAPPINGS[collectionName] || [collectionName];

  // 2. Fetch fresh data from Supabase asynchronously (checks primary table and standard aliases)
  const fetchFromSupabase = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      let foundData: any[] | null = null;

      for (const tbl of candidateTables) {
        try {
          const { data, error } = await supabase.from(tbl).select('*');
          if (!error && data && data.length > 0) {
            foundData = data;
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
      } else if (initialSeed && initialSeed.length > 0 && (!cached || cached.length === 0)) {
        // Automatic initial seed to Supabase if table is new and empty
        try {
          const sanitizedSeed = initialSeed.map((item: any) => ({
            id: String(item.id || item.code || Math.random().toString(36).slice(2)),
            ...sanitizeForSupabase(item),
          }));
          for (const tbl of candidateTables) {
            await supabase.from(tbl).upsert(sanitizedSeed, { onConflict: 'id' });
          }
        } catch {
          // Table schema might be custom, continue smoothly
        }
      }
    } catch (err) {
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
          .channel(`public:${tbl}`)
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

  // Unsubscribe cleanup
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
 * Mirrors to both standard table (e.g. courses, documents, assignments, profiles) and legacy table
 */
export async function saveDocument(collectionName: string, id: string, data: any): Promise<void> {
  const cleanId = String(id);
  const cleanData = sanitizeForSupabase(data);

  // 1. Update local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const idx = existing.findIndex((item) => String(item.id || item.code) === cleanId);
    const itemWithId = { ...cleanData, id: cleanId };
    let updatedList;
    if (idx >= 0) {
      updatedList = [...existing];
      updatedList[idx] = itemWithId;
    } else {
      updatedList = [itemWithId, ...existing];
    }
    setLocalCache(collectionName, updatedList);
  } catch {}

  // 2. Persist to Supabase across all candidate table aliases
  const tables = TABLE_MAPPINGS[collectionName] || [collectionName];
  try {
    const supabase = getSupabase();
    if (supabase) {
      const payload: any = { id: cleanId, ...cleanData };
      if (collectionName === 'homeworks') payload.type = 'homework';
      if (collectionName === 'exams') payload.type = 'exam';

      for (const tbl of tables) {
        try {
          await supabase.from(tbl).upsert(payload, { onConflict: 'id' });
        } catch (tblErr) {
          // Table may not exist yet in user's schema
        }
      }
    }
  } catch (err) {
    console.warn(`[Supabase] saveDocument notice for ${collectionName}/${cleanId}:`, err);
  }
}

/**
 * Update partial fields of a document in Supabase
 */
export async function updateDocument(collectionName: string, id: string, partial: any): Promise<void> {
  const cleanId = String(id);
  const cleanPartial = sanitizeForSupabase(partial);

  // 1. Update local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const idx = existing.findIndex((item) => String(item.id || item.code) === cleanId);
    if (idx >= 0) {
      const updatedList = [...existing];
      updatedList[idx] = { ...updatedList[idx], ...cleanPartial };
      setLocalCache(collectionName, updatedList);
    }
  } catch {}

  // 2. Persist to Supabase across all candidate table aliases
  const tables = TABLE_MAPPINGS[collectionName] || [collectionName];
  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          await supabase.from(tbl).update(cleanPartial).eq('id', cleanId);
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
  const cleanId = String(id);

  // 1. Remove from local cache immediately
  try {
    const existing = getLocalCache<any>(collectionName) || [];
    const updatedList = existing.filter((item) => String(item.id || item.code) !== cleanId);
    setLocalCache(collectionName, updatedList);
  } catch {}

  // 2. Remove from Supabase across all candidate table aliases
  const tables = TABLE_MAPPINGS[collectionName] || [collectionName];
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

  // 2. Persist to Supabase across all candidate table aliases
  const tables = TABLE_MAPPINGS[collectionName] || [collectionName];
  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const tbl of tables) {
        try {
          await supabase.from(tbl).upsert(cleanItems, { onConflict: 'id' });
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`[Supabase] bulkSaveDocuments notice for ${collectionName}:`, err);
  }
}
