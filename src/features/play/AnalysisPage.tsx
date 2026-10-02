/**
 * Analysis board: load a FEN or a PGN, then study the position.
 * The engine runs continuously and the evaluation updates live.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../../components/Board';
import { MoveList, PlyNav } from '../../components/MoveList';
import { Field, Icon, ICONS } from '../../components/ui';
import { useSettings } from '../../store/settings';
import { Engine, evalLabelJa, evalToRatio } from '../../ai/stockfish';
import { useToast } from '../../components/Toast';
import type { GradedMove } from '../../chess/session';
import type { Color } from '../../chess/rules';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function AnalysisPage(): React.JSX.Element {
  const toast = useToast();
  const engineVariant = useSettings((s) => s.ai.engine);
  const fullEngineReady = useSettings((s) => s.fullEngineReady);
  const variant = engineVariant === 'full' && fullEngineReady ? 'full' : 'lite';

  const [orientation, setOrientation] = useState<Color>('w');
  const [fenInput, setFenInput] = useState(START);
  const [pgnInput, setPgnInput] = useState('');
  const [startFen, setStartFen] = useState(START);
  const [moves, setMoves] = useState<GradedMove[]>([]);
  const [cursor, setCursor] = useState(0);
  const [evalCp, setEvalCp] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const engineRef = useRef<Engine | null>(null);
  const seqRef = useRef(0);

  /** Every position from the start up to each move, so the board can scrub. */
  const positions = useMemo(() => {
    const c = new Chess();
    try {
      c.load(startFen);
    } catch {
      return [startFen];
    }
    const out = [c.fen()];
    for (const m of moves) {
      try {
        c.move(m.san);
        out.push(c.fen());
      } catch {
        break;
      }
    }
    return out;
  }, [startFen, moves]);

  const fen = positions[Math.min(cursor, positions.length - 1)] ?? START;
  const turn = useMemo(() => new Chess(fen).turn(), [fen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        if (!engineRef.current) {
          const e = new Engine();
          await e.init(variant);
          engineRef.current = e;
        }
        const e = engineRef.current;
        if (!e) return;
        const seq = ++seqRef.current;
        const { infos } = await e.go({
          fen,
          multiPv: 3,
          budgetType: 'depth',
          budgetValue: 16,
          sideToMove: turn,
          onInfo: (i) => {
            // Discard results from a search that has already been superseded.
            if (seq === seqRef.current) setEvalCp(i.evalCp);
          },
        });
        if (seq === seqRef.current) {
          const best = infos.filter((i) => i.pv.length > 0).at(-1);
          if (best) setEvalCp(best.evalCp);
        }
      } catch (err) {
        if (!cancelled) toast.error(`エンジンエラー: ${(err as Error).message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fen, turn, variant, toast]);


  /** Plays a move on the board, truncating any later moves. */
  const onMove = (from: string, to: string) => {
    const c = new Chess(fen);
    const m = c.moves({ verbose: true }).find((x) => x.from === from && x.to === to);
    if (!m) return;
    const mv = c.move({ from, to, promotion: m.promotion });
    if (!mv) return;
    setMoves((prev) => [
      ...prev.slice(0, cursor),
      {
        ply: cursor + 1,
        san: mv.san,
        from: mv.from as never,
        to: mv.to as never,
        piece: mv.piece,
        color: mv.color,
        fen: c.fen(),
        castle: mv.flags.includes('k') || mv.flags.includes('q'),
        enPassant: mv.flags.includes('e'),
      },
    ]);
    setCursor((n) => n + 1);
  };

  const loadFen = () => {
    const c = new Chess();
    let ok = true;
    try {
      c.load(fenInput.trim());
    } catch {
      ok = false;
    }
    if (!ok) {
      toast.error('FENを読み込めませんでした。');
      return;
    }
    setStartFen(c.fen());
    setMoves([]);
    setCursor(0);
  };

  const loadPgn = () => {
    const c = new Chess();
    let ok = false;
    try {
      ok = Boolean(c.loadPgn(pgnInput));
    } catch {
      ok = false;
    }
    if (!ok) {
      toast.error('PGNを読み込めませんでした。');
      return;
    }
    const hist = c.history({ verbose: true });
    // Replaying the history backwards reveals the starting position.
    const probe = new Chess();
    for (const _ of hist) probe.undo();
    setStartFen(probe.fen());
    setMoves(
      hist.map((m, i) => ({
        ply: i + 1,
        san: m.san,
        from: m.from as never,
        to: m.to as never,
        piece: m.piece,
        color: m.color,
        fen: '',
        castle: m.flags.includes('k') || m.flags.includes('q'),
        enPassant: m.flags.includes('e'),
      })),
    );
    setCursor(hist.length);
  };

  const reset = () => {
    setMoves([]);
    setCursor(0);
    setStartFen(START);
    setFenInput(START);
    setPgnInput('');
  };

  return (
    <div className="game-shell">
      <div className="game-shell__players" />

      <div className="game-shell__board">
        <div className="board-col">
          <div className="evalbar" role="img" aria-label="評価">
            <div
              className="evalbar__white"
              style={{ height: `${(evalCp === null ? 0.5 : evalToRatio(evalCp)) * 100}%` }}
            />
            <div className="evalbar__mid" />
          </div>
          <Board fen={fen} turn={turn} orientation={orientation} onMove={onMove} />
        </div>
      </div>

      <div className="game-shell__side">
        <div className="card card--pad">
          <h3 className="card__title">評価</h3>
          <div className="eval-line">
            <span className="num">{evalCp === null ? '—' : (evalCp / 100).toFixed(1)}</span>
            {evalCp === null ? '計算中' : evalLabelJa(evalCp)}
            {busy ? <span className="dim">（計算中）</span> : null}
          </div>
          <PlyNav cursor={cursor} total={moves.length} onSelect={setCursor} />
        </div>

        <div className="card card--pad">
          <h3 className="card__title">指し手</h3>
          <MoveList moves={moves} cursor={cursor} onSelect={setCursor} />
        </div>

        <div className="card card--pad">
          <h3 className="card__title">
            <Icon path={ICONS.download} size={16} />
            読み込み
          </h3>
          <Field label="FEN">
            <div className="row-inline">
              <input
                className="input input--mono"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                aria-label="FEN"
              />
              <button className="btn" onClick={loadFen}>
                読込
              </button>
            </div>
          </Field>
          <Field label="PGN">
            <textarea
              className="textarea"
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              placeholder="1. e4 e5 2. Nf3 …"
              aria-label="PGN"
            />
            <button className="btn btn--block" onClick={loadPgn} style={{ marginTop: 8 }}>
              PGNを読み込む
            </button>
          </Field>
          <div className="board-tools">
            <button
              className="btn btn--sm"
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
            >
              <Icon path={ICONS.flip} size={15} />
              反転
            </button>
            <button className="btn btn--sm" onClick={reset}>
              <Icon path={ICONS.refresh} size={15} />
              初期化
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
