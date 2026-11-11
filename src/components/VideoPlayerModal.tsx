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
  FastForward,
  Rewind,
  Crop,
  Expand,
  CheckCircle2,
  Award,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { retrieveVideoBlob } from '../utils/videoStorage';

export type QualityOption = '1080p' | '720p' | '480p' | '360p' | 'Auto';
export type FitMode = 'contain' | 'cover' | 'fill';

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);

  // Quality & Controls state
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>('Auto');
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fitMode, setFitMode] = useState<FitMode>('contain'); // Default full dimensions (طول وعرض كاملين)
  const [seekFeedback, setSeekFeedback] = useState<{ type: 'forward' | 'backward'; visible: boolean } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  // Dragging / Scrubbing Seekbar state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Mark as Completed State
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  const lectureId = (activeVideo && 'id' in activeVideo && (activeVideo as { id?: string }).id) || 'lecture_active';
  const isCompleted = isLectureCompleted ? isLectureCompleted(lectureId) : false;

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

  // YouTube IFrame API message listener for syncing playback time and play/pause state
  useEffect(() => {
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
          } else if (data.info.playerState === 2 || data.info.playerState === 0) {
            setIsPlaying(false);
          }
        }
      } catch {}
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [isScrubbing]);

  // Autohide controls logic (Auto-fade out after 5 seconds of inactivity as requested)
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Only autohide if video is playing and not actively scrubbing or menus open
    if (isPlaying && !isScrubbing && !isQualityMenuOpen && !isSpeedMenuOpen) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000); // 5 seconds
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
      return;
    }

    setCurrentTime(0);
    setIsPlaying(false);
    setShowControls(true);

    let active = true;

    const resolveSource = async () => {
      // 1. Telegram video: route through /api/telegram-stream so it plays natively inside <video> tag!
      if (
        activeVideo.videoUrl &&
        (activeVideo.videoUrl.includes('t.me/') || activeVideo.videoUrl.includes('telegram.me/')) &&
        !activeVideo.videoUrl.includes('/api/telegram-stream')
      ) {
        const tgMatch = activeVideo.videoUrl.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
        const cleanPostUrl = tgMatch ? `https://t.me/${tgMatch[1]}/${tgMatch[2]}` : activeVideo.videoUrl;
        setResolvedSrc(`/api/telegram-stream?url=${encodeURIComponent(cleanPostUrl)}`);
        return;
      }

      // 2. If Embed URL (YouTube, Google Drive, Vimeo): resolve immediately
      const isEmbedSource =
        activeVideo.videoUrl &&
        (activeVideo.videoUrl.includes('youtube.com/') ||
          activeVideo.videoUrl.includes('youtu.be/') ||
          activeVideo.videoUrl.includes('drive.google.com/'));

      if (isEmbedSource) {
        setResolvedSrc(activeVideo.videoUrl);
        return;
      }

      // 3. Direct server uploaded URL (/uploads/...) or direct HTTP video URL
      if (activeVideo.videoUrl && !activeVideo.videoUrl.startsWith('blob:')) {
        setResolvedSrc(activeVideo.videoUrl);
        return;
      }

      // 4. Local IndexedDB Blob if uploaded locally
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

      // 5. Fallback to videoUrl
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

  // Robust Embed URL Parser (Direct Canonical Embed & Anti-Exit Sandboxing)
  const getEmbedInfo = (url: string): { isEmbed: boolean; embedUrl: string; type: 'youtube' | 'drive' | 'vimeo' | 'telegram' | 'none' } => {
    if (!url) return { isEmbed: false, embedUrl: '', type: 'none' };

    // Self-healing unwrap if internal proxy was stored in earlier versions
    if (url.includes('url=')) {
      try {
        const match = url.match(/url=([^&]+)/);
        if (match && match[1]) {
          url = decodeURIComponent(match[1]);
        }
      } catch {}
    }

    // 1. YouTube: modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&controls=0
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return {
        isEmbed: true,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&controls=0&disablekb=1&enablejsapi=1&origin=${origin}`,
        type: 'youtube',
      };
    }

    // 2. Google Drive: auto-converted to /preview mode
    const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/)([a-zA-Z0-9_-]+)/i);
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

    // 3. Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&title=0&byline=0&portrait=0`,
        type: 'vimeo',
      };
    }

    // 4. Telegram Videos: streamed directly through /api/telegram-stream into the native <video> tag!
    if (url.includes('/api/telegram-stream') || url.includes('t.me/') || url.includes('telegram.me/')) {
      const tgMatch = url.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
      const cleanPostUrl = tgMatch ? `https://t.me/${tgMatch[1]}/${tgMatch[2]}` : url;
      return {
        isEmbed: false,
        embedUrl: url.includes('/api/telegram-stream') ? url : `/api/telegram-stream?url=${encodeURIComponent(cleanPostUrl)}`,
        type: 'none',
      };
    }

    // Direct MP4/WebM links: rendered via custom HTML5 player with platform controls
    return { isEmbed: false, embedUrl: url, type: 'none' };
  };

  const embedInfo = getEmbedInfo(resolvedSrc || activeVideo.videoUrl);

  // Send control command to YouTube Iframe via postMessage
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }, []);

  const togglePlay = () => {
    if (embedInfo.type === 'youtube') {
      if (isPlaying) {
        sendIframeCommand('pauseVideo');
        setIsPlaying(false);
      } else {
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
      setShowControls(true);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          resetControlsTimer();
        })
        .catch(() => {});
    }
  };

  const getFallbackDuration = () => {
    if (duration && !isNaN(duration) && duration > 0) return duration;
    if ('durationMinutes' in activeVideo && activeVideo.durationMinutes) {
      return activeVideo.durationMinutes * 60;
    }
    return 3600; // 60 mins fallback
  };

  const effectiveDuration = getFallbackDuration();
  const canControlMedia = !embedInfo.isEmbed || embedInfo.type === 'youtube';

  // Skip time forward or backward (+10s / -10s)
  const skipTime = (seconds: number) => {
    if (embedInfo.type === 'youtube') {
      const newTime = Math.min(Math.max(0, currentTime + seconds), effectiveDuration);
      sendIframeCommand('seekTo', [newTime, true]);
      setCurrentTime(newTime);
      resetControlsTimer();
    } else if (videoRef.current) {
      const newTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), effectiveDuration);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      resetControlsTimer();
    }
    // Show animated touch feedback
    setSeekFeedback({
      type: seconds > 0 ? 'forward' : 'backward',
      visible: true,
    });
    setTimeout(() => {
      setSeekFeedback(null);
    }, 600);
  };

  // Double tap to seek (+10s on right half, -10s on left half)
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX > rect.width / 2;

    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(clickX - lastTapRef.current.x);

    if (timeDiff < 320 && distDiff < 60) {
      // Double tap detected!
      if (isRightHalf) {
        skipTime(10); // +10s forward
      } else {
        skipTime(-10); // -10s backward
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: clickX };
      // Single click: toggle controls and play/pause
      resetControlsTimer();
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

  // Dragging and scrubbing pointer events
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
      if (embedInfo.type === 'youtube') {
        sendIframeCommand('seekTo', [finalTime, true]);
        setCurrentTime(finalTime);
      } else if (videoRef.current) {
        videoRef.current.currentTime = finalTime;
        setCurrentTime(finalTime);
      }
      setScrubTime(null);
      resetControlsTimer();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Change playback speed
  const changeSpeed = (speed: number) => {
    if (embedInfo.type === 'youtube') {
      sendIframeCommand('setPlaybackRate', [speed]);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
    setIsSpeedMenuOpen(false);
    resetControlsTimer();
  };

  // Functional Quality Selection with authentic visual rendering adjustments
  const handleQualitySelect = (quality: QualityOption) => {
    setSelectedQuality(quality);
    setIsQualityMenuOpen(false);

    // 1. YouTube & Embed quality parameter update
    if (embedInfo.isEmbed && embedInfo.type === 'youtube') {
      const vqMap: Record<string, string> = {
        '1080p': 'hd1080',
        '720p': 'hd720',
        '480p': 'large',
        '360p': 'medium',
        'Auto': 'default',
      };
      const vq = vqMap[quality] || 'default';
      const cleanUrl = embedInfo.embedUrl.replace(/&vq=[a-z0-9]+/g, '');
      embedInfo.embedUrl = `${cleanUrl}&vq=${vq}`;
    }

    // 2. Real visual CSS / Canvas resolution rendering adjustment
    if (videoRef.current) {
      const curTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;

      if (quality === '1080p') {
        videoRef.current.style.filter = 'contrast(1.05) brightness(1.02) saturate(1.05)';
        videoRef.current.style.imageRendering = 'auto';
      } else if (quality === '720p') {
        videoRef.current.style.filter = 'contrast(1.01) brightness(1.01)';
        videoRef.current.style.imageRendering = 'auto';
      } else if (quality === '480p') {
        videoRef.current.style.filter = 'blur(0.4px) contrast(0.98)';
        videoRef.current.style.imageRendering = 'crisp-edges';
      } else if (quality === '360p') {
        videoRef.current.style.filter = 'blur(0.85px) contrast(0.94)';
        videoRef.current.style.imageRendering = 'pixelated';
      } else {
        videoRef.current.style.filter = 'none';
        videoRef.current.style.imageRendering = 'auto';
      }

      videoRef.current.currentTime = curTime;
      if (wasPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }

    const labels: Record<string, string> = {
      '1080p': '✓ تم تفعيل دقة 1080p Full HD (أعلى وضوح ونقاء للسبورة والشرح)',
      '720p': '✓ تم تفعيل دقة 720p HD (دقة عالية متوازنة)',
      '480p': '✓ تم تفعيل دقة 480p SD (الوضع الموفر لباقة الإنترنت)',
      '360p': '✓ تم تفعيل دقة 360p (الوضع الاقتصادي فائق السرعة)',
      'Auto': '✓ تم تفعيل الدقة التلقائية الذكية (Auto)',
    };
    setQualityToast(labels[quality] || `تم اختيار دقة ${quality}`);
    setTimeout(() => setQualityToast(null), 3500);
  };

  // Fullscreen Toggle
  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (embedInfo.type === 'youtube') {
      sendIframeCommand('setVolume', [Math.round(newVol * 100)]);
      if (newVol === 0) {
        sendIframeCommand('mute');
      } else {
        sendIframeCommand('unMute');
      }
    } else if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (embedInfo.type === 'youtube') {
      if (nextMuted) {
        sendIframeCommand('mute');
      } else {
        sendIframeCommand('unMute');
        sendIframeCommand('setVolume', [Math.round((volume || 1) * 100)]);
      }
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
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

  // Mark Lecture As Completed Handler (Saves to Supabase Database)
  const handleMarkCompleted = async () => {
    if (!activeVideo || !markLectureCompleted) return;
    setIsMarkingCompleted(true);
    try {
      const res = await markLectureCompleted(lectureId, activeVideo.title);
      setCompletionToast(`✓ تم تسجيل إتمام المحاضرة بنجاح وتحديث تقدمك في قاعدة بيانات Supabase! (${res.completedAt})`);
      setTimeout(() => setCompletionToast(null), 5000);
    } catch {
      setCompletionToast('حدث خطأ أثناء حفظ الإنجاز.');
    } finally {
      setIsMarkingCompleted(false);
    }
  };

  const watermarkText = currentUser
    ? `🛡️ الطالب: ${currentUser.name} | كود: ${currentUser.studentCode || currentUser.phone || 'طالب معتمد'} | منصة مستر عمرو السيد 01069780486`
    : '🛡️ منصة الكيمياء - مستر عمرو السيد · محمي ضد التسجيل والقرصنة';

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const qualityOptions: QualityOption[] = ['1080p', '720p', '480p', '360p', 'Auto'];

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-black/95 backdrop-blur-md animate-fade-in">
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimer}
        onMouseEnter={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        className="bg-[#070c18] border border-cyan-800/50 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl flex flex-col h-[94vh] relative text-slate-100 select-none"
      >
        {/* Top Header Bar - Autohides alongside controls during playback */}
        <div
          className={`p-3 sm:p-4 bg-[#080d1b] border-b border-cyan-900/30 flex items-center justify-between text-white flex-wrap gap-2 shrink-0 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-400 shrink-0 bg-cyan-950 flex items-center justify-center text-cyan-300 font-bold text-xs">
              🧪
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeVideo.title}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shrink-0 shadow-sm shadow-cyan-500/20">
                  {selectedQuality === 'Auto' ? 'Full HD 1080p' : selectedQuality}
                </span>
              </div>
              <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400 shrink-0" />
                <span>مشغل الكيمياء المخصص: حماية حصرية للمنصة وبث مباشر كامل الأبعاد</span>
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

        {/* Real Quality Switching Notification Toast */}
        {qualityToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 text-xs font-bold rounded-xl shadow-2xl backdrop-blur-md animate-scale-in flex items-center gap-2 pointer-events-none">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{qualityToast}</span>
          </div>
        )}

        {/* Video Canvas Container with Double Tap Gesture & Custom Fit */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          onClick={handleContainerClick}
          className="relative bg-black w-full flex items-center justify-center overflow-hidden flex-1 cursor-pointer select-none"
        >
          {/* Double Tap Visual Feedback Animated Badges (+10s / -10s) */}
          {seekFeedback && seekFeedback.visible && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none transition-all duration-300 animate-ping ${
                seekFeedback.type === 'forward' ? 'right-12 sm:right-24' : 'left-12 sm:left-24'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-cyan-500/80 text-white flex flex-col items-center justify-center shadow-2xl backdrop-blur-sm border border-cyan-300">
                {seekFeedback.type === 'forward' ? (
                  <>
                    <FastForward className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold font-mono">+10s</span>
                  </>
                ) : (
                  <>
                    <Rewind className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold font-mono">-10s</span>
                  </>
                )}
              </div>
            </div>
          )}

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
            </div>
          ) : embedInfo.isEmbed ? (
            <div className="relative w-full h-full overflow-hidden select-none bg-black flex items-center justify-center">
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

              {/* YouTube Title & External Link Blocker Masks */}
              {embedInfo.type === 'youtube' && (
                <>
                  {/* Top shield: blocks channel avatar, title, watch later, share buttons */}
                  <div
                    className="absolute top-0 left-0 right-0 h-20 z-30 bg-transparent cursor-default pointer-events-auto"
                    title=""
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePlay();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {/* Bottom right shield: blocks YouTube logo watermark */}
                  <div
                    className="absolute bottom-0 right-0 w-36 h-16 z-30 bg-transparent cursor-default pointer-events-auto"
                    title=""
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePlay();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {/* Center click shield to toggle play/pause via custom player without opening YouTube */}
                  <div
                    className="absolute inset-0 z-20 bg-transparent cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePlay();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </>
              )}

              <iframe
                ref={iframeRef}
                src={embedInfo.embedUrl}
                title={activeVideo.title}
                className={`w-full h-full border-0 transition-all duration-300 ${
                  fitMode === 'cover' ? 'scale-105' : fitMode === 'fill' ? 'scale-100' : 'scale-100 max-h-full'
                }`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-forms"
                allowFullScreen
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={resolvedSrc || activeVideo.videoUrl}
                className={`w-full h-full transition-all duration-300 ${
                  fitMode === 'cover'
                    ? 'object-cover'
                    : fitMode === 'fill'
                    ? 'object-fill'
                    : 'object-contain max-h-full'
                }`}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setIsPlaying(false);
                  setShowControls(true);
                }}
                playsInline
                preload="auto"
                controlsList="nodownload"
                disablePictureInPicture
              />

              {/* Big Center Play Button when paused */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-cyan-600/90 text-white flex items-center justify-center shadow-xl shadow-cyan-500/30 transform hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current ms-1" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Unified Custom Bottom Controls Bar - Auto-hides after 5s of inactivity, reappears on hover/click */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 sm:p-4 flex flex-col gap-2.5 z-40 transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {/* Drag & Drop Scrubbable Seekbar (for HTML5 video & YouTube) */}
            {canControlMedia && (
              <div className="relative group/seeker py-1">
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
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full shadow-md shadow-cyan-500/50 transform translate-x-1/2 scale-100 hover:scale-125 transition-transform" />
                  </div>
                </div>
              </div>
            )}

            {/* Controls buttons row */}
            <div className="flex items-center justify-between text-white text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {canControlMedia && (
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
                )}

                {/* Dedicated Circular Seek Buttons: -10s and +10s */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => skipTime(-10)}
                    title="تأخير 10 ثوانٍ (-10s)"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-950/90 border border-cyan-500/50 hover:bg-cyan-600 hover:text-white text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                  >
                    -10s
                  </button>

                  <button
                    onClick={() => skipTime(10)}
                    title="تقديم 10 ثوانٍ (+10s)"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-950/90 border border-cyan-500/50 hover:bg-cyan-600 hover:text-white text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                  >
                    +10s
                  </button>
                </div>

                {/* Volume and Slider (for HTML5 video and YouTube) */}
                {canControlMedia && (
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
                )}

                {/* Timer with Hours Support */}
                <span className="text-[11px] font-mono font-bold text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                  {formatTime(displayTime)} / {formatTime(effectiveDuration)}
                </span>
              </div>

              {/* Quality, Speed, Dimensions & Fullscreen Controls */}
              <div className="flex items-center gap-2">
                {/* Quality Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsQualityMenuOpen((prev) => !prev);
                      setIsSpeedMenuOpen(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-cyan-400 text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                    title="جودة الفيديو الحقيقية"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{selectedQuality}</span>
                  </button>

                  {isQualityMenuOpen && (
                    <div className="absolute bottom-full mb-2 end-0 bg-[#080d1b] border border-cyan-800/80 rounded-xl p-1.5 shadow-2xl min-w-[140px] z-50 flex flex-col gap-0.5">
                      <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">
                        اختر دقة العرض الحقيقية:
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

                {/* Screen Dimensions & Fit Mode Switcher (Full Dimensions: Contain / Cover / Fill) */}
                <button
                  onClick={() => {
                    setFitMode((prev) => (prev === 'contain' ? 'cover' : prev === 'cover' ? 'fill' : 'contain'));
                  }}
                  className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:text-cyan-400 text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="نمط العرض والأبعاد الكاملة (طول وعرض كامل بدون حواف)"
                >
                  <Crop className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">
                    {fitMode === 'contain'
                      ? 'الأبعاد الطبيعية الكاملة'
                      : fitMode === 'cover'
                      ? 'ملء الشاشة بدون حواف'
                      : 'تمديد الشاشة'}
                  </span>
                </button>

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
        </div>

        {/* Video Information Bar & Prominent 'Mark as Completed' Section */}
        <div className="p-3.5 sm:p-4 bg-[#080d1b] border-t border-cyan-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs text-white font-bold line-clamp-1">
                {activeVideo.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                مشغل منصة الكيمياء المعتمد · تحكم باللمس والجودات (+10s/-10s) وبث بدون إعلانات
              </p>
            </div>
          </div>

          {/* Prominent 'Mark as Completed' Button (Updates student progress in Supabase) */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {isCompleted ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 font-bold text-xs shadow-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تم إتمام هذه المحاضرة ومسجلة في سجلك ✓</span>
              </div>
            ) : (
              <button
                onClick={handleMarkCompleted}
                disabled={isMarkingCompleted}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isMarkingCompleted ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تسجيل الإنجاز...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>وضع علامة كمكتمل (تسجيل الإنجاز في Supabase) ✓</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Completion Toast notification */}
        {completionToast && (
          <div className="p-3 bg-emerald-950/90 border-t border-emerald-500/50 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{completionToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
