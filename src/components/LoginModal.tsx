import React, { useState } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  X,
  Mail,
  User,
  Lock,
  UserPlus,
  AlertCircle,
  KeyRound,
  GraduationCap,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import { GradeLevel, SubscriptionType } from '../types';
import { getSupabase } from '../services/supabaseService';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, loginStrict, registerStrict, login, secretaries } = usePlatform();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regParentPhone, setRegParentPhone] = useState('');
  const [regGrade, setRegGrade] = useState<GradeLevel>('sec3');
  const [regGov, setRegGov] = useState('القاهرة');

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isLoginModalOpen) return null;

  const trimmedId = loginIdentifier.trim();
  const lowerId = trimmedId.toLowerCase();
  const digitsId = trimmedId.replace(/\D/g, '');

  // 1. Master Teacher Bypass: amr12345@gmail.com enters directly without password
  const isTeacherDirect =
    lowerId === 'amr12345@gmail.com' ||
    lowerId === ADMIN_EMAIL.toLowerCase() ||
    lowerId === 'amr.elsayed@chemistry.edu' ||
    digitsId === '01069780486' ||
    digitsId === '201069780486';

  // 2. Platform Secretaries: Phone numbers or emails added in platform enter directly without password
  const isSecretaryDirect =
    lowerId.includes('secretary') ||
    Boolean(
      secretaries &&
        secretaries.some((s) => {
          const sDigits = (s.phone || '').replace(/\D/g, '');
          return (
            s.phone.trim() === trimmedId ||
            (digitsId.length >= 8 && sDigits.length >= 8 && digitsId === sDigits) ||
            s.name.toLowerCase() === lowerId
          );
        })
    );

  const isPasswordless = isTeacherDirect || isSecretaryDirect;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmed = loginIdentifier.trim();
    if (!trimmed) {
      setStatusMessage({ text: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف أو كود الطالب.', isError: true });
      return;
    }

    // 1. Master Teacher: amr12345@gmail.com enters directly without password
    if (isTeacherDirect) {
      loginStrict(trimmed, '', loginCode);
      setIsLoginModalOpen(false);
      setIsLoading(false);
      resetFields();
      return;
    }

    // 2. Platform Secretaries: Enter directly without password
    if (isSecretaryDirect) {
      loginStrict(trimmed, '', '');
      setIsLoginModalOpen(false);
      setIsLoading(false);
      resetFields();
      return;
    }

    // 3. For all other users (all student Gmail accounts, phone, or code), password is REQUIRED!
    if (!loginPassword.trim()) {
      setStatusMessage({ text: 'يرجى إدخال كلمة المرور الخاصة بحسابك للدخول.', isError: true });
      return;
    }

    // 4. Strict local authentication attempt
    const localRes = loginStrict(trimmed, loginPassword.trim(), loginCode.trim());
    if (localRes.success) {
      setIsLoading(false);
      setIsLoginModalOpen(false);
      resetFields();
      return;
    }

    // If account was found locally but password was incorrect, show the error immediately
    if (localRes.error && localRes.error.includes('كلمة المرور غير صحيحة')) {
      setStatusMessage({ text: localRes.error, isError: true });
      setIsLoading(false);
      return;
    }

    // 5. Cloud database validation (Direct Supabase query for 100% Vercel & client-side support)
    setIsLoading(true);

    try {
      // Step A: Direct Supabase real-time check (works on Vercel with zero server dependency)
      const supabase = getSupabase();
      if (supabase) {
        const rawLower = trimmed.toLowerCase();
        const cleanDigits = trimmed.replace(/\D/g, '');
        const { data: supaAccounts } = await supabase.from('registered_accounts').select('*');

        if (Array.isArray(supaAccounts) && supaAccounts.length > 0) {
          const match = supaAccounts.find((acc: any) => {
            const e = (acc.email || '').toLowerCase();
            const p = String(acc.phone || '').replace(/\D/g, '');
            const c = (acc.studentCode || '').toUpperCase();
            return (
              e === rawLower ||
              (cleanDigits.length >= 8 && p === cleanDigits) ||
              c === trimmed.toUpperCase()
            );
          });

          if (match) {
            if (match.password === loginPassword.trim()) {
              login(
                match.email || `${match.phone}@amr-chem.com`,
                match.name,
                match.phone,
                match.grade || 'sec3',
                match.studentCode
              );
              setIsLoading(false);
              setIsLoginModalOpen(false);
              resetFields();
              return;
            } else {
              setStatusMessage({
                text: 'كلمة المرور غير صحيحة! يرجى التأكد من كلمة المرور بدقة.',
                isError: true,
              });
              setIsLoading(false);
              return;
            }
          }
        }
      }
    } catch {
      // Supabase direct query completed, proceed to API check
    }

    // Step B: Final check - if not found in local cache or Supabase, provide clear feedback
    setIsLoading(false);
    setStatusMessage({
      text: localRes.error || 'لم يتم العثور على حساب مسجل بهذه البيانات. يرجى الضغط على "إنشاء حساب جديد" بالأسفل.',
      isError: true,
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!regName.trim() || !regPhone.trim() || !regPassword.trim()) {
      setStatusMessage({ text: 'يرجى كتابة اسم الطالب، ورقم الهاتف، وكلمة المرور.', isError: true });
      return;
    }

    if (!regParentPhone.trim()) {
      setStatusMessage({ text: 'يرجى إدخال رقم هاتف ولي الأمر (إلزامي لمتابعة الطالب وإرسال التقارير).', isError: true });
      return;
    }

    setIsLoading(true);
    const finalCode = `AMR-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalEmail = regEmail.trim() || `${regPhone.trim()}@student.amr-chem.com`;

    // 1. Instant local registration & immediate session activation
    registerStrict({
      name: regName.trim(),
      email: finalEmail,
      phone: regPhone.trim(),
      password: regPassword.trim(),
      studentCode: finalCode,
      parentPhone: regParentPhone.trim(),
      grade: regGrade,
      governorate: regGov.trim(),
      subscriptionType: 'course',
    });

    login(finalEmail, regName.trim(), regPhone.trim(), regGrade, finalCode);
    setIsLoading(false);
    setIsLoginModalOpen(false);
    resetFields();
  };

  const resetFields = () => {
    setLoginIdentifier('');
    setLoginPassword('');
    setLoginCode('');
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegParentPhone('');
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b1429] border border-cyan-800/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-[#0d1a3a] to-[#0b1429] border-b border-cyan-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)] shrink-0">
              <img
                src="/assets/aistudio/image_5a8c23d0_ad0df768.jpg"
                alt="مستر عمرو السيد"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>الكيمياء مع مستر عمرو السيد</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </h2>
              <p className="text-[11px] text-cyan-400">
                {authMode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب طالب جديد على المنصة'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsLoginModalOpen(false);
              setStatusMessage(null);
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex border-b border-cyan-950/60 bg-[#070e20] text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setStatusMessage(null);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              authMode === 'login'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setStatusMessage(null);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              authMode === 'register'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-red-500/15 border border-red-500/30 text-red-200'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authMode === 'login' ? (
            <div className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    البريد الإلكتروني أو رقم الهاتف أو كود الطالب
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="student@gmail.com أو 010XXXXXXXX أو AMR-101"
                      className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 pl-9 font-mono text-left"
                      dir="ltr"
                    />
                    <Mail className="w-4 h-4 text-cyan-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required={!isPasswordless}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 pl-9 font-mono text-left"
                      dir="ltr"
                    />
                    <Lock className="w-4 h-4 text-cyan-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/25 cursor-pointer mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-cyan-200" />
                  <span>{isLoading ? 'جارٍ التحقق...' : 'تسجيل الدخول 🚀'}</span>
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setStatusMessage(null);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  ليس لديك حساب بعد؟ اضغط هنا لإنشاء حساب جديد
                </button>
              </div>
            </div>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">اسم الطالب كاملاً</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="مثال: أحمد محمود إبراهيم"
                    className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 pl-8"
                  />
                  <User className="w-4 h-4 text-cyan-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">رقم هاتف الطالب</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-left font-mono pl-8"
                      dir="ltr"
                    />
                    <Phone className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-emerald-400 mb-1 flex items-center justify-between">
                    <span>رقم ولي الأمر</span>
                    <span className="text-[10px] text-emerald-500">*مطلوب</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={regParentPhone}
                      onChange={(e) => setRegParentPhone(e.target.value)}
                      placeholder="011XXXXXXXX"
                      className="w-full bg-[#060a14] border border-emerald-800/60 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-left font-mono pl-8"
                      dir="ltr"
                    />
                    <Phone className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">كلمة المرور</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="كلمة مرور تحفظها"
                      className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-left font-mono pl-8"
                      dir="ltr"
                    />
                    <Lock className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">البريد الإلكتروني (اختياري)</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الصف الدراسي</label>
                  <select
                    value={regGrade}
                    onChange={(e) => setRegGrade(e.target.value as GradeLevel)}
                    className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="sec3">الصف الثالث الثانوي (2026)</option>
                    <option value="sec2">الصف الثاني الثانوي</option>
                    <option value="sec1">الصف الأول الثانوي</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">المحافظة</label>
                  <input
                    type="text"
                    value={regGov}
                    onChange={(e) => setRegGov(e.target.value)}
                    placeholder="مثال: القاهرة / الدقهلية"
                    className="w-full bg-[#060a14] border border-cyan-900/50 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/25 cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'جارٍ التسجيل...' : 'إنشاء الحساب والدخول فوراً'}</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
