/**
 * The game session: rules + clock + move history + engine, in one hook.
 *
 * Every mode (AI, pass-and-play, P2P, analysis, lessons, puzzles) drives this
 * hook, which is why the rules live in exactly one place.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Color, type Square } from 'chess.js';
import { Clock, type ClockConfig, type SideClockState } from './clock';
import {
  positionResult,
  toMoveRecord,
  type MoveRecord,
  type ResultInfo,
} from './rules';
import { Engine, type SearchInfo } from '../ai/stockfish';
import { buildCandidates, chooseMove, minimumThinkMs, type Candidate } from '../ai/opponent';
import { effectiveSpec, type AiConfig } from '../ai/profile';

export type MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface GradedMove extends MoveRecord {
  grade?: MoveGrade;
  /** Centipawns this move gave away, from the mover's point of view. */
  lossCp?: number;
  bestUci?: string;
  bestSan?: string;
  /** Evaluation after the move, White's point of view. */
  evalAfterCp?: number;
}

export interface SessionOptions {
  fen?: string;
  clock?: ClockConfig;
  /** Which side the human controls. */
  humanColor?: Color;
  /** Non-null turns on the AI opponent. */
  ai?: AiConfig | null;
  /** Replaying a fixed line (puzzles, lessons). */
  locked?: boolean;
  onGameEnd?: (result: ResultInfo, moves: GradedMove[]) => void;
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const IDLE_CLOCK: SideClockState = {
  remaining: 0,
  periodsLeft: 0,
  canSave: false,
  flagged: false,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function useSession(opts: SessionOptions) {
  const chessRef = useRef(new Chess(opts.fen ?? START));
  const [clockInstance, setClockInstance] = useState<Clock | null>(() =>
    opts.clock ? new Clock(opts.clock) : null,
  );
  const clockRef = useRef<Clock | null>(clockInstance);
  clockRef.current = clockInstance;
  const engineRef = useRef<Engine | null>(null);
  const agreedRef = useRef<{ draw?: boolean; resignedBy?: Color; timeoutBy?: Color }>({});
  const busyRef = useRef(false);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<GradedMove[]>([]);
  const [cursor, setCursor] = useState(0);
  const [result, setResult] = useState<ResultInfo>({ over: false });
  const [evalCp, setEvalCp] = useState<number | null>(null);
  const [engineThinking, setEngineThinking] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clockTick, setClockTick] = useState(0);

  const ai = opts.ai ?? null;
  const humanColor = opts.humanColor ?? 'w';
  const locked = opts.locked ?? false;
  const { onGameEnd } = opts;

  useEffect(() => {
    const c = clockInstance;
    if (!c) return;
    return c.subscribe(
      () => setClockTick((n) => n + 1),
      (side) => {
        agreedRef.current = { timeoutBy: side };
        const r = positionResult(chessRef.current, agreedRef.current);
        setResult(r);
        onGameEnd?.(r, movesRef.current);
      },
    );
  }, [clockInstance, onGameEnd]);

  const movesRef = useRef<GradedMove[]>([]);
  movesRef.current = moves;

  useEffect(
    () => () => {
      engineRef.current?.quit();
      clockRef.current?.dispose();
    },
    [],
  );

  const turn = chessRef.current.turn();
  const live = cursor === moves.length;
  const inCheck: Color | null = chessRef.current.inCheck() ? turn : null;

  /** Legal destinations for the side to move, keyed by origin square. */
  const dests = useMemo(() => {
    if (!live || locked) return {} as Record<string, string[]>;
    const out: Record<string, string[]> = {};
    for (const m of chessRef.current.moves({ verbose: true })) {
      (out[m.from] ??= []).push(m.to);
    }
    return out;
  }, [fen, live, locked]);

  /** Every legal move in UCI form, used to validate engine output. */
  const legalUci = useMemo(
    () =>
      chessRef.current
        .moves({ verbose: true })
        .map((m) => m.from + m.to + (m.promotion ?? '')),
    [fen],
  );

  const applyMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (locked) return false;
      if (agreedRef.current.draw || agreedRef.current.resignedBy || agreedRef.current.timeoutBy) return false;
      const c = chessRef.current;
      const moveCandidates = c.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
      if (moveCandidates.length === 0) return false;
      const legal =
        (promotion ? moveCandidates.find((m) => m.promotion === promotion) : undefined) ??
        moveCandidates[0];
      const mv = c.move({ from, to, promotion: legal.promotion });
      if (!mv) return false;

      const rec = toMoveRecord(mv, movesRef.current.length + 1, c.fen());
      movesRef.current = [...movesRef.current, rec];
      setMoves(movesRef.current);
      setFen(c.fen());
      setCursor(movesRef.current.length);
      setCandidates([]);
      setEvalCp(null);

      clockRef.current?.onMovePlayed(rec.color);
      clockRef.current?.turn(c.turn());

      const r = positionResult(c, agreedRef.current);
      setResult(r);
      if (r.over) {
        clockRef.current?.stop();
        onGameEnd?.(r, movesRef.current);
      }
      return true;
    },
    [locked, onGameEnd],
  );

  const play = useCallback(
    (from: string, to: string, promotion?: string) => applyMove(from, to, promotion),
    [applyMove],
  );

  const playSan = useCallback(
    (san: string) => {
      const m = chessRef.current.moves({ verbose: true }).find((x) => x.san === san);
      return m ? applyMove(m.from, m.to, m.promotion) : false;
    },
    [applyMove],
  );

  const undo = useCallback(() => {
    chessRef.current.undo();
    movesRef.current = movesRef.current.slice(0, -1);
    setMoves(movesRef.current);
    setFen(chessRef.current.fen());
    setCursor((n) => Math.max(0, n - 1));
    agreedRef.current = {};
    setResult({ over: false });
    setEvalCp(null);
  }, []);

  const reset = useCallback(
    (newFen?: string) => {
      chessRef.current = new Chess(newFen ?? START);
      agreedRef.current = {};
      movesRef.current = [];
      setMoves([]);
      setCursor(0);
      setFen(chessRef.current.fen());
      setResult({ over: false });
      setEvalCp(null);
      setCandidates([]);
      if (opts.clock) {
        clockRef.current?.dispose();
        const newClock = new Clock(opts.clock);
        clockRef.current = newClock;
        setClockInstance(newClock);
      }
    },
    [opts.clock],
  );

  const endByAgreement = useCallback(
    (patch: { draw?: boolean; resignedBy?: Color; timeoutBy?: Color }) => {
      agreedRef.current = patch;
      const r = positionResult(chessRef.current, patch);
      setResult(r);
      clockRef.current?.stop();
      onGameEnd?.(r, movesRef.current);
    },
    [onGameEnd],
  );

  const resign = useCallback(
    () => endByAgreement({ resignedBy: chessRef.current.turn() }),
    [endByAgreement],
  );
  const offerDraw = useCallback(() => endByAgreement({ draw: true }), [endByAgreement]);

  const saveByoyomi = useCallback(() => {
    const c = clockRef.current;
    if (!c) return;
    c.save(chessRef.current.turn());
    setClockTick((n) => n + 1);
  }, []);

  // --- engine -------------------------------------------------------------
  const ensureEngine = useCallback(async () => {
    if (engineRef.current?.status.ready) return engineRef.current;
    const e = new Engine();
    await e.init(ai?.engine ?? 'lite');
    e.setOption('UCI_ShowWDL', 'false');
    engineRef.current = e;
    return e;
  }, [ai?.engine]);

  /** Asks the engine for the position's best lines. Drives hints and review. */
  const analyse = useCallback(
    async (depth = 12) => {
      const e = await ensureEngine();
      const c = chessRef.current;
      const { infos } = await e.go({
        fen: c.fen(),
        multiPv: Math.max(1, Math.min(3, legalUci.length)),
        budgetType: 'depth',
        budgetValue: depth,
        sideToMove: c.turn(),
      });
      const cands = buildCandidates(infos, c.fen(), c.turn(), new Set(legalUci));
      if (cands.length > 0) {
        setEvalCp(cands[0].evalCp);
        setCandidates(cands);
      }
      return cands;
    },
    [ensureEngine, legalUci],
  );

  /** The AI's turn: search, then choose a move using the difficulty model. */
  const playEngineMove = useCallback(async () => {
    if (!ai || busyRef.current) return;
    const c = chessRef.current;
    if (c.turn() === humanColor) return;
    busyRef.current = true;
    setEngineThinking(true);
    try {
      const spec = effectiveSpec(ai);
      const e = await ensureEngine();
      const t0 = performance.now();
      const { bestmove, infos } = await e.go({
        fen: c.fen(),
        multiPv: Math.max(1, Math.min(spec.multiPv, legalUci.length)),
        budgetType: spec.budgetType,
        budgetValue: spec.budgetValue,
        sideToMove: c.turn(),
        onInfo: (i: SearchInfo) => setEvalCp(i.evalCp),
      });

      const cands = buildCandidates(infos, c.fen(), c.turn(), new Set(legalUci));
      let uci = bestmove;
      if (cands.length > 0) {
        const choice = chooseMove(cands, ai);
        if (choice) {
          uci = choice.uci;
          setCandidates(choice.candidates);
        }
        setEvalCp(cands[0].evalCp);
      }
      if (!uci) return;

      // Keep the opponent feeling human rather than instantaneous.
      const wait = Math.max(0, minimumThinkMs(ai) - (performance.now() - t0));
      if (wait > 0) await sleep(wait);
      applyMove(
        uci.slice(0, 2),
        uci.slice(2, 4),
        uci.length > 4 ? uci.slice(4, 5) : undefined,
      );
    } finally {
      busyRef.current = false;
      setEngineThinking(false);
    }
  }, [ai, applyMove, ensureEngine, humanColor, legalUci]);

  // Drive the AI whenever it is its turn.
  useEffect(() => {
    if (!ai || locked || result.over) return;
    if (chessRef.current.turn() === humanColor) return;
    void playEngineMove();
  }, [ai, fen, humanColor, locked, playEngineMove, result.over]);

  const readClock = useCallback(
    (c: Color): SideClockState => {
      void clockTick;
      return clockRef.current ? clockRef.current.read(c) : IDLE_CLOCK;
    },
    [clockTick],
  );

  const refreshClock = useCallback(() => {
    clockRef.current?.refresh();
    setClockTick((n) => n + 1);
  }, []);

  const lastMove = useMemo(() => {
    const m = moves[Math.min(cursor, moves.length) - 1];
    return m ? ([m.from, m.to] as [Square, Square]) : null;
  }, [moves, cursor]);

  return {
    fen,
    turn,
    dests,
    lastMove,
    moves,
    ply: moves.length,
    cursor,
    viewing: !live,
    result,
    inCheck,
    legalUci,
    evalCp,
    engineThinking,
    candidates,
    play,
    playSan,
    undo,
    reset,
    setCursor,
    resign,
    offerDraw,
    acceptDraw: offerDraw,
    saveByoyomi,
    analyse,
    clock: clockRef.current,
    readClock,
    refreshClock,
    dispose: () => {
      engineRef.current?.quit();
      clockRef.current?.dispose();
    },
  };
}

export type SessionApi = ReturnType<typeof useSession>;
