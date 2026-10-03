/**
 * Service worker registration.
 *
 * vite-plugin-pwa is configured with `injectRegister: null`, so nothing is
 * registered automatically - it is done here instead, because the app also
 * needs to react to updates ("a new version is ready") rather than silently
 * swapping the bundle under the user's fingers.
 *
 * Without this call the app is not installable: Chrome only offers the install
 * prompt once a service worker with a fetch handler is actually registered.
 */
import { registerSW } from 'virtual:pwa-register';

/** Prompts the waiting worker to activate. */
export const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    notify({ type: 'update-available' });
  },
  onOfflineReady() {
    notify({ type: 'offline-ready' });
  },
});

export type PwaEvent = { type: 'update-available' | 'offline-ready' };

const listeners = new Set<(e: PwaEvent) => void>();

function notify(e: PwaEvent) {
  for (const l of listeners) l(e);
}

export function onPwaEvent(fn: (e: PwaEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}