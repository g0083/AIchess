/**
 * Persistence.
 *
 * Small values (settings, profile) live in localStorage for synchronous reads
 * during the first render. Anything with real volume (game archive, puzzle SRS
 * schedule, lesson progress) lives in IndexedDB via idb-keyval.
 */
import { createStore, get, set, del } from 'idb-keyval';

const ns = (k: string) => `shogiya-chess:${k}`;

const idb = createStore('shogiya-chess', 'kv');

export async function idbGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await get<T>(ns(key), idb);
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    await set(ns(key), value, idb);
  } catch {
    /* quota or private mode: settings remain in localStorage */
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await del(ns(key), idb);
  } catch {
    /* ignore */
  }
}

const LS_PREFIX = 'shogiya-chess:';

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function lsDel(key: string): void {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* ignore */
  }
}
