import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { PUZZLES, THEME_LABELS } from '../src/content/puzzles';
import { LESSONS, CLASSES } from '../src/content/lessons';
import { GLOSSARY } from '../src/content/glossary';
import { ACHIEVEMENTS } from '../src/content/achievements';
import {
  makeRoomCode,
  isValidRoomCode,
  formatRoomCode,
  sanitizeDisplayName,
  nameInitial,
} from '../src/p2p/roomCodes';
import { parseRoomInput, joinUrl, getPublicOrigin } from '../src/config/site';
import { DEFAULT_AI, effectiveSpec, LEVELS, PERSONALITIES } from '../src/ai/profile';
import { chooseMove, buildCandidates, type Candidate } from '../src/ai/opponent';
import { parseInfo } from '../src/ai/stockfish';

describe('puzzles', () => {
  it('every solution is a legal move sequence', () => {
    for (const p of PUZZLES) {
      const c = new Chess(p.fen);
      expect(() => new Chess(p.fen), p.id).not.toThrow();
      for (const san of p.solution) {
        expect(c.move(san), `${p.id}: ${san}`).not.toBeNull();
      }
    }
  });

  it('every puzzle carries text and a rating', () => {
    for (const p of PUZZLES) {
      expect(p.solution.length).toBeGreaterThan(0);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.hint.length).toBeGreaterThan(0);
      expect(p.explain.length).toBeGreaterThan(0);
      expect(p.rating).toBeGreaterThan(0);
    }
  });

  it('every theme is labelled', () => {
    for (const p of PUZZLES) {
      for (const t of p.themes) {
        expect(Object.keys(THEME_LABELS)).toContain(t);
      }
    }
  });

  it('has unique puzzle ids', () => {
    const ids = PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('lessons', () => {
  it('defines nine classes, level 0 through 8', () => {
    expect(CLASSES).toHaveLength(9);
    expect(CLASSES.map((c) => c.level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('every lesson board task has a legal accepted move', () => {
    for (const l of LESSONS) {
      if (!l.task) continue;
      const c = new Chess(l.task.fen);
      for (const san of l.task.accept) {
        expect(c.move(san), `${l.id}: ${san}`).not.toBeNull();
        c.undo();
      }
    }
  });

  it('every quiz answer index is in range', () => {
    for (const l of LESSONS) {
      for (const q of l.quiz ?? []) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
      }
    }
  });
});

describe('glossary and achievements', () => {
  it('has unique glossary terms', () => {
    const terms = GLOSSARY.map((g) => g.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('every glossary entry explains itself', () => {
    for (const g of GLOSSARY) {
      expect(g.short.length).toBeGreaterThan(0);
      expect(g.points.length).toBeGreaterThan(0);
    }
  });

  it('validates every glossary example position', () => {
    for (const g of GLOSSARY) {
      if (!g.example) continue;
      const c = new Chess(g.example.fen);
      expect(c.move(g.example.solution), `${g.term}: ${g.example.solution}`).not.toBeNull();
    }
  });

  it('has unique achievement ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('room codes', () => {
  it('generates eight unambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = makeRoomCode();
      expect(code).toHaveLength(8);
      expect(isValidRoomCode(code)).toBe(true);
      // Characters that get confused when read aloud must never appear.
      expect(code).not.toMatch(/[O0IL1]/);
    }
  });

  it('formats a code for display', () => {
    expect(formatRoomCode('ABCD2345')).toBe('ROOM-ABCD-2345');
  });

  it('sanitises display names', () => {
    expect(sanitizeDisplayName('  山田   太郎 ')).toBe('山田 太郎');
    expect(sanitizeDisplayName('a'.repeat(40))).toHaveLength(24);
    expect(sanitizeDisplayName('')).toBe('');
  });

  it('derives an avatar initial', () => {
    expect(nameInitial('山田')).toBe('山');
    expect(nameInitial('')).toBe('ぐ');
  });
});

describe('join links', () => {
  it('parses a room code out of a full URL', () => {
    expect(
      parseRoomInput('https://g0083.github.io/AIChess/?room=ABCD2345&join=1#p2p'),
    ).toBe('ABCD2345');
  });

  it('parses a bare ROOM- code', () => {
    expect(parseRoomInput('ROOM-ABCD-2345')).toBe('ABCD2345');
  });

  it('rejects nonsense', () => {
    expect(parseRoomInput('')).toBeNull();
  });

  it('does not mistake a URL scheme for a room code', () => {
    expect(parseRoomInput('https://example.com/')).toBeNull();
    expect(parseRoomInput('HTTPS')).toBeNull();
  });

  it('keeps the deployment sub-path in the join URL', () => {
    // GitHub Pages serves the app at /AIChess/. Losing the sub-path would
    // make every QR code point at the domain root instead of the app.
    globalThis.window = {
      __APP_CONFIG__: { publicOrigin: 'https://g0083.github.io/AIChess' },
    } as never;
    try {
      expect(joinUrl('ABCD2345')).toBe(
        'https://g0083.github.io/AIChess/?room=ABCD2345&join=1#p2p',
      );
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('never emits a path that escapes the deployment prefix', () => {
    globalThis.window = {
      __APP_CONFIG__: { publicOrigin: 'https://g0083.github.io/AIChess/' },
    } as never;
    try {
      // A trailing slash in the config must not produce a double slash.
      const url = joinUrl('ABCD2345');
      expect(url).toContain('/AIChess/?room=');
      expect(url).not.toContain('//?room=');
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
  it('builds a URL with the query before the hash', () => {
    const url = joinUrl('ABCD2345');
    expect(url).toContain('?room=ABCD2345');
    expect(url.indexOf('?')).toBeLessThan(url.indexOf('#'));
    expect(url.endsWith('#p2p')).toBe(true);
    // Outside a browser there is no origin, so only assert it when present.
    const origin = getPublicOrigin();
    if (origin) expect(url.startsWith(origin)).toBe(true);
  });
});

describe('ai difficulty', () => {
  it('defines eight levels', () => {
    expect(LEVELS).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(8);
  });

  it('gets stronger as the level rises', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].budgetValue).toBeGreaterThanOrEqual(LEVELS[i - 1].budgetValue);
      expect(LEVELS[i].blendChance).toBeLessThanOrEqual(LEVELS[i - 1].blendChance);
    }
  });

  it('only marks the top two levels as needing the full engine', () => {
    expect(LEVELS.filter((l) => l.needsFullEngine).map((l) => l.id)).toEqual([
      'master',
      'maximum',
    ]);
  });

  it('defines six personalities', () => {
    expect(PERSONALITIES).toHaveLength(6);
    for (const p of PERSONALITIES) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it('passes the level tuning through for a normal level', () => {
    const cfg = { ...DEFAULT_AI, level: 'beginner' as const };
    expect(effectiveSpec(cfg).budgetValue).toBe(LEVELS[0].budgetValue);
  });

  it('uses the custom block when level is custom', () => {
    const cfg = { ...DEFAULT_AI, level: 'custom' as const };
    expect(effectiveSpec(cfg).budgetValue).toBe(DEFAULT_AI.custom.budgetValue);
  });
});

describe('move selection', () => {
  const candidates: Candidate[] = [
    { uci: 'e2e4', san: 'e4', evalCp: 30, lossCp: 0, pv: ['e2e4'], depth: 10 },
    { uci: 'd2d4', san: 'd4', evalCp: 10, lossCp: 20, pv: ['d2d4'], depth: 10 },
    { uci: 'g1f3', san: 'Nf3', evalCp: -40, lossCp: 70, pv: ['g1f3'], depth: 10 },
  ];

  it('always picks the best move at maximum strength', () => {
    const cfg = { ...DEFAULT_AI, level: 'maximum' as const };
    const choice = chooseMove(candidates, cfg);
    expect(choice!.uci).toBe('e2e4');
    expect(choice!.weakened).toBe(false);
  });

  it('weakens the move for a beginner, but never past its allowed window', () => {
    const cfg = { ...DEFAULT_AI, level: 'beginner' as const };
    const window = LEVELS[0].blendWindow;
    let weakened = 0;
    for (let i = 0; i < 400; i++) {
      const choice = chooseMove(candidates, cfg, { rand: () => i / 400 });
      // The opponent may play an inferior move, but never an absurd one.
      const played = candidates.find((c) => c.uci === choice!.uci)!;
      expect(played.lossCp).toBeLessThanOrEqual(window);
      if (choice!.weakened) weakened++;
    }
    // And it must actually make mistakes, otherwise the level is a cheat.
    expect(weakened).toBeGreaterThan(0);
  });

  it('never weakens below the intermediate window', () => {
    const cfg = { ...DEFAULT_AI, level: 'intermediate' as const };
    for (let i = 0; i < 300; i++) {
      const choice = chooseMove(candidates, cfg, { rand: () => i / 300 });
      const played = candidates.find((c) => c.uci === choice!.uci)!;
      expect(played.lossCp).toBeLessThanOrEqual(LEVELS[4].blendWindow);
    }
  });

  it('is deterministic when a fixed random source is given', () => {
    const cfg = { ...DEFAULT_AI, level: 'beginnerPlus' as const };
    const a = chooseMove(candidates, cfg, { rand: () => 0.5 });
    const b = chooseMove(candidates, cfg, { rand: () => 0.5 });
    expect(a!.uci).toBe(b!.uci);
  });

  it('builds candidates from engine output and filters illegal moves', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const infos = [
      parseInfo('info depth 8 multipv 1 score cp 30 pv e2e4', 'w')!,
      parseInfo('info depth 8 multipv 2 score cp 20 pv d2d4', 'w')!,
      parseInfo('info depth 8 multipv 3 score cp 10 pv e2e5', 'w')!,
    ];
    const legal = new Set(['e2e4', 'd2d4']);
    const out = buildCandidates(infos, fen, 'w', legal);
    expect(out.map((c) => c.uci)).toEqual(['e2e4', 'd2d4']);
    expect(out[0].lossCp).toBe(0);
    expect(out[1].lossCp).toBe(10);
  });
});
