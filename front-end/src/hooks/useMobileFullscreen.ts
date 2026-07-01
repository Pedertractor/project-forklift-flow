import { useCallback, useEffect, useState } from 'react';

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // Safari iOS — modo app instalado na tela inicial
    ('standalone' in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function supportsElementFullscreen(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  return Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
}

async function enterFullscreen(): Promise<void> {
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  if (root.requestFullscreen) {
    await root.requestFullscreen();
    return;
  }

  await root.webkitRequestFullscreen?.();
}

async function leaveFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };

  if (doc.fullscreenElement && doc.exitFullscreen) {
    await doc.exitFullscreen();
    return;
  }

  await doc.webkitExitFullscreen?.();
}

export function useMobileFullscreen() {
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplayMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canRequestFullscreen, setCanRequestFullscreen] = useState(
    supportsElementFullscreen,
  );

  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
    setCanRequestFullscreen(supportsElementFullscreen());

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const onStandaloneChange = () => setIsStandalone(isStandaloneDisplayMode());
    standaloneQuery.addEventListener('change', onStandaloneChange);

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      standaloneQuery.removeEventListener('change', onStandaloneChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await leaveFullscreen();
      } else {
        await enterFullscreen();
      }
    } catch {
      /* gesto negado ou navegador sem suporte */
    }
  }, []);

  return {
    isStandalone,
    isFullscreen,
    /** Fullscreen via API (Android/Chrome desktop). iOS Safari no navegador não suporta. */
    canRequestFullscreen,
    toggleFullscreen,
  };
}
