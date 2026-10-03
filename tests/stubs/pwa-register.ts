/**
 * Stub for vite-plugin-pwa's `virtual:pwa-register`, which only exists inside
 * a real Vite build. Tests alias it here so `src/pwa.ts` can be imported.
 */
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}