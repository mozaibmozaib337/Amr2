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
    const { identifier, password, code } = req.body || {};
    const rawId = String(identifier || '').trim();
    const rawPass = String(password || '').trim();
    const rawCode = String(code || '').trim().toUpperCase();

    if (!rawId && !rawCode) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال البريد أو الهاتف أو الكود' });
    }

    // 1. Direct Teacher Bypass for Mr. Amr El-Sayed
    if (
      rawId.toLowerCase() === 'amr12345@gmail.com' ||
      rawId === '01069780486' ||
      rawId === '+20 10 69780486'
    ) {
      return res.status(200).json({
        success: true,
        account: {
          id: 'admin_amr_sayed',
          name: 'مستر عمرو السيد',
          email: 'Amr.ElSayed@Chemistry.Edu',
          phone: '01069780486',
          grade: 'sec3',
          governorate: 'المنصورة / القاهرة',
          role: 'admin',
          walletBalance: 9999,
          studentCode: 'AMR-001',
        },
      });
    }

    // 2. Query Supabase directly
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: accounts, error } = await supabase.from('registered_accounts').select('*');

    if (!error && Array.isArray(accounts)) {
      const rawLower = rawId.toLowerCase();
      const cleanDigits = rawId.replace(/\D/g, '');

      const found = accounts.find((acc: any) => {
        const accEmail = (acc.email || '').toLowerCase();
        const accPhoneDigits = String(acc.phone || '').replace(/\D/g, '');
        const accCode = (acc.studentCode || '').toUpperCase();

        const matchEmail = accEmail === rawLower;
        const matchPhone = cleanDigits.length >= 8 && accPhoneDigits.length >= 8 && accPhoneDigits === cleanDigits;
        const matchCode = (rawCode && accCode === rawCode) || (accCode === rawId.toUpperCase());

        return matchEmail || matchPhone || matchCode;
      });

      if (found) {
        if (rawPass && found.password && found.password !== rawPass) {
          return res.status(401).json({
            success: false,
            error: 'كلمة المرور غير صحيحة! يرجى التأكد من كلمة المرور.',
          });
        }

        return res.status(200).json({
          success: true,
          account: found,
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'لم يتم العثور على حساب بهذا البريد أو الهاتف أو الكود. يرجى إنشاء حساب جديد أولاً.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'حدث خطأ في معالجة الطلب' });
  }
}
