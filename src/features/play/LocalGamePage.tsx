/**
 * Pass-and-play game screen.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameView } from '../../components/GameView';
import { MoveList } from '../../components/MoveList';
import { Dialog } from '../../components/ui';
import { useSession } from '../../chess/session';
import { clockById } from '../../chess/clock';
import { useSettings } from '../../store/settings';
import { useArchive, buildPgn } from '../../store/archive';
import { useProgress } from '../../store/progress';
import type { Color } from '../../chess/rules';

interface State {
  whiteName: string;
  blackName: string;
  dualClock: boolean;
}

export function LocalGamePage(): React.JSX.Element {
  const nav = useNavigate();
  const loc = useLocation();
  const state = (loc.state ?? {}) as Partial<State>;
  const whiteName = state.whiteName ?? '白';
  const blackName = state.blackName ?? '黒';
  const dualClock = state.dualClock ?? true;

  const clockPresetId = useSettings((s) => s.clockPresetId);
  const clockCfg = useMemo(() => clockById(clockPresetId), [clockPresetId]);
  const saveGame = useArchive((s) => s.save);
  const addGame = useProgress((s) => s.addGame);

  const [orientation, setOrientation] = useState<Color>('w');
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const session = useSession({
    clock: dualClock ? clockCfg : undefined,
    humanColor: undefined,
    ai: null,
    onGameEnd: () => setFinished(true),
  });

  useEffect(() => {
    session.clock?.start();
  }, [session.clock]);

  useEffect(() => {
    if (!finished || saved) return;
    setSaved(true);
    addGame();
    const w = session.result.winner;
    const result = session.result.agreed && !w ? '1/2-1/2' : w === 'w' ? '1-0' : w === 'b' ? '0-1' : '*';
    saveGame({
      mode: 'local',
      date: new Date().toISOString(),
      white: whiteName,
      black: blackName,
      result,
      pgn: buildPgn({
        event: 'オフライン2人対戦',
        white: whiteName,
        black: blackName,
        result,
        moves: session.moves.map((m) => m.san),
        timeControl: clockPresetId,
      }),
      moves: session.moves.map((m) => m.san),
    });
  }, [finished, saved]);

  return (
    <>
      <GameView
        session={session}
        orientation={orientation}
        onFlip={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
        youAre={null}
        showClocks={dualClock}
        white={{ name: whiteName, sub: '先手', tint: 'w' }}
        black={{ name: blackName, sub: '後手', tint: 'b' }}
        panel={
          <div className="card card--pad">
            <h3 className="card__title">指し手</h3>
            <MoveList moves={session.moves} cursor={session.cursor} onSelect={session.setCursor} />
          </div>
        }
        actions={
          <div className="board-tools board-tools--wrap">
            <button className="btn btn--sm" onClick={() => session.offerDraw()} disabled={session.result.over}>
              引き分け
            </button>
            <button
              className="btn btn--sm"
              onClick={() => session.undo()}
              disabled={session.ply === 0}
            >
              1手戻す
            </button>
            <button className="btn btn--sm" onClick={() => nav('/play/local')}>
              やめる
            </button>
          </div>
        }
      />

      <Dialog
        open={finished}
        title="対局終了"
        onClose={() => setFinished(false)}
        footer={
          <>
            <button className="btn" onClick={() => nav('/play/local')}>
              設定に戻る
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                session.reset();
                session.clock?.start();
                setFinished(false);
                setSaved(false);
              }}
            >
              もう一度
            </button>
          </>
        }
      >
        <p className="result-title">
          {session.result.winner === 'w'
            ? `${whiteName}の勝ち`
            : session.result.winner === 'b'
              ? `${blackName}の勝ち`
              : '引き分け'}
        </p>
        <p className="dim">{session.result.reason}</p>
      </Dialog>
    </>
  );
}
