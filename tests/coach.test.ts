import { describe, expect, it } from 'vitest';
import {
  explainMove,
  explainOpponentThreat,
  detectHangingPieces,
  explainPuzzleBlunder,
} from '../src/chess/coach';

describe('coach: explainMove', () => {
  it('explains a checkmate move', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    const advice = explainMove(fen, 'Ra8#');
    expect(advice).not.toBeNull();
    expect(advice?.category).toBe('mate');
    expect(advice?.title).toContain('チェックメイト');
  });

  it('explains a castling move', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const advice = explainMove(fen, 'O-O');
    expect(advice).not.toBeNull();
    expect(advice?.category).toBe('castle');
    expect(advice?.reason).toContain('キングを安全地帯へ');
  });

  it('explains a free piece capture', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const advice = explainMove(fen, 'exd5');
    expect(advice).not.toBeNull();
    expect(advice?.category).toBe('capture');
    expect(advice?.title).toContain('ポーンの獲得');
  });

  it('explains a center occupation by pawn', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const advice = explainMove(fen, 'e4');
    expect(advice).not.toBeNull();
    expect(advice?.category).toBe('center');
  });
});

describe('coach: explainOpponentThreat', () => {
  it('detects when the king is in check', () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3';
    const threat = explainOpponentThreat(fen);
    expect(threat).not.toBeNull();
    expect(threat?.type).toBe('check');
  });

  it('detects a mate threat by opponent', () => {
    // Black has Qf3, threatening Qxf7# next move
    const fen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B5/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 3';
    const threat = explainOpponentThreat(fen);
    expect(threat).not.toBeNull();
    expect(threat?.type).toBe('mate');
    expect(threat?.message).toContain('Qxf7#');
  });
});

describe('coach: detectHangingPieces', () => {
  it('detects an undefended piece under attack', () => {
    // White knight on e5 is attacked by Black pawn on d6, undefended
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    const hanging = detectHangingPieces(fen, 'w');
    expect(hanging).toContain('e5');
  });
});

describe('coach: explainPuzzleBlunder', () => {
  it('points out a missed checkmate', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    const msg = explainPuzzleBlunder(fen, 'h3', 'Ra8#');
    expect(msg).toContain('チェックメイト');
  });

  it('points out when a piece is hung for free', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // Playing e4 then e5 for Black...
    const fen2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    // White plays Qh5, Black plays g5?
    const fen3 = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
    // Black plays a5, hangs e5 pawn
    const msg = explainPuzzleBlunder(fen3, 'Nf6', 'Qxe5+');
    expect(msg).toBeDefined();
  });
});
