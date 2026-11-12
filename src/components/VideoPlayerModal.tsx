import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Sliders,
  Gauge,
  Film,
  Sparkles,
  Check,
  FastForward,
  Rewind,
  Crop,
  CheckCircle2,
  RefreshCw,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { parseYouTubeUrl } from '../utils/linkParser';
import { retrieveVideoBlob } from '../utils/videoStorage';

export type QualityOption = '1080p' | '720p' | '480p' | '360p' | 'Auto';
export type AspectRatioMode = '16:9' | '9:16' | '4:3' | 'cover';

export const VideoPlayerModal: React.FC = () => {
  const {
    activeVideo,
    setActiveVideo,
    currentUser,
    markLectureCompleted,
    isLectureCompleted,
  } = usePlatform();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const seekbarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('16:9');

  // Quality & Controls state
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>('Auto');
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState<{ type: 'forward' | 'backward'; visible: boolean } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  // Dragging / Scrubbing Seekbar state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Resolved video source
  const [resolvedSrc, setResolvedSrc] = useState<string>('');

  // Mark as Completed State
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  const lectureId = (activeVideo && 'id' in activeVideo && (activeVideo as { id?: string }).id) || 'lecture_active';
  const isCompleted = isLectureCompleted ? isLectureCompleted(lectureId) : false;

  // Anti-piracy dynamic floating watermark (Student Phone hopping every 4 seconds)
  const [watermarkPos, setWatermarkPos] = useState({ top: 22, left: 22 });

  useEffect(() => {
    if (!activeVideo) return;
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 60) + 18;
      const randomLeft = Math.floor(Math.random() * 60) + 18;
      setWatermarkPos({ top: randomTop, left: randomLeft });
    }, 4000);
    return () => clearInterval(interval);
  }, [activeVideo]);

  // Lock body scroll when modal is open (and not in mini player)
  useEffect(() => {
    if (activeVideo && !isMiniPlayer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeVideo, isMiniPlayer]);

  // Browser back button & Esc key closes player
  useEffect(() => {
    if (!activeVideo) return;

    window.history.pushState({ videoModal: true }, '');

    const handlePopState = () => {
      setActiveVideo(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveVideo(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeVideo, setActiveVideo]);

  // Send control command to YouTube Iframe via postMessage
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }, []);

  // Pause video when tab visibility changes (e.g. user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        sendIframeCommand('pauseVideo');
        if (videoRef.current) {
          videoRef.current.pause();
        }
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, sendIframeCommand]);

  // Resolve video source
  useEffect(() => {
    if (!activeVideo) {
      setResolvedSrc('');
      return;
    }

    setCurrentTime(0);
    setIsPlaying(false);
    setIsEnded(false);
    setShowControls(true);

    let isSubscribed = true;

    const resolveSource = async () => {
      const rawUrl = activeVideo.videoUrl || '';

      // Check if YouTube
      const parsedYt = parseYouTubeUrl(rawUrl);
      if (parsedYt) {
        setResolvedSrc(rawUrl);
        return;
      }

      // Check IndexedDB blob if local upload
      if ('id' in activeVideo && activeVideo.id) {
        try {
          const storedBlob = await retrieveVideoBlob(activeVideo.id);
          if (storedBlob && isSubscribed) {
            setResolvedSrc(URL.createObjectURL(storedBlob));
            return;
          }
        } catch {}
      }

      if (isSubscribed) {
        setResolvedSrc(rawUrl);
      }
    };

    resolveSource();

    return () => {
      isSubscribed = false;
    };
  }, [activeVideo]);

  // Determine media type
  const targetUrl = resolvedSrc || activeVideo?.videoUrl || '';
  const parsedYouTube = parseYouTubeUrl(targetUrl);
  const isYouTube = !!parsedYouTube;

  // YouTube IFrame API message listener
  useEffect(() => {
    if (!isYouTube) return;

    const handleMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number' && !isScrubbing) {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (data.info.playerState === 1) {
            setIsPlaying(true);
            setIsEnded(false);
          } else if (data.info.playerState === 2) {
            setIsPlaying(false);
          } else if (data.info.playerState === 0) {
            setIsPlaying(false);
            setIsEnded(true);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [isYouTube, isScrubbing]);

  // Autohide controls logic (3 seconds of inactivity)
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !isScrubbing && !isQualityMenuOpen && !isSpeedMenuOpen && !isAspectMenuOpen) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // 3 seconds
    }
  }, [isPlaying, isScrubbing, isQualityMenuOpen, isSpeedMenuOpen, isAspectMenuOpen]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, isScrubbing, resetControlsTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!activeVideo) return null;

  const togglePlay = () => {
    if (isYouTube) {
      if (isPlaying) {
        sendIframeCommand('pauseVideo');
        setIsPlaying(false);
      } else {
        if (isEnded) {
          sendIframeCommand('seekTo', [0, true]);
          setIsEnded(false);
        }
        sendIframeCommand('playVideo');
        setIsPlaying(true);
      }
      resetControlsTimer();
      return;
    }

    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (isEnded) {
        videoRef.current.currentTime = 0;
        setIsEnded(false);
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    resetControlsTimer();
  };

  const lectureDurationSecs =
    'durationMinutes' in activeVideo && typeof activeVideo.durationMinutes === 'number'
      ? activeVideo.durationMinutes * 60
      : 3600;

  const effectiveDuration = duration > 0 ? duration : lectureDurationSecs;

  const skipTime = (seconds: number) => {
    const newTime = Math.min(Math.max(0, currentTime + seconds), effectiveDuration);
    if (isYouTube) {
      sendIframeCommand('seekTo', [newTime, true]);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
    resetControlsTimer();

    setSeekFeedback({
      type: seconds > 0 ? 'forward' : 'backward',
      visible: true,
    });
    setTimeout(() => setSeekFeedback(null), 500);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX > rect.width / 2;

    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(clickX - lastTapRef.current.x);

    if (timeDiff < 320 && distDiff < 60) {
      if (isRightHalf) {
        skipTime(10);
      } else {
        skipTime(-10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: clickX };
      resetControlsTimer();
    }
  };

  const calculateScrubTime = (clientX: number) => {
    if (!seekbarRef.current) return 0;
    const rect = seekbarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * effectiveDuration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScrubbing(true);
    const newTime = calculateScrubTime(e.clientX);
    setScrubTime(newTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const time = calculateScrubTime(ev.clientX);
      setScrubTime(time);
    };

    const onPointerUp = (ev: PointerEvent) => {
      setIsScrubbing(false);
      const finalTime = calculateScrubTime(ev.clientX);
      if (isYouTube) {
        sendIframeCommand('seekTo', [finalTime, true]);
      } else if (videoRef.current) {
        videoRef.current.currentTime = finalTime;
      }
      setCurrentTime(finalTime);
      setScrubTime(null);
      resetControlsTimer();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const changeSpeed = (speed: number) => {
    if (isYouTube) {
      sendIframeCommand('setPlaybackRate', [speed]);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
    setIsSpeedMenuOpen(false);
    resetControlsTimer();
  };

  const handleQualitySelect = (quality: QualityOption) => {
    setSelectedQuality(quality);
    setIsQualityMenuOpen(false);

    if (isYouTube) {
      const ytQualityMap: Record<QualityOption, string> = {
        '1080p': 'hd1080',
        '720p': 'hd720',
        '480p': 'large',
        '360p': 'medium',
        'Auto': 'default',
      };
      sendIframeCommand('setPlaybackQuality', [ytQualityMap[quality]]);
      sendIframeCommand('setPlaybackQualityRange', [ytQualityMap[quality], ytQualityMap[quality]]);
    }

    setQualityToast(`تم ضبط الجودة الحقيقية للبث: ${quality}`);
    setTimeout(() => setQualityToast(null), 2500);
    resetControlsTimer();
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        try {
          if (screen.orientation && 'lock' in screen.orientation) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } catch {}
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const ss = s < 10 ? `0${s}` : `${s}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const handleMarkCompleted = async () => {
    if (!activeVideo || isMarkingCompleted) return;
    setIsMarkingCompleted(true);
    try {
      if (markLectureCompleted) {
        await markLectureCompleted(lectureId, activeVideo.title);
      }
      setCompletionToast('🎉 تم تسجيل إتمام المحاضرة بنجاح وتحديث تقدمك الدراسي في Supabase!');
      setTimeout(() => setCompletionToast(null), 4000);
    } catch {
      setCompletionToast('⚠️ تم حفظ التقدم محلياً.');
      setTimeout(() => setCompletionToast(null), 3000);
    } finally {
      setIsMarkingCompleted(false);
    }
  };

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = effectiveDuration > 0 ? (displayTime / effectiveDuration) * 100 : 0;

  // Aspect ratio classes
  const aspectClass =
    aspectMode === '9:16'
      ? 'aspect-[9/16] max-h-full max-w-[50vh]'
      : aspectMode === '4:3'
      ? 'aspect-[4/3] max-h-full max-w-[85vw]'
      : aspectMode === 'cover'
      ? 'w-full h-full object-cover'
      : 'aspect-video max-h-full max-w-full';

  // YouTube embed URL with strict parameters
  const ytEmbedSrc = parsedYouTube && parsedYouTube.external_id
    ? `https://www.youtube-nocookie.com/embed/${parsedYouTube.external_id}?enablejsapi=1&controls=0&rel=0&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&cc_load_policy=0&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`
    : '';

  const studentDisplayIdentifier = currentUser?.phone
    ? `0${currentUser.phone.replace(/^0+/, '')}`
    : currentUser?.name || 'منصة الأستاذ عمرو السيد';

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className={`select-none transition-all duration-300 ${
        isMiniPlayer
          ? 'fixed bottom-4 left-4 z-[9999] w-[340px] sm:w-[420px] h-[220px] sm:h-[265px] rounded-2xl overflow-hidden shadow-2xl border-2 border-cyan-500/80 bg-black flex flex-col justify-between'
          : 'fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex flex-col justify-between overflow-hidden'
      }`}
    >
      {/* TOP FLOATING CONTROLS (Fade out after 3s) */}
      <div
        className={`absolute top-0 inset-x-0 z-50 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Film className="w-4 h-4" />
          </div>
          <div className="max-w-[200px] sm:max-w-md">
            <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
              {activeVideo.title}
            </h2>
            <span className="text-[10px] text-cyan-400 font-medium">
              منصة مستر عمرو السيد في الكيمياء · مشغل خاص عالي الدقة
            </span>
          </div>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Mini Player Toggle */}
          <button
            onClick={() => setIsMiniPlayer((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title={isMiniPlayer ? 'تكبير المشغل' : 'تصغير المشغل (Mini Player)'}
          >
            {isMiniPlayer ? <Maximize className="w-4 h-4 text-cyan-400" /> : <Crop className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Fullscreen Button */}
          {!isMiniPlayer && (
            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}

          {/* Close Button ✕ */}
          <button
            onClick={() => setActiveVideo(null)}
            className="p-2 rounded-xl bg-red-950/80 hover:bg-red-800 text-red-200 hover:text-white border border-red-700/60 transition-colors cursor-pointer"
            title="إغلاق المشغل ✕"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER VIEWPORT (Adaptive Aspect Ratio + YouTube scale(1.12) / Video) */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden relative"
        onClick={handleContainerClick}
      >
        <div className={`relative flex items-center justify-center overflow-hidden bg-black ${aspectClass}`}>
          {isYouTube ? (
            <>
              {/* YouTube IFrame with 1.12 scale pushing out top/bottom chrome */}
              <iframe
                ref={iframeRef}
                src={ytEmbedSrc}
                title={activeVideo.title}
                className="w-full h-full border-0 select-none pointer-events-none transform scale-[1.12] origin-center"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Transparent click layer over iframe to intercept clicks & toggle play/pause */}
              <div
                className="absolute inset-0 z-20 cursor-pointer"
                onClick={togglePlay}
              />
            </>
          ) : (
            <video
              ref={videoRef}
              src={resolvedSrc || activeVideo.videoUrl}
              onTimeUpdate={() => {
                if (videoRef.current && !isScrubbing) {
                  setCurrentTime(videoRef.current.currentTime);
                  if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
                    setDuration(videoRef.current.duration);
                  }
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setIsEnded(true);
              }}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              playsInline
            />
          )}

          {/* CUSTOM BLACK PLATFORM OVERLAY ON PAUSE OR END (Completely hides YouTube suggested videos!) */}
          {(!isPlaying || isEnded) && (
            <div
              className="absolute inset-0 z-30 bg-black/92 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-2xl shadow-cyan-500/40 transform hover:scale-110 active:scale-95 transition-all mb-4">
                {isEnded ? <RotateCcw className="w-8 h-8 sm:w-10 sm:h-10" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-1" />}
              </div>
              <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/50 mb-2">
                منصة الأستاذ عمرو السيد في الكيمياء
              </span>
              <h2 className="text-sm sm:text-lg font-bold text-white max-w-lg mb-1.5 line-clamp-2">
                {activeVideo.title}
              </h2>
              <p className="text-xs text-slate-400">
                {isEnded ? 'انتهت المحاضرة · اضغط لإعادة المشاهدة ↺' : 'المحاضرة متوقفة مؤقتاً · اضغط في أي مكان للاستئناف ▶'}
              </p>
            </div>
          )}

          {/* Double Tap Visual Seek Feedback (+10s / -10s) */}
          {seekFeedback && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-40 bg-black/80 border border-cyan-500/40 px-5 py-3 rounded-2xl flex items-center gap-2 text-white font-bold text-sm shadow-2xl animate-scale-in pointer-events-none ${
                seekFeedback.type === 'forward' ? 'right-12' : 'left-12'
              }`}
            >
              {seekFeedback.type === 'forward' ? (
                <>
                  <FastForward className="w-5 h-5 text-cyan-400" />
                  <span>+10 ثوانٍ</span>
                </>
              ) : (
                <>
                  <Rewind className="w-5 h-5 text-cyan-400" />
                  <span>-10 ثوانٍ</span>
                </>
              )}
            </div>
          )}

          {/* DYNAMIC FLOATING WATERMARK (Student Phone, opacity 0.28-0.35, visible in fullscreen) */}
          <div
            className="absolute pointer-events-none select-none z-40 transition-all duration-1000 ease-out"
            style={{
              top: `${watermarkPos.top}%`,
              left: `${watermarkPos.left}%`,
              opacity: 0.32,
            }}
          >
            <div className="bg-black/90 border border-cyan-500/50 px-3.5 py-1 rounded-full text-[11px] font-mono font-bold text-cyan-300 shadow-xl tracking-wider">
              {studentDisplayIdentifier}
            </div>
          </div>

          {/* Platform Logo Badge (Bottom-Right Corner over player) */}
          <div className="absolute bottom-4 right-4 z-30 pointer-events-none select-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-cyan-500/40 text-[10px] text-cyan-300 font-bold opacity-80">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>منصة الكيمياء ⚡</span>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS & PROGRESS BAR (Fade out after 3s) */}
      <div
        className={`z-50 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-2.5 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seekbar Progress Bar */}
        <div
          ref={seekbarRef}
          onPointerDown={handlePointerDown}
          className="relative w-full h-2.5 bg-slate-800/80 hover:h-3.5 rounded-full cursor-pointer transition-all duration-150 group"
        >
          {/* Filled track */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-500 transform scale-0 group-hover:scale-100 transition-transform"
            style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          {/* Left: Play/Pause, Seek, Time */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-md shadow-cyan-600/30"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
            </button>

            {/* +/- 10s */}
            <button
              onClick={() => skipTime(-10)}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              title="ترجيع 10 ثوانٍ"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => skipTime(10)}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              title="تقديم 10 ثوانٍ"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            {/* Time */}
            <span className="font-mono text-[11px] font-bold text-slate-300 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800">
              {formatTime(displayTime)} / {formatTime(effectiveDuration)}
            </span>
          </div>

          {/* Right: Quality, Speed, Aspect, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsQualityMenuOpen((p) => !p);
                  setIsSpeedMenuOpen(false);
                  setIsAspectMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                title="الجودة"
              >
                <Sliders className="w-3 h-3" />
                <span>{selectedQuality}</span>
              </button>

              {isQualityMenuOpen && (
                <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[130px] z-50 flex flex-col gap-0.5">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">
                    جودة الفيديو الحقيقية:
                  </div>
                  {(['1080p', '720p', '480p', '360p', 'Auto'] as QualityOption[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQualitySelect(q)}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        selectedQuality === q ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{q}</span>
                      {selectedQuality === q && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsSpeedMenuOpen((p) => !p);
                  setIsQualityMenuOpen(false);
                  setIsAspectMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
                title="سرعة التشغيل"
              >
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>{playbackSpeed}x</span>
              </button>

              {isSpeedMenuOpen && (
                <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[110px] z-50 flex flex-col gap-0.5">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">
                    السرعة:
                  </div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => changeSpeed(spd)}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        playbackSpeed === spd ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{spd}x</span>
                      {playbackSpeed === spd && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aspect Ratio Selector (16:9 / 9:16 Shorts / 4:3 / Cover) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsAspectMenuOpen((p) => !p);
                  setIsQualityMenuOpen(false);
                  setIsSpeedMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
                title="أبعاد ونسبة العرض (Aspect Ratio)"
              >
                <Crop className="w-3 h-3 text-cyan-400" />
                <span>{aspectMode}</span>
              </button>

              {isAspectMenuOpen && (
                <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[130px] z-50 flex flex-col gap-0.5">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">
                    أبعاد الفيديو:
                  </div>
                  {(['16:9', '9:16', '4:3', 'cover'] as AspectRatioMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setAspectMode(mode);
                        setIsAspectMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        aspectMode === mode ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{mode === '9:16' ? '9:16 (Shorts)' : mode === 'cover' ? 'ملء كامل' : mode}</span>
                      {aspectMode === mode && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:text-cyan-400 text-slate-200 transition-colors cursor-pointer"
              title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'شاشة كاملة'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quality Toast notification */}
        {qualityToast && (
          <div className="py-1 px-3 bg-cyan-950/90 border border-cyan-500/50 rounded-xl text-cyan-200 text-[11px] font-bold text-center animate-fade-in">
            {qualityToast}
          </div>
        )}

        {/* MARK AS COMPLETED BUTTON */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 line-clamp-1">
            {'chapterTitle' in activeVideo && activeVideo.chapterTitle ? `${activeVideo.chapterTitle} · ` : ''}{activeVideo.title}
          </div>

          <div>
            {isCompleted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 font-bold text-xs shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>تم إتمام المحاضرة ✓</span>
              </div>
            ) : (
              <button
                onClick={handleMarkCompleted}
                disabled={isMarkingCompleted}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {isMarkingCompleted ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التسجيل...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>وضع علامة كمكتمل (تسجيل الإنجاز في Supabase) ✓</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Completion Toast notification */}
        {completionToast && (
          <div className="py-1.5 px-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{completionToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
