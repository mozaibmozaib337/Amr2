import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  RotateCw,
  Eye,
  Layers,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface InBrowserPdfViewerProps {
  fileUrl: string;
  fileName?: string;
  title?: string;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const InBrowserPdfViewer: React.FC<InBrowserPdfViewerProps> = ({
  fileUrl,
  fileName,
  title,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [viewEngine, setViewEngine] = useState<'canvas' | 'native'>('canvas');
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');
  const [isBrowserPageOpen, setIsBrowserPageOpen] = useState<boolean>(false);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [loadTimedOut, setLoadTimedOut] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(false);
  const [showFsControls, setShowFsControls] = useState<boolean>(true);

  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const fsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const continuousContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const triggerFsControlsTimer = () => {
    setShowFsControls(true);
    if (fsHideTimerRef.current) clearTimeout(fsHideTimerRef.current);
    if (document.fullscreenElement) {
      fsHideTimerRef.current = setTimeout(() => {
        setShowFsControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsPdfFullscreen(active);
      if (fsHideTimerRef.current) clearTimeout(fsHideTimerRef.current);
      if (active) {
        setShowFsControls(false);
      } else {
        setShowFsControls(true);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (fsHideTimerRef.current) clearTimeout(fsHideTimerRef.current);
    };
  }, []);

  const togglePdfFullscreen = () => {
    const el = viewerRootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Helper to convert base64 data to binary Uint8Array
  const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Google Drive 10s timeout timer
  useEffect(() => {
    const isDrive = fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com');
    if (isDrive) {
      setViewEngine('native');
      setIframeLoaded(false);
      setLoadTimedOut(false);
      const timer = setTimeout(() => {
        setLoadTimedOut(true);
      }, 10000); // 10 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [fileUrl, iframeKey]);

  // Load PDF Document with PDF.js
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setRenderError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      // 1. If Google Drive or Telegram post: immediately use isolated native view
      if (fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com') || fileUrl.includes('t.me') || fileUrl.includes('telegram.me')) {
        if (!isCancelled) {
          setViewEngine('native');
          setIsLoading(false);
        }
        return;
      }

      try {
        // Wait briefly for CDN script if needed
        let pdfjs = window.pdfjsLib;
        if (!pdfjs) {
          await new Promise((res) => setTimeout(res, 600));
          pdfjs = window.pdfjsLib;
        }

        if (!pdfjs) {
          // Fall back gracefully to native iframe
          if (!isCancelled) {
            setViewEngine('native');
            setIsLoading(false);
          }
          return;
        }

        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        let source: any;
        if (fileUrl.startsWith('data:')) {
          source = { data: dataUrlToUint8Array(fileUrl) };
        } else {
          source = fileUrl;
        }

        const loadingTask = pdfjs.getDocument(source);
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) return;
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('PDF.js canvas load failed, switching to native embed:', err);
          // Auto-fallback to native embed so user NEVER sees a broken view!
          setViewEngine('native');
          setRenderError(err.message || 'تم التبديل للعرض المباشر المدعوم بالمتصفح.');
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Render Page for Single Page Mode (Canvas)
  useEffect(() => {
    if (viewEngine !== 'canvas' || viewMode !== 'single' || !pdfDocRef.current || isLoading) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale, rotation });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: ctx,
          transform,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, scale, rotation, viewMode, viewEngine, isLoading]);

  // Render All Pages for Continuous Scroll Mode (Canvas)
  useEffect(() => {
    if (viewEngine !== 'canvas' || viewMode !== 'continuous' || !pdfDocRef.current || isLoading) return;

    const container = continuousContainerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const renderAllPages = async () => {
      for (let p = 1; p <= numPages; p++) {
        try {
          const page = await pdfDocRef.current.getPage(p);
          const viewport = page.getViewport({ scale, rotation });
          const canvas = document.createElement('canvas');
          canvas.className = 'rounded-xl shadow-2xl bg-white mb-6 mx-auto block max-w-full';
          container.appendChild(canvas);

          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = Math.floor(viewport.width) + 'px';
          canvas.style.height = Math.floor(viewport.height) + 'px';

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
            await page.render({ canvasContext: ctx, transform, viewport }).promise;
          }
        } catch (e) {
          console.warn('Continuous page render error:', e);
        }
      }
    };

    renderAllPages();
  }, [viewMode, viewEngine, scale, rotation, numPages, isLoading]);

  // Clean formatted URL for Google Drive preview, Telegram direct embed, or direct PDF
  let unwrappedFileUrl = fileUrl;
  if (unwrappedFileUrl.includes('url=')) {
    try {
      const match = unwrappedFileUrl.match(/url=([^&]+)/);
      if (match && match[1]) {
        unwrappedFileUrl = decodeURIComponent(match[1]);
      }
    } catch {}
  }

  const isGoogleDrive = unwrappedFileUrl.includes('drive.google.com') || unwrappedFileUrl.includes('docs.google.com');
  const tgMatch = unwrappedFileUrl.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
  const isTelegram = !!tgMatch;

  const safeEmbedUrl = isGoogleDrive
    ? (() => {
        const driveMatch = unwrappedFileUrl.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/)([a-zA-Z0-9_-]+)/i);
        if (driveMatch && driveMatch[1]) {
          return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        return unwrappedFileUrl.replace(/\/view(\?.*)?$/, '/preview');
      })()
    : isTelegram
    ? `https://t.me/${tgMatch[1]}/${tgMatch[2]}?embed=1`
    : unwrappedFileUrl;

  return (
    <div
      ref={viewerRootRef}
      data-keep-dark={isPdfFullscreen ? 'true' : undefined}
      onClick={() => {
        if (isPdfFullscreen) {
          setShowFsControls((prev) => {
            const next = !prev;
            if (fsHideTimerRef.current) clearTimeout(fsHideTimerRef.current);
            if (next) {
              fsHideTimerRef.current = setTimeout(() => setShowFsControls(false), 3000);
            }
            return next;
          });
        }
      }}
      onPointerMove={(e) => {
        if (isPdfFullscreen && e.pointerType === 'mouse') {
          triggerFsControlsTimer();
        }
      }}
      className={`w-full h-full flex flex-col bg-[#070c18] overflow-hidden text-slate-100 relative ${
        isPdfFullscreen ? 'rounded-none w-screen h-[100dvh]' : 'rounded-xl'
      }`}
    >
      {/* PDF Action Toolbar (Completely hidden in Fullscreen mode) */}
      {!isPdfFullscreen && (
      <div className="p-2 sm:p-3 bg-[#0a1122] border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Engine Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-cyan-900/40">
          <button
            onClick={() => setViewEngine('canvas')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewEngine === 'canvas'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>مشغل تفاعلي Canvas</span>
          </button>
          <button
            onClick={() => {
              setViewEngine('native');
              setIsBrowserPageOpen(true);
            }}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewEngine === 'native'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'bg-emerald-950/80 text-emerald-300 hover:text-white border border-emerald-800/40'
            }`}
            title="فتح المستند في صفحة كاملة داخل المنصة بقارئ المتصفح المباشر"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-300" />
            <span>عرض في التصفح المباشر (صفحة داخل المنصة) ⚡</span>
          </button>
        </div>

        {/* Navigation for Single Mode */}
        {viewEngine === 'canvas' && numPages > 0 && viewMode === 'single' && (
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-cyan-900/40">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-cyan-300 px-1">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Mode Toggle (Canvas only) */}
        {viewEngine === 'canvas' && (
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-cyan-900/40">
            <button
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              صفحة بصفحة
            </button>
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'continuous'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تمرير متصل
            </button>
          </div>
        )}

        {/* Zoom & Rotation Controls (Canvas only) */}
        {viewEngine === 'canvas' && (
          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-cyan-900/40">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-300 px-1">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-1" />
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="تدوير الصفحة 90 درجة"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* In-Platform Download & Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePdfFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-700/50 text-cyan-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            title="ملء الشاشة"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ملء الشاشة</span>
          </button>
          <a
            href={fileUrl}
            download={fileName || 'chemistry-document.pdf'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
            title="تحميل الملف على جهازك"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل</span>
          </a>
        </div>
      </div>
      )}

      {/* Floating Controls in Fullscreen Mode (Auto-hides after 3s, toggleable by tap) */}
      {isPdfFullscreen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-cyan-500/40 shadow-2xl transition-opacity duration-300 text-xs ${
            showFsControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {viewEngine === 'canvas' && numPages > 0 && viewMode === 'single' && (
            <>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-cyan-300 px-1">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            </>
          )}
          <button
            type="button"
            onClick={togglePdfFullscreen}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer"
            title="الخروج من الشاشة الكاملة"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>خروج من ملء الشاشة</span>
          </button>
        </div>
      )}

      {/* PDF Viewport Area */}
      <div
        className={`flex-1 bg-[#050811] overflow-auto flex flex-col items-center justify-start relative select-none ${
          isPdfFullscreen ? 'p-0' : 'p-2 sm:p-4'
        }`}
      >
        {isLoading && viewEngine === 'canvas' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050811]/90 z-20 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
            <p className="text-xs font-bold text-white">جاري تجهيز وعرض صفحات الـ PDF بدقة عالية...</p>
          </div>
        )}

        {/* Native Browser Embed (Foolproof, renders on 100% of browsers inside platform) */}
        {viewEngine === 'native' && (
          <div
            className={`w-full h-full overflow-hidden bg-white shadow-2xl relative select-none ${
              isPdfFullscreen ? 'rounded-none' : 'rounded-xl'
            }`}
          >
            {/* Pop-out icon blocker mask for Google Drive (~70x70px top-right corner) */}
            {isGoogleDrive && (
              <div
                className="absolute top-0 right-0 w-[72px] h-[72px] z-40 bg-transparent cursor-default pointer-events-auto"
                title=""
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onContextMenu={(e) => e.preventDefault()}
              />
            )}

            {/* Skeleton Loader while iframe is loading */}
            {!iframeLoaded && (
              <div className="absolute inset-0 z-20 bg-[#060b18] flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-white">جاري تحميل وعرض المستند من Google Drive...</p>
                  <p className="text-[11px] text-slate-400">يتم الفتح داخل عارض المنصة المدمج الآمن بدون تنزيل أو روابط خارجية</p>
                </div>

                {/* 10s Timeout Message & Retry Button */}
                {loadTimedOut && (
                  <div className="mt-2 p-3 bg-amber-950/80 border border-amber-600/50 rounded-xl text-center space-y-2 max-w-sm animate-fade-in">
                    <p className="text-[11px] text-amber-200 font-semibold">
                      ⚠️ الملف كبير أو أن اتصال السيرفر استغرق وقتاً أطول. جرّب لاحقاً أو أعد تحميل الصفحة.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIframeLoaded(false);
                        setLoadTimedOut(false);
                        setIframeKey((k) => k + 1);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      إعادة المحاولة ↻
                    </button>
                  </div>
                )}
              </div>
            )}

            <iframe
              key={iframeKey}
              src={safeEmbedUrl}
              title={title || fileName || 'عرض مستند PDF'}
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        )}

        {/* Single Page Canvas View */}
        {viewEngine === 'canvas' && viewMode === 'single' && (
          <div className="flex flex-col items-center justify-center my-auto">
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-2xl bg-white max-w-full transition-transform duration-150"
            />
          </div>
        )}

        {/* Continuous Scroll View */}
        {viewEngine === 'canvas' && viewMode === 'continuous' && (
          <div
            ref={continuousContainerRef}
            className="w-full flex flex-col items-center space-y-4 py-2"
          />
        )}
      </div>

      {/* DEDICATED IN-PLATFORM FULL PAGE BROWSER VIEWER (صفحة جديدة كاملة داخل المنصة وليست تبويب خارجي مع زر الإغلاق X) */}
      {isBrowserPageOpen && (
        <div
          className="fixed inset-0 z-70 bg-black/95 backdrop-blur-md flex flex-col animate-fade-in"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header Bar (Hidden in Fullscreen mode) */}
          {!isPdfFullscreen && (
            <div className="bg-[#070d1c] border-b border-cyan-800/80 px-4 py-3 flex items-center justify-between text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>{title || fileName || 'قراءة المستند بالتصفح المباشر'}</span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800">
                      صفحة مدمجة بالمنصة
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    عرض وقراءة المستند بنظام المتصفح المباشر مع الحماية من الخروج أو كشف المصدر
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePdfFullscreen}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-700/60 transition-all cursor-pointer flex items-center gap-1.5"
                  title="ملء الشاشة"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-xs font-bold hidden sm:inline">ملء الشاشة</span>
                </button>

                {/* Close Button X */}
                <button
                  onClick={() => setIsBrowserPageOpen(false)}
                  className="p-2 rounded-xl bg-red-950/80 hover:bg-red-800 text-red-200 hover:text-white border border-red-700 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  title="إغلاق والرجوع للمنصة (X)"
                >
                  <X className="w-5 h-5" />
                  <span className="text-xs font-bold hidden sm:inline">إغلاق الصفحة ✕</span>
                </button>
              </div>
            </div>
          )}

          {/* Full Screen Reader Viewport */}
          <div className="flex-1 bg-white relative overflow-hidden">
            {/* Pop-out icon blocker mask for Google Drive */}
            {isGoogleDrive && (
              <>
                <div
                  className="absolute top-0 right-0 w-32 h-24 z-40 bg-transparent cursor-default pointer-events-auto"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
                <div
                  className="absolute top-0 left-0 w-32 h-24 z-40 bg-transparent cursor-default pointer-events-auto"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </>
            )}

            <iframe
              src={safeEmbedUrl}
              title={title || fileName || 'عرض تصفح مباشر داخل المنصة'}
              className="w-full h-full border-0 select-none"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      )}
    </div>
  );
};
