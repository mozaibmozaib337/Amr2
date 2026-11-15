export type FullscreenKind = 'native' | 'video' | 'css';

interface VendorDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface VendorElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface VendorVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
}

export function getAnyFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as VendorDocument;
  return (
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

export function tryLockLandscapeOnMobile(): void {
  if (typeof window === 'undefined' || typeof screen === 'undefined') return;
  try {
    const isMobileOrTablet =
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
    const orientation = screen.orientation as
      | (ScreenOrientation & { lock?: (orientation: string) => Promise<void> })
      | undefined;
    if (isMobileOrTablet && orientation && typeof orientation.lock === 'function') {
      orientation.lock('landscape').catch(() => {
        // Silently ignore on browsers/PWAs that do not allow orientation locking
      });
    }
  } catch {
    // Ignore unsupported orientation API
  }
}

export function tryUnlockOrientation(): void {
  if (typeof screen === 'undefined') return;
  try {
    if (screen.orientation && typeof screen.orientation.unlock === 'function') {
      screen.orientation.unlock();
    }
  } catch {
    // Ignore unsupported orientation API
  }
}

export async function enterElementFullscreen(
  containerEl: HTMLElement | null,
  options?: {
    videoEl?: HTMLVideoElement | null;
    lockLandscape?: boolean;
  }
): Promise<FullscreenKind> {
  const lockLandscape = options?.lockLandscape ?? true;
  const el = containerEl as VendorElement | null;
  const video = options?.videoEl as VendorVideoElement | null | undefined;

  if (el) {
    try {
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen();
        if (lockLandscape) tryLockLandscapeOnMobile();
        return 'native';
      }
      if (typeof el.webkitRequestFullscreen === 'function') {
        await Promise.resolve(el.webkitRequestFullscreen());
        if (lockLandscape) tryLockLandscapeOnMobile();
        return 'native';
      }
      if (typeof el.webkitRequestFullScreen === 'function') {
        await Promise.resolve(el.webkitRequestFullScreen());
        if (lockLandscape) tryLockLandscapeOnMobile();
        return 'native';
      }
      if (typeof el.mozRequestFullScreen === 'function') {
        await Promise.resolve(el.mozRequestFullScreen());
        if (lockLandscape) tryLockLandscapeOnMobile();
        return 'native';
      }
      if (typeof el.msRequestFullscreen === 'function') {
        await Promise.resolve(el.msRequestFullscreen());
        if (lockLandscape) tryLockLandscapeOnMobile();
        return 'native';
      }
    } catch {
      // Fall through to iOS video or CSS fullscreen fallback
    }
  }

  // iOS Safari native <video> fullscreen support
  if (video && typeof video.webkitEnterFullscreen === 'function') {
    try {
      video.webkitEnterFullscreen();
      if (lockLandscape) tryLockLandscapeOnMobile();
      return 'video';
    } catch {
      // Fall through to CSS full-viewport fallback
    }
  }

  // CSS full-viewport fallback (works in iOS Safari, iOS PWA standalone, embedded frames)
  if (lockLandscape) tryLockLandscapeOnMobile();
  return 'css';
}

export async function exitAnyFullscreen(videoEl?: HTMLVideoElement | null): Promise<void> {
  if (typeof document !== 'undefined') {
    const doc = document as VendorDocument;
    try {
      if (doc.fullscreenElement && typeof doc.exitFullscreen === 'function') {
        await doc.exitFullscreen();
      } else if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === 'function') {
        await Promise.resolve(doc.webkitExitFullscreen());
      } else if (doc.webkitFullscreenElement && typeof doc.webkitCancelFullScreen === 'function') {
        await Promise.resolve(doc.webkitCancelFullScreen());
      } else if (doc.mozFullScreenElement && typeof doc.mozCancelFullScreen === 'function') {
        await Promise.resolve(doc.mozCancelFullScreen());
      } else if (doc.msFullscreenElement && typeof doc.msExitFullscreen === 'function') {
        await Promise.resolve(doc.msExitFullscreen());
      }
    } catch {
      // Ignore errors if already exited
    }
  }

  const video = videoEl as VendorVideoElement | null | undefined;
  if (video && video.webkitDisplayingFullscreen && typeof video.webkitExitFullscreen === 'function') {
    try {
      video.webkitExitFullscreen();
    } catch {
      // Ignore
    }
  }

  tryUnlockOrientation();
}

export function subscribeFullscreenChange(
  handler: (isNativeFullscreen: boolean) => void
): () => void {
  if (typeof document === 'undefined') return () => {};
  const onChange = () => {
    const active = Boolean(getAnyFullscreenElement());
    if (!active) {
      tryUnlockOrientation();
    }
    handler(active);
  };
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
}
