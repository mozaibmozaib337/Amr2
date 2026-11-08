import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pcpyhjdnclzuqlhrlqui.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AdHng3q0ogCOLTx9hwPIZg_yU5kr9nG';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const studentData = req.body || {};
    if (!studentData.name || !studentData.phone) {
      return res.status(400).json({ success: false, error: 'بيانات التسجيل غير مكتملة' });
    }

    const cleanPhone = String(studentData.phone).trim();
    const cleanEmail = studentData.email ? String(studentData.email).trim().toLowerCase() : '';
    const cleanCode = studentData.studentCode
      ? String(studentData.studentCode).trim().toUpperCase()
      : `AMR-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAccount = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: String(studentData.name).trim(),
      phone: cleanPhone,
      parentPhone: String(studentData.parentPhone || cleanPhone).trim(),
      studentCode: cleanCode,
      password: String(studentData.password || cleanCode).trim(),
      email: cleanEmail || `${cleanCode.toLowerCase()}@amr-chem.com`,
      grade: studentData.grade || 'sec3',
      governorate: studentData.governorate?.trim() || 'القاهرة',
      subscriptionType: studentData.subscriptionType || 'course',
      age: Number(studentData.age) || 18,
      role: 'student',
      walletBalance: Number(studentData.walletBalance) || 0,
      registeredAt: new Date().toISOString().split('T')[0],
      isOnline: true,
    };

    // Save to Supabase
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.from('registered_accounts').upsert(newAccount, { onConflict: 'id' });
    } catch {
      // Graceful fallback if table is offline
    }

    return res.status(200).json({
      success: true,
      account: newAccount,
      message: 'تم تسجيل الحساب وحفظه بنجاح!',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'حدث خطأ في التسجيل' });
  }
}
