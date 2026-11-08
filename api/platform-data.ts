import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pcpyhjdnclzuqlhrlqui.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AdHng3q0ogCOLTx9hwPIZg_yU5kr9nG';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (req.method === 'POST') {
      const incoming = req.body || {};
      for (const [key, value] of Object.entries(incoming)) {
        if (Array.isArray(value) && value.length > 0) {
          try {
            await supabase.from(key).upsert(value as any, { onConflict: 'id' });
          } catch {}
        }
      }
      return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    }

    // GET
    const [lecturesRes, examsRes, filesRes, accountsRes] = await Promise.all([
      supabase.from('lectures').select('*'),
      supabase.from('exams').select('*'),
      supabase.from('files').select('*'),
      supabase.from('registered_accounts').select('*'),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        lectures: lecturesRes.data || [],
        exams: examsRes.data || [],
        files: filesRes.data || [],
        registeredAccounts: accountsRes.data || [],
      },
    });
  } catch (err: any) {
    return res.status(200).json({ success: true, data: null });
  }
}
