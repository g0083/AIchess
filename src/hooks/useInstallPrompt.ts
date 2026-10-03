/**
 * PWA install prompt.
 *
 * Chrome fires `beforeinstallprompt` only when the app is genuinely
 * installable (manifest + service worker + icons), so the event's existence is
 * itself the signal. We must call preventDefault() and re-fire it ourselves:
 * without that the browser's mini-infobar appears and we never get to show
 * our own button.
 *
 * iOS Safari never fires the event; there we show the Share -> Add to Home
 * Screen instructions instead.
 */
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = 'unavailable' | 'installed' | 'installable';

export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>('unavailable');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Keep it, so we can show a button the user chooses to press.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setState('installable');
    };
    const onInstalled = () => {
      setDeferred(null);
      setState('installed');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // Already running as an installed app?
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) setState('installed');

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const e = deferred;
    if (!e) return 'unavailable';
    await e.prompt();
    const choice = await e.userChoice;
    if (choice.outcome === 'accepted') setState('installed');
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  return { state, install };
}

/**
 * True when the browser will not fire beforeinstallprompt, so instructions
 * for manual installation are more useful than a dead button.
 */
export function needsManualInstallSteps(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return iOS;
}