import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  Wallet,
  CreditCard,
  QrCode,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Smartphone,
  Building,
} from 'lucide-react';

export const WalletSection: React.FC = () => {
  const { currentUser, redeemCode, transactions, setIsLoginModalOpen } = usePlatform();
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!code.trim()) return;

    const res = redeemCode(code);
    if (res.success) {
      setNotice({ text: res.message, isError: false });
      setCode('');
    } else {
      setNotice({ text: res.message, isError: true });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      
      {/* Header & Balance Card */}
      <div className="p-5 sm:p-8 bg-gradient-to-r from-[#0c1c3f] to-[#091329] border border-cyan-800/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-right">
          <span className="text-xs sm:text-sm text-cyan-400 font-semibold tracking-wide">
            محفظتي الإلكترونية التعليمية
          </span>
          <h2 className="text-[22px] sm:text-3xl font-extrabold text-white">
            رصيدك المتاح: <span className="font-mono text-cyan-400">{currentUser?.walletBalance || 0}</span> ج.م
          </h2>
          <p className="text-[14px] text-slate-300 leading-relaxed">
            يمكنك استخدام رصيد المحفظة للاشتراك في كورسات ومحاضرات مادة الكيمياء.
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
          <Wallet className="w-8 h-8" />
        </div>
      </div>

      {/* Recharge Form */}
      <div className="p-5 sm:p-6 bg-[#091224] border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-400 shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-white">شحن الرصيد بواسطة كود الكارت الفوري</h3>
        </div>
        <p className="text-[14px] text-slate-400 leading-relaxed">
          أدخل كود الشحن الذي حصلت عليه من السنتر أو منافذ البيع لشحن رصيدك فوراً في المحفظة.
        </p>

        <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-3 pt-1">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setNotice(null);
            }}
            placeholder="أدخل كود الشحن هنا (مثال: CHEM-100)"
            className="flex-1 min-h-[44px] bg-[#060b18] border border-slate-700/80 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none uppercase font-mono"
            dir="ltr"
          />

          <button
            type="submit"
            className="min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-cyan-600/25 cursor-pointer shrink-0"
          >
            تفعيل وشحن الكود
          </button>
        </form>

        {notice && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              notice.isError
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {notice.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      {/* Payment methods available in Egypt */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#091224] border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Smartphone className="w-4 h-4" />
            <span className="text-xs font-bold text-white">المحافظ الإلكترونية (كاش)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            فودافون كاش، أورنج كاش، اتصالات كاش، وي باي. تواصل مع الدعم لإرسال إيصال التحويل.
          </p>
        </div>

        <div className="p-4 bg-[#091224] border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Building className="w-4 h-4" />
            <span className="text-xs font-bold text-white">فوري (Fawry)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            ادفع من أقرب منفذ فوري أو ماكينة دفع باستخدام كود خدمة منصات التعليم.
          </p>
        </div>

        <div className="p-4 bg-[#091224] border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <QrCode className="w-4 h-4" />
            <span className="text-xs font-bold text-white">إنستاباي (InstaPay)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            تحويل بنكي لحظي عبر خدمة إنستاباي مع تأكيد فوري من فريق المتابعة.
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="p-6 bg-[#091224] border border-slate-800 rounded-2xl space-y-4">
        <h4 className="text-sm font-bold text-white">سجل العمليات والمدفوعات ({transactions.length})</h4>

        {transactions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            لا توجد أي معاملات سابقة مسجلة في محفظتك.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-white">{tx.description}</p>
                  <p className="text-[11px] text-slate-400">{tx.date}</p>
                </div>
                <span
                  className={`font-mono font-bold ${
                    tx.type === 'deposit' ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {tx.type === 'deposit' ? `+${tx.amount}` : `-${tx.amount}`} ج.م
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
