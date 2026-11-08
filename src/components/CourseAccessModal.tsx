import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  X,
  Lock,
  Unlock,
  Play,
  ShoppingCart,
  Phone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  Wallet,
  UploadCloud,
  Image as ImageIcon,
  Gift,
  QrCode,
} from 'lucide-react';

export const CourseAccessModal: React.FC = () => {
  const {
    selectedCourseForDetails,
    setSelectedCourseForDetails,
    hasAccessToLecture,
    purchaseLecture,
    verifyPhoneAndCodeAccess,
    setActiveVideo,
    currentUser,
    setIsLoginModalOpen,
    recordLectureEntry,
    paymentMethods,
    submitPaymentReceipt,
    redeemCode,
  } = usePlatform();

  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || '');
  const [codeInput, setCodeInput] = useState(currentUser?.studentCode || '');
  const [rechargeCodeInput, setRechargeCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'receipt' | 'phone_code' | 'buy'>('code');

  // Receipt submission state
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0]?.name || 'فودافون كاش');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  if (!selectedCourseForDetails) return null;

  const lecture = selectedCourseForDetails;
  const isFreeCourse = lecture.isFree || lecture.price === 0;
  const isUnlocked = hasAccessToLecture(lecture.id);

  const handleStartWatching = () => {
    recordLectureEntry(lecture.id, lecture.title);
    setActiveVideo(lecture);
    setSelectedCourseForDetails(null);
  };

  const handlePurchase = () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const res = purchaseLecture(lecture.id);
    if (res.success) {
      setFeedback({ text: res.message, isError: false });
    } else {
      setFeedback({ text: res.message, isError: true });
    }
  };

  const handleRedeemCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const clean = rechargeCodeInput.trim();
    if (!clean) {
      setFeedback({ text: 'يرجى كتابة كود الشحن أو التفعيل أولاً', isError: true });
      return;
    }
    const res = redeemCode(clean);
    if (res.success) {
      setFeedback({ text: res.message, isError: false });
      setRechargeCodeInput('');
      // Auto-purchase if wallet now has enough balance and wasn't a direct course code
      if (currentUser && currentUser.walletBalance + (res.amount || 0) >= lecture.price) {
        purchaseLecture(lecture.id);
      }
    } else {
      setFeedback({ text: res.message, isError: true });
    }
  };

  const handleVerifyPhoneAndCode = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyPhoneAndCodeAccess(phoneInput, codeInput, lecture.id);
    if (res.success) {
      setFeedback({ text: res.message, isError: false });
    } else {
      setFeedback({ text: res.message, isError: true });
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!screenshotPreview) {
      setFeedback({ text: 'يرجى إرفاق صورة الشاشة (سكرين شوت) لإيصال التحويل.', isError: true });
      return;
    }

    setIsSubmittingReceipt(true);
    const res = submitPaymentReceipt({
      lectureId: lecture.id,
      lectureTitle: lecture.title,
      amount: lecture.price,
      paymentMethodName: selectedMethod,
      screenshotUrl: screenshotPreview,
      notes: receiptNotes,
    });

    setIsSubmittingReceipt(false);
    setFeedback({ text: res.message, isError: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b1429] border border-cyan-800/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d1a3a] to-[#0b1429] border-b border-cyan-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isFreeCourse || isUnlocked
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            }`}>
              {isFreeCourse ? <Gift className="w-5 h-5 text-emerald-400" /> : isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[11px] font-semibold text-cyan-400 block">
                {lecture.chapterTitle || 'مادة الكيمياء'}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                {lecture.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCourseForDetails(null);
              setFeedback(null);
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          
          {/* Course Description Section */}
          <div className="bg-[#080d1b] border border-slate-800/80 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" />
              وصف الكورس والمحتوى العلمي
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {lecture.description || 'كورس كيمياء متكامل لشرح وتدريب الأفكار الوزارية المقررة مع مستر عمرو السيد.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>المدة: {lecture.durationMinutes} دقيقة</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  السعر: {isFreeCourse ? <span className="text-emerald-400">مجاني بالكامل 🎁</span> : `${lecture.price} ج.م`}
                </span>
              </div>
              {lecture.pdfTitle && (
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span>مرفق ملزمة / شيت</span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 leading-relaxed ${
                feedback.isError
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {feedback.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* CASE 1: Free Course OR Unlocked */}
          {isFreeCourse || isUnlocked ? (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                {isFreeCourse ? <Gift className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <p className="text-sm font-bold text-white">
                {isFreeCourse
                  ? 'هذا الكورس مجاني 100% ومفتوح لجميع الطلاب بدون اشتراك أو رسوم!'
                  : 'أنت مشترك في هذا الكورس ومصرح لك بالدخول والمشاهدة!'}
              </p>
              <button
                onClick={handleStartWatching}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>تشغيل المحاضرة في المشغل المدمج فوراً</span>
              </button>
            </div>
          ) : (
            /* CASE 2: Locked Course - Show Payment & Authorization Options */
            <div className="space-y-4">
              
              {/* Option Selector Tabs */}
              <div className="flex border-b border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'code'
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30 font-bold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>شحن / تفعيل بكود</span>
                </button>

                <button
                  onClick={() => setActiveTab('receipt')}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'receipt'
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30 font-bold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>إرسال إيصال الدفع</span>
                </button>

                <button
                  onClick={() => setActiveTab('phone_code')}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'phone_code'
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30 font-bold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>تصريح المعلم</span>
                </button>

                <button
                  onClick={() => setActiveTab('buy')}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'buy'
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30 font-bold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>المحفظة</span>
                </button>
              </div>

              {/* TAB 0: Direct Recharge / Course Access Code */}
              {activeTab === 'code' && (
                <form onSubmit={handleRedeemCode} className="bg-[#080d1b] border border-cyan-900/50 rounded-2xl p-4 space-y-3.5">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-200 leading-relaxed">
                    <span className="font-bold text-white">تفعيل فوري بكود الشحن: </span>
                    إذا كان لديك كارت شحن من السنتر أو كود تفعيل من مستر عمرو السيد، أدخل الكود هنا لتفعيل الكورس أو شحن رصيدك فوراً وبشكل لحظي.
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      كود التفعيل أو الشحن *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={rechargeCodeInput}
                        onChange={(e) => setRechargeCodeInput(e.target.value.toUpperCase())}
                        placeholder="مثال: AMR-7X29A-1"
                        className="w-full bg-[#050811] border border-cyan-700/60 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono text-left tracking-wider pl-9"
                        dir="ltr"
                      />
                      <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>تفعيل الكود وفتح الكورس فوراً ⚡</span>
                  </button>
                </form>
              )}

              {/* TAB 1: Submit Payment Receipt with Screenshot & 20-min Countdown */}
              {activeTab === 'receipt' && (
                <form onSubmit={handleSubmitReceipt} className="bg-[#080d1b] border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-200 leading-relaxed">
                    <span className="font-bold text-white">نظام التفعيل بعد المراجعة: </span>
                    قم بتحويل مبلغ <span className="font-bold text-cyan-300 font-mono">{lecture.price} ج.م</span> عبر فودافون كاش أو إنستاباي، ثم أرفق سكرين شوت التحويل هنا. يتم تفعيل الكورس فور مراجعته أو تلقائياً بعد ثلث ساعة (20 دقيقة) كحد أقصى!
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      طريقة الدفع التي تم التحويل عبرها *
                    </label>
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="w-full bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      {paymentMethods.map((m) => (
                        <option key={m.id} value={`${m.name} (${m.accountNumber})`}>
                          {m.name} - رقم: {m.accountNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      صورة إيصال التحويل (سكرين شوت الشاشة) *
                    </label>
                    <div className="border-2 border-dashed border-cyan-800/50 hover:border-cyan-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#050811] relative">
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={handleScreenshotChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {screenshotPreview ? (
                        <div className="space-y-2">
                          <img
                            src={screenshotPreview}
                            alt="إيصال الدفع"
                            className="max-h-36 mx-auto rounded-xl border border-cyan-500/40 object-contain"
                          />
                          <p className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم إرفاق صورة الإيصال بنجاح (انقر لتغييرها)</span>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-2">
                          <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto" />
                          <p className="text-xs font-bold text-white">انقر هنا لرفع سكرين شوت التحويل أو صورة الإيصال</p>
                          <p className="text-[10px] text-slate-400">يدعم صيغ الصور (PNG, JPG, JPEG) من هاتفك أو جهازك</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      ملاحظات أو اسم صاحب الحساب المحوِّل منه (اختياري)
                    </label>
                    <input
                      type="text"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="مثال: تم التحويل من محفظة باسم محمد علي..."
                      className="w-full bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReceipt}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>إرسال الإيصال وبدء مراجعة التفعيل (خلال ثلث ساعة)</span>
                  </button>
                </form>
              )}

              {/* TAB 2: Whitelisted Phone + Student Code */}
              {activeTab === 'phone_code' && (
                <form onSubmit={handleVerifyPhoneAndCode} className="bg-[#080d1b] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    إذا كان مستر عمرو السيد قد أضاف رقمك وكودك في قائمة التصريح، أدخلهما معاً للدخول المباشر:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">رقم الهاتف المصرح</label>
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="010XXXXXXXX"
                        className="w-full bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none text-left font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">كود الطالب المسجل</label>
                      <input
                        type="text"
                        required
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        placeholder="SEC3-101"
                        className="w-full bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none text-left uppercase font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer mt-2 flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>تحقق من الهاتف والكود والدخول فورياً</span>
                  </button>
                </form>
              )}

              {/* TAB 3: Buy with Wallet Balance */}
              {activeTab === 'buy' && (
                <div className="bg-[#080d1b] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">سعر هذا الكورس:</span>
                    <span className="text-white font-bold">{lecture.price} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">رصيدك الحالي بالمحفظة:</span>
                    <span className="text-cyan-400 font-bold">
                      {currentUser ? `${currentUser.walletBalance} ج.م` : '0 ج.م'}
                    </span>
                  </div>

                  <button
                    onClick={handlePurchase}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>تأكيد خصم السعر من المحفظة ومشاهدة الكورس</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
