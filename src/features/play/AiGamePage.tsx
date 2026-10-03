/**
 * The AI game screen: board, clock, move list, and a post-game review.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameView } from '../../components/GameView';
import { MoveList } from '../../components/MoveList';
import { Dialog } from '../../components/ui';
import { useSession, type GradedMove, type MoveGrade } from '../../chess/session';
import { clockById } from '../../chess/clock';
import { useSettings, playerName } from '../../store/settings';
import { getLevel, levelName } from '../../ai/profile';
import { gradeGame, summariseReview } from '../../chess/review';
import { useProgress } from '../../store/progress';
import { useArchive, buildPgn } from '../../store/archive';
import type { Color } from '../../chess/rules';

const GRADE_LABEL: Record<MoveGrade, string> = {
  best: '最善手',
  good: '好手',
  inaccuracy: '疑問手',
  mistake: '悪手',
  blunder: '大悪手',
};

export function AiGamePage(): React.JSX.Element {
  const nav = useNavigate();
  const ai = useSettings((s) => s.ai);
  const clockPresetId = useSettings((s) => s.clockPresetId);
  const name = useSettings((s) => s.displayName);
  const addGame = useProgress((s) => s.addGame);
  const saveGame = useArchive((s) => s.save);

  // Resolve the side once: the engine must not flip sides mid-game.
  const mySide: Color = useMemo<Color>(() => {
    if (ai.side === 'random') return Math.random() < 0.5 ? 'w' : 'b';
    return ai.side === 'white' ? 'w' : 'b';
  }, [ai.side]);

  const clockCfg = useMemo(() => clockById(clockPresetId), [clockPresetId]);
  const [finished, setFinished] = useState<null | { winner: Color | 'draw' }>(null);
  const [review, setReview] = useState<{ moves: GradedMove[]; pending: boolean } | null>(null);
  const [orientation, setOrientation] = useState<Color>(mySide);

  const spec = getLevel(ai.level);
  const levelLabel = levelName(ai.level);

  const session = useSession({
    clock: clockCfg,
    humanColor: mySide,
    ai,
    onGameEnd: (res) => {
      setFinished({ winner: res.winner ?? 'draw' });
    },
  });

  // Start the clock as soon as the board exists.
  useEffect(() => {
    session.clock?.start();
  }, [session.clock]);

  // Run the review and archive the game once the result is known.
  useEffect(() => {
    if (!finished) return;
    addGame();
    const won = finished.winner === mySide;
    if (won) {
      useProgress.getState().grantAchievement('first-win');
    }
    useProgress.setState((s) => ({
      aiRating: Math.max(
        600,
        Math.round(s.aiRating + (won ? 12 : finished.winner === 'draw' ? 2 : -10)),
      ),
    }));
    const result = finished.winner === 'draw' ? '1/2-1/2' : finished.winner === 'w' ? '1-0' : '0-1';
    saveGame({
      mode: 'ai',
      date: new Date().toISOString(),
      white: mySide === 'w' ? playerName(name) : `AI ${levelLabel}`,
      black: mySide === 'b' ? playerName(name) : `AI ${levelLabel}`,
      result,
      won,
      pgn: buildPgn({
        event: 'AI対戦',
        white: mySide === 'w' ? playerName(name) : `AI ${levelLabel}`,
        black: mySide === 'b' ? playerName(name) : `AI ${levelLabel}`,
        result,
        moves: session.moves.map((m) => m.san),
        timeControl: clockPresetId,
      }),
      moves: session.moves.map((m) => m.san),
    });
    if (ai.blunderDetection) {
      setReview({ moves: [], pending: true });
      void gradeGame(session.moves, ai, mySide).then((r) => setReview(r));
    } else {
      setReview({ moves: session.moves, pending: false });
    }
    // Only once per finished game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const bad = useMemo(
    () => (review?.moves ?? []).filter((m) => m.grade === 'blunder' || m.grade === 'mistake'),
    [review],
  );


  return (
    <>
      <GameView
        session={session}
        orientation={orientation}
        onFlip={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
        youAre={mySide}
        showEval={ai.hintLevel > 0}
        white={{
          name: mySide === 'w' ? playerName(name) : `AI ${levelLabel}`,
          sub: mySide === 'w' ? 'あなた' : `約${spec.elo}`,
          tint: mySide === 'w' ? 'you' : 'b',
        }}
        black={{
          name: mySide === 'b' ? playerName(name) : `AI ${levelLabel}`,
          sub: mySide === 'b' ? 'あなた' : `約${spec.elo}`,
          tint: mySide === 'b' ? 'you' : 'b',
        }}
        panel={
          <div className="card card--pad">
            <h3 className="card__title">指し手</h3>
            <MoveList moves={session.moves} cursor={session.cursor} onSelect={session.setCursor} />
          </div>
        }
        actions={
          <div className="board-tools board-tools--wrap">
            <button
              className="btn btn--sm"
              onClick={() => session.undo()}
              disabled={session.ply === 0}
            >
              1手戻す
            </button>
            <button
              className="btn btn--sm"
              onClick={() => session.offerDraw()}
              disabled={session.result.over}
            >
              引き分け
            </button>
            <button
              className="btn btn--sm"
              onClick={() => session.resign()}
              disabled={session.result.over}
            >
              投了
            </button>
          </div>
        }
        onExit={() => nav('/play/ai')}
        exitLabel="設定に戻る"
      />

      <Dialog
        open={!!finished}
        title="対局終了"
        onClose={() => setFinished(null)}
        footer={
          <>
            <button className="btn" onClick={() => nav('/play/ai')}>
              設定に戻る
            </button>
            <button className="btn" onClick={() => nav('/meta', { state: { tab: 'archive' } })}>
              棋譜を見る
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                session.reset();
                setFinished(null);
                setReview(null);
                session.clock?.start();
              }}
            >
              もう一度
            </button>
          </>
        }
      >
        <div className="result-body">
          <p className="result-title">
            {finished?.winner === mySide
              ? 'あなたの勝ちです'
              : finished?.winner === 'draw'
                ? '引き分け'
                : '敗北しました'}
          </p>
          <p className="dim">{session.result.reason}</p>
          {review?.pending ? (
            <p className="dim">指手を評価しています…</p>
          ) : review ? (
            bad.length > 0 ? (
              <div className="review-box">
                <h4 className="card__title">見つかった悪手・疑問手</h4>
                <ul className="list">
                  {bad.map((m) => (
                    <li key={m.ply} className="review-item">
                      <span className="num">{Math.ceil(m.ply / 2)}.</span>
                      <span className="num">{m.san}</span>
                      <span
                        className={`badge ${m.grade === 'blunder' ? 'badge--danger' : 'badge--brass'}`}
                      >
                        {GRADE_LABEL[m.grade!]}
                      </span>
                      {m.bestSan ? <span className="dim num">最善手は {m.bestSan}</span> : null}
                    </li>
                  ))}
                </ul>
                <p className="dim" style={{ marginTop: 'var(--sp-2)' }}>
                  {summariseReview(review.moves)}
                </p>
              </div>
            ) : (
              <p className="ok-text">大きなミスはありませんでした。</p>
            )
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
