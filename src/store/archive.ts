/**
 * Game archive: every finished game is kept as PGN plus a little metadata so
 * the archive page can list, search and filter without parsing anything.
 */
import { create } from 'zustand';
import { idbGet, idbSet } from './persist';

export type GameMode = 'ai' | 'local' | 'p2p' | 'analysis';

export interface ArchivedGame {
  id: string;
  mode: GameMode;
  date: string;
  white: string;
  black: string;
  /** PGN result token: "1-0", "0-1", "1/2-1/2" or "*". */
  result: string;
  pgn: string;
  moves: string[];
  /** Set when the game was won by the local player in AI mode. */
  won?: boolean;
  favourite?: boolean;
  tags?: string[];
}

interface ArchiveState {
  games: ArchivedGame[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  save: (g: Omit<ArchivedGame, 'id'>) => void;
  toggleFavourite: (id: string) => void;
  remove: (id: string) => void;
  setTags: (id: string, tags: string[]) => void;
  clear: () => void;
}

const KEY = 'archive';
const MAX_GAMES = 500;

function persistNow(games: ArchivedGame[]) {
  void idbSet(KEY, { games: games.slice(0, MAX_GAMES) });
}

export const useArchive = create<ArchiveState>()((set, get) => ({
  games: [],
  loaded: false,

  hydrate: async () => {
    const saved = await idbGet<{ games: ArchivedGame[] }>(KEY, { games: [] });
    set({ games: saved.games ?? [], loaded: true });
  },

  save: (g) => {
    const entry: ArchivedGame = { ...g, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    const games = [entry, ...get().games].slice(0, MAX_GAMES);
    set({ games });
    persistNow(games);
  },

  toggleFavourite: (id) => {
    const games = get().games.map((g) => (g.id === id ? { ...g, favourite: !g.favourite } : g));
    set({ games });
    persistNow(games);
  },

  remove: (id) => {
    const games = get().games.filter((g) => g.id !== id);
    set({ games });
    persistNow(games);
  },

  setTags: (id, tags) => {
    const games = get().games.map((g) => (g.id === id ? { ...g, tags } : g));
    set({ games });
    persistNow(games);
  },

  clear: () => {
    set({ games: [] });
    persistNow([]);
  },
}));

/** Builds a standards-compliant PGN from a move list. */
export function buildPgn(opts: {
  event: string;
  site?: string;
  date?: string;
  white: string;
  black: string;
  result: string;
  moves: string[];
  fen?: string;
  timeControl?: string;
}): string {
  const d = opts.date ? new Date(opts.date) : new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const head = [
    `[Event "${opts.event}"]`,
    `[Site "${opts.site ?? '将棋盤チェス'}"]`,
    `[Date "${date}"]`,
    opts.timeControl ? `[TimeControl "${opts.timeControl}"]` : '',
    ...(opts.fen ? ['[SetUp "1"]', `[FEN "${opts.fen}"]`] : []),
    `[White "${opts.white}"]`,
    `[Black "${opts.black}"]`,
    `[Result "${opts.result}"]`,
  ].filter(Boolean);

  const tokens: string[] = [];
  opts.moves.forEach((san, i) => {
    if (i % 2 === 0) tokens.push(`${i / 2 + 1}.`);
    tokens.push(san);
  });
  tokens.push(opts.result);
  return `${head.join('\n')}\n\n${tokens.join(' ')}\n`;
}
