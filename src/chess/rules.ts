/**
 * Thin, well-typed wrapper around chess.js.
 *
 * Everything the rest of the app needs from the rules lives here, so the
 * chess.js API surface leaks into exactly one module.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

export type { Color, Square, PieceSymbol };

export interface MoveRecord {
  /** 1-based move number. */
  ply: number;
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  color: Color;
  /** SAN after the move, i.e. with check/mate suffix applied. */
  comment?: string;
  fen: string;
  /** 'w' = standard, 'b' = black, 'q' = queen, or the piece symbol for underpromotion. */
  promotion?: string;
  /** True for a castling move (detected by king moving two squares). */
  castle: boolean;
  /** True for an en-passant capture. */
  enPassant: boolean;
}

export interface ResultInfo {
  over: boolean;
  /** Japanese reason when `over`. */
  reason?: string;
  winner?: Color;
  /** Set when the game ended by agreement rather than by the rules. */
  agreed?: boolean;
}

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class Rules {
  readonly chess: Chess;

  constructor(fen: string = START_FEN) {
    this.chess = new Chess(fen);
  }

  fen(): string {
    return this.chess.fen();
  }

  turn(): Color {
    return this.chess.turn();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  isInsufficientMaterial(): boolean {
    return this.chess.isInsufficientMaterial();
  }

  isThreefoldRepetition(): boolean {
    return this.chess.isThreefoldRepetition();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  inCheck(): boolean {
    return this.chess.inCheck();
  }

  /** Whether White still has the right to castle kingside/queenside. */
  canCastle(color: Color): { king: boolean; queen: boolean } {
    const moves = this.chess.moves({ verbose: true });
    const back = color === 'w' ? '1' : '8';
    const kingFrom = `e${back}`;
    const rookFrom = color === 'w' ? 'h1' : 'h8';
    const rookQueen = color === 'w' ? 'a1' : 'a8';
    const kingSide = moves.some(
      (m) => m.from === kingFrom && m.to === `g${back}` && m.flags.includes('k'),
    );
    const queenSide = moves.some(
      (m) => m.from === kingFrom && m.to === `c${back}` && m.flags.includes('q'),
    );
    const rookExists = (from: string) => {
      const p = this.chess.get(from as never);
      return p?.type === 'r' && p.color === color;
    };
    return {
      king: kingSide && rookExists(rookFrom),
      queen: queenSide && rookExists(rookQueen),
    };
  }

  /**
   * Result of the current position, with a Japanese reason.
   * `agreed` is set by the caller for draw offers and resignations, which
   * chess.js knows nothing about.
   */
  result(agreed?: { draw?: boolean; resignedBy?: Color; timeoutBy?: Color }): ResultInfo {
    return positionResult(this.chess, agreed);
  }

  moves(): Move[] {
    return this.chess.moves({ verbose: true });
  }

  move(sanOrObj: string | { from: string; to: string; promotion?: string }): Move | null {
    try {
      return this.chess.move(sanOrObj as never);
    } catch {
      return null;
    }
  }

  undo(): Move | null {
    return this.chess.undo();
  }

  history(): Move[] {
    return this.chess.history({ verbose: true });
  }

  load(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  reset(): void {
    this.chess.reset();
  }
}

export function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}

/** SAN in Japanese-friendly notation: castling is rendered O-O / O-O-O (standard). */
export function toMoveRecord(m: Move, ply: number, fen: string): MoveRecord {
  return {
    ply,
    san: m.san,
    from: m.from as Square,
    to: m.to as Square,
    piece: m.piece,
    captured: (m as { captured?: PieceSymbol }).captured,
    color: m.color,
    promotion: m.promotion,
    fen,
    castle: m.flags.includes('k') || m.flags.includes('q'),
    enPassant: m.flags.includes('e'),
  };
}

/** Material balance in pawns, from White's point of view. */
export const VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PIECE_ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

export interface MaterialSummary {
  /** Captured pieces by the side that captured them. */
  white: { role: PieceSymbol; count: number }[];
  black: { role: PieceSymbol; count: number }[];
  /** Positive = White is up material, in pawns. */
  balance: number;
}

export function materialSummary(history: MoveRecord[]): MaterialSummary {
  const white: Record<string, number> = {};
  const black: Record<string, number> = {};
  for (const m of history) {
    if (!m.captured) continue;
    const bag = m.color === 'w' ? white : black;
    bag[m.captured] = (bag[m.captured] ?? 0) + 1;
  }
  const pack = (bag: Record<string, number>) =>
    PIECE_ORDER.filter((r) => bag[r]).map((role) => ({ role, count: bag[role] }));
  const w = pack(white);
  const b = pack(black);
  const sum = (list: { role: PieceSymbol; count: number }[]) =>
    list.reduce((a, x) => a + VALUES[x.role] * x.count, 0);
  return { white: w, black: b, balance: sum(w) - sum(b) };
}

/** The Japanese name of a piece, used in lesson text and hints. */
export const PIECE_JA: Record<PieceSymbol, string> = {
  k: 'キング',
  q: 'クイーン',
  r: 'ルーク',
  b: 'ビショップ',
  n: 'ナイト',
  p: 'ポーン',
};


/**
 * Result of a position, with a Japanese reason.
 * `agreed` is set by the caller for draw offers and resignations, which
 * chess.js knows nothing about.
 */
export function positionResult(
  chess: Chess,
  agreed?: { draw?: boolean; resignedBy?: Color; timeoutBy?: Color },
): ResultInfo {
  if (agreed?.timeoutBy) {
    return { over: true, reason: '時間切れ', winner: other(agreed.timeoutBy) };
  }
  if (agreed?.resignedBy) {
    return { over: true, reason: '投了', winner: other(agreed.resignedBy) };
  }
  if (agreed?.draw) return { over: true, reason: '合意', agreed: true };
  if (chess.isCheckmate()) {
    return { over: true, reason: 'チェックメイト', winner: other(chess.turn()) };
  }
  if (chess.isStalemate()) return { over: true, reason: 'ステイルメイト', agreed: true };
  if (chess.isInsufficientMaterial()) return { over: true, reason: '決着不能', agreed: true };
  if (chess.isThreefoldRepetition())
    return { over: true, reason: '三回同一局面', agreed: true };
  if (chess.isDraw()) return { over: true, reason: '50手ルール', agreed: true };
  return { over: false };
}
