import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  X,
  FileText,
  FileSpreadsheet,
  Image,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ShieldCheck,
  CheckCircle2,
  Pen,
  Highlighter,
  Eraser,
  Undo,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  MousePointer,
  Check,
  Palette,
  Layers,
} from 'lucide-react';
import { InBrowserPdfViewer } from './InBrowserPdfViewer';

type AnnotationTool = 'cursor' | 'pen' | 'highlighter' | 'eraser';

export const DocumentViewerModal: React.FC = () => {
  const { activeDocument, setActiveDocument, currentUser } = usePlatform();

  // Zoom state: 50% to 300%
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Samsung Notes Drawing Tools State
  const [activeTool, setActiveTool] = useState<AnnotationTool>('cursor');
  const [penColor, setPenColor] = useState<string>('#06b6d4'); // Chemistry Cyan
  const [penWidth, setPenWidth] = useState<number>(3);
  const [highlighterColor, setHighlighterColor] = useState<string>('rgba(253, 224, 71, 0.42)'); // Neon Yellow
  const [highlighterWidth, setHighlighterWidth] = useState<number>(24);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // History stack for Undo
  const [history, setHistory] = useState<ImageData[]>([]);

  // Refs
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Anti-piracy dynamic floating watermark
  const [watermarkPos, setWatermarkPos] = useState({ top: 28, left: 28 });

  useEffect(() => {
    if (!activeDocument) return;
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 60) + 18;
      const randomLeft = Math.floor(Math.random() * 55) + 18;
      setWatermarkPos({ top: randomTop, left: randomLeft });
    }, 3500);
    return () => clearInterval(interval);
  }, [activeDocument]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard shortcut blocker while viewing documents
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'p')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Resize and restore drawing canvas when zoom or document changes
  const syncCanvasDimensions = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const wrapper = contentWrapperRef.current;
    if (!canvas || !wrapper) return;

    const width = wrapper.scrollWidth || wrapper.clientWidth || 900;
    const height = wrapper.scrollHeight || wrapper.clientHeight || 1200;

    if (canvas.width !== width || canvas.height !== height) {
      // Temporarily preserve existing image data if present
      const ctx = canvas.getContext('2d');
      let prevImg: ImageData | null = null;
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        try {
          prevImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch {
          // ignore
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx && prevImg) {
        ctx.putImageData(prevImg, 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    syncCanvasDimensions();
    const timer = setTimeout(syncCanvasDimensions, 400);
    return () => clearTimeout(timer);
  }, [zoom, activeDocument, syncCanvasDimensions]);

  // Load saved annotations for this document from localStorage
  useEffect(() => {
    if (!activeDocument) return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const storageKey = `samsung_notes_doc_${activeDocument.fileName || activeDocument.title}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          saveToHistory();
        };
        img.src = saved;
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHistory([]);
      }
    } catch {
      // ignore
    }
  }, [activeDocument]);

  const saveToHistory = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-15), snapshot]);

      // Save to localStorage permanently
      if (activeDocument) {
        const storageKey = `samsung_notes_doc_${activeDocument.fileName || activeDocument.title}`;
        localStorage.setItem(storageKey, canvas.toDataURL('image/png'));
      }
    } catch {
      // ignore
    }
  };

  const handleUndo = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas || history.length <= 1) {
      if (canvas && history.length === 1) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setHistory([]);
          showToast('تم التراجع ومسح الملاحظات.');
        }
      }
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current
    const previous = newHistory[newHistory.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(newHistory);
    showToast('تم التراجع ↩️');
  };

  const handleClearAll = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    if (activeDocument) {
      const storageKey = `samsung_notes_doc_${activeDocument.fileName || activeDocument.title}`;
      localStorage.removeItem(storageKey);
    }
    showToast('تم مسح جميع الملاحظات من المستند 🗑️');
  };

  // Drawing Event Handlers
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'cursor') return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCoordinates(e);
    lastPointRef.current = pt;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);

    if (activeTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = highlighterWidth;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 28;
      ctx.lineCap = 'round';
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activeTool === 'cursor') return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const current = getCoordinates(e);
    const last = lastPointRef.current || current;

    // Smooth quadratic curve for natural handwriting
    const midX = (last.x + current.x) / 2;
    const midY = (last.y + current.y) / 2;
    ctx.quadraticCurveTo(last.x, last.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = current;
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = annotationCanvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    saveToHistory();
  };

  const handleExportAnnotated = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ملاحظات_${activeDocument?.title || 'كيمياء'}_2026.png`;
      a.click();
      showToast('تم حفظ وتحميل ملاحظاتك بنجاح 💾');
    } catch {
      showToast('تعذر الحفظ');
    }
  };

  if (!activeDocument) return null;

  const { title, fileUrl, fileName, fileType } = activeDocument;
  const inferredType =
    fileType ||
    (fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')
      ? 'xls'
      : fileName?.endsWith('.docx') || fileName?.endsWith('.doc')
      ? 'doc'
      : fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i)
      ? 'image'
      : 'pdf');

  const isExcel = inferredType === 'xls' || inferredType === 'xlsx';
  const isDoc = inferredType === 'doc' || inferredType === 'docx';
  const isImage = inferredType === 'image';
  const isPdf = !isExcel && !isDoc && !isImage;

  const getIcon = () => {
    if (isExcel) return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (isDoc) return <FileText className="w-5 h-5 text-blue-400" />;
    if (isImage) return <Image className="w-5 h-5 text-amber-400" />;
    return <FileText className="w-5 h-5 text-cyan-400" />;
  };

  const getBadgeLabel = () => {
    if (isExcel) return 'مستند إكسل Excel Spreadsheet';
    if (isDoc) return 'مستند وورد Word Document';
    if (isImage) return 'شيت مصور / صورة عالية الدقة';
    return 'مستند PDF معتمد';
  };

  const penColors = [
    { label: 'أزرق كيميائي', value: '#06b6d4' },
    { label: 'أصفر مشع', value: '#fde047' },
    { label: 'أحمر تنبيه', value: '#ef4444' },
    { label: 'أخضر تفاعل', value: '#22c55e' },
    { label: 'أبيض ناصع', value: '#ffffff' },
    { label: 'بنفسجي ملكي', value: '#a855f7' },
  ];

  const highlighterColors = [
    { label: 'أصفر فسفوري', value: 'rgba(253, 224, 71, 0.42)' },
    { label: 'أخضر فسفوري', value: 'rgba(74, 222, 128, 0.42)' },
    { label: 'وردي فسفوري', value: 'rgba(244, 114, 182, 0.42)' },
    { label: 'سماوي شفاف', value: 'rgba(56, 189, 248, 0.42)' },
  ];

  return (
    <div
      ref={modalContainerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isFullscreen ? 'p-0 w-screen h-screen' : 'p-2 sm:p-4'
      } bg-black/95 backdrop-blur-md animate-fade-in select-none`}
    >
      <div
        className={`bg-[#0b1429] border border-cyan-800/60 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'rounded-2xl w-full max-w-7xl h-[95vh]'
        } overflow-hidden shadow-2xl flex flex-col text-slate-100 transition-all relative`}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-bold rounded-full shadow-2xl backdrop-blur-md animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* 1. TOP HEADER BAR */}
        <div className="p-3 bg-[#080d1b] border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-cyan-950/80 rounded-xl border border-cyan-800/60 text-cyan-400 shrink-0 shadow-md">
              {getIcon()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
                {title || fileName || 'مستند تعليمي'}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-cyan-400">
                <span className="font-semibold">{getBadgeLabel()}</span>
                <span>·</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>مشغل سامسونج نوتس التفاعلي 2026</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions: Fullscreen inside Platform & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Internal Fullscreen Toggle (Never exits the platform) */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e1c38] hover:bg-[#13274e] border border-cyan-700/60 hover:border-cyan-400 text-cyan-300 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'شاشة كاملة داخل المنصة'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'نافذة كاملة داخل المنصة'}</span>
            </button>

            {/* Save & Export Annotated Snapshot */}
            <button
              onClick={handleExportAnnotated}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              title="حفظ الملاحظات كصورة"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">حفظ الملاحظات</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => setActiveDocument(null)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800 transition-colors cursor-pointer"
              title="إغلاق المستند"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. SAMSUNG NOTES INTERACTIVE TOOLBAR (Pens, Highlighters, Eraser, Zoom, Colors) */}
        <div className="px-3 py-2 bg-[#060c1c] border-b border-cyan-950 flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Main Annotation Tools */}
          <div className="flex items-center gap-1.5 bg-[#091224] p-1 rounded-xl border border-cyan-900/40">
            {/* Cursor / Scroll Tool */}
            <button
              onClick={() => {
                setActiveTool('cursor');
                setIsColorMenuOpen(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'cursor'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="تصفح وتحريك الصفحة"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصفح</span>
            </button>

            {/* Writing Pen (قلم الكتابة) */}
            <button
              onClick={() => {
                setActiveTool('pen');
                setIsColorMenuOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-cyan-400 hover:bg-cyan-950/50'
              }`}
              title="قلم الكتابة (اضغط لاختيار الألوان والسُمك)"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>قلم الكتابة 🖊️</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/60 inline-block"
                style={{ backgroundColor: penColor }}
              />
            </button>

            {/* Fluorescent Highlighter / Marker (قلم ماركر فسفوري) */}
            <button
              onClick={() => {
                setActiveTool('highlighter');
                setIsColorMenuOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'highlighter'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                  : 'text-amber-400 hover:bg-amber-950/50'
              }`}
              title="قلم ماركر فسفوري لتحديد النصوص والمسائل"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>ماركر التحديد 🖍️</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/60 inline-block"
                style={{ backgroundColor: highlighterColor.replace(/[\d.]+\)$/, '1)') }}
              />
            </button>

            {/* Eraser Tool (الممحاة) */}
            <button
              onClick={() => {
                setActiveTool('eraser');
                setIsColorMenuOpen(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'eraser'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-red-300'
              }`}
              title="ممحاة لمسح الشخبطة والكتابة"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ممحاة</span>
            </button>

            {/* Undo Button */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              title="تراجع عن آخر خطوة (Undo)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            {/* Clear All Annotations */}
            <button
              onClick={handleClearAll}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
              title="مسح كافة الملاحظات والرسومات"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls (تصغير وتكبير سلس كما تشاء من 50% إلى 300%) */}
          <div className="flex items-center gap-1.5 bg-[#091224] p-1 rounded-xl border border-cyan-900/40">
            <button
              onClick={() => setZoom((prev) => Math.max(50, prev - 15))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="تصغير (-15%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setZoom(100)}
              className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-[11px] font-mono text-cyan-300 font-bold transition-colors cursor-pointer"
              title="إعادة الضبط للحجم الطبيعي 100%"
            >
              {zoom}%
            </button>

            <button
              onClick={() => setZoom((prev) => Math.min(300, prev + 15))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="تكبير (+15%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Fit Width shortcut */}
            <button
              onClick={() => setZoom(135)}
              className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-[10px] font-bold text-cyan-300 rounded-lg transition-colors cursor-pointer"
              title="ملاءمة عرض الشاشة"
            >
              عرض الشاشة
            </button>
          </div>

        </div>

        {/* 3. COLOR & STROKE PALETTE SUB-BAR (Shows when Pen or Highlighter is active) */}
        {isColorMenuOpen && (activeTool === 'pen' || activeTool === 'highlighter') && (
          <div className="px-4 py-2 bg-[#081024] border-b border-cyan-900/50 flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>{activeTool === 'pen' ? 'ألوان القلم:' : 'ألوان الماركر التحديدي:'}</span>
              </span>

              {/* Color Swatches */}
              <div className="flex items-center gap-1.5">
                {(activeTool === 'pen' ? penColors : highlighterColors).map((c) => {
                  const isSelected = activeTool === 'pen' ? penColor === c.value : highlighterColor === c.value;
                  const displayBg = activeTool === 'pen' ? c.value : c.value.replace(/[\d.]+\)$/, '1)');
                  return (
                    <button
                      key={c.value}
                      onClick={() => {
                        if (activeTool === 'pen') setPenColor(c.value);
                        else setHighlighterColor(c.value);
                      }}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: displayBg }}
                      title={c.label}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stroke Thickness Picker */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">سُمك الخط:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                {activeTool === 'pen' ? (
                  [
                    { label: 'رفيع', val: 2 },
                    { label: 'متوسط', val: 4 },
                    { label: 'عريض', val: 7 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setPenWidth(s.val)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                        penWidth === s.val ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))
                ) : (
                  [
                    { label: '16px', val: 16 },
                    { label: '24px', val: 24 },
                    { label: '36px', val: 36 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setHighlighterWidth(s.val)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                        highlighterWidth === s.val ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. MAIN DOCUMENT VIEWER CANVAS + INTERACTIVE DRAWING OVERLAY */}
        <div
          ref={scrollContainerRef}
          className="flex-1 bg-[#040813] overflow-auto p-4 sm:p-6 relative flex justify-center items-start"
          style={{ cursor: activeTool === 'cursor' ? 'default' : 'crosshair' }}
        >
          {/* Scalable Container with Zoom Applied Smoothly */}
          <div
            ref={contentWrapperRef}
            className="relative shadow-2xl rounded-xl overflow-hidden transition-transform duration-100 ease-out origin-top max-w-full"
            style={{
              transform: `scale(${zoom / 100})`,
              marginBottom: `${Math.max(0, (zoom - 100) * 8)}px`,
            }}
          >
            {/* UNDERLYING DOCUMENT: PDF / Word / Excel / Image */}
            <div className="bg-[#0b1429] w-full md:min-w-[750px] min-h-[1050px] text-slate-100 relative">
              {isExcel ? (
                /* Excel Spreadsheet View */
                <div className="p-6 bg-[#0a1428] border border-cyan-900/40 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-cyan-800/40 pb-3">
                    <span className="font-extrabold text-white text-sm flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <span>{title || fileName}</span>
                    </span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                      Excel Workbook
                    </span>
                  </div>
                  <table className="w-full text-right text-xs border border-slate-700">
                    <thead>
                      <tr className="bg-[#121e3a] text-cyan-300 border-b border-slate-700">
                        <th className="p-2.5 border-r border-slate-700 text-center w-12 font-mono">#</th>
                        <th className="p-2.5 border-r border-slate-700">المركب / العنصر</th>
                        <th className="p-2.5 border-r border-slate-700">التوزيع وحالة التأكسد</th>
                        <th className="p-2.5 border-r border-slate-700">اللون والخواص المغناطيسية</th>
                        <th className="p-2.5">الملاحظات والاستخدامات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {[
                        { a: 'السكانديوم (Sc 21)', b: '[Ar] 4s² 3d¹ (حالة تأكسد +3 فقط)', c: 'غير ملون ودايامغناطيسي', d: 'سبائك مع الألومنيوم لطائرات الميج' },
                        { a: 'التيتانيوم (Ti 22)', b: '[Ar] 4s² 3d² (+2, +3, +4)', c: 'TiO₂ أبيض واقي من أشعة الشمس', d: 'زراعة الأسنان والمفاصل الصناعية' },
                        { a: 'الفانديوم (V 23)', b: '[Ar] 4s² 3d³ (+2, +3, +4, +5)', c: 'V₂O₅ صبغة في السيراميك والزجاج', d: 'زنبركات السيارات لصلابتها ومقاومة التآكل' },
                        { a: 'الكروم (Cr 24)', b: '[Ar] 4s¹ 3d⁵ (توزيع شاذ)', c: 'Cr³⁺ لونه أخضر بارامغناطيسي', d: 'دباغة الجلود وطلاء المعادن لحمايتها' },
                        { a: 'المنجنيز (Mn 25)', b: '[Ar] 4s² 3d⁵ (+2 إلى +7)', c: 'KMnO₄ مادة مؤكسدة ومطهرة بنفسجية', d: 'سبائك الحديد والمنجنيز أصلب من الصلب' },
                        { a: 'الحديد (Fe 26)', b: '[Ar] 4s² 3d⁶ (+2, +3)', c: 'Fe³⁺ أصفر باهت Fe²⁺ أخضر', d: 'الخرسانات وأبراج الكهرباء والسبائك' },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-cyan-950/20">
                          <td className="p-2.5 border-r border-slate-800 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 border-r border-slate-800 font-bold text-white">{row.a}</td>
                          <td className="p-2.5 border-r border-slate-800 font-mono text-cyan-300">{row.b}</td>
                          <td className="p-2.5 border-r border-slate-800 font-semibold text-emerald-400">{row.c}</td>
                          <td className="p-2.5 text-slate-300">{row.d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : isDoc ? (
                /* Word Document View */
                <div className="p-8 bg-[#0a1428] border border-cyan-900/40 rounded-xl space-y-4 max-w-3xl mx-auto">
                  <div className="border-b border-cyan-800/40 pb-4">
                    <h3 className="font-extrabold text-lg text-white">{title || fileName}</h3>
                    <p className="text-xs text-cyan-400 font-semibold">مذكرة مراجعة الكيمياء 2026 - مستر عمرو السيد</p>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                    <p className="font-bold text-white">الباب الأول: العناصر الانتقالية وتفاعلات الحديد</p>
                    <p>
                      تشمل السلسلة الانتقالية الأولى 10 عناصر تبدأ بالسكانديوم وتنتهي بالخارصين، ويتتابع فيها امتلاء المستوى الفرعي 3d بالإلكترونات.
                    </p>
                    <div className="p-4 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs space-y-1.5">
                      <span className="font-bold text-cyan-300 block">قوانين وملاحظات هامة:</span>
                      <p>• تفاعل أكسيد الحديد المغناطيسي Fe₃O₄ مع الأحماض المركزة الساخنة يعطي خليطاً من أملاح الحديد II والحديد III.</p>
                      <p>• يتفاعل الحديد مع الكلور بالتسخين معطياً كلوريد الحديد III فقط لأن غاز الكلور عامل مؤكسد قوي.</p>
                    </div>
                  </div>
                </div>
              ) : isImage ? (
                /* High-Res Sheet Image */
                <div className="flex items-center justify-center p-4 bg-black/40">
                  <img
                    src={fileUrl}
                    alt={title || fileName}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  />
                </div>
              ) : (
                /* PDF Canvas / Embed Viewer (Zero external redirection) */
                <InBrowserPdfViewer
                  fileUrl={fileUrl}
                  fileName={fileName}
                  title={title}
                />
              )}
            </div>

            {/* OVERLAY DRAWING CANVAS (Samsung Notes Drawing Layer) */}
            <canvas
              ref={annotationCanvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              className="absolute inset-0 w-full h-full z-20 touch-none"
              style={{
                pointerEvents: activeTool === 'cursor' ? 'none' : 'auto',
              }}
            />
          </div>

          {/* DYNAMIC MOVING ANTI-PIRACY WATERMARK (Moves randomly every 3.5s) */}
          <div
            className="absolute pointer-events-none select-none z-40 transition-all duration-1000 ease-out"
            style={{
              top: `${watermarkPos.top}%`,
              left: `${watermarkPos.left}%`,
            }}
          >
            <div className="bg-black/80 backdrop-blur-md border border-cyan-500/50 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-cyan-300 shadow-2xl flex items-center gap-1.5 opacity-70">
              <span>
                {currentUser
                  ? `🛡️ الطالب: ${currentUser.name} | كود: ${currentUser.studentCode || currentUser.phone || 'معتمد'} | منصة مستر عمرو السيد 01069780486`
                  : '🛡️ منصة مستر عمرو السيد في الكيمياء · محمي ضد التصوير والقرصنة'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. FOOTER STATUS BAR */}
        <div className="px-4 py-2.5 bg-[#080d1b] border-t border-cyan-900/40 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>عرض آمن ومحمي بالكامل داخل المنصة · تدوين ملاحظات وتكبير سلس بنظام سامسونج نوتس</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>التكبير: {zoom}%</span>
            <span>·</span>
            <span>الأداة: {activeTool === 'pen' ? 'قلم الكتابة' : activeTool === 'highlighter' ? 'ماركر التحديد' : activeTool === 'eraser' ? 'ممحاة' : 'تصفح'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
