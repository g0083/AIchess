/**
 * Turning a Stockfish search into an opponent that feels human.
 *
 * The engine is always asked for its true best moves. The difficulty is applied
 * *afterwards*, by choosing among the MultiPV lines. That way even the easiest
 * level plays defensible chess and loses to a human the way a beginner loses -
 * by overlooking a threat, not by hanging a queen on move two.
 */
import { Chess, type Square } from 'chess.js';
import type { SearchInfo } from './stockfish';
import { latestByPv } from './stockfish';
import {
  effectiveSpec,
  getPersonality,
  type AiConfig,
  type LevelSpec,
} from './profile';

export interface Candidate {
  /** UCI move, e.g. "e2e4". */
  uci: string;
  /** Algebraic for humans. */
  san: string;
  /** Evaluation in centipawns, always from White's point of view. */
  evalCp: number;
  /** Lower is better, from the mover's point of view. */
  lossCp: number;
  pv: string[];
  depth: number;
}

export interface OpponentChoice {
  uci: string;
  san: string;
  /** True when we deliberately did not pick the engine's top choice. */
  weakened: boolean;
  candidates: Candidate[];
  /** Thinking time actually spent, in ms. */
  thinkMs: number;
}

/**
 * Softmax over candidate losses. A temperature of 0 means "always the best
 * move"; higher values flatten the distribution so the opponent sometimes
 * prefers the second-best move even when blending is disabled.
 */
function softmaxPick(cands: Candidate[], temperature: number, rand: () => number): number {
  if (cands.length === 0) return -1;
  if (temperature <= 0) return 0;
  const losses = cands.map((c) => c.lossCp);
  const min = Math.min(...losses);
  const t = Math.max(1, temperature);
  const weights = losses.map((l) => Math.exp(-(l - min) / t));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** Builds a candidate list from the engine's MultiPV output. */
export function buildCandidates(
  infos: SearchInfo[],
  fen: string,
  /** Whose move it is; the engine reports scores from this side. */
  mover: 'w' | 'b',
  legalUci: Set<string>,
): Candidate[] {
  const chess = new Chess(fen);
  const latest = latestByPv(infos).filter((i) => i.pv.length > 0);
  if (latest.length === 0) return [];

  const sign = mover === 'w' ? 1 : -1;
  const best = latest[0];

  const out: Candidate[] = [];
  for (const info of latest) {
    const uci = info.pv[0];
    if (!uci || !legalUci.has(uci)) continue;
    // A promotion needs all four fields; the PV only carries the first two,
    // so recover the suffix from the legal move list.
    const full = completeUci(chess, uci);
    if (!full) continue;
    let san = '';
    try {
      const m = chess.move({
        from: full.slice(0, 2),
        to: full.slice(2, 4),
        promotion: full.length > 4 ? full.slice(4, 5) : undefined,
      });
      san = m?.san ?? '';
      chess.undo();
    } catch {
      san = '';
    }
    out.push({
      uci: full,
      san,
      evalCp: info.evalCp,
      lossCp: Math.max(0, (best.evalCp - info.evalCp) * sign),
      pv: info.pv,
      depth: info.depth,
    });
  }
  return out;
}

/** Adds the promotion suffix when the move is a pawn reaching the last rank. */
function completeUci(chess: Chess, uci: string): string | null {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  if (uci.length > 4) return uci;
  const piece = chess.get(from as Square);
  if (!piece || piece.type !== 'p') return uci;
  const rank = to[1];
  const lastRank = piece.color === 'w' ? '8' : '1';
  if (rank !== lastRank) return uci;
  // Prefer the promotion the engine would actually choose; queens are the
  // default and the engine's PV already tells us when it is not one.
  return `${uci}q`;
}

export interface ChooseOptions {
  /** Injected for deterministic tests. */
  rand?: () => number;
  /** Overrides the minimum think time, e.g. 0 in tests. */
  minThinkMs?: number;
}

/**
 * Picks the opponent's move from the candidate set according to the level's
 * blending and temperature settings.
 */
export function chooseMove(
  candidates: Candidate[],
  cfg: AiConfig,
  opts: ChooseOptions = {},
): OpponentChoice | null {
  if (candidates.length === 0) return null;
  const rand = opts.rand ?? Math.random;
  const spec: LevelSpec = effectiveSpec(cfg);
  const personality = getPersonality(cfg.personality);

  // How much worse than the best move are we willing to consider at all?
  const greedyWindow = Math.round(spec.blendWindow * (0.5 + personality.greed));

  const pool = candidates.filter((c) => c.lossCp <= greedyWindow);
  const usable = pool.length > 0 ? pool : [candidates[0]];

  // Sorting by loss means index 0 is the engine's top choice.
  const ordered = [...usable].sort((a, b) => a.lossCp - b.lossCp);

  let index = 0;
  const isTopLoss = ordered[0].lossCp;
  const canWeaken = ordered.length > 1 && isTopLoss === 0;
  if (canWeaken && rand() < spec.blendChance) {
    // Drop the best move and choose among the rest, so a weakened move is
    // always genuinely different from the top choice.
    const rest = ordered.slice(1);
    const pick = softmaxPick(rest, spec.temperature, rand);
    index = 1 + (pick < 0 ? 0 : pick);
  } else if (spec.temperature > 0 && ordered.length > 1) {
    index = Math.max(0, softmaxPick(ordered, spec.temperature, rand));
  }

  const chosen = ordered[Math.min(index, ordered.length - 1)];
  return {
    uci: chosen.uci,
    san: chosen.san,
    weakened: chosen.uci !== candidates[0].uci,
    candidates: ordered,
    thinkMs: 0,
  };
}

/** The minimum think time a level should ever spend, in ms. */
export function minimumThinkMs(cfg: AiConfig): number {
  return effectiveSpec(cfg).minThinkMs;
}
