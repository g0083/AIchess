/**
 * The shared game screen: board, players, clock, move list, actions.
 *
 * AI, pass-and-play and analysis all render this with different props, which
 * is what keeps the responsive layout identical across all three.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Board, toKey, type ShapeHint } from './Board';
import { Icon, ICONS } from './ui';
import { formatClock } from '../chess/clock';
import { materialSummary, PIECE_JA, type Color, type PieceSymbol } from '../chess/rules';
import type { SessionApi } from '../chess/session';
import { evalLabelJa, evalToRatio } from '../ai/stockfish';
import { useSettings } from '../store/settings';

export interface PlayerInfo {
  name: string;
  sub?: string;
  /** Avatar tint: the piece colour, or 'you' for the local player. */
  tint?: 'w' | 'b' | 'you';
}

export interface GameViewProps {
  session: SessionApi;
  orientation: Color;
  onFlip: () => void;
  white: PlayerInfo;
  black: PlayerInfo;
  /** The side the local player controls, or null for a shared board. */
  youAre: Color | null;
  panel: ReactNode;
  actions?: ReactNode;
  showEval?: boolean;
  showClocks?: boolean;
  hintArrow?: ShapeHint | null;
  banner?: ReactNode;
  onExit?: () => void;
  exitLabel?: string;
}

export function GameView(props: GameViewProps): React.JSX.Element {
  const { session, orientation, onFlip, white, black, youAre, panel, actions } = props;
  const { fen, turn, dests, lastMove, inCheck, result, play, evalCp, candidates } = session;
  const showEval = props.showEval ?? false;
  const showClocks = props.showClocks ?? true;
  const hintLevel = useSettings((s) => s.ai.hintLevel);
  const highlightLastMove = useSettings((s) => s.highlightLastMove);

  const interactive = !result.over && (youAre === null || turn === youAre);
  const summary = useMemo(() => materialSummary(session.moves), [session.moves]);

  const hintArrow: ShapeHint | null = useMemo(() => {
    if (props.hintArrow) return props.hintArrow;
    if (hintLevel < 2 || candidates.length === 0) return null;
    const c = candidates[0];
    return c
      ? { from: toKey(c.uci.slice(0, 2)), to: toKey(c.uci.slice(2, 4)), kind: 'arrow' }
      : null;
  }, [props.hintArrow, hintLevel, candidates]);

  return (
    <div className="game-shell">
      <div className="game-shell__players">
        <PlayerCard
          info={black}
          side="b"
          active={turn === 'b' && !result.over}
          you={youAre === 'b'}
          clock={showClocks ? session.readClock('b') : null}
          summary={summary.black}
          onSave={session.saveByoyomi}
        />
        <PlayerCard
          info={white}
          side="w"
          active={turn === 'w' && !result.over}
          you={youAre === 'w'}
          clock={showClocks ? session.readClock('w') : null}
          summary={summary.white}
          onSave={session.saveByoyomi}
        />
      </div>

      <div className="game-shell__board">
        <div className="board-col">
          {showEval ? <EvalBar evalCp={evalCp} /> : null}
          <Board
            fen={fen}
            turn={interactive ? turn : null}
            orientation={orientation}
            dests={dests}
            lastMove={highlightLastMove && lastMove ? lastMove : undefined}
            check={inCheck}
            shapes={hintArrow ? [hintArrow] : []}
            viewOnly={!interactive}
            onMove={(from, to) => play(from, to)}
          />
        </div>
      </div>

      <div className="game-shell__side">
        {props.banner}
        {panel}
        <div className="board-tools">
          <button className="btn btn--sm" onClick={onFlip}>
            <Icon path={ICONS.flip} size={15} />
            盤面を反転
          </button>
          <CopyFenButton fen={fen} />
          {props.onExit ? (
            <button className="btn btn--sm" onClick={props.onExit}>
              {props.exitLabel ?? 'やめる'}
            </button>
          ) : null}
        </div>
        {evalCp !== null ? (
          <div className="eval-line">
            <span className="num">{signed(evalCp)}</span>　{evalLabelJa(evalCp)}
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

function signed(cp: number): string {
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : pawns < 0 ? '−' : ''}${Math.abs(pawns).toFixed(1)}`;
}

function PlayerCard({
  info,
  side,
  active,
  you,
  clock,
  summary,
  onSave,
}: {
  info: PlayerInfo;
  side: Color;
  active: boolean;
  you: boolean;
  clock: { remaining: number; periodsLeft: number; canSave: boolean; flagged: boolean } | null;
  summary: { role: PieceSymbol; count: number }[];
  onSave: () => void;
}): React.JSX.Element {
  // Re-render so the clock keeps ticking; the Clock class banks elapsed time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const low = clock !== null && Number.isFinite(clock.remaining) && clock.remaining < 30_000;
  const initial = [...info.name][0] ?? '?';

  return (
    <div className={`player-card${active ? ' player-card--active' : ''}`}>
      <span className={`avatar avatar--${info.tint ?? side}`} aria-hidden="true">
        {initial}
      </span>
      <span className="player-card__body">
        <span className="player-card__name">
          {info.name}
          {you ? (
            <span className="badge badge--brass" style={{ marginLeft: 6 }}>
              あなた
            </span>
          ) : null}
        </span>
        {info.sub ? <span className="player-card__sub">{info.sub}</span> : null}
        {summary.length > 0 ? (
          <span className="player-card__sub">
            {summary.map((s) => `${PIECE_JA[s.role].slice(0, 3)}×${s.count}`).join(' ')}
          </span>
        ) : null}
      </span>
      {clock ? (
        <span className={`clock${active ? ' clock--active' : ''}${low ? ' clock--low' : ''}`}>
          <span className="clock__time">{formatClock(clock.remaining)}</span>
          {clock.canSave ? (
            <button className="clock__save" onClick={onSave}>
              残す
            </button>
          ) : clock.periodsLeft > 0 ? (
            <span className="clock__meta">残り{clock.periodsLeft}期</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function EvalBar({ evalCp }: { evalCp: number | null }): React.JSX.Element {
  const ratio = evalCp === null ? 0.5 : evalToRatio(evalCp);
  return (
    <div
      className="evalbar"
      role="img"
      aria-label={evalCp === null ? '評価' : evalLabelJa(evalCp)}
    >
      <div className="evalbar__white" style={{ height: `${ratio * 100}%` }} />
      <div className="evalbar__mid" />
    </div>
  );
}

function CopyFenButton({ fen }: { fen: string }): React.JSX.Element {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn--sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(fen);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked by the browser */
        }
      }}
    >
      <Icon path={done ? ICONS.check : ICONS.copy} size={15} />
      {done ? 'コピーしました' : 'FENをコピー'}
    </button>
  );
}

