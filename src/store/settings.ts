/**
 * User settings and profile.
 *
 * Kept in zustand with localStorage persistence so the first render already
 * has the right theme, piece set and display name.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_AI, type AiConfig } from '../ai/profile';
import { randomDisplayName } from '../i18n/ja';

export type ThemeId = 'washi' | 'sepia' | 'ink';
export type PieceSetId = 'classic' | 'ink';
export type NotationLang = 'ja' | 'en';

export interface Settings {
  theme: ThemeId;
  pieceSet: PieceSetId;
  notationLang: NotationLang;
  /** Show file/rank coordinates on the board. */
  showCoordinates: boolean;
  /** Highlight the last move. */
  highlightLastMove: boolean;
  /** Show legal-move dots. */
  showMoveHints: boolean;
  /** Sound effects. */
  sound: boolean;
  /** Auto-flip the board to the player's side on small screens. */
  autoFlip: boolean;
  /** Confirmation before resigning. */
  confirmResign: boolean;
  /** Show AI coach explanations when requesting a hint. */
  coachExplanation: boolean;
  /** Warn about opponent threats and mate dangers. */
  showThreats: boolean;
  /** Highlight undefended friendly pieces under attack. */
  highlightHanging: boolean;
  displayName: string;
  clockPresetId: string;
  ai: AiConfig;
  /** Whether the optional 99 MB engine has been downloaded. */
  fullEngineReady: boolean;
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patch: (p: Partial<Settings>) => void;
  setAi: (a: Partial<AiConfig>) => void;
  reset: () => void;
}

/** Trims, strips control characters, and caps the length. */
export function sanitizeName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 24);
}

const DEFAULTS: Settings = {
  theme: 'washi',
  pieceSet: 'classic',
  notationLang: 'ja',
  showCoordinates: true,
  highlightLastMove: true,
  showMoveHints: true,
  sound: false,
  autoFlip: true,
  confirmResign: true,
  coachExplanation: true,
  showThreats: true,
  highlightHanging: true,
  displayName: '',
  clockPresetId: 'sudoku-10-5',
  ai: DEFAULT_AI,
  fullEngineReady: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      displayName: randomDisplayName(),
      set: (key, value) => set({ [key]: value } as never),
      patch: (p) => set(p as never),
      setAi: (a) => set((s) => ({ ai: { ...s.ai, ...a } })),
      reset: () => set({ ...DEFAULTS, displayName: randomDisplayName() }),
    }),
    {
      name: 'shogiya-chess:settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/** The name shown to other players, never empty. */
export function playerName(name: string): string {
  const n = sanitizeName(name);
  return n || 'ゲスト';
}

/** First character of the display name, used for the avatar badge. */
export function initialOf(name: string): string {
  const n = playerName(name);
  return [...n][0] ?? 'ぐ';
}
