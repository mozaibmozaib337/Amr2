import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  RotateCcw,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  enterElementFullscreen,
  exitAnyFullscreen,
  getAnyFullscreenElement,
  subscribeFullscreenChange,
} from '../utils/fullscreen';
import {
  classifyDocument,
  downloadDocumentSafely,
  fetchDocumentAsBlob,
  loadPdfFromBytes,
} from '../utils/pdfRenderer';

interface InBrowserPdfViewerProps {
  fileUrl: string;
  fileName?: string;
  title?: string;
  fileType?: string;
}

export const InBrowserPdfViewer: React.FC<InBrowserPdfViewerProps> = ({
  fileUrl,
  fileName,
  title,
  fileType,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [isFullViewport, setIsFullViewport] = useState<boolean>(false);
  const [isNativeFs, setIsNativeFs] = useState<boolean>(false);
  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);

  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pagesHostRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const renderGenerationRef = useRef<number>(0);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const inFlightTasksRef = useRef<Map<number, RenderTask>>(new Map());
  const lazyObserverRef = useRef<IntersectionObserver | null>(null);
  const isCssFallbackFsRef = useRef<boolean>(false);
  const savedScrollYRef = useRef<number>(0);
  const historyPushedRef = useRef<boolean>(false);
  const closingViaPopstateRef = useRef<boolean>(false);

  const docMeta = useMemo(
    () => classifyDocument(fileUrl, fileName, fileType),
    [fileUrl, fileName, fileType]
  );

  // Sync native Fullscreen API changes cleanly with full-viewport mode
  useEffect(() => {
    return subscribeFullscreenChange((nativeActive) => {
      setIsNativeFs(nativeActive);
      if (nativeActive) {
        isCssFallbackFsRef.current = false;
        setIsFullViewport(true);
      } else if (!isCssFallbackFsRef.current) {
        setIsFullViewport(false);
      }
    });
  }, []);

  const closeFullViewport = useCallback((fromPopstate = false) => {
    if (fromPopstate) {
      closingViaPopstateRef.current = true;
    }
    isCssFallbackFsRef.current = false;
    exitAnyFullscreen().catch(() => {});
    setIsFullViewport(false);
  }, []);

  const openFullViewport = useCallback(async () => {
    savedScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    setIsFullViewport(true);
    const mode = await enterElementFullscreen(viewerRootRef.current, {
      lockLandscape: false,
    });
    isCssFallbackFsRef.current = mode === 'css';
  }, []);

  // Manage scroll restoration, body lock, and mobile Back button / Esc when full-viewport is active
  useEffect(() => {
    if (!isFullViewport) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    closingViaPopstateRef.current = false;
    try {
      window.history.pushState(
        { ...(window.history.state || {}), __inlineFileFullscreen: true },
        '',
        window.location.href
      );
      historyPushedRef.current = true;
    } catch {
      historyPushedRef.current = false;
    }

    const handlePopState = () => {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        closeFullViewport(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFullViewport(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;

      if (historyPushedRef.current && !closingViaPopstateRef.current) {
        historyPushedRef.current = false;
        try {
          if (window.history.state?.__inlineFileFullscreen) {
            window.history.back();
          }
        } catch {
          // ignore
        }
      }

      const targetY = savedScrollYRef.current;
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: 'auto' });
      });
    };
  }, [isFullViewport, closeFullViewport]);

  const cleanupPdfRenderers = useCallback(() => {
    renderGenerationRef.current++;
    if (lazyObserverRef.current) {
      lazyObserverRef.current.disconnect();
      lazyObserverRef.current = null;
    }
    inFlightTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch {
        // ignore
      }
    });
    inFlightTasksRef.current.clear();
    renderedPagesRef.current.clear();
  }, []);

  const renderSinglePage = useCallback(
    async (pageNum: number, slotEl: HTMLDivElement, gen: number) => {
      const pdfDoc = pdfDocRef.current;
      const scrollEl = scrollContainerRef.current;
      if (!pdfDoc || !scrollEl || gen !== renderGenerationRef.current) return;
      if (renderedPagesRef.current.has(pageNum)) return;
      renderedPagesRef.current.add(pageNum);

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (gen !== renderGenerationRef.current) return;

        const baseWidth = Math.max(240, scrollEl.clientWidth || window.innerWidth || 360);
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const baseViewport = page.getViewport({ scale: 1 });
        const fitWidthScale = baseWidth / Math.max(1, baseViewport.width);
        const renderScale = fitWidthScale * zoom;
        const viewport = page.getViewport({ scale: renderScale });

        const cssW = Math.floor(viewport.width);
        const cssH = Math.floor(viewport.height);

        slotEl.style.width = `${cssW}px`;
        slotEl.style.height = `${cssH}px`;

        let canvas = slotEl.querySelector('canvas');
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.className = 'block bg-white w-full h-full';
          slotEl.innerHTML = '';
          slotEl.appendChild(canvas);
        }

        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        const renderTask = page.render({
          canvas,
          canvasContext: ctx,
          transform,
          viewport,
        });
        inFlightTasksRef.current.set(pageNum, renderTask);
        await renderTask.promise;
        inFlightTasksRef.current.delete(pageNum);
      } catch (err: any) {
        inFlightTasksRef.current.delete(pageNum);
        if (err?.name !== 'RenderingCancelledException' && gen === renderGenerationRef.current) {
          renderedPagesRef.current.delete(pageNum);
          console.warn(`PDF page ${pageNum} render warning:`, err);
        }
      }
    },
    [zoom]
  );

  const setupLazyPdfPages = useCallback(async () => {
    const pdfDoc = pdfDocRef.current;
    const host = pagesHostRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!pdfDoc || !host || !scrollEl) return;

    cleanupPdfRenderers();
    const gen = renderGenerationRef.current;
    const baseWidth = Math.max(240, scrollEl.clientWidth || window.innerWidth || 360);

    const page1 = await pdfDoc.getPage(1);
    if (gen !== renderGenerationRef.current) return;
    const p1Base = page1.getViewport({ scale: 1 });
    const defaultAspect = p1Base.height / Math.max(1, p1Base.width);
    const estWidth = Math.floor(baseWidth * zoom);
    const estHeight = Math.floor(estWidth * defaultAspect);

    host.innerHTML = '';
    const slots: HTMLDivElement[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const slot = document.createElement('div');
      slot.dataset.page = String(pageNum);
      slot.className = 'relative bg-white border-b border-slate-200/70 last:border-b-0 shrink-0';
      slot.style.width = `${estWidth}px`;
      slot.style.height = `${estHeight}px`;
      host.appendChild(slot);
      slots.push(slot);
    }

    const eagerCount = Math.min(3, slots.length);
    for (let i = 0; i < eagerCount; i++) {
      if (gen !== renderGenerationRef.current) return;
      await renderSinglePage(i + 1, slots[i], gen);
    }

    if (slots.length > eagerCount && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const slotEl = entry.target as HTMLDivElement;
            const p = Number(slotEl.dataset.page || 0);
            if (p > 0) {
              renderSinglePage(p, slotEl, gen);
            }
          });
        },
        {
          root: scrollEl,
          rootMargin: '1100px 0px',
          threshold: 0.01,
        }
      );

      for (let i = eagerCount; i < slots.length; i++) {
        observer.observe(slots[i]);
      }
      lazyObserverRef.current = observer;
    } else {
      for (let i = eagerCount; i < slots.length; i++) {
        if (gen !== renderGenerationRef.current) return;
        await renderSinglePage(i + 1, slots[i], gen);
      }
    }
  }, [cleanupPdfRenderers, renderSinglePage, zoom]);

  // Load document content (Blob fetch for Supabase/uploaded PDF & Images, Drive preview iframe, Office embed)
  useEffect(() => {
    const { rawUrl, kind } = docMeta;
    if (!rawUrl) {
      setIsLoading(false);
      setLoadError('رابط الملف غير متوفر أو فارغ.');
      return;
    }

    let cancelled = false;
    cleanupPdfRenderers();
    pdfDocRef.current = null;
    setNumPages(0);
    setCurrentPage(1);
    setLoadError(null);
    setIsLoading(true);

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setBlobPreviewUrl(null);

    if (kind === 'drive' || kind === 'iframe') {
      return;
    }

    if (kind === 'office') {
      const isPublicHttp = /^https?:\/\//i.test(rawUrl);
      if (!isPublicHttp) {
        fetchDocumentAsBlob(rawUrl, docMeta.mimeHint)
          .then((loaded) => {
            if (cancelled) {
              URL.revokeObjectURL(loaded.blobUrl);
              return;
            }
            activeBlobUrlRef.current = loaded.blobUrl;
            setBlobPreviewUrl(loaded.blobUrl);
            setIsLoading(false);
            setLoadError(
              'ملفات Word و PowerPoint المرفوعة محلياً تتطلب تحويلها لـ PDF للعرض المباشر على الصفحة، يمكنك تحميل الملف الآن.'
            );
          })
          .catch((err: any) => {
            if (cancelled) return;
            setIsLoading(false);
            setLoadError(err?.message || 'تعذر تحميل مستند Office.');
          });
      }
      return;
    }

    if (kind === 'image') {
      fetchDocumentAsBlob(rawUrl, 'image/png')
        .then((loaded) => {
          if (cancelled) {
            URL.revokeObjectURL(loaded.blobUrl);
            return;
          }
          activeBlobUrlRef.current = loaded.blobUrl;
          setBlobPreviewUrl(loaded.blobUrl);
          setIsLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setBlobPreviewUrl(rawUrl);
          }
        });
      return;
    }

    const loadPdf = async () => {
      try {
        const loaded = await fetchDocumentAsBlob(rawUrl, 'application/pdf');
        if (cancelled) {
          URL.revokeObjectURL(loaded.blobUrl);
          return;
        }
        activeBlobUrlRef.current = loaded.blobUrl;
        setBlobPreviewUrl(loaded.blobUrl);

        const pdfDoc = await loadPdfFromBytes(loaded.bytes);
        if (cancelled) {
          Promise.resolve(pdfDoc.cleanup?.()).catch(() => {});
          return;
        }

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);
        await setupLazyPdfPages();
      } catch (err: any) {
        if (cancelled) return;
        console.error('[InBrowserPdfViewer] Load failed:', err);
        setIsLoading(false);
        setLoadError(err?.message || 'تعذر تحميل وعرض الملف. تأكد من اتصالك ثم أعد المحاولة.');
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      cleanupPdfRenderers();
      if (pdfDocRef.current) {
        Promise.resolve(pdfDocRef.current.cleanup?.()).catch(() => {});
        pdfDocRef.current = null;
      }
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [docMeta, retryKey, cleanupPdfRenderers, setupLazyPdfPages]);

  // Re-layout PDF pages cleanly on zoom, full-viewport toggle, resize, or orientationchange
  useEffect(() => {
    if (docMeta.kind !== 'pdf' || !pdfDocRef.current) return;
    const raf = requestAnimationFrame(() => {
      setupLazyPdfPages();
    });
    return () => cancelAnimationFrame(raf);
  }, [zoom, isFullViewport, docMeta.kind, setupLazyPdfPages]);

  useEffect(() => {
    if (docMeta.kind !== 'pdf' || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    let timer: number | null = null;

    const scheduleRerender = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (pdfDocRef.current) {
          setupLazyPdfPages();
        }
      }, 180);
    };

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleRerender())
        : null;
    observer?.observe(el);
    window.addEventListener('orientationchange', scheduleRerender);

    return () => {
      if (timer) window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('orientationchange', scheduleRerender);
    };
  }, [docMeta.kind, setupLazyPdfPages]);

  // Timeout check for Drive / Office / iframe sources
  useEffect(() => {
    if (
      (docMeta.kind !== 'drive' && docMeta.kind !== 'office' && docMeta.kind !== 'iframe') ||
      !isLoading ||
      loadError
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      setIsLoading(false);
      setLoadError('استغرق تحميل الملف وقتاً أطول من المعتاد. تأكد من صلاحية الملف ثم اضغط إعادة المحاولة.');
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [docMeta.kind, isLoading, loadError, retryKey]);

  const handleScrollTrackPage = () => {
    const scrollEl = scrollContainerRef.current;
    const host = pagesHostRef.current;
    if (!scrollEl || !host || numPages <= 0) return;

    const slots = host.querySelectorAll<HTMLDivElement>('div[data-page]');
    const scrollTop = scrollEl.scrollTop + scrollEl.clientHeight * 0.25;
    let active = 1;
    slots.forEach((slotEl) => {
      if (slotEl.offsetTop <= scrollTop) {
        const p = Number(slotEl.dataset.page || 1);
        if (p > 0) active = p;
      }
    });
    if (active !== currentPage) setCurrentPage(active);
  };

  const handleRefresh = () => {
    setLoadError(null);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  };

  const handleDownloadClick = () => {
    downloadDocumentSafely(
      docMeta.rawUrl,
      fileName || `${title || 'document'}.pdf`,
      blobPreviewUrl
    );
  };

  const { embedUrl, kind, isDrive } = docMeta;

  return (
    <div
      ref={viewerRootRef}
      data-keep-dark={isFullViewport ? 'true' : undefined}
      onContextMenu={(e) => e.preventDefault()}
      style={
        isFullViewport
          ? { position: 'fixed', inset: 0, width: '100dvw', height: '100dvh' }
          : undefined
      }
      className={
        isFullViewport
          ? 'z-[9999] bg-white overflow-hidden select-none flex flex-col'
          : 'w-full h-full flex flex-col bg-white overflow-hidden relative rounded-xl select-none'
      }
    >
      {/* Inline Top Action Toolbar (Only visible when NOT in full-viewport reader) */}
      {!isFullViewport && (
        <div className="px-3 py-2 bg-[#0a1122] border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={openFullViewport}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              title="فتح الملف على الشاشة بالكامل"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>فتح الملف</span>
            </button>

            {kind === 'pdf' && numPages > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold tabular-nums text-cyan-300 whitespace-nowrap">
                {currentPage} / {numPages}
              </span>
            )}

            <div className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-1 font-mono font-bold text-[11px] tabular-nums text-slate-200 cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              title="تحديث العرض"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadClick}
              className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-700/50 text-cyan-300 hover:text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              title="تحميل الملف"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل</span>
            </button>

            <button
              type="button"
              onClick={openFullViewport}
              className="min-h-[40px] px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow"
              title="تكبير الشاشة"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>تكبير الشاشة</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Corner X Close Button (>= 44px) in Full-Viewport Mode */}
      {isFullViewport && (
        <button
          type="button"
          onClick={() => closeFullViewport(false)}
          aria-label="إغلاق عارض الملف"
          title="إغلاق والرجوع"
          style={{
            top: 'max(12px, env(safe-area-inset-top))',
            right: 'max(12px, env(safe-area-inset-right))',
          }}
          className="fixed z-[10001] min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/25 shadow-xl backdrop-blur-md flex items-center justify-center cursor-pointer transition-transform active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Translucent Floating Bottom File Toolbar in Full-Viewport Mode */}
      {isFullViewport && (
        <div
          style={{
            bottom: 'max(12px, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="fixed z-[10001] flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/75 border border-white/20 text-white text-xs shadow-xl backdrop-blur-md max-w-[calc(100dvw-24px)]"
        >
          {kind === 'pdf' && numPages > 0 && (
            <>
              <span className="px-2 font-mono font-bold tabular-nums text-[11px] text-cyan-200 whitespace-nowrap">
                {currentPage} / {numPages}
              </span>
              <span className="w-px h-4 bg-white/20" />
            </>
          )}

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
            aria-label="تصغير"
            title="تصغير"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setZoom(1)}
            title="ملاءمة العرض الكامل"
            className="px-2 min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 font-mono font-bold text-[11px] tabular-nums cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
            aria-label="تكبير"
            title="تكبير"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-white/20" />

          <button
            type="button"
            onClick={handleRefresh}
            aria-label="تحديث"
            title="تحديث"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDownloadClick}
            aria-label="تحميل الملف"
            title="تحميل"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 text-cyan-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (getAnyFullscreenElement()) {
                closeFullViewport(false);
              } else {
                closeFullViewport(false);
              }
            }}
            aria-label={isNativeFs ? 'تصغير الشاشة' : 'إغلاق ملء الشاشة'}
            title={isNativeFs ? 'تصغير الشاشة' : 'تصغير الشاشة'}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* White Document Viewport Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScrollTrackPage}
        className="flex-1 w-full overflow-auto m-0 p-0 bg-white relative"
      >
        {isLoading && !loadError && (
          <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center gap-3 p-6 text-slate-700">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            <p className="text-xs sm:text-sm font-bold">جاري تحميل وعرض الملف...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center gap-4 p-6 text-center text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">تعذر تحميل الملف</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{loadError}</p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={handleRefresh}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
              {blobPreviewUrl && (
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل الملف</span>
                </button>
              )}
            </div>
          </div>
        )}

        {kind === 'pdf' && (
          <div
            ref={pagesHostRef}
            className="w-full min-h-full m-0 p-0 flex flex-col items-start bg-white"
          />
        )}

        {kind === 'image' && !loadError && blobPreviewUrl && (
          <div className="w-full min-h-full m-0 p-0 flex items-start justify-start bg-white">
            <img
              key={`${blobPreviewUrl}_${retryKey}`}
              src={blobPreviewUrl}
              alt={title || fileName || 'صورة الملف'}
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setLoadError('تعذر تحميل الصورة. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
              }}
              style={{
                width: `${zoom * 100}%`,
                height: 'auto',
                maxWidth: 'none',
                display: 'block',
              }}
            />
          </div>
        )}

        {(kind === 'drive' || kind === 'office' || kind === 'iframe') &&
          !loadError &&
          embedUrl && (
            <div
              className="w-full h-full m-0 p-0 bg-white relative"
              style={
                zoom !== 1
                  ? {
                      width: `${zoom * 100}%`,
                      height: `${zoom * 100}%`,
                    }
                  : undefined
              }
            >
              {/* Transparent Pop-Out Corner Guard over Google Drive's Open-in-New-Tab button */}
              {isDrive && (
                <>
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute top-0 right-0 w-24 h-20 z-40 bg-transparent pointer-events-auto cursor-default"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute top-0 left-0 w-24 h-20 z-40 bg-transparent pointer-events-auto cursor-default"
                  />
                </>
              )}

              <iframe
                key={`${embedUrl}_${retryKey}`}
                src={embedUrl}
                title={title || fileName || 'عرض المستند'}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError('تعذر عرض المستند داخل الصفحة.');
                }}
                className="w-full h-full border-0 block bg-white"
                allowFullScreen
                sandbox={
                  isDrive
                    ? 'allow-scripts allow-same-origin allow-forms'
                    : undefined
                }
              />
            </div>
          )}
      </div>
    </div>
  );
};
