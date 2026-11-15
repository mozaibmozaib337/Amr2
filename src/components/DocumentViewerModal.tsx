import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
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

export const DocumentViewerModal: React.FC = () => {
  const { activeDocument, setActiveDocument } = usePlatform();

  const [zoom, setZoom] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [isNativeFs, setIsNativeFs] = useState<boolean>(false);
  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pagesHostRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const renderGenerationRef = useRef<number>(0);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const inFlightTasksRef = useRef<Map<number, RenderTask>>(new Map());
  const lazyObserverRef = useRef<IntersectionObserver | null>(null);
  const savedScrollYRef = useRef<number>(0);
  const historyPushedRef = useRef<boolean>(false);
  const closingViaPopstateRef = useRef<boolean>(false);

  const closeViewer = useCallback(
    (fromPopstate = false) => {
      if (fromPopstate) {
        closingViaPopstateRef.current = true;
      }
      exitAnyFullscreen().catch(() => {});
      setActiveDocument(null);
    },
    [setActiveDocument]
  );

  // Sync fullscreen status
  useEffect(() => {
    return subscribeFullscreenChange((active) => {
      setIsNativeFs(active);
    });
  }, []);

  // Preserve scroll position, lock body scroll, attempt Fullscreen API, and wire Back button / Esc
  useEffect(() => {
    if (!activeDocument) return;

    savedScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    setZoom(1);
    setNumPages(0);
    setCurrentPage(1);
    setIsLoading(true);
    setLoadError(null);

    closingViaPopstateRef.current = false;
    try {
      window.history.pushState(
        { ...(window.history.state || {}), __fileViewerOpen: true },
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
        closeViewer(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeViewer(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    // Attempt native Fullscreen API (falls back smoothly to CSS 100dvw x 100dvh on Safari/iOS/PWA)
    const fsTimer = window.setTimeout(() => {
      if (rootRef.current && !getAnyFullscreenElement()) {
        enterElementFullscreen(rootRef.current, { lockLandscape: false }).catch(() => {});
      }
    }, 30);

    return () => {
      window.clearTimeout(fsTimer);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      exitAnyFullscreen().catch(() => {});

      if (historyPushedRef.current && !closingViaPopstateRef.current) {
        historyPushedRef.current = false;
        try {
          if (window.history.state?.__fileViewerOpen) {
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
  }, [activeDocument, closeViewer]);

  // Classify active document source safely
  const docMeta = useMemo(() => {
    if (!activeDocument) {
      return classifyDocument('', '', '');
    }
    return classifyDocument(
      activeDocument.fileUrl,
      activeDocument.fileName,
      activeDocument.fileType
    );
  }, [activeDocument]);

  // Cancel all pending page render tasks safely
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

  // Render an individual PDF page onto its canvas at crisp DPR without any text layer
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

  // Build crisp full-width page slots and wire progressive lazy IntersectionObserver rendering
  const setupLazyPdfPages = useCallback(async () => {
    const pdfDoc = pdfDocRef.current;
    const host = pagesHostRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!pdfDoc || !host || !scrollEl) return;

    cleanupPdfRenderers();
    const gen = renderGenerationRef.current;
    const baseWidth = Math.max(240, scrollEl.clientWidth || window.innerWidth || 360);

    // Inspect page 1 aspect ratio to pre-size all page slots cleanly with zero layout jump
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

    // Eagerly render first 3 pages immediately for instant open
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
      // Fallback if IntersectionObserver unavailable
      for (let i = eagerCount; i < slots.length; i++) {
        if (gen !== renderGenerationRef.current) return;
        await renderSinglePage(i + 1, slots[i], gen);
      }
    }
  }, [cleanupPdfRenderers, renderSinglePage, zoom]);

  // Load document content (Blob fetch for Supabase/device PDFs & images, Drive iframe, Office embed)
  useEffect(() => {
    if (!activeDocument) return;

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
        // Local or data Office file: fetch as blob so user can download cleanly or see fallback
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
          // Fall back to direct URL in <img> if CORS prevents fetch
          if (!cancelled) {
            setBlobPreviewUrl(rawUrl);
          }
        });
      return;
    }

    // PDF: fetch inside app as ArrayBuffer -> Uint8Array + Blob, then load with CMaps & standard fonts
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
        console.error('[DocumentViewerModal] Load failed:', err);
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
  }, [activeDocument, docMeta, retryKey, cleanupPdfRenderers, setupLazyPdfPages]);

  // Re-layout PDF pages cleanly on zoom, viewport resize, or mobile orientation change
  useEffect(() => {
    if (docMeta.kind !== 'pdf' || !pdfDocRef.current) return;
    setupLazyPdfPages();
  }, [zoom, docMeta.kind, setupLazyPdfPages]);

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
      !activeDocument ||
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
  }, [activeDocument, docMeta.kind, isLoading, loadError, retryKey]);

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

  const handleRetryOrRefresh = () => {
    setLoadError(null);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  };

  const handleToggleNativeFs = async () => {
    if (getAnyFullscreenElement()) {
      await exitAnyFullscreen();
      return;
    }
    if (rootRef.current) {
      await enterElementFullscreen(rootRef.current, { lockLandscape: false });
    }
  };

  const handleDownloadClick = () => {
    if (!activeDocument) return;
    downloadDocumentSafely(
      docMeta.rawUrl,
      activeDocument.fileName || `${activeDocument.title || 'document'}.pdf`,
      blobPreviewUrl
    );
  };

  if (!activeDocument) return null;

  const { title, fileName } = activeDocument;
  const { embedUrl, kind, isDrive } = docMeta;

  return (
    <div
      ref={rootRef}
      data-keep-dark="true"
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, width: '100dvw', height: '100dvh' }}
      className="z-[9999] bg-white overflow-hidden select-none"
    >
      {/* Fixed Close X Button (>= 44px touch target) */}
      <button
        type="button"
        onClick={() => closeViewer(false)}
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

      {/* Compact Translucent Bottom File Toolbar (page indicator, zoom, refresh, download, fullscreen) */}
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
          onClick={handleRetryOrRefresh}
          aria-label="تحديث"
          title="تحديث العرض"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {docMeta.rawUrl && (
          <button
            type="button"
            onClick={handleDownloadClick}
            aria-label="تحميل الملف"
            title="تحميل"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 text-cyan-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleNativeFs}
          aria-label={isNativeFs ? 'تصغير الشاشة' : 'تكبير الشاشة'}
          title={isNativeFs ? 'تصغير الشاشة' : 'تكبير الشاشة'}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
        >
          {isNativeFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && !loadError && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center gap-3 p-6 text-slate-700">
          <Loader2 className="w-9 h-9 animate-spin text-cyan-600" />
          <p className="text-sm font-bold">جاري تحميل وعرض الملف...</p>
        </div>
      )}

      {/* Error State + Retry Button */}
      {loadError && (
        <div className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center gap-4 p-6 text-center text-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-extrabold text-slate-900">تعذر تحميل الملف</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{loadError}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleRetryOrRefresh}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
            {blobPreviewUrl && (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الملف</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => closeViewer(false)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Main Edge-to-Edge White Document Content Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScrollTrackPage}
        className="w-full h-full overflow-auto m-0 p-0 bg-white"
      >
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
              {/* Transparent Pop-Out Corner Guard over Google Drive's Open-in-New-Tab icon */}
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
