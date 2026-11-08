import React, { useState } from 'react';
import {
  Headphones,
  MessageCircle,
  Send,
  CheckCircle2,
  Phone,
  HelpCircle,
  FileQuestion,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { TEACHER_PHONE, TEACHER_PHONE_LOCAL } from '../context/PlatformContext';

export const SupportSection: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [studentContact, setStudentContact] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSentNotice(true);
    setQuestion('');
    setStudentContact('');
    setTimeout(() => setSentNotice(false), 5000);
  };

  const whatsappUrl = `https://wa.me/201069780486?text=${encodeURIComponent(
    'السلام عليكم مستر عمرو السيد، أرغب في الاستفسار بخصوص منصة الكيمياء'
  )}`;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      
      {/* Header Banner with Teacher Photo */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0d1a38] to-[#091224] border border-cyan-800/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 text-center sm:text-right z-10">
          <span className="text-xs text-cyan-400 font-semibold tracking-wide flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>قنوات التواصل الرسمية والدعم الفني</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            الدعم الفني والتواصل المباشر مع مستر عمرو السيد
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            نحن معك لحظة بلحظة للرد على جميع استفسارات مادة الكيمياء وحل أي مشكلة تقنية في تفعيل الأكواد أو الحسابات فوراً.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-slate-900">
            <img
              src="/assets/aistudio/image_5a8c23d0_ad0df768.jpg"
              alt="مستر عمرو السيد"
              className="w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Prominent Direct Contact Card for Mr. Amr El-Sayed */}
      <div className="p-6 bg-gradient-to-br from-[#0c1935] via-[#091224] to-[#050b17] border-2 border-cyan-500/40 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                الهاتف الرسمي المباشر للدعم والاستفسارات
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-mono dir-ltr text-right sm:text-left mt-0.5">
                {TEACHER_PHONE}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                الرقم الخاص بالأستاذ عمرو السيد وتيم الدعم المساعد للمنصة
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>محادثة واتساب مباشرة</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              href={`tel:${TEACHER_PHONE_LOCAL}`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/30 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>اتصال هاتفي</span>
            </a>
          </div>
        </div>

        {/* Support Direct Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-[#070e1c] border border-slate-800 rounded-2xl flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-0.5">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">واتساب الاستفسارات والأكواد</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                لتفعيل اشتراكات الكورسات وحل أي مشكلة في أكواد الشحن والدفع الإلكتروني.
              </p>
              <span className="inline-block mt-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {TEACHER_PHONE_LOCAL}
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#070e1c] border border-slate-800 rounded-2xl flex items-start gap-3.5">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl shrink-0 mt-0.5">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">المساعد العلمي للكيمياء</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                شرح المسائل الصعبة، وتوضيح أفكار أسئلة الامتحانات والواجبات الكيميائية.
              </p>
              <span className="inline-block mt-2 text-xs font-bold text-cyan-400">
                متاح طوال أيام الأسبوع
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Question Form */}
      <div className="p-6 bg-[#091224] border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">أرسل استفسارك أو سؤالك لمستر عمرو السيد مباشرة</h3>
        </div>

        {sentNotice && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>تم استلام سؤالك بنجاح! سيقوم تيم مستر عمرو السيد بالرد عليك في أقرب وقت.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              رقم هاتفك أو وسيلة التواصل للرد عليك:
            </label>
            <input
              type="text"
              required
              value={studentContact}
              onChange={(e) => setStudentContact(e.target.value)}
              placeholder="010XXXXXXXX أو اسمك على واتساب"
              className="w-full bg-[#060b18] border border-slate-700/80 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              نص السؤال أو الاستفسار الكيميائي:
            </label>
            <textarea
              required
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="اكتب رقم الصفحة ورقم السؤال أو اكتب معادلتك واستفسارك هنا..."
              className="w-full bg-[#060b18] border border-slate-700/80 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال السؤال لمستر عمرو</span>
          </button>
        </form>
      </div>

    </div>
  );
};
