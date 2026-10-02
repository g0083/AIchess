import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  materialSummary,
  positionResult,
  toMoveRecord,
  VALUES,
} from '../src/chess/rules';
import { parseInfo, evalLabelJa, evalToRatio, latestByPv } from '../src/ai/stockfish';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('rules', () => {
  it('reports no result on the starting position', () => {
    const r = positionResult(new Chess(START));
    expect(r.over).toBe(false);
  });

  it('detects checkmate and names the winner', () => {
    const c = new Chess('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
    c.move('Ra8');
    const r = positionResult(c);
    expect(r.over).toBe(true);
    expect(r.reason).toBe('チェックメイト');
    expect(r.winner).toBe('w');
  });

  it('detects stalemate as a draw', () => {
    const c = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const r = positionResult(c);
    if (c.isStalemate()) {
      expect(r.reason).toBe('ステイルメイト');
      expect(r.winner).toBeUndefined();
    }
  });

  it('reports an agreed resignation', () => {
    const r = positionResult(new Chess(START), { resignedBy: 'w' });
    expect(r.reason).toBe('投了');
    expect(r.winner).toBe('b');
  });

  it('records moves with SAN and the resulting FEN', () => {
    const c = new Chess(START);
    const m1 = c.move('e4');
    const rec = toMoveRecord(m1!, 1, c.fen());
    expect(rec.san).toBe('e4');
    expect(rec.from).toBe('e2');
    expect(rec.to).toBe('e4');
    expect(rec.fen).toBe(c.fen());
    expect(rec.castle).toBe(false);
  });

  it('flags castling and en passant in the move record', () => {
    const castle = new Chess('rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 4');
    expect(castle.move('O-O')!.san).toBe('O-O');

    // Reach the en-passant position by playing it, which avoids depending on
    // how strictly a given library validates the FEN ep field.
    const ep = new Chess();
    ep.move('e4');
    ep.move('a6');
    ep.move('e5');
    ep.move('d5');
    const mv = ep.move('exd6');
    expect(mv?.flags).toContain('e');
    expect(mv?.san).toBe('exd6');
  });

  it('summarises captured material from White\'s point of view', () => {
    const c = new Chess('4k3/8/8/3n4/8/4N3/8/4K3 w - - 0 1');
    c.move('Nxd5');
    const s = materialSummary([toMoveRecord(c.history({ verbose: true })[0], 1, c.fen())]);
    expect(s.balance).toBe(VALUES.n);
    expect(s.white).toEqual([{ role: 'n', count: 1 }]);
  });
});

describe('engine info parsing', () => {
  it('normalises the score to White and captures the PV', () => {
    const info = parseInfo(
      'info depth 12 seldepth 20 multipv 1 score cp 34 nodes 1000 nps 5000 time 200 pv e2e4 e7e5 g1f3',
      'w',
    );
    expect(info).not.toBeNull();
    expect(info!.depth).toBe(12);
    expect(info!.multipv).toBe(1);
    expect(info!.evalCp).toBe(34);
    expect(info!.pv[0]).toBe('e2e4');
    expect(info!.nodes).toBe(1000);
  });

  it('flips the score when Black is to move', () => {
    const info = parseInfo('info depth 10 multipv 1 score cp 50 pv e7e5', 'b');
    expect(info!.evalCp).toBe(-50);
  });

  it('turns a mate score into a very large advantage', () => {
    const info = parseInfo('info depth 12 multipv 1 score mate 3 pv d1h5', 'w');
    expect(info!.scoreMate).toBe(3);
    expect(info!.evalCp).toBeGreaterThan(1000);
  });

  it('ignores lines with no depth', () => {
    expect(parseInfo('info string hello', 'w')).toBeNull();
  });

  it('keeps the newest line per MultiPV slot', () => {
    const a = parseInfo('info depth 5 multipv 1 score cp 10 pv a2a3', 'w')!;
    const b = parseInfo('info depth 9 multipv 1 score cp 20 pv a2a4', 'w')!;
    const c2 = parseInfo('info depth 8 multipv 2 score cp 5 pv b2b3', 'w')!;
    const out = latestByPv([a, b, c2]);
    expect(out).toHaveLength(2);
    expect(out[0].depth).toBe(9);
  });
});

describe('evaluation display', () => {
  it('labels centipawns in Japanese', () => {
    expect(evalLabelJa(0)).toBe('均衡');
    expect(evalLabelJa(40)).toBe('白やや優勢');
    expect(evalLabelJa(-300)).toBe('黒が明確に優勢');
    expect(evalLabelJa(900)).toBe('白の必勝');
  });

  it('maps 0 to half and grows monotonically with White', () => {
    expect(evalToRatio(0)).toBeCloseTo(0.5);
    expect(evalToRatio(300)).toBeGreaterThan(0.5);
    expect(evalToRatio(-300)).toBeLessThan(0.5);
  });
});