import React, { useState, useEffect, useRef } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  StickyNote,
  Palette,
  Download,
  Share2,
  Trash2,
  Undo,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Bookmark,
  FileDown,
  Layers,
  Grid,
  FileText,
  Sliders,
  X,
  Plus,
} from 'lucide-react';

interface SamsungNotesViewerProps {
  documentId: string;
  documentTitle: string;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  fileUrl?: string;
  onExportAnnotated?: () => void;
}

export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'sticky' | 'cursor';
export type PaperTemplate = 'blank' | 'ruled' | 'grid' | 'dark';

interface StickyNoteItem {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

export const SamsungNotesViewer: React.FC<SamsungNotesViewerProps> = ({
  documentId,
  documentTitle,
  currentPage,
  totalPages,
  onPageChange,
  fileUrl,
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [penColor, setPenColor] = useState<string>('#06b6d4'); // Chemistry Cyan
  const [penWidth, setPenWidth] = useState<number>(3);
  const [highlighterColor, setHighlighterColor] = useState<string>('#fde047'); // Neon Yellow
  const [highlighterWidth, setHighlighterWidth] = useState<number>(20);
  const [paperTemplate, setPaperTemplate] = useState<PaperTemplate>('blank');
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
  const [newStickyText, setNewStickyText] = useState('');
  const [isAddingSticky, setIsAddingSticky] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const storageKey = `samsung_notes_${documentId}_p${currentPage}`;

  const showSamsungNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Load saved drawings for this page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions to match container
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth || 800;
      canvas.height = parent.clientHeight || 1100;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = saved;
      }

      const savedSticky = localStorage.getItem(`${storageKey}_sticky`);
      if (savedSticky) {
        setStickyNotes(JSON.parse(savedSticky));
      } else {
        setStickyNotes([]);
      }
    } catch (e) {
      console.warn('Could not restore Samsung Notes annotations:', e);
    }
  }, [storageKey, currentPage]);

  // Save drawing strokes
  const saveDrawingState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem(storageKey, dataUrl);
      localStorage.setItem(`${storageKey}_sticky`, JSON.stringify(stickyNotes));
    } catch (e) {
      console.warn('Could not save Samsung Notes annotations:', e);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === 'cursor' || activeTool === 'sticky') return;
    isDrawingRef.current = true;
    const coords = getCanvasCoordinates(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

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
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = 0.35;
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }
    saveDrawingState();
  };

  const handleClearAll = () => {
    if (!confirm('هل تريد مسح جميع الملاحظات والشروحات المكتوبة بالقلم على هذه الصفحة؟')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStickyNotes([]);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_sticky`);
    showSamsungNotice('تم مسح شروحات الصفحة بنجاح.');
  };

  const handleAddSticky = () => {
    if (!newStickyText.trim()) return;
    const newNote: StickyNoteItem = {
      id: `sticky_${Date.now()}`,
      text: newStickyText.trim(),
      color: '#fef08a', // classic yellow post-it
      x: 40 + Math.random() * 40,
      y: 60 + Math.random() * 60,
    };
    const updated = [...stickyNotes, newNote];
    setStickyNotes(updated);
    setNewStickyText('');
    setIsAddingSticky(false);
    try {
      localStorage.setItem(`${storageKey}_sticky`, JSON.stringify(updated));
    } catch {}
    showSamsungNotice('تمت إضافة ملاحظة لاصقة على الصفحة!');
  };

  const handleRemoveSticky = (id: string) => {
    const updated = stickyNotes.filter((n) => n.id !== id);
    setStickyNotes(updated);
    try {
      localStorage.setItem(`${storageKey}_sticky`, JSON.stringify(updated));
    } catch {}
  };

  // Direct Open / Share to Samsung Notes on Android Tablets & Phones
  const handleOpenInSamsungNotes = async () => {
    if (fileUrl) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `مذكرة ${documentTitle} - مستر عمرو السيد`,
            text: `مذكرة كيمياء تفاعلية مع شروحات سامسونج نوت - مستر عمرو السيد`,
            url: window.location.href,
          });
          showSamsungNotice('تم فتح قائمة المشاركة وحفظ الملاحظات!');
          return;
        } catch {
          // fallback
        }
      }
    }
    showSamsungNotice('تم تجهيز الملاحظات والشروحات بنجاح!');
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none">
      {/* Top Floating Samsung Notes S-Pen Toolbar */}
      <div className="z-30 bg-[#0d162d]/95 backdrop-blur-md border-b border-cyan-800/40 p-2 sm:p-2.5 flex items-center justify-between gap-2 flex-wrap shadow-lg">
        {/* Left: S-Pen Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* S-Pen Branding Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600/30 to-cyan-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>سامسونج نوت S-Notes</span>
          </div>

          {/* Pen Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="قلم حبر سامسونج نوت للكتابة والرسم"
          >
            <Pen className="w-4 h-4" />
            <span className="hidden sm:inline">قلم حبر</span>
          </button>

          {/* Highlighter Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-amber-500 text-slate-900 shadow-md shadow-amber-500/30 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="قلم تحديد فسفوري لتظليل القوانين والمعادلات"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline">تظليل فسفوري</span>
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="الممحاة"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">ممحاة</span>
          </button>

          {/* Sticky Notes */}
          <button
            type="button"
            onClick={() => setIsAddingSticky((prev) => !prev)}
            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isAddingSticky
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="إضافة ملاحظة لاصقة على الصفحة"
          >
            <StickyNote className="w-4 h-4" />
            <span className="hidden sm:inline">ملاحظة لاصقة</span>
          </button>

          {/* Color Palettes for Pen */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
              {[
                { color: '#06b6d4', title: 'سماوي كيمياء' },
                { color: '#3b82f6', title: 'أزرق سامسونج' },
                { color: '#ef4444', title: 'أحمر تصحيح' },
                { color: '#f59e0b', title: 'ذهبي' },
                { color: '#ffffff', title: 'أبيض ناصع' },
                { color: '#10b981', title: 'أخضر زمردي' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setPenColor(c.color)}
                  style={{ backgroundColor: c.color }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    penColor === c.color ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.title}
                />
              ))}

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Stroke width */}
              {[2, 4, 7].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setPenWidth(w)}
                  className={`px-1.5 py-0.5 text-[10px] rounded font-bold cursor-pointer ${
                    penWidth === w ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          )}

          {/* Color Palettes for Highlighter */}
          {activeTool === 'highlighter' && (
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
              {[
                { color: '#fde047', title: 'أصفر فسفوري' },
                { color: '#86efac', title: 'أخضر نيون' },
                { color: '#f472b6', title: 'وردي فسفوري' },
                { color: '#7dd3fc', title: 'سماوي نيون' },
                { color: '#c084fc', title: 'بنفسجي' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setHighlighterColor(c.color)}
                  style={{ backgroundColor: c.color }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    highlighterColor === c.color ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.title}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Paper Template & Open in Samsung Notes */}
        <div className="flex items-center gap-1.5">
          {/* Paper Background Style */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setPaperTemplate('blank')}
              className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                paperTemplate === 'blank' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="ورقة عادية"
            >
              عادية
            </button>
            <button
              type="button"
              onClick={() => setPaperTemplate('ruled')}
              className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                paperTemplate === 'ruled' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="ورقة مسطرة كراسة"
            >
              مسطرة
            </button>
            <button
              type="button"
              onClick={() => setPaperTemplate('grid')}
              className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                paperTemplate === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="ورقة رسم بياني للكيمياء"
            >
              مربعات
            </button>
            <button
              type="button"
              onClick={() => setPaperTemplate('dark')}
              className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                paperTemplate === 'dark' ? 'bg-slate-950 text-cyan-300 border border-slate-600' : 'text-slate-400 hover:text-white'
              }`}
              title="وضع AMOLED الليلي"
            >
              AMOLED
            </button>
          </div>

          {/* Clear Page Annotations */}
          <button
            type="button"
            onClick={handleClearAll}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700/60 transition-colors cursor-pointer"
            title="مسح كل الشروحات من هذه الصفحة"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Open / Share Notes Button */}
          <button
            type="button"
            onClick={handleOpenInSamsungNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            title="مشاركة وحفظ الملاحظات"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>مشاركة الملاحظات 🖊️</span>
          </button>
        </div>
      </div>

      {/* Floating Notice */}
      {notice && (
        <div className="absolute top-16 right-4 z-40 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in border border-blue-400">
          <CheckCircle2 className="w-4 h-4 text-cyan-200" />
          <span>{notice}</span>
        </div>
      )}

      {/* Sticky Note Input Modal */}
      {isAddingSticky && (
        <div className="absolute top-16 left-4 z-40 bg-amber-100 text-slate-900 p-3 rounded-2xl shadow-2xl border-2 border-amber-400 w-72 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold flex items-center gap-1 text-amber-900">
              <StickyNote className="w-4 h-4 text-amber-700" />
              <span>ملاحظة سامسونج نوت لاصقة</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingSticky(false)}
              className="text-slate-600 hover:text-black p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={3}
            value={newStickyText}
            onChange={(e) => setNewStickyText(e.target.value)}
            placeholder="اكتب ملاحظة كيميائية سريعة، معادلة هامة، أو تنبيه امتحاني..."
            className="w-full bg-white/90 p-2 text-xs rounded-xl border border-amber-300 focus:outline-none text-slate-900 font-medium"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddSticky}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            إلصاق الملاحظة على الصفحة 📌
          </button>
        </div>
      )}

      {/* Drawing Canvas Layered Transparently Over Document */}
      <div
        className={`relative flex-1 overflow-auto flex items-center justify-center p-2 ${
          paperTemplate === 'ruled'
            ? 'bg-[linear-gradient(rgba(59,130,246,0.15)_1px,transparent_1px)] bg-[size:100%_28px] bg-slate-900'
            : paperTemplate === 'grid'
            ? 'bg-[radial-gradient(#38bdf8_1px,transparent_1px)] bg-[size:24px_24px] bg-slate-950'
            : paperTemplate === 'dark'
            ? 'bg-[#030611]'
            : 'bg-[#0b1429]'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 z-20 w-full h-full ${
            activeTool === 'eraser' ? 'cursor-cell' : activeTool === 'cursor' ? 'cursor-default' : 'cursor-crosshair'
          }`}
        />

        {/* Render Sticky Notes on the canvas */}
        {stickyNotes.map((note) => (
          <div
            key={note.id}
            style={{ top: `${note.y}px`, right: `${note.x}px` }}
            className="absolute z-25 p-3 rounded-2xl shadow-xl border border-amber-400 bg-amber-200 text-slate-900 max-w-xs text-xs font-semibold space-y-1.5 animate-fade-in group"
          >
            <div className="flex items-center justify-between border-b border-amber-300/80 pb-1">
              <span className="text-[10px] text-amber-900 font-bold flex items-center gap-1">
                <span>📌</span>
                <span>ملاحظة سامسونج نوت</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemoveSticky(note.id)}
                className="opacity-60 hover:opacity-100 text-rose-700 cursor-pointer p-0.5"
                title="حذف الملاحظة"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
