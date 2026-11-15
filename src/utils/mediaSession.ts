/**
 * Media playback cleanup & MediaSession helpers.
 * Prevents background audio, phantom Android Chrome/PWA media notifications,
 * and ensures only a single video can play at once.
 */

const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'seekbackward',
  'seekforward',
  'seekto',
  'stop',
  'previoustrack',
  'nexttrack',
];

export function pauseAllOtherVideos(except?: HTMLVideoElement | null): void {
  if (typeof document === 'undefined') return;
  try {
    const videos = document.querySelectorAll('video');
    videos.forEach((vid) => {
      if (vid !== except && !vid.paused) {
        try {
          vid.pause();
        } catch {}
      }
    });
  } catch {}
}

export function cleanupVideoElement(video: HTMLVideoElement | null): void {
  if (!video) return;
  try {
    video.pause();
  } catch {}
  try {
    video.removeAttribute('src');
    video.load();
  } catch {}
}

export function clearMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.playbackState = 'none';
  } catch {}
  try {
    ms.metadata = null;
  } catch {}
  MEDIA_SESSION_ACTIONS.forEach((action) => {
    try {
      ms.setActionHandler(action, null);
    } catch {}
  });
}

export function setActiveMediaSession(options: {
  title: string;
  artist?: string;
  album?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    if (typeof window !== 'undefined' && 'MediaMetadata' in window) {
      ms.metadata = new window.MediaMetadata({
        title: options.title || 'محاضرة كيمياء',
        artist: options.artist || 'الأستاذ عمرو السيد',
        album: options.album || 'منصة الكيمياء',
      });
    }
    ms.playbackState = 'playing';
    ms.setActionHandler('play', options.onPlay || null);
    ms.setActionHandler('pause', options.onPause || null);
    ms.setActionHandler('stop', options.onStop || options.onPause || null);
  } catch {}
}
