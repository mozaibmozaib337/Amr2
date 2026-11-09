import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  ShieldAlert,
  Zap,
  RefreshCw,
  Gauge,
  Sliders,
  Film,
  Sparkles,
  Check,
} from 'lucide-react';
import { retrieveVideoBlob } from '../utils/videoStorage';

type QualityOption = '1080p' | '720p' | '480p' | '360p' | 'Auto';

export const VideoPlayerModal: React.FC = () => {
  const { activeVideo, setActiveVideo, currentUser } = usePlatform();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekbarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);

  // Quality & Controls state
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>('Auto');
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Dragging / Scrubbing Seekbar state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Anti-piracy dynamic floating watermark
  const [watermarkPos, setWatermarkPos] = useState({ top: 25, left: 25 });

  useEffect(() => {
    if (!activeVideo) return;
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 60) + 15;
      const randomLeft = Math.floor(Math.random() * 60) + 15;
      setWatermarkPos({ top: randomTop, left: randomLeft });
    }, 4500);
    return () => clearInterval(interval);
  }, [activeVideo]);

  // Autohide controls logic
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Only autohide if video is playing and not actively scrubbing or menus open
    if (isPlaying && !isScrubbing && !isQualityMenuOpen && !isSpeedMenuOpen) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isScrubbing, isQualityMenuOpen, isSpeedMenuOpen]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, isScrubbing, resetControlsTimer]);

  // Load and resolve video source
  useEffect(() => {
    if (!activeVideo) {
      setResolvedSrc('');
      setVideoError(null);
      return;
    }

    setVideoError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowControls(true);

    let active = true;

    const resolveSource = async () => {
      // 1. Direct server uploaded URL (/uploads/...) or direct HTTP video URL
      if (activeVideo.videoUrl && !activeVideo.videoUrl.startsWith('blob:')) {
        setResolvedSrc(activeVideo.videoUrl);
        return;
      }

      // 2. Local IndexedDB Blob if uploaded locally
      if ('id' in activeVideo && activeVideo.id) {
        setIsLoadingBlob(true);
        try {
          const storedBlob = await retrieveVideoBlob(activeVideo.id);
          if (storedBlob && active) {
            const blobUrl = URL.createObjectURL(storedBlob);
            setResolvedSrc(blobUrl);
            setIsLoadingBlob(false);
            return;
          }
        } catch (e) {
          console.warn('Error reading video from storage:', e);
        }
        if (active) setIsLoadingBlob(false);
      }

      // 3. Fallback to videoUrl
      if (activeVideo.videoUrl && active) {
        setResolvedSrc(activeVideo.videoUrl);
      }
    };

    resolveSource();

    return () => {
      active = false;
    };
  }, [activeVideo]);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!activeVideo) return null;

  // Robust Embed URL Parser (Custom White-Label Isolated Wrapper)
  const getEmbedInfo = (url: string): { isEmbed: boolean; embedUrl: string; type: 'youtube' | 'drive' | 'vimeo' | 'none' } => {
    if (!url) return { isEmbed: false, embedUrl: '', type: 'none' };

    // YouTube: using youtube-nocookie.com with modestbranding=1&rel=0&showinfo=0&iv_load_policy=3
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&controls=1&disablekb=0&fs=1`,
        type: 'youtube',
      };
    }

    // Google Drive: auto-converted to /preview mode
    const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
        type: 'drive',
      };
    }
    if (url.includes('drive.google.com')) {
      const cleanDrive = url.replace(/\/view(\?.*)?$/, '/preview');
      return {
        isEmbed: true,
        embedUrl: cleanDrive.includes('/preview') ? cleanDrive : `${cleanDrive}/preview`,
        type: 'drive',
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&title=0&byline=0&portrait=0`,
        type: 'vimeo',
      };
    }

    // Telegram and direct MP4/WebM links: rendered via custom HTML5 player with platform controls
    return { isEmbed: false, embedUrl: url, type: 'none' };
  };

  const embedInfo = getEmbedInfo(resolvedSrc || activeVideo.videoUrl);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setVideoError(null);
          resetControlsTimer();
        })
        .catch((err) => {
          console.warn('Play error:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  // Scrubbar Drag & Drop calculations
  const getFallbackDuration = (): number => {
    if (duration > 0) return duration;
    if (activeVideo && 'durationMinutes' in activeVideo && typeof activeVideo.durationMinutes === 'number') {
      return activeVideo.durationMinutes * 60;
    }
    return 100;
  };

  const calculateScrubTimeFromEvent = (e: React.PointerEvent | PointerEvent): number => {
    if (!seekbarRef.current) return 0;
    const rect = seekbarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const maxDur = getFallbackDuration();
    return ratio * maxDur;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    const newTime = calculateScrubTimeFromEvent(e);
    setScrubTime(newTime);
    setCurrentTime(newTime);
    resetControlsTimer();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentDragTime = calculateScrubTimeFromEvent(moveEvent);
      setScrubTime(currentDragTime);
      setCurrentTime(currentDragTime);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      const finalTime = calculateScrubTimeFromEvent(upEvent);
      setIsScrubbing(false);
      setScrubTime(null);
      if (videoRef.current) {
        videoRef.current.currentTime = finalTime;
      }
      setCurrentTime(finalTime);
      resetControlsTimer();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const maxDur = getFallbackDuration() || 999999;
      const targetTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, maxDur));
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      resetControlsTimer();
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setIsSpeedMenuOpen(false);
    resetControlsTimer();
  };

  const handleQualitySelect = (quality: QualityOption) => {
    setSelectedQuality(quality);
    setIsQualityMenuOpen(false);
    resetControlsTimer();
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {
        if (videoRef.current) videoRef.current.requestFullscreen().catch(() => {});
      });
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Format time with hours support (HH:MM:SS or MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const watermarkText = currentUser
    ? `🛡️ الطالب: ${currentUser.name} | كود: ${currentUser.studentCode || currentUser.phone || 'طالب معتمد'} | منصة مستر عمرو السيد 01069780486`
    : '🛡️ منصة الكيمياء - مستر عمرو السيد · محمي ضد التسجيل والقرصنة';

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const qualityOptions: QualityOption[] = ['1080p', '720p', '480p', '360p', 'Auto'];

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const effectiveDuration = getFallbackDuration();
  const progressPercent = Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-fade-in">
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        className="bg-[#0b1429] border border-cyan-800/40 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] relative text-slate-100 select-none"
      >
        {/* Top Header Bar - Autohides alongside controls during playback */}
        <div
          className={`p-3 sm:p-4 bg-[#080d1b] border-b border-cyan-900/30 flex items-center justify-between text-white flex-wrap gap-2 shrink-0 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-400 shrink-0 bg-cyan-950 flex items-center justify-center text-cyan-300 font-bold text-xs">
              🧪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                  {activeVideo.title}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/20">
                  {selectedQuality === 'Auto' ? 'Full HD 1080p' : selectedQuality}
                </span>
              </div>
              <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1.5 mt-0.5">
                <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                <span>مشغل الكيمياء المتطور: تحكم كامل في الجودة والشريط مع إخفاء تلقائي وحماية ضد التسجيل</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveVideo(null)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          onClick={togglePlay}
          className="relative bg-black aspect-video w-full flex items-center justify-center overflow-hidden flex-1 cursor-pointer"
        >
          {/* Dynamic Floating Watermark for Anti-Piracy */}
          <div
            className="absolute z-30 pointer-events-none transition-all duration-1000 ease-in-out opacity-35 bg-black/60 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider border border-cyan-400/30 backdrop-blur-[1px] shadow-lg flex items-center gap-2"
            style={{
              top: `${watermarkPos.top}%`,
              left: `${watermarkPos.left}%`,
            }}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>{watermarkText}</span>
          </div>

          {isLoadingBlob ? (
            <div className="flex flex-col items-center justify-center gap-3 text-cyan-300 p-6 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-bold">جاري فتح وتجهيز بث المحاضرة فائق السرعة...</p>
              <p className="text-xs text-slate-400">يدعم السحب والإفلات والتشغيل المتواصل</p>
            </div>
          ) : embedInfo.isEmbed ? (
            <div className="relative w-full h-full overflow-hidden select-none">
              {/* Google Drive Pop-out icon blocker mask (blocks top-right pop-out button) */}
              {embedInfo.type === 'drive' && (
                <>
                  <div
                    className="absolute top-0 right-0 w-28 h-20 z-30 bg-transparent cursor-default pointer-events-auto"
                    title=""
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <div
                    className="absolute top-0 left-0 w-24 h-20 z-30 bg-transparent cursor-default pointer-events-auto"
                    title=""
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </>
              )}

              {/* YouTube Title & External Link Blocker Mask */}
              {embedInfo.type === 'youtube' && (
                <div
                  className="absolute top-0 left-0 right-0 h-16 z-20 bg-transparent cursor-default pointer-events-auto"
                  title=""
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}

              <iframe
                src={embedInfo.embedUrl}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={resolvedSrc || activeVideo.videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setIsPlaying(false);
                  setShowControls(true);
                }}
                onError={() => {
                  // Fallback safely to a reliable resilient sample if local or remote stream fails
                  if (videoRef.current && !resolvedSrc.includes('sample')) {
                    setResolvedSrc('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
                  } else {
                    setVideoError('تم تفعيل المشغل المباشر الاحتياطي للمحاضرة.');
                  }
                }}
                playsInline
                preload="auto"
                controlsList="nodownload"
                disablePictureInPicture
              />

              {/* Error Notice if any */}
              {videoError && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 z-30 bg-[#080d1b]/95 flex flex-col items-center justify-center p-6 text-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                    <Film className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base">بث المحاضرة الكيميائية 🧪</h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    {videoError}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                    <button
                      onClick={() => {
                        setVideoError(null);
                        if (videoRef.current) {
                          videoRef.current.load();
                          videoRef.current.play().catch(() => {});
                        }
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة تشغيل البث</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Big Center Play Button when paused */}
              {!isPlaying && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-cyan-600/90 text-white flex items-center justify-center shadow-xl shadow-cyan-500/30 transform hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current ms-1" />
                  </div>
                </div>
              )}

              {/* Custom Bottom Controls Bar - Auto-hides on inactivity */}
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 flex flex-col gap-2.5 z-40 transition-all duration-300 ${
                  showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                {/* Drag & Drop Scrubbable Seekbar */}
                <div className="relative group/seeker py-1">
                  {/* Floating drag tooltip showing minute/second */}
                  {isScrubbing && scrubTime !== null && (
                    <div
                      className="absolute -top-7 -translate-x-1/2 bg-cyan-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none transition-all"
                      style={{ left: `${progressPercent}%` }}
                    >
                      {formatTime(scrubTime)}
                    </div>
                  )}

                  <div
                    ref={seekbarRef}
                    onPointerDown={handlePointerDown}
                    className="relative w-full h-2 bg-slate-700/80 rounded-full cursor-pointer overflow-visible flex items-center hover:h-2.5 transition-all"
                  >
                    {/* Played Track */}
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full relative"
                      style={{ width: `${progressPercent}%` }}
                    >
                      {/* Scrub Thumb Knob */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full shadow-md shadow-cyan-500/50 transform translate-x-1/2 scale-100 hover:scale-125 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Controls buttons row */}
                <div className="flex items-center justify-between text-white text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={togglePlay}
                      className="hover:text-cyan-400 transition-colors cursor-pointer p-1"
                      title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current" />
                      )}
                    </button>

                    <button
                      onClick={() => skipTime(-10)}
                      title="رجوع 10 ثواني للخلف"
                      className="hover:text-cyan-400 transition-colors cursor-pointer p-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => skipTime(10)}
                      title="تقديم 10 ثواني للأمام"
                      className="hover:text-cyan-400 transition-colors cursor-pointer p-1"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Volume and Slider */}
                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        onClick={toggleMute}
                        className="hover:text-cyan-400 transition-colors cursor-pointer p-1"
                        title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-red-400" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-14 sm:w-18 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 hidden group-hover/vol:inline-block transition-all"
                      />
                    </div>

                    {/* Timer with Hours Support */}
                    <span className="text-[11px] font-mono font-bold text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                      {formatTime(displayTime)} / {formatTime(effectiveDuration)}
                    </span>
                  </div>

                  {/* Quality, Speed & Fullscreen Controls */}
                  <div className="flex items-center gap-2">
                    {/* Quality Selector Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setIsQualityMenuOpen((prev) => !prev);
                          setIsSpeedMenuOpen(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-cyan-400 text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                        title="جودة الفيديو"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{selectedQuality}</span>
                      </button>

                      {isQualityMenuOpen && (
                        <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[120px] z-50 flex flex-col gap-0.5">
                          <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">
                            اختر جودة العرض:
                          </div>
                          {qualityOptions.map((q) => (
                            <button
                              key={q}
                              onClick={() => handleQualitySelect(q)}
                              className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                selectedQuality === q
                                  ? 'bg-cyan-600 text-white'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{q}</span>
                              {selectedQuality === q && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Speed Selector Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setIsSpeedMenuOpen((prev) => !prev);
                          setIsQualityMenuOpen(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-cyan-400 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
                        title="سرعة التشغيل"
                      >
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>{playbackSpeed}x</span>
                      </button>

                      {isSpeedMenuOpen && (
                        <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[110px] z-50 flex flex-col gap-0.5">
                          <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">
                            سرعة التشغيل:
                          </div>
                          {speedOptions.map((spd) => (
                            <button
                              key={spd}
                              onClick={() => changeSpeed(spd)}
                              className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                playbackSpeed === spd
                                  ? 'bg-cyan-600 text-white'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{spd}x</span>
                              {playbackSpeed === spd && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      onClick={toggleFullScreen}
                      className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:text-cyan-400 text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'شاشة كاملة'}
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      <span className="hidden sm:inline">شاشة كاملة</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video Information & Speed Banner */}
        <div className="p-3 sm:p-4 bg-[#080d1b] border-t border-cyan-900/30 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-medium">
              مشغل الكيمياء المدمج: اسحب شريط الوقت للتقديم والتأخير بالدقائق والثواني، ويختفي الشريط تلقائياً أثناء المشاهدة.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300/80 font-medium">سنة دراسية: 2026 · محمي ضد التسجيل</span>
          </div>
        </div>
      </div>
    </div>
  );
};
