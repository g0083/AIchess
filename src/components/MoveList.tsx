/**
 * Move list with SAN, navigation, and mistake markers.
 * Pairs are rendered as "1. 白手 黒手" rows, which is how Japanese players read.
 */
import { useEffect, useRef } from 'react';
import type { GradedMove } from '../chess/session';

export function MoveList({
  moves,
  cursor,
  onSelect,
}: {
  moves: GradedMove[];
  /** 0 = initial position, n = after n moves. */
  cursor: number;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  const endRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest move in view while the game is live.
  useEffect(() => {
    if (cursor === moves.length) endRef.current?.scrollIntoView({ block: 'end' });
  }, [cursor, moves.length]);

  if (moves.length === 0) {
    return <div className="empty">まだ指していません</div>;
  }

  const rows: React.JSX.Element[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const w = moves[i];
    const b = moves[i + 1];
    const moveNo = i / 2 + 1;
    rows.push(
      <div className="movelist__row" key={moveNo}>
        <span className="movelist__num">{moveNo}.</span>
        <MoveButton move={w} index={i + 1} cursor={cursor} onSelect={onSelect} />
        {b ? (
          <MoveButton move={b} index={i + 2} cursor={cursor} onSelect={onSelect} />
        ) : (
          <span className="movelist__move movelist__move--empty" />
        )}
      </div>,
    );
  }

  return (
    <div className="movelist">
      <button
        className="btn btn--sm btn--ghost"
        onClick={() => onSelect(0)}
        aria-current={cursor === 0}
      >
        初期局面
      </button>
      {rows}
      <div ref={endRef} />
    </div>
  );
}

function MoveButton({
  move,
  index,
  cursor,
  onSelect,
  endRef,
}: {
  move: GradedMove;
  index: number;
  cursor: number;
  onSelect: (i: number) => void;
  endRef?: React.Ref<HTMLButtonElement>;
}): React.JSX.Element {
  const isCurrent = cursor === index;
  return (
    <button
      ref={endRef}
      className="movelist__move"
      data-grade={move.grade}
      aria-current={isCurrent}
      onClick={() => onSelect(index)}
    >
      {move.san}
    </button>
  );
}

/** A compact move navigator for analysis mode. */
export function PlyNav({
  cursor,
  total,
  onSelect,
}: {
  cursor: number;
  total: number;
  onSelect: (i: number) => void;
}): React.JSX.Element {
  return (
    <div className="board-tools">
      <button className="btn btn--sm" onClick={() => onSelect(0)} disabled={cursor === 0}>
        最初
      </button>
      <button className="btn btn--sm" onClick={() => onSelect(cursor - 1)} disabled={cursor === 0}>
        前
      </button>
      <span className="board-tools__pos num">
        {cursor} / {total}
      </span>
      <button
        className="btn btn--sm"
        onClick={() => onSelect(cursor + 1)}
        disabled={cursor >= total}
      >
        次
      </button>
      <button
        className="btn btn--sm"
        onClick={() => onSelect(total)}
        disabled={cursor >= total}
      >
        最後
      </button>
    </div>
  );
}
