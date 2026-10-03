/**
 * Learning progress, puzzle rating, streaks and the spaced-repetition
 * schedule. Persisted to IndexedDB because the SRS table grows over time.
 */
import { create } from 'zustand';
import { idbGet, idbSet } from './persist';

export type SrsResult = 'again' | 'hard' | 'good' | 'easy';

/** One puzzle's review history, in the spirit of SM-2. */
export interface SrsCard {
  id: string;
  /** Times seen. */
  reps: number;
  /** Times answered wrongly. */
  lapses: number;
  /** Ease factor, 1.3..2.8. Lower after a miss. */
  ease: number;
  /** Days until the next review. */
  interval: number;
  /** Epoch ms when the card becomes due. */
  due: number;
  lastResult?: SrsResult;
}

export interface ProgressState {
  loaded: boolean;
  /** Consecutive days with at least one puzzle or lesson. */
  streak: number;
  /** Last day (YYYY-MM-DD) that activity was recorded. */
  lastActiveDay: string;
  /** Glicko-lite puzzle rating. */
  puzzleRating: number;
  puzzleDeviation: number;
  /** AI ladder rating. */
  aiRating: number;
  lessons: Record<string, boolean>;
  /** Classes unlocked, 0..8. */
  unlockedClass: number;
  classTests: Record<number, { passed: boolean; score: number }>;
  /** Opening drill mastery, keyed by opening id: 0..1. */
  openings: Record<string, number>;
  cards: Record<string, SrsCard>;
  achievements: string[];
  daily: Record<string, { solved: number; date: string }>;
  gamesToday: number;

  hydrate: () => Promise<void>;
  touch: () => void;
  recordPuzzle: (id: string, correct: boolean, ms: number) => void;
  rateCard: (id: string, result: SrsResult) => void;
  markLesson: (id: string) => void;
  passClassTest: (level: number, score: number) => void;
  setOpeningMastery: (id: string, v: number) => void;
  grantAchievement: (id: string) => boolean;
  addGame: () => void;
}

const KEY = 'progress';
const START_RATING = 1000;

/** Rating update after a solve, with a bonus for fast correct answers. */
export function glickoLite(
  rating: number,
  deviation: number,
  correct: boolean,
  ms: number,
): { rating: number; deviation: number } {
  const speed = Math.max(-40, Math.min(40, (60_000 - ms) / 2000));
  const k = 32 / (1 + deviation / 120);
  const expected = 1 / (1 + Math.pow(10, -rating / 400));
  const delta = k * ((correct ? 1 : 0) - expected) + (correct ? speed : -speed);
  return {
    rating: Math.round(Math.max(600, Math.min(2600, rating + delta))),
    deviation: Math.round(Math.max(30, deviation * 0.985)),
  };
}

/** SM-2 with the four buttons a player actually sees. */
export function scheduleNext(card: SrsCard, result: SrsResult): SrsCard {
  const next = { ...card };
  if (result === 'again') {
    next.lapses += 1;
    next.reps = 0;
    next.ease = Math.max(1.3, next.ease - 0.2);
    next.interval = 0;
    next.due = Date.now() + 10 * 60_000; // again later in the same session
  } else {
    next.reps += 1;
    if (result === 'hard') {
      next.ease = Math.max(1.3, next.ease - 0.15);
      next.interval = Math.max(1, Math.round(Math.max(1, next.interval) * 1.2));
    } else if (result === 'good') {
      next.interval =
        next.reps === 1 ? 1 : next.reps === 2 ? 3 : Math.round(next.interval * next.ease);
    } else {
      next.ease = Math.min(2.8, next.ease + 0.15);
      next.interval = next.reps === 1 ? 2 : Math.round(Math.max(2, next.interval) * next.ease);
    }
    next.due = Date.now() + next.interval * 86_400_000;
  }
  next.lastResult = result;
  return next;
}

export function newCard(id: string): SrsCard {
  return { id, reps: 0, lapses: 0, ease: 2.5, interval: 0, due: Date.now() };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

interface Persisted {
  streak: number;
  lastActiveDay: string;
  puzzleRating: number;
  puzzleDeviation: number;
  aiRating: number;
  lessons: Record<string, boolean>;
  unlockedClass: number;
  classTests: Record<number, { passed: boolean; score: number }>;
  openings: Record<string, number>;
  cards: Record<string, SrsCard>;
  achievements: string[];
  daily: Record<string, { solved: number; date: string }>;
  gamesToday: number;
}

const INITIAL: Persisted & { loaded: boolean } = {
  loaded: false,
  streak: 0,
  lastActiveDay: '',
  puzzleRating: START_RATING,
  puzzleDeviation: 200,
  aiRating: 1000,
  lessons: {},
  unlockedClass: 0,
  classTests: {},
  openings: {},
  cards: {},
  achievements: [],
  daily: {},
  gamesToday: 0,
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced write-behind; IndexedDB is too slow to hit on every keystroke. */
function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const c = useProgress.getState();
    void idbSet(KEY, {
      streak: c.streak,
      lastActiveDay: c.lastActiveDay,
      puzzleRating: c.puzzleRating,
      puzzleDeviation: c.puzzleDeviation,
      aiRating: c.aiRating,
      lessons: c.lessons,
      unlockedClass: c.unlockedClass,
      classTests: c.classTests,
      openings: c.openings,
      cards: c.cards,
      achievements: c.achievements,
      daily: c.daily,
      gamesToday: c.gamesToday,
    });
  }, 400);
}

export const useProgress = create<ProgressState>()((set, get) => ({
  ...INITIAL,

  hydrate: async () => {
    const saved = await idbGet<Persisted>(KEY, INITIAL);
    set({ ...saved, loaded: true });
  },

  touch: () => {
    const today = todayKey();
    const { lastActiveDay, streak } = get();
    if (lastActiveDay === today) return;
    const next = daysBetween(lastActiveDay, today) === 1 ? streak + 1 : 1;
    set({ lastActiveDay: today, streak: next });
    scheduleSave();
  },

  recordPuzzle: (_id, correct, ms) => {
    const cur = get();
    const { rating, deviation } = glickoLite(cur.puzzleRating, cur.puzzleDeviation, correct, ms);
    const today = todayKey();
    const entry = cur.daily[today] ?? { solved: 0, date: today };
    set({
      puzzleRating: rating,
      puzzleDeviation: deviation,
      daily: { ...cur.daily, [today]: { solved: entry.solved + 1, date: today } },
    });
    if (correct) {
      get().grantAchievement('first-puzzle');
    }
    scheduleSave();
    get().touch();
  },

  rateCard: (id, result) => {
    const cur = get().cards[id] ?? newCard(id);
    const cards = { ...get().cards, [id]: scheduleNext(cur, result) };
    set({ cards });
    scheduleSave();
  },

  markLesson: (id) => {
    if (get().lessons[id]) return;
    const lessons = { ...get().lessons, [id]: true };
    set({ lessons });
    scheduleSave();
    get().touch();
  },

  passClassTest: (level, score) => {
    const classTests = { ...get().classTests, [level]: { passed: true, score } };
    const unlockedClass = Math.max(get().unlockedClass, Math.min(8, level + 1));
    set({ classTests, unlockedClass });
    scheduleSave();
  },

  setOpeningMastery: (id, v) => {
    const openings = { ...get().openings, [id]: Math.max(get().openings[id] ?? 0, v) };
    set({ openings });
    scheduleSave();
  },

  grantAchievement: (id) => {
    if (get().achievements.includes(id)) return false;
    const achievements = [...get().achievements, id];
    set({ achievements });
    scheduleSave();
    return true;
  },

  addGame: () => {
    const nextToday = get().gamesToday + 1;
    set({ gamesToday: nextToday });
    const cur = get();
    const totalDaily = Object.values(cur.daily).reduce((a, d) => a + (d.solved ?? 0), 0);
    if (nextToday >= 10 || (nextToday + totalDaily) >= 10) {
      get().grantAchievement('ten-games');
    }
    scheduleSave();
  },
}));

/** Puzzles whose review is due, most overdue first. */
export function dueCards(cards: Record<string, SrsCard>): SrsCard[] {
  const now = Date.now();
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}

/** How many puzzles have been solved today. */
export function solvedToday(state: ProgressState): number {
  return state.daily[todayKey()]?.solved ?? 0;
}

/** Whether today's daily mission is complete. */
export function dailyDone(state: ProgressState): boolean {
  return solvedToday(state) >= 10;
}
