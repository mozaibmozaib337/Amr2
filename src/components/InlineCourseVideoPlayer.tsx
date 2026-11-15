import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Film,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { CourseLesson, Lecture, LessonSubSection } from '../types';
import { usePlatform } from '../context/PlatformContext';
import { convertGoogleDriveLink, parseYouTubeUrl } from '../utils/linkParser';
import { retrieveVideoBlob } from '../utils/videoStorage';
import {
  enterElementFullscreen,
  exitAnyFullscreen,
  getAnyFullscreenElement,
  subscribeFullscreenChange,
} from '../utils/fullscreen';

interface InlineCourseVideoPlayerProps {
  course: Lecture;
  lesson: CourseLesson;
  subSection: LessonSubSection;
}

export const InlineCourseVideoPlayer: React.FC<InlineCourseVideoPlayerProps> = ({
  course,
  lesson,
  subSection,
}) => {
  const {
    markLectureCompleted,
    isLectureCompleted,
    recordLectureEntry,
  } = usePlatform();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedKeyRef = useRef<string>('');

  const rawUrl = (subSection.videoUrl || course.videoUrl || '').trim();
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCssFallbackFs, setIsCssFallbackFs] = useState<boolean>(false);
  const isCssFallbackFsRef = useRef<boolean>(false);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState<boolean>(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  const isCompleted = isLectureCompleted ? isLectureCompleted(course.id) : false;

  // Record course/lesson entry once per opened video section
  useEffect(() => {
    const key = `${course.id}:${lesson.id}:${subSection.id}`;
    if (recordedKeyRef.current !== key) {
      recordedKeyRef.current = key;
      recordLectureEntry(course.id, `${course.title} — ${lesson.title}`);
    }
  }, [course.id, course.title, lesson.id, lesson.title, subSection.id, recordLectureEntry]);

  // Resolve video URL (YouTube / Google Drive / IndexedDB blob / Direct stream)
  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;
    setIsResolving(true);
    setVideoError(null);

    const resolve = async () => {
      const parsedYt = parseYouTubeUrl(rawUrl);
      if (parsedYt.isValid) {
        if (active) {
          setResolvedSrc(rawUrl);
          setIsResolving(false);
        }
        return;
      }

      const isDrive =
        /drive\.google\.com|drive\.usercontent\.google\.com/i.test(rawUrl) ||
        (!rawUrl && course.provider === 'drive' && Boolean(course.external_id));
      if (isDrive) {
        const driveSource =
          rawUrl || (course.external_id ? `https://drive.google.com/file/d/${course.external_id}/view` : '');
        const embed = convertGoogleDriveLink(driveSource);
        if (active) {
          setResolvedSrc(embed);
          setIsResolving(false);
        }
        return;
      }

      if (!rawUrl && course.id) {
        try {
          const blob = await retrieveVideoBlob(course.id);
          if (blob && active) {
            createdBlobUrl = URL.createObjectURL(blob);
            setResolvedSrc(createdBlobUrl);
            setIsResolving(false);
            return;
          }
        } catch {
          // Ignore IDB fallback errors
        }
      }

      if (active) {
        setResolvedSrc(rawUrl);
        setIsResolving(false);
      }
    };

    resolve();

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [rawUrl, course.id, course.provider, course.external_id]);

  // Listen to native Fullscreen & iOS Safari video fullscreen events
  useEffect(() => {
    const unsubNative = subscribeFullscreenChange((nativeActive) => {
      if (nativeActive) {
        isCssFallbackFsRef.current = false;
        setIsFullscreen(true);
        setIsCssFallbackFs(false);
      } else if (!isCssFallbackFsRef.current) {
        setIsFullscreen(false);
        setIsCssFallbackFs(false);
      }
    });

    const videoEl = videoRef.current as (HTMLVideoElement & {
      addEventListener: HTMLVideoElement['addEventListener'];
      removeEventListener: HTMLVideoElement['removeEventListener'];
    }) | null;

    const onWebkitBegin = () => {
      isCssFallbackFsRef.current = false;
      setIsFullscreen(true);
    };
    const onWebkitEnd = () => {
      isCssFallbackFsRef.current = false;
      setIsFullscreen(false);
      setIsCssFallbackFs(false);
    };

    videoEl?.addEventListener('webkitbeginfullscreen', onWebkitBegin as EventListener);
    videoEl?.addEventListener('webkitendfullscreen', onWebkitEnd as EventListener);

    return () => {
      unsubNative();
      videoEl?.removeEventListener('webkitbeginfullscreen', onWebkitBegin as EventListener);
      videoEl?.removeEventListener('webkitendfullscreen', onWebkitEnd as EventListener);
    };
  }, [resolvedSrc]);

  // Prevent background page scroll while CSS fullscreen fallback is active (e.g. iOS Safari/PWA)
  useEffect(() => {
    if (!isCssFallbackFs) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isCssFallbackFs]);

  // Sync HTML5 video playback rate when speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, resolvedSrc]);

  const targetUrl = resolvedSrc || rawUrl;
  const parsedYt = parseYouTubeUrl(targetUrl);
  const isYouTube = parsedYt.isValid && Boolean(parsedYt.external_id);
  const isDriveVideo =
    !isYouTube &&
    (/drive\.google\.com|drive\.usercontent\.google\.com/i.test(targetUrl) ||
      (!targetUrl && course.provider === 'drive'));
  const driveEmbedSrc = isDriveVideo
    ? convertGoogleDriveLink(
        targetUrl || (course.external_id ? `https://drive.google.com/file/d/${course.external_id}/view` : '')
      )
    : '';

  const ytEmbedSrc = isYouTube
    ? `https://www.youtube-nocookie.com/embed/${parsedYt.external_id}?rel=0&modestbranding=1&playsinline=1&fs=1&hl=ar`
    : '';

  const handleToggleFullscreen = async () => {
    if (isFullscreen || getAnyFullscreenElement()) {
      isCssFallbackFsRef.current = false;
      await exitAnyFullscreen(videoRef.current);
      setIsFullscreen(false);
      setIsCssFallbackFs(false);
      return;
    }

    const mode = await enterElementFullscreen(containerRef.current, {
      videoEl: videoRef.current,
      lockLandscape: true,
    });
    isCssFallbackFsRef.current = mode === 'css';
    setIsFullscreen(true);
    setIsCssFallbackFs(mode === 'css');
  };

  const handleMarkCompleted = async () => {
    if (isMarkingCompleted) return;
    setIsMarkingCompleted(true);
    try {
      await markLectureCompleted(course.id, `${course.title} — ${lesson.title}`);
      setCompletionToast('تم تسجيل إتمام المحاضرة بنجاح');
      setTimeout(() => setCompletionToast(null), 3500);
    } catch {
      setCompletionToast('تم حفظ التقدم');
      setTimeout(() => setCompletionToast(null), 3000);
    } finally {
      setIsMarkingCompleted(false);
    }
  };

  return (
    <div
      ref={containerRef}
      data-keep-dark="true"
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex flex-col justify-between overflow-hidden'
          : 'w-full bg-[#091224] border border-cyan-900/40 rounded-2xl overflow-hidden shadow-xl flex flex-col'
      }
      style={
        isFullscreen
          ? {
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }
          : undefined
      }
    >
      {/* Video Top Bar */}
      <div
        className={`px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 border-b ${
          isFullscreen
            ? 'bg-black/90 border-slate-800 text-white shrink-0'
            : 'bg-[#050811] border-slate-800/80 text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">
              {subSection.title}
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {lesson.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isYouTube && !isDriveVideo && Boolean(targetUrl) && (
            <select
              aria-label="سرعة التشغيل"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="min-h-[44px] sm:min-h-[38px] px-2.5 py-1 rounded-xl bg-[#091224] border border-slate-700 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                <option key={spd} value={spd}>
                  {spd}x
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title={isFullscreen ? 'تصغير الشاشة' : 'تكبير ملء الشاشة'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 shrink-0" />
                <span>تصغير</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 shrink-0" />
                <span>ملء الشاشة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Player Viewport */}
      <div
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${
          isFullscreen ? 'flex-1 min-h-0' : 'aspect-video'
        }`}
      >
        {isResolving ? (
          <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-slate-300">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs font-semibold">جاري تجهيز الفيديو...</span>
          </div>
        ) : !targetUrl ? (
          <div className="p-6 text-center space-y-2 max-w-md">
            <p className="text-sm font-bold text-amber-300">
              لم يقم المعلم بإرفاق رابط الفيديو لهذا القسم بعد.
            </p>
            <p className="text-xs text-slate-400">
              يمكنك اختيار أي قسم آخر من قائمة المحاضرات.
            </p>
          </div>
        ) : isYouTube ? (
          <iframe
            key={ytEmbedSrc}
            src={ytEmbedSrc}
            title={subSection.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
          />
        ) : isDriveVideo ? (
          <iframe
            key={driveEmbedSrc}
            src={driveEmbedSrc}
            title={subSection.title}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              key={targetUrl}
              src={targetUrl}
              controls
              playsInline
              preload="metadata"
              onError={() =>
                setVideoError(
                  'تعذر تشغيل الفيديو مباشرة. تأكد من صلاحية الرابط أو صيغة الملف.'
                )
              }
              className="w-full h-full object-contain bg-black"
            />
            {videoError && (
              <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 text-center">
                <p className="text-xs sm:text-sm text-amber-300 max-w-md">{videoError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Bar (Normal mode only) */}
      {!isFullscreen && (
        <div className="px-3.5 py-3 sm:px-4 bg-[#060b18] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs text-slate-400 truncate max-w-full sm:max-w-[55%]">
            {subSection.notes ? subSection.notes : `${course.chapterTitle} · ${lesson.title}`}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {completionToast && (
              <span className="text-xs font-bold text-emerald-400">{completionToast}</span>
            )}

            {isCompleted ? (
              <div className="min-h-[44px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تم إتمام المحاضرة</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleMarkCompleted}
                disabled={isMarkingCompleted}
                className="min-h-[44px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                {isMarkingCompleted ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>جاري التسجيل...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>تسجيل إتمام المحاضرة</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
