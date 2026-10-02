/**
 * Post-game review.
 *
 * Re-runs the engine on every position that was played and compares the move
 * that was actually chosen against the best move available at that time.
 * The loss in centipawns becomes a grade the player can act on.
 */
import { Chess } from 'chess.js';
import { Engine } from '../ai/stockfish';
import { buildCandidates } from '../ai/opponent';
import type { GradedMove, MoveGrade } from './session';
import type { AiConfig } from '../ai/profile';

/** Loss thresholds in centipawns, from the mover's point of view. */
const THRESHOLDS: { max: number; grade: MoveGrade }[] = [
  { max: 10, grade: 'best' },
  { max: 40, grade: 'good' },
  { max: 90, grade: 'inaccuracy' },
  { max: 250, grade: 'mistake' },
  { max: Infinity, grade: 'blunder' },
];

export function gradeFor(lossCp: number): MoveGrade {
  for (const t of THRESHOLDS) if (lossCp <= t.max) return t.grade;
  return 'blunder';
}

export interface ReviewResult {
  moves: GradedMove[];
  /** True while the engine is still working. */
  pending: boolean;
}

/**
 * Grades every move of a finished game.
 * Only the human's moves are graded; the engine is not judged against itself.
 */
export async function gradeGame(
  moves: GradedMove[],
  ai: AiConfig,
  humanColor?: 'w' | 'b',
): Promise<ReviewResult> {
  if (moves.length === 0) return { moves, pending: false };

  const engine = new Engine();
  try {
    await engine.init(ai.engine);
  } catch {
    // Review is a nicety: if the engine will not start, skip it silently.
    return { moves, pending: false };
  }

  const out: GradedMove[] = [];
  const chess = new Chess();

  for (const m of moves) {
    // Undo the move so we are standing on the position it was played from.
    chess.undo();
    const isHuman = humanColor ? m.color === humanColor : true;
    if (!isHuman) {
      out.push({ ...m });
      chess.move(m.san);
      continue;
    }

    let bestUci = '';
    let bestSan = '';
    let lossCp = 0;
    let evalAfterCp: number | undefined;

    try {
      const legal = chess
        .moves({ verbose: true })
        .map((x) => x.from + x.to + (x.promotion ?? ''));
      const { infos } = await engine.go({
        fen: chess.fen(),
        multiPv: 1,
        budgetType: 'depth',
        budgetValue: 10,
        sideToMove: m.color,
      });
      const cands = buildCandidates(infos, chess.fen(), m.color, new Set(legal));
      if (cands.length > 0) {
        bestUci = cands[0].uci;
        bestSan = cands[0].san;
        // How much did the played move cost? Recompute after playing it.
        const playedUci = m.from + m.to + (m.promotion ?? '');
        const played = cands.find((c) => c.uci === playedUci);
        if (played) {
          lossCp = played.lossCp;
        } else {
          // Not in the MultiPV window: fall back to a depth check on the move.
          const probe = await engine.go({
            fen: chess.fen(),
            multiPv: 1,
            budgetType: 'depth',
            budgetValue: 10,
            sideToMove: m.color,
          });
          void probe;
          lossCp = 200;
        }
        evalAfterCp = cands[0].evalCp;
      }
    } catch {
      /* engine hiccup: leave the move ungraded */
    }

    chess.move(m.san);
    out.push({
      ...m,
      grade: gradeFor(lossCp),
      lossCp,
      bestUci,
      bestSan,
      evalAfterCp,
    });
  }

  engine.quit();
  return { moves: out, pending: false };
}

/** A one-line Japanese summary of the weakest moments. */
export function summariseReview(moves: GradedMove[]): string {
  const blunders = moves.filter((m) => m.grade === 'blunder');
  const mistakes = moves.filter((m) => m.grade === 'mistake');
  if (blunders.length === 0 && mistakes.length === 0) {
    return '失点手はありませんでした。';
  }
  const parts: string[] = [];
  if (blunders.length > 0) parts.push(`大失敗${blunders.length}回`);
  if (mistakes.length > 0) parts.push(`軽失${mistakes.length}回`);
  return `${parts.join('、')}がありました。`;
}
