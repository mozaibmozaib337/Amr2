import React from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  FolderOpen,
  FileText,
  Eye,
  Calendar,
  Sparkles,
  Search,
  UploadCloud,
} from 'lucide-react';
import { UniversalPlusUploader } from './UniversalPlusUploader';

export const FilesSection: React.FC = () => {
  const { files, activeGrade, setActiveDocument, currentUser, setIsLoginModalOpen } = usePlatform();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  // Strict Grade Isolation: if student is logged in, show only their grade!
  const targetGrade = currentUser?.role === 'student' ? currentUser.grade : activeGrade;

  const categories = Array.from(new Set(files.map((f) => f.category))).filter(Boolean);

  const filteredFiles = files.filter((f) => {
    const matchesGrade = targetGrade === 'all' || f.grade === targetGrade;
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGrade && matchesCategory && matchesSearch;
  });

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'مذكرة_كيمياء_مستر_عمرو_السيد.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isTeacherOrSec =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretary' ||
    currentUser?.email === ADMIN_EMAIL;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="p-6 bg-[#091224] border border-cyan-900/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <span>الملفات والمذكرات والملازم المعتمدة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تصفح وقراءة مذكرات الشرح والملخصات والمفاهيم مباشرة في المشغل المدمج، مع إمكانية التحميل للمشتركين فقط.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في المذكرات والملازم..."
            className="w-full bg-[#060b18] border border-slate-700/80 rounded-xl px-3 py-2 ps-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Universal Plus Uploader (+) for Teacher & Secretary */}
      {isTeacherOrSec && (
        <div className="p-5 bg-[#091224] border border-cyan-800/40 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>رفع الفيديوهات والمذكرات المباشر للسيرفر وقاعدة البيانات (+)</span>
          </div>
          <UniversalPlusUploader defaultCategory="مذكرات الشرح" />
        </div>
      )}

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#091224] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            جميع المذكرات
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#091224] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 bg-[#091224] border border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">لا توجد ملفات أو مذكرات مرفوعة لهذا الصف حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            سيقوم مستر عمرو السيد بإضافة المذكرات والملخصات الخاصة بصفك الدراسي فور تجهيزها.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-[#091224] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-md group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
                    {file.category}
                  </span>
                  <span className="text-[11px] text-slate-400">{file.dateAdded}</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                      {file.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {file.description || 'مذكرة كيمياء معتمدة لمنصة مستر عمرو السيد.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() =>
                    setActiveDocument({
                      title: file.title,
                      fileUrl: file.fileUrl,
                      fileName: file.fileName,
                      fileType: file.fileType,
                    })
                  }
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>قراءة في المشغل المدمج</span>
                </button>

                {currentUser ? (
                  <button
                    onClick={() => handleDownload(file.fileUrl, file.fileName)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
                    title="تحميل المذكرة إلى جهازك (مصرح لك كطالب مسجل)"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="p-2.5 bg-slate-800/60 text-slate-500 hover:text-cyan-400 rounded-xl border border-slate-800 transition-colors cursor-pointer"
                    title="سجل دخولك بكودك لتحميل المذكرة"
                  >
                    🔒
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
