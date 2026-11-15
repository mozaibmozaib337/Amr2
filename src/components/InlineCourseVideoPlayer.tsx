import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  FastForward,
  Film,
  Gauge,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
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
import {
  cleanupVideoElement,
  clearMediaSession,
  pauseAllOtherVideos,
  setActiveMediaSession,
} from '../utils/mediaSession';

interface InlineCourseVideoPlayerProps {
  course: Lecture;
  lesson: CourseLesson;
  subSection: LessonSubSection;
}

function formatHMS(secs: number): string {
  if (!isFinite(secs) || isNaN(secs) || secs < 0) return '00:00:00';
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const seekbarRef = useRef<HTMLDivElement>(null);
  const recordedKeyRef = useRef<string>('');
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const isScrubbingRef = useRef(false);
  const savedTimeRef = useRef<number>(0);
  const wasUnloadedRef = useRef<boolean>(false);

  const rawUrl = (subSection.videoUrl || course.videoUrl || '').trim();
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<{ type: 'forward' | 'backward' } | null>(null);

  // Fullscreen state (Container-only native FS or CSS 100dvw x 100dvh fallback)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCssFallbackFs, setIsCssFallbackFs] = useState<boolean>(false);
  const isCssFallbackFsRef = useRef<boolean>(false);

  const [isMarkingCompleted, setIsMarkingCompleted] = useState<boolean>(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  const isCompleted = isLectureCompleted ? isLectureCompleted(course.id) : false;

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

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
    setIsPlaying(false);
    setIsEnded(false);
    setCurrentTime(0);
    setDuration(0);
    setShowControls(true);

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
      cleanupVideoElement(videoRef.current);
      clearMediaSession();
      savedTimeRef.current = 0;
      wasUnloadedRef.current = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [rawUrl, course.id, course.provider, course.external_id]);

  // Listen strictly to container native fullscreen events (never <video> fullscreen)
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
    return () => unsubNative();
  }, []);

  // Lock background page scroll while CSS fullscreen fallback is active (e.g. iOS Safari/PWA)
  useEffect(() => {
    if (!isCssFallbackFs) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [isCssFallbackFs]);

  // Sync HTML5 video playback rate & volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, resolvedSrc]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, resolvedSrc]);

  const targetUrl = (resolvedSrc || rawUrl).replace(/([?&])autoplay=1/gi, '$1autoplay=0');
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
    ? `https://www.youtube-nocookie.com/embed/${parsedYt.external_id}?autoplay=0&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&fs=1&hl=ar`
    : '';

  const stopAndUnloadMedia = useCallback((preservePosition: boolean) => {
    const video = videoRef.current;
    if (video) {
      if (preservePosition && Number.isFinite(video.currentTime) && video.currentTime > 0) {
        savedTimeRef.current = video.currentTime;
      } else if (!preservePosition) {
        savedTimeRef.current = 0;
      }
      cleanupVideoElement(video);
      wasUnloadedRef.current = preservePosition;
    }
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }),
          '*'
        );
      } catch {}
    }
    clearMediaSession();
    setIsPlaying(false);
  }, []);

  // Stop & unload video when page goes to background, tab hides, page hides, or section/component unmounts
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopAndUnloadMedia(true);
      }
    };
    const handlePageHide = () => {
      stopAndUnloadMedia(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      stopAndUnloadMedia(false);
    };
  }, [stopAndUnloadMedia, subSection.id]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !isScrubbing && !isSpeedMenuOpen && !showVolumeSlider) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3200);
    }
  }, [isPlaying, isScrubbing, isSpeedMenuOpen, showVolumeSlider]);

  const toggleControlsVisibility = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      if (next && isPlaying && !isScrubbing && !isSpeedMenuOpen && !showVolumeSlider) {
        hideControlsTimerRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3200);
      }
      return next;
    });
  }, [isPlaying, isScrubbing, isSpeedMenuOpen, showVolumeSlider]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, isScrubbing, isFullscreen, resetControlsTimer]);

  const handleToggleFullscreen = async () => {
    if (isFullscreen || getAnyFullscreenElement()) {
      isCssFallbackFsRef.current = false;
      await exitAnyFullscreen();
      setIsFullscreen(false);
      setIsCssFallbackFs(false);
      setShowControls(true);
      return;
    }

    const mode = await enterElementFullscreen(containerRef.current, {
      lockLandscape: true,
    });
    isCssFallbackFsRef.current = mode === 'css';
    setIsFullscreen(true);
    setIsCssFallbackFs(mode === 'css');
    resetControlsTimer();
  };

  const togglePlay = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      clearMediaSession();
      setIsPlaying(false);
    } else {
      pauseAllOtherVideos(video);
      if (wasUnloadedRef.current || !video.getAttribute('src')) {
        video.setAttribute('src', targetUrl);
        video.load();
        wasUnloadedRef.current = false;
        const restorePos = savedTimeRef.current;
        if (restorePos > 0) {
          const seekOnReady = () => {
            try {
              video.currentTime = restorePos;
            } catch {}
            video.removeEventListener('loadedmetadata', seekOnReady);
          };
          video.addEventListener('loadedmetadata', seekOnReady);
        }
      } else if (isEnded) {
        video.currentTime = 0;
        savedTimeRef.current = 0;
        setIsEnded(false);
      }
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    resetControlsTimer();
  };

  const effectiveDuration = duration > 0 ? duration : 0;

  const skipTime = (seconds: number, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const maxDur = effectiveDuration > 0 ? effectiveDuration : video.duration || 0;
    const target = Math.max(0, maxDur > 0 ? Math.min(maxDur, video.currentTime + seconds) : video.currentTime + seconds);
    video.currentTime = target;
    setCurrentTime(target);
    resetControlsTimer();
    setSeekFeedback({ type: seconds > 0 ? 'forward' : 'backward' });
    setTimeout(() => setSeekFeedback(null), 500);
  };

  // Single tap toggles controls ONLY (never pauses/plays). Double tap seeks ±10s.
  const handleViewportTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isYouTube || isDriveVideo || !targetUrl) return;
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX > rect.width / 2;
    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(clickX - lastTapRef.current.x);

    if (timeDiff < 300 && distDiff < 65) {
      skipTime(isRightHalf ? 10 : -10);
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: clickX };
      setIsSpeedMenuOpen(false);
      setShowVolumeSlider(false);
      toggleControlsVisibility();
    }
  };

  const calculateScrubTime = (clientX: number) => {
    if (!seekbarRef.current || effectiveDuration <= 0) return 0;
    const rect = seekbarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * effectiveDuration;
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (effectiveDuration <= 0) return;
    setIsScrubbing(true);
    const initial = calculateScrubTime(e.clientX);
    setScrubTime(initial);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const onMove = (ev: PointerEvent) => {
      setScrubTime(calculateScrubTime(ev.clientX));
    };

    const onUp = (ev: PointerEvent) => {
      const finalTime = calculateScrubTime(ev.clientX);
      setIsScrubbing(false);
      setScrubTime(null);
      if (videoRef.current) {
        videoRef.current.currentTime = finalTime;
      }
      setCurrentTime(finalTime);
      resetControlsTimer();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (!next && volume === 0) setVolume(0.7);
      return next;
    });
    resetControlsTimer();
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

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = effectiveDuration > 0 ? (displayTime / effectiveDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      data-keep-dark="true"
      onContextMenu={(e) => e.preventDefault()}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') {
          resetControlsTimer();
        }
      }}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-[100dvw] h-[100dvh] bg-black flex flex-col justify-between overflow-hidden select-none'
          : 'w-full bg-[#091224] border border-cyan-900/40 rounded-2xl overflow-hidden shadow-xl flex flex-col select-none'
      }
      style={
        isFullscreen
          ? {
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }
          : undefined
      }
    >
      {/* Top Bar */}
      <div
        className={`px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2.5 border-b ${
          isFullscreen
            ? `bg-black/85 border-slate-800/80 text-white shrink-0 transition-opacity duration-300 ${
                showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`
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

        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          title={isFullscreen ? 'تصغير الشاشة' : 'تكبير ملء الشاشة'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 shrink-0" />
              <span>خروج من ملء الشاشة</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 shrink-0" />
              <span>ملء الشاشة</span>
            </>
          )}
        </button>
      </div>

      {/* Video Player Viewport */}
      <div
        onClick={handleViewportTap}
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
            ref={iframeRef}
            key={ytEmbedSrc}
            src={ytEmbedSrc}
            title={subSection.title}
            className="w-full h-full border-0"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
          />
        ) : isDriveVideo ? (
          <iframe
            ref={iframeRef}
            key={driveEmbedSrc}
            src={driveEmbedSrc}
            title={subSection.title}
            className="w-full h-full border-0"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              key={targetUrl}
              src={targetUrl}
              playsInline
              {...({ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' } as Record<string, string>)}
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload noplaybackrate nofullscreen"
              preload="metadata"
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={() => {
                if (
                  videoRef.current &&
                  videoRef.current.duration &&
                  !isNaN(videoRef.current.duration) &&
                  isFinite(videoRef.current.duration)
                ) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onTimeUpdate={() => {
                if (videoRef.current && !isScrubbingRef.current) {
                  const cur = videoRef.current.currentTime;
                  savedTimeRef.current = cur;
                  setCurrentTime(cur);
                  if (
                    videoRef.current.duration &&
                    !isNaN(videoRef.current.duration) &&
                    isFinite(videoRef.current.duration)
                  ) {
                    setDuration(videoRef.current.duration);
                  }
                }
              }}
              onPlay={() => {
                pauseAllOtherVideos(videoRef.current);
                setIsPlaying(true);
                setIsEnded(false);
                setVideoError(null);
                setActiveMediaSession({
                  title: subSection.title,
                  artist: lesson.title,
                  album: course.title,
                  onPlay: () => videoRef.current?.play().catch(() => {}),
                  onPause: () => videoRef.current?.pause(),
                  onStop: () => stopAndUnloadMedia(false),
                });
              }}
              onPause={() => {
                setIsPlaying(false);
                clearMediaSession();
              }}
              onEnded={() => {
                setIsPlaying(false);
                setIsEnded(true);
                setShowControls(true);
                clearMediaSession();
              }}
              onError={() => {
                setIsPlaying(false);
                clearMediaSession();
                setVideoError(
                  'تعذر تشغيل الفيديو مباشرة. تأكد من صلاحية الرابط أو صيغة الملف.'
                );
              }}
              className="platform-custom-video w-full h-full object-contain bg-black pointer-events-none"
            />

            {/* Transparent interaction layer preventing browser video menu/native double-tap */}
            <div
              className="absolute inset-0 z-10 bg-transparent"
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* Center Play Button Overlay when paused or ended (does NOT trigger on background tap) */}
            {(!isPlaying || isEnded) && !videoError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isEnded ? 'إعادة تشغيل الفيديو' : 'تشغيل الفيديو'}
                  className="pointer-events-auto min-w-[64px] min-h-[64px] w-16 h-16 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center shadow-2xl shadow-cyan-600/40 cursor-pointer transition-transform active:scale-95"
                >
                  {isEnded ? (
                    <RotateCcw className="w-7 h-7" />
                  ) : (
                    <Play className="w-7 h-7 fill-current translate-x-0.5" />
                  )}
                </button>
              </div>
            )}

            {/* Seek ±10s visual indicator */}
            {seekFeedback && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 z-30 bg-black/85 border border-cyan-500/40 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-white font-bold text-xs shadow-2xl pointer-events-none ${
                  seekFeedback.type === 'forward' ? 'right-6' : 'left-6'
                }`}
              >
                {seekFeedback.type === 'forward' ? (
                  <>
                    <FastForward className="w-4 h-4 text-cyan-400" />
                    <span>+10 ث</span>
                  </>
                ) : (
                  <>
                    <Rewind className="w-4 h-4 text-cyan-400" />
                    <span>-10 ث</span>
                  </>
                )}
              </div>
            )}

            {videoError && (
              <div className="absolute inset-0 z-30 bg-black/90 flex items-center justify-center p-4 text-center">
                <p className="text-xs sm:text-sm text-amber-300 max-w-md">{videoError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform Custom Controls Bar (Same look & controls in normal & fullscreen modes) */}
      {!isYouTube && !isDriveVideo && Boolean(targetUrl) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`px-3 py-2.5 sm:px-4 bg-gradient-to-t from-black via-black/95 to-black/85 border-t border-slate-800/80 space-y-2 transition-opacity duration-300 ${
            isFullscreen
              ? `shrink-0 ${showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
              : 'shrink-0 opacity-100 pointer-events-auto'
          }`}
        >
          {/* Seekbar */}
          <div className="py-1.5" dir="ltr">
            <div
              ref={seekbarRef}
              onPointerDown={handleSeekPointerDown}
              role="slider"
              aria-label="شريط تقدم الفيديو"
              aria-valuemin={0}
              aria-valuemax={Math.floor(effectiveDuration)}
              aria-valuenow={Math.floor(displayTime)}
              className="relative w-full h-3 bg-slate-800 rounded-full cursor-pointer touch-none group"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-500"
                style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between flex-wrap gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => skipTime(-10, e)}
                aria-label="ترجيع 10 ثوانٍ"
                className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Rewind className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-bold">-10</span>
              </button>

              <button
                type="button"
                onClick={(e) => skipTime(10, e)}
                aria-label="تقديم 10 ثوانٍ"
                className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <span className="text-[10px] font-mono font-bold">+10</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>

              <span
                dir="ltr"
                className="font-mono text-[11px] font-bold text-slate-200 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 tabular-nums"
              >
                {formatHMS(displayTime)} / {formatHMS(effectiveDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Volume & Mute */}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted || volume === 0 ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center justify-center cursor-pointer transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVolumeSlider((p) => !p);
                    setIsSpeedMenuOpen(false);
                  }}
                  aria-label="مستوى الصوت"
                  className="hidden sm:flex min-w-[44px] min-h-[44px] px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/70 items-center justify-center cursor-pointer ms-1 text-[11px] font-mono font-bold"
                >
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </button>
                {showVolumeSlider && (
                  <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-3 shadow-2xl z-50 flex items-center gap-2 min-w-[150px]">
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      aria-label="تعديل مستوى الصوت"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVolume(val);
                        setIsMuted(val === 0);
                      }}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Speed Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSpeedMenuOpen((p) => !p);
                    setShowVolumeSlider(false);
                  }}
                  aria-label="سرعة التشغيل"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-xs font-mono font-bold text-cyan-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{playbackSpeed}x</span>
                </button>

                {isSpeedMenuOpen && (
                  <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[115px] z-50 flex flex-col gap-0.5">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          setPlaybackSpeed(spd);
                          setIsSpeedMenuOpen(false);
                        }}
                        className={`min-h-[40px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          playbackSpeed === spd ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{spd}x</span>
                        {playbackSpeed === spd && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-cyan-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تم إتمام المحاضرة</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleMarkCompleted}
                disabled={isMarkingCompleted}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
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
