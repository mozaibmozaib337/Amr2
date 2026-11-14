import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  KeyRound,
  Phone,
  HelpCircle,
  MessageCircle,
  MapPin,
  GraduationCap,
} from 'lucide-react';
import { usePlatform, ADMIN_EMAIL, TEACHER_PHONE_LOCAL } from '../context/PlatformContext';
import { GradeLevel } from '../types';

interface LoginPageProps {
  onNavigateHome?: () => void;
  onAuthSuccess?: (role: 'student' | 'admin' | 'secretary') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateHome,
  onAuthSuccess,
}) => {
  const {
    currentUser,
    currentPath,
    navigate,
    loginStrict,
    registerStrict,
    secretaries,
    setIsAdminPanelOpen,
  } = usePlatform();

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    currentPath === '/register' ? 'register' : 'login'
  );

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regParentPhone, setRegParentPhone] = useState('');
  const [regGrade, setRegGrade] = useState<GradeLevel>('sec3');
  const [regGov, setRegGov] = useState('القاهرة');

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Sync authMode if path changes between /login and /register
  useEffect(() => {
    if (currentPath === '/register') {
      setAuthMode('register');
    } else if (currentPath === '/login') {
      setAuthMode('login');
    }
  }, [currentPath]);

  // If user is already logged in when visiting /login, redirect immediately
  useEffect(() => {
    if (!currentUser) return;
    const isStaff =
      currentUser.role === 'admin' ||
      currentUser.role === 'secretary' ||
      currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (isStaff) {
      setIsAdminPanelOpen(true);
      onAuthSuccess?.(currentUser.role === 'secretary' ? 'secretary' : 'admin');
    } else {
      onAuthSuccess?.('student');
    }
    navigate('/');
  }, [currentUser, navigate, onAuthSuccess, setIsAdminPanelOpen]);

  const trimmedId = loginIdentifier.trim();
  const lowerId = trimmedId.toLowerCase();
  const digitsId = trimmedId.replace(/\D/g, '');

  // 1. Master Teacher Bypass: amr12345@gmail.com or teacher phone enters directly without password
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

  const handleBackHome = () => {
    setStatusMessage(null);
    onNavigateHome?.();
    navigate('/');
  };

  const handleFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const el = e.currentTarget;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmed = loginIdentifier.trim();
    if (!trimmed) {
      setStatusMessage({ text: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف أو كود الطالب.', isError: true });
      return;
    }

    if (!isPasswordless && !loginPassword.trim()) {
      setStatusMessage({ text: 'يرجى إدخال كلمة المرور الخاصة بحسابك للدخول.', isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginStrict(
        trimmed,
        isPasswordless ? '' : loginPassword.trim(),
        ''
      );
      if (res.success) {
        if (isTeacherDirect || isSecretaryDirect) {
          setIsAdminPanelOpen(true);
          onAuthSuccess?.(isSecretaryDirect && !isTeacherDirect ? 'secretary' : 'admin');
        } else {
          onAuthSuccess?.('student');
        }
        navigate('/');
      } else {
        setStatusMessage({
          text:
            res.error ||
            'لم يتم العثور على حساب مسجل بهذه البيانات. يرجى الضغط على "أنشئ حسابك الآن" بالأسفل.',
          isError: true,
        });
      }
    } catch {
      setStatusMessage({
        text: 'تعذر الاتصال بالسحابة للتحقق من البيانات. يرجى المحاولة مرة أخرى.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!regName.trim() || !regPhone.trim() || !regPassword.trim()) {
      setStatusMessage({ text: 'يرجى كتابة اسم الطالب، ورقم الهاتف، وكلمة المرور.', isError: true });
      return;
    }

    if (!regParentPhone.trim()) {
      setStatusMessage({
        text: 'يرجى إدخال رقم هاتف ولي الأمر (إلزامي لمتابعة الطالب وإرسال التقارير).',
        isError: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalCode = `AMR-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalEmail = regEmail.trim() || `${regPhone.trim()}@student.amr-chem.com`;

      const res = await registerStrict({
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

      if (res.success) {
        onAuthSuccess?.('student');
        navigate('/');
      } else {
        setStatusMessage({
          text: res.error || 'تعذر إنشاء الحساب في قاعدة البيانات السحابية.',
          isError: true,
        });
      }
    } catch {
      setStatusMessage({
        text: 'حدث خطأ غير متوقع أثناء حفظ الحساب في السحابة. يرجى المحاولة مرة أخرى.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPasswordWhatsappUrl = `https://wa.me/201069780486?text=${encodeURIComponent(
    `السلام عليكم، أرغب في استعادة كلمة المرور لحسابي على منصة مستر عمرو السيد${
      trimmedId ? ` (${trimmedId})` : ''
    }`
  )}`;

  return (
    <div
      dir="rtl"
      className="min-h-dvh w-full max-w-full overflow-x-clip bg-[#070d1e] flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex-1 w-full max-w-7xl mx-auto md:p-6 lg:p-8 flex flex-col md:grid md:grid-cols-2 md:gap-6 lg:gap-8 md:items-stretch">
        {/* LEFT COLUMN ON DESKTOP/TABLET (md:order-2 in RTL), TOP BANNER ON MOBILE (order-1) */}
        <div
          data-keep-dark="true"
          className="order-1 md:order-2 relative w-full h-[32dvh] min-h-[210px] max-h-[300px] md:h-auto md:min-h-[calc(100dvh-4rem)] md:max-h-none md:rounded-3xl overflow-hidden md:border md:border-cyan-800/40 md:shadow-2xl shrink-0 bg-[#050c1f]"
        >
          <img
            src="/assets/aistudio/image_5a8c23d0_ad0df768.jpg"
            alt="مستر عمرو السيد - أستاذ الكيمياء"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-[50%_18%]"
          />

          {/* Platform Dark Gradient Scrim Bottom-to-Top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050c1f] via-[#071530]/60 to-[#061226]/20" />

          {/* Bottom White Headline & Subtitle */}
          <div className="absolute inset-x-0 bottom-0 p-5 pb-9 sm:p-7 sm:pb-10 md:p-9 lg:p-11 z-10 text-right">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-md text-balance">
              الكيمياء مع مستر عمرو السيد
            </h1>
            <p className="text-sm sm:text-base text-slate-200 mt-1.5 font-medium drop-shadow">
              سجّل الدخول لحسابك وتابع دراستك
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN ON DESKTOP/TABLET (md:order-1 in RTL), CARD BELOW ON MOBILE (order-2) */}
        <div
          data-keep-dark="true"
          className="order-2 md:order-1 -mt-5 md:mt-0 relative z-10 flex-1 w-full bg-white text-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 flex flex-col justify-center p-5 sm:p-8 lg:p-10"
        >
          <div className="w-full max-w-md mx-auto space-y-5">
            {/* Top Back to Home Button */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackHome}
                className="min-h-[48px] md:min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-sm font-bold inline-flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                <ArrowRight className="w-4 h-4 text-cyan-700 shrink-0" />
                <span>الرجوع للرئيسية</span>
              </button>
            </div>

            {/* Welcome Title & Subtitle */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
                {authMode === 'login' ? 'مرحباً بعودتك!' : 'إنشاء حساب طالب جديد'}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {authMode === 'login'
                  ? 'أدخل بياناتك المسجلة للدخول إلى كورساتك ومحاضراتك واختباراتك.'
                  : 'أدخل بياناتك كاملة لإنشاء حساب طالب والبدء في منصة مستر عمرو السيد.'}
              </p>
            </div>

            {/* Status / Error Message */}
            {statusMessage && (
              <div
                role="alert"
                className={`p-3.5 rounded-xl text-sm font-semibold flex items-start gap-2.5 border ${
                  statusMessage.isError
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === 'login' ? (
              <div className="space-y-4">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-identifier"
                      className="block text-sm font-bold text-slate-800"
                    >
                      البريد الإلكتروني أو رقم الهاتف أو كود الطالب
                    </label>
                    <div className="relative">
                      <input
                        id="login-identifier"
                        type="text"
                        inputMode="email"
                        autoComplete="username"
                        required
                        value={loginIdentifier}
                        onFocus={handleFieldFocus}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="010XXXXXXXX أو AMR-101 أو البريد"
                        style={{ colorScheme: 'light' }}
                        className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl px-4 pl-11 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 font-mono text-left transition-colors"
                        dir="ltr"
                      />
                      <Mail className="w-5 h-5 text-cyan-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="login-password"
                        className="block text-sm font-bold text-slate-800"
                      >
                        كلمة المرور
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotHelp((prev) => !prev)}
                        className="min-h-[44px] inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-cyan-700 hover:text-cyan-800 cursor-pointer whitespace-nowrap"
                      >
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>نسيت كلمة السر؟</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required={!isPasswordless}
                        value={loginPassword}
                        onFocus={handleFieldFocus}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ colorScheme: 'light' }}
                        className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl pr-12 pl-11 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 font-mono text-left transition-colors"
                        dir="ltr"
                      />
                      <Lock className="w-5 h-5 text-cyan-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={showLoginPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        title={showLoginPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        className="min-w-[48px] min-h-[48px] h-12 w-12 absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer rounded-r-xl"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {showForgotHelp && (
                      <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-xs sm:text-sm text-slate-800 space-y-2">
                        <p className="font-bold text-cyan-900">استعادة كلمة المرور:</p>
                        <p className="text-slate-700 leading-relaxed">
                          تواصل مباشرة مع فريق الدعم والسكرتارية على الرقم{' '}
                          <span className="font-mono font-bold text-slate-900" dir="ltr">
                            {TEACHER_PHONE_LOCAL}
                          </span>{' '}
                          لإعادة تعيين كلمة مرورك فوراً.
                        </p>
                        <a
                          href={forgotPasswordWhatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <span>مراسلة الدعم عبر واتساب</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[48px] h-12 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold text-base rounded-xl transition-all shadow-lg shadow-cyan-600/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-5 h-5 shrink-0" />
                    <span>{isLoading ? 'جارٍ التحقق من البيانات...' : 'تسجيل الدخول'}</span>
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setStatusMessage(null);
                      navigate('/register');
                    }}
                    className="min-h-[48px] w-full px-3 py-2 text-sm sm:text-base font-bold text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 rounded-xl transition-colors cursor-pointer"
                  >
                    لا يوجد لديك حساب؟ أنشئ حسابك الآن
                  </button>
                </div>
              </div>
            ) : (
              /* REGISTER FORM */
              <div className="space-y-4">
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="reg-name" className="block text-sm font-bold text-slate-800">
                      اسم الطالب كاملاً
                    </label>
                    <div className="relative">
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={regName}
                        onFocus={handleFieldFocus}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="مثال: أحمد محمود إبراهيم"
                        style={{ colorScheme: 'light' }}
                        className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl px-4 pl-11 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                      />
                      <User className="w-5 h-5 text-cyan-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="reg-phone" className="block text-sm font-bold text-slate-800">
                        رقم هاتف الطالب
                      </label>
                      <div className="relative">
                        <input
                          id="reg-phone"
                          type="tel"
                          inputMode="tel"
                          required
                          value={regPhone}
                          onFocus={handleFieldFocus}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="010XXXXXXXX"
                          style={{ colorScheme: 'light' }}
                          className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl px-4 pl-10 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 text-left font-mono"
                          dir="ltr"
                        />
                        <Phone className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="reg-parent-phone"
                        className="flex items-center justify-between text-sm font-bold text-emerald-700"
                      >
                        <span>رقم ولي الأمر</span>
                        <span className="text-xs">*مطلوب</span>
                      </label>
                      <div className="relative">
                        <input
                          id="reg-parent-phone"
                          type="tel"
                          inputMode="tel"
                          required
                          value={regParentPhone}
                          onFocus={handleFieldFocus}
                          onChange={(e) => setRegParentPhone(e.target.value)}
                          placeholder="011XXXXXXXX"
                          style={{ colorScheme: 'light' }}
                          className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-emerald-400 focus:border-emerald-600 rounded-xl px-4 pl-10 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 text-left font-mono"
                          dir="ltr"
                        />
                        <Phone className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="reg-password" className="block text-sm font-bold text-slate-800">
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onFocus={handleFieldFocus}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          style={{ colorScheme: 'light' }}
                          className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl pr-12 pl-10 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 text-left font-mono"
                          dir="ltr"
                        />
                        <Lock className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          aria-label={showRegPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                          className="min-w-[48px] min-h-[48px] h-12 w-12 absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer rounded-r-xl"
                        >
                          {showRegPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reg-email" className="block text-sm font-bold text-slate-800">
                        البريد الإلكتروني (اختياري)
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        inputMode="email"
                        value={regEmail}
                        onFocus={handleFieldFocus}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="student@gmail.com"
                        style={{ colorScheme: 'light' }}
                        className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl px-4 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="reg-grade" className="block text-sm font-bold text-slate-800">
                        الصف الدراسي
                      </label>
                      <div className="relative">
                        <select
                          id="reg-grade"
                          value={regGrade}
                          onFocus={handleFieldFocus}
                          onChange={(e) => setRegGrade(e.target.value as GradeLevel)}
                          style={{ colorScheme: 'light' }}
                          className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl px-4 text-[16px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                        >
                          <option value="sec3">الصف الثالث الثانوي (2026)</option>
                          <option value="sec2">الصف الثاني الثانوي</option>
                          <option value="sec1">الصف الأول الثانوي</option>
                        </select>
                        <GraduationCap className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none hidden" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reg-gov" className="block text-sm font-bold text-slate-800">
                        المحافظة
                      </label>
                      <div className="relative">
                        <input
                          id="reg-gov"
                          type="text"
                          value={regGov}
                          onFocus={handleFieldFocus}
                          onChange={(e) => setRegGov(e.target.value)}
                          placeholder="مثال: القاهرة / الدقهلية"
                          style={{ colorScheme: 'light' }}
                          className="w-full min-h-[48px] h-12 bg-slate-50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl px-4 pl-10 text-[16px] text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                        />
                        <MapPin className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[48px] h-12 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-base rounded-xl transition-all shadow-lg shadow-emerald-600/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus className="w-5 h-5 shrink-0" />
                    <span>{isLoading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب والدخول فوراً'}</span>
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setStatusMessage(null);
                      navigate('/login');
                    }}
                    className="min-h-[48px] w-full px-3 py-2 text-sm sm:text-base font-bold text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 rounded-xl transition-colors cursor-pointer"
                  >
                    لديك حساب بالفعل؟ سجّل الدخول الآن
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
