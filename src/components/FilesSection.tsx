import React, { useState } from 'react';
import { usePlatform, ADMIN_EMAIL } from '../context/PlatformContext';
import {
  FolderOpen,
  FileText,
  Eye,
  Calendar,
  Sparkles,
  Search,
  UploadCloud,
  PlusCircle,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  X,
  AlertCircle,
  FileCheck2,
  BookOpen,
} from 'lucide-react';
import { UniversalPlusUploader } from './UniversalPlusUploader';
import { LinkVerificationService, LinkMetadata } from '../utils/LinkVerificationService';
import { GradeLevel } from '../types';

export const FilesSection: React.FC = () => {
  const { files, activeGrade, setActiveDocument, currentUser, setIsLoginModalOpen, addFile } = usePlatform();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Quick Verified Document Submission Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<LinkMetadata | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('مذكرات الشرح');
  const [docGrade, setDocGrade] = useState<GradeLevel>(activeGrade === 'all' ? 'sec3' : activeGrade);
  const [docDescription, setDocDescription] = useState('');
  const [formNotice, setFormNotice] = useState<string | null>(null);

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

  const handleVerifyDocLink = async () => {
    if (!quickUrl.trim()) return;
    setIsVerifying(true);
    setFormNotice(null);
    try {
      const res = await LinkVerificationService.verifyUrl(quickUrl, 'document');
      setVerificationResult(res);
      if (res.isValid) {
        if (res.cleanDisplayUrl) setQuickUrl(res.cleanDisplayUrl);
        if (res.title) setDocTitle(res.title);
        const pagesText = res.pageCount ? `${res.pageCount} صفحة` : '';
        const sizeText = res.fileSizeFormatted ? `حجم ${res.fileSizeFormatted}` : '';
        const details = [pagesText, sizeText].filter(Boolean).join(' · ');
        setDocDescription(`مذكرة كيمياء معتمدة لمنصة مستر عمرو السيد ${details ? `(${details})` : ''}`);
        setFormNotice(`✅ تم التحقق من الرابط بنجاح! نوع المحتوى: ${res.contentType} ${res.pageCount ? `· عدد الصفحات: ${res.pageCount}` : ''}`);
      } else {
        setFormNotice(`⚠️ ${res.error || 'فشل التحقق من الرابط'}`);
      }
    } catch (err: any) {
      setFormNotice('⚠️ تعذر فحص الرابط.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitVerifiedDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !quickUrl.trim()) return;

    const cleanInfo = LinkVerificationService.cleanRawUrl(quickUrl);
    const finalFileUrl = verificationResult?.sanitizedUrl || cleanInfo.embedUrl || quickUrl.trim();

    const fileType = verificationResult?.category === 'doc'
      ? 'doc'
      : verificationResult?.category === 'xls'
      ? 'xls'
      : verificationResult?.category === 'image'
      ? 'image'
      : 'pdf';

    addFile({
      title: docTitle.trim(),
      category: docCategory,
      grade: docGrade,
      fileUrl: finalFileUrl,
      fileName: `${docTitle.trim()}.${fileType === 'pdf' ? 'pdf' : 'docx'}`,
      fileType: fileType as any,
      sizeMb: verificationResult?.fileSizeBytes ? +(verificationResult.fileSizeBytes / (1024 * 1024)).toFixed(1) : 2.5,
      description: docDescription || `مذكرة معتمدة مرفوعة بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
    });

    setFormNotice('⚡ تم حفظ المذكرة بنجاح في قاعدة البيانات Supabase!');
    setTimeout(() => {
      setShowQuickAddModal(false);
      setQuickUrl('');
      setVerificationResult(null);
      setDocTitle('');
      setDocDescription('');
      setFormNotice(null);
    }, 1200);
  };

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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Quick Verified Document Button for Admin/Secretary */}
          {isTeacherOrSec && (
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة مذكرة برابط مفحوص ⚡</span>
            </button>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-60">
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
      </div>

      {/* Quick Verified Add Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091224] border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-7 w-full max-w-xl space-y-5 shadow-2xl relative animate-scale-in">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                <FileCheck2 className="w-5 h-5 text-cyan-400" />
                <span>إضافة مذكرة أو مستند مفحوص الرابط والصفحات ⚡</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerifiedDoc} className="space-y-4">
              {/* URL Input & Verify Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 block">
                  رابط المذكرة أو المستند الخارجي (PDF / Google Drive / مباشر):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={quickUrl}
                      onChange={(e) => setQuickUrl(e.target.value)}
                      placeholder="https://example.com/file.pdf أو رابط Google Drive"
                      className="w-full p-2.5 ps-8 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white font-mono focus:outline-none"
                      required
                    />
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyDocLink}
                    disabled={isVerifying || !quickUrl.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>فحص الرابط...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>فحص الرابط وقراءة الصفحات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {formNotice && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  formNotice.includes('✅') || formNotice.includes('⚡')
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-600/50 text-amber-300'
                }`}>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{formNotice}</span>
                </div>
              )}

              {/* Verified Information Box */}
              {verificationResult && (
                <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/40 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-cyan-800/30 pb-1.5">
                    <span>نتائج الفحص الحي لترويسات الرابط (HEAD Metadata):</span>
                    <span className="text-[11px] bg-cyan-900/60 px-2 py-0.5 rounded text-cyan-200">
                      {verificationResult.contentType}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-400">عدد الصفحات المكتشف: </span>
                      <span className="font-bold text-white">
                        {verificationResult.pageCount ? `${verificationResult.pageCount} صفحة` : 'جاري العرض المتجاوب'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">حجم الملف المقروء: </span>
                      <span className="font-bold text-white">{verificationResult.fileSizeFormatted || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">دعم البث التدفقي الجزئي: </span>
                      <span className="font-bold text-emerald-400">
                        {verificationResult.acceptRanges ? 'مفعل (Accept-Ranges)' : 'تحميل تدريجي آمن'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">نوع المشغل: </span>
                      <span className="font-bold text-cyan-300">عارض مدمج بدون إعلانات</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields: Title, Category, Grade */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">عنوان المذكرة أو المستند:</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="مثال: مذكرة الباب الأول - الكيمياء العضوية"
                    className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">التصنيف:</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="مذكرات الشرح">مذكرات الشرح</option>
                      <option value="مذكرات المراجعة">مذكرات المراجعة</option>
                      <option value="ملخصات ومفاهيم">ملخصات ومفاهيم</option>
                      <option value="واجبات وتدريبات">واجبات وتدريبات</option>
                      <option value="نماذج امتحانات">نماذج امتحانات</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">الصف الدراسي:</label>
                    <select
                      value={docGrade}
                      onChange={(e) => setDocGrade(e.target.value as GradeLevel)}
                      className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="sec1">الصف الأول الثانوي</option>
                      <option value="sec2">الصف الثاني الثانوي</option>
                      <option value="sec3">الصف الثالث الثانوي</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">الوصف أو الملاحظات:</label>
                  <textarea
                    rows={2}
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    placeholder="وصف مختصر للمذكرة أو عدد صفحاتها ومحتواها..."
                    className="w-full p-2.5 bg-[#050811] border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!docTitle.trim() || !quickUrl.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>حفظ المذكرة في Supabase ⚡</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
