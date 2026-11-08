import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 bg-[#060b18] border-t border-cyan-950/60 py-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              <img
                src="/assets/aistudio/image_5a8c23d0_ad0df768.jpg"
                alt="مستر عمرو السيد"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-white text-sm">الكيمياء مع مستر عمرو السيد</p>
              <p className="text-[11px] text-cyan-400">المنصة التعليمية للثانوية العامة والأزهرية</p>
            </div>
          </div>

            {/* User Requested Attribution */}
            <div className="p-3 bg-[#0a1226] border border-cyan-800/40 rounded-xl text-center sm:text-left space-y-1">
              <p className="text-xs font-bold text-cyan-300">
                تم تطوير هذه المنصة بواسطة محمد زكريا
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                للتواصل مع مستر عمرو السيد: 01069780486
              </p>
            </div>
          </div>

        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} الكيمياء مع مستر عمرو السيد. جميع الحقوق محفوظة.</p>
          <p className="flex items-center gap-1">
            <span>منصة متوافقة وسريعة تعمل على جميع متصفحات الويب والهواتف</span>
          </p>
        </div>

      </div>
    </footer>
  );
};
