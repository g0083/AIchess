/**
 * Room codes and display names for P2P.
 *
 * Two alphabets are in play: a narrow "Crockford-style" one for P2P join codes.
 * It drops the characters that get mistyped and misread (O/0, I/1/l), because a
 * room code has to survive being read aloud or copied off a screen.
 *
 * Kept separate from Room.ts so the file names never collide on a
 * case-insensitive filesystem.
 */

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Number of data characters in a generated code. 32^8 is about 40 bits. */
const CODE_LEN = 8;

/** Namespaced so it cannot collide with any other trystero app. */
export const P2P_APP_ID = 'shogiya-chess-p2p-v1';

export function makeRoomCode(): string {
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function isValidRoomCode(code: string): boolean {
  return /^[2-9A-HJ-NP-Z]{4,16}$/.test(code.toUpperCase());
}

/** `ROOM-XXXX-XXXX`, which is what the QR encodes inside the join URL. */
export function formatRoomCode(code: string): string {
  const c = code.toUpperCase();
  return c.length === 8 ? `ROOM-${c.slice(0, 4)}-${c.slice(4)}` : `ROOM-${c}`;
}

/** Strips the `ROOM-` prefix and dashes so any accepted form normalises. */
export function normaliseRoomCode(raw: string): string | null {
  const s = raw.toUpperCase().replace(/^ROOM-/, '').replace(/[^0-9A-Z]/g, '');
  return isValidRoomCode(s) ? s : null;
}

/** Display name rules: 1-24 characters, no control characters. */
export function sanitizeDisplayName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split('')
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c >= 0x20 && c !== 0x7f;
    })
    .join('')
    .slice(0, 24);
}

/** First character of a display name, used for the avatar badge. */
export function nameInitial(name: string): string {
  return [...name][0] ?? 'ぐ';
}