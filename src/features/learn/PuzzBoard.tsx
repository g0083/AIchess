/**
 * Puzzle trainer: one position at a time, three-tier hints, and an SRS review
 * schedule so solved puzzles come back before they are forgotten.
 */
import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../../components/Board';
import { Icon, ICONS } from '../../components/ui';
import { THEME_LABELS, type Puzzle } from '../../content/puzzles';
import { useProgress } from '../../store/progress';
import type { Color } from '../../chess/rules';
import { explainPuzzleBlunder } from '../../chess/coach';

type Verdict = 'idle' | 'correct' | 'wrong';

export function PuzzBoard({
  puzzles,
  daily = false,
}: {
  puzzles: Puzzle[];
  daily?: boolean;
}): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict>('idle');
  const [wrongReason, setWrongReason] = useState<string>('');
  const [hintLevel, setHintLevel] = useState(0);
  const [orientation, setOrientation] = useState<Color>('w');
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const recordPuzzle = useProgress((s) => s.recordPuzzle);
  const rateCard = useProgress((s) => s.rateCard);

  const puzzle = puzzles[Math.min(index, puzzles.length - 1)];

  const baseFen = useMemo(() => {
    if (!puzzle) return '';
    let c = new Chess();
    try {
      c = new Chess(puzzle.fen);
    } catch {
      return puzzle.fen;
    }
    return c.fen();
  }, [puzzle]);

  const [currentFen, setCurrentFen] = useState(baseFen);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();

  const turn = useMemo(() => {
    try {
      return new Chess(currentFen).turn();
    } catch {
      return 'w';
    }
  }, [currentFen]);

  const dests = useMemo(() => {
    if (verdict === 'correct') return {};
    try {
      const c = new Chess(currentFen);
      const out: Record<string, string[]> = {};
      for (const m of c.moves({ verbose: true })) (out[m.from] ??= []).push(m.to);
      return out;
    } catch {
      return {};
    }
  }, [currentFen, verdict]);

  if (!puzzle) {
    return <div className="empty">問題がありません。</div>;
  }

  const next = () => {
    const nextIdx = (index + 1) % puzzles.length;
    setIndex(nextIdx);
    setVerdict('idle');
    setWrongReason('');
    setHintLevel(0);
    setStartedAt(Date.now());
    setLastMove(undefined);
    try {
      setCurrentFen(new Chess(puzzles[nextIdx].fen).fen());
    } catch {
      setCurrentFen(puzzles[nextIdx].fen);
    }
  };

  const again = () => {
    setCurrentFen(baseFen);
    setVerdict('idle');
    setWrongReason('');
    setHintLevel(0);
    setStartedAt(Date.now());
    setLastMove(undefined);
  };

  return (
    <div>
      <div className="card card--pad" style={{ marginBottom: 'var(--sp-3)' }}>
        <div className="class-card__head">
          <span className="class-card__title">
            {puzzle.title || '問題'}
          </span>
          <span className="badge badge--brass num">{puzzle.rating}</span>
        </div>
        <div className="board-tools" style={{ marginTop: 'var(--sp-2)' }}>
          {puzzle.themes.map((t) => (
            <span key={t} className="badge">
              {THEME_LABELS[t] ?? t}
            </span>
          ))}
          <span className="dim num">
            {index + 1} / {puzzles.length}
          </span>
        </div>
        {verdict === 'wrong' ? (
          <div className="coach-card" style={{ marginTop: 'var(--sp-2)', borderColor: 'var(--col-danger)' }}>
            <div className="coach-card__title" style={{ color: 'var(--col-danger)' }}>
              不正解です
            </div>
            <p className="coach-card__text" style={{ margin: 0 }}>
              {wrongReason || '別の手を考えてみましょう。'}
            </p>
          </div>
        ) : null}
        {verdict === 'correct' ? (
          <div className="ok-text" style={{ marginTop: 'var(--sp-2)' }}>
            <p><strong>正解です！</strong></p>
            <p>{puzzle.explain}</p>
          </div>
        ) : null}
      </div>

      <div className="board-col" style={{ justifyContent: 'center' }}>
        <Board
          fen={currentFen}
          turn={verdict === 'correct' ? null : turn}
          orientation={orientation}
          dests={dests}
          lastMove={lastMove}
          viewOnly={verdict === 'correct'}
          onMove={(from, to, promo) => {
            const c = new Chess(currentFen);
            const moveCandidates = c.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
            if (moveCandidates.length === 0) return;
            const legal = (promo ? moveCandidates.find((m) => m.promotion === promo) : undefined) ?? moveCandidates[0];
            const mv = c.move({ from, to, promotion: legal.promotion });
            if (!mv) return;
            const correct = puzzle.solution[0] === mv.san;
            const elapsed = Date.now() - startedAt;
            setLastMove([from, to]);
            if (correct) {
              setCurrentFen(c.fen());
              setVerdict('correct');
              setWrongReason('');
              setSolved((s) => ({ ...s, [puzzle.id]: true }));
              recordPuzzle(puzzle.id, true, elapsed);
              rateCard(puzzle.id, elapsed < 10_000 ? 'easy' : 'good');
            } else {
              const reason = explainPuzzleBlunder(currentFen, mv.san, puzzle.solution[0]);
              setWrongReason(reason);
              setCurrentFen(c.fen());
              setVerdict('wrong');
              recordPuzzle(puzzle.id, false, elapsed);
              rateCard(puzzle.id, 'again');
              setTimeout(() => {
                setCurrentFen(baseFen);
                setLastMove(undefined);
              }, 700);
            }
          }}
        />
      </div>

      <div className="board-tools board-tools--wrap">
        <button className="btn btn--sm" onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}>
          <Icon path={ICONS.flip} size={15} />
          反転
        </button>
        {verdict !== 'correct' ? (
          <button
            className="btn btn--sm"
            onClick={() => setHintLevel((h) => Math.min(2, h + 1))}
            disabled={hintLevel >= 2}
          >
            <Icon path={ICONS.info} size={15} />
            ヒント（{hintLevel}/2）
          </button>
        ) : null}
        <button className="btn btn--sm" onClick={again}>
          <Icon path={ICONS.refresh} size={15} />
          もう一度
        </button>
        <button className="btn btn--sm btn--primary" onClick={next}>
          次の問題
        </button>
      </div>

      {hintLevel >= 1 ? (
        <div className="card card--pad" style={{ marginTop: 'var(--sp-3)' }}>
          <p>{puzzle.hint}</p>
          {hintLevel >= 2 ? <p className="dim">{puzzle.detail}</p> : null}
        </div>
      ) : null}

      <div className="dim" style={{ marginTop: 'var(--sp-3)', fontSize: '0.8rem' }}>
        解答した問題 {Object.keys(solved).length} / {puzzles.length}
        {daily ? '　/　今日の課題' : ''}
      </div>
    </div>
  );
}