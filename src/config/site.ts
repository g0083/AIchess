/**
 * Runtime configuration, in particular the PUBLIC link used to build P2P
 * join URLs and QR codes.
 *
 * Resolution order (first non-empty wins):
 *   1. localStorage override set by the user in Settings
 *   2. window.__APP_CONFIG__.publicOrigin  (public/app-config.json on the server)
 *   3. import.meta.env.VITE_PUBLIC_ORIGIN  (build-time .env)
 *   4. window.location.origin                (always correct as a last resort)
 *
 * This is what lets the deployment URL be decided *after* the app is built:
 * edit app-config.json on the server, and the QR codes start using it.
 */

const LS_KEY = 'chess.publicOrigin';

interface AppConfig {
  publicOrigin?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

/** Trailing slashes would produce a double slash in every join URL. */
function normalizeOrigin(v: string): string {
  const s = v.trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

export function getPublicOrigin(): string {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return normalizeOrigin(stored);
  } catch {
    /* private mode or no DOM (tests): fall through */
  }
  const fromFile = normalizeOrigin(globalThis.window?.__APP_CONFIG__?.publicOrigin ?? '');
  if (fromFile) return fromFile;
  const fromEnv = normalizeOrigin(import.meta.env.VITE_PUBLIC_ORIGIN ?? '');
  if (fromEnv) return fromEnv;
  return normalizeOrigin(globalThis.location?.origin ?? '');
}

export function setPublicOriginOverride(v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, normalizeOrigin(v));
  } catch {
    /* ignore */
  }
}

export function getPublicOriginOverride(): string {
  try {
    return normalizeOrigin(localStorage.getItem(LS_KEY) ?? '');
  } catch {
    return '';
  }
}

/** Where the deployed app is expected to live; used to warn on mismatch. */
export function isConfiguredOrigin(): boolean {
  const o = getPublicOrigin();
  return o !== '' && o !== normalizeOrigin(window.location.origin);
}

/**
 * The shareable join URL for a room.
 * Query parameters come before the hash so this is a plain, server-independent
 * URL that any static host serves correctly.
 */
export function joinUrl(roomCode: string): string {
  return `${getPublicOrigin()}/?room=${encodeURIComponent(roomCode)}&join=1#p2p`;
}

/** Pull a room code out of a URL, a pasted code, or arbitrary scanned text. */
export function parseRoomInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // A URL: prefer the explicit query parameter, then the hash.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) || s.startsWith('/')) {
    try {
      // Only an absolute URL needs a base; relative input is fine without one.
      const base = typeof window === 'undefined' ? undefined : window.location.href;
      const u = base ? new URL(s, base) : new URL(s);
      const fromQuery = u.searchParams.get('room');
      if (fromQuery) return fromQuery.toUpperCase();
      const fromHash = u.hash.match(/room=([A-Za-z0-9-]+)/);
      if (fromHash?.[1]) return fromHash[1].toUpperCase();
    } catch {
      /* not a parsable URL */
    }
  }

  // A bare code. Deliberately strict so a URL that slipped through above
  // cannot match its own scheme ("HTTPS" is not a room code).
  const direct = s.match(/^ROOM-([2-9A-HJ-NP-Z-]{8,20})$/i);
  if (direct) {
    const body = direct[1].replace(/-/g, '').toUpperCase();
    if (/^[2-9A-HJ-NP-Z]{8}$/.test(body)) return body;
  }
  if (/^[2-9A-HJ-NP-Z]{8}$/.test(s)) return s.toUpperCase();
  return null;
}
