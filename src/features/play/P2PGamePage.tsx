/**
 * The P2P game screen, shared by host and guest.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Board } from '../../components/Board';
import { MoveList } from '../../components/MoveList';
import { Dialog, Icon, ICONS } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useP2P } from '../../p2p/useP2P';
import { formatRoomCode, nameInitial, sanitizeDisplayName } from '../../p2p/roomCodes';
import { clockById, formatClock } from '../../chess/clock';
import { materialSummary, PIECE_JA, type Color } from '../../chess/rules';
import { useArchive, buildPgn } from '../../store/archive';
import { useProgress } from '../../store/progress';

interface NavState {
  room?: string;
  whiteName?: string;
  blackName?: string;
  clockPresetId?: string;
}

export function P2PGamePage({ role }: { role: 'host' | 'guest' }): React.JSX.Element {
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const st = (loc.state ?? {}) as NavState;

  const code = (st.room ?? '').toUpperCase();
  const myName = sanitizeDisplayName(
    role === 'host' ? (st.whiteName ?? 'ホスト') : (st.blackName ?? 'ゲスト'),
  );
  const clockCfg = useMemo(() => clockById(st.clockPresetId ?? 'sudoku-10-5'), [st.clockPresetId]);
  const saveGame = useArchive((s) => s.save);
  const addGame = useProgress((s) => s.addGame);

  const [orientation, setOrientation] = useState<Color>(role === 'host' ? 'w' : 'b');
  const [draft, setDraft] = useState('');
  // Captured so the finish callback can read the peer name.
  const peerRef = useRef('接続中');

  const p2p = useP2P({
    code,
    role,
    myName,
    clock: clockCfg,
    onFinish: (result, moves, reason) => {
      addGame();
      const peer = peerRef.current;
      const white = role === 'host' ? myName : peer;
      const black = role === 'host' ? peer : myName;
      saveGame({
        mode: 'p2p',
        date: new Date().toISOString(),
        white,
        black,
        result,
        pgn: buildPgn({
          event: 'P2P対戦',
          white,
          black,
          result,
          moves: moves.map((m) => m.san),
        }),
        moves: moves.map((m) => m.san),
      });
      toast.ok(reason);
    },
  });

  useEffect(() => {
    peerRef.current = p2p.peer?.name ?? '接続中';
  }, [p2p.peer]);

  const closeRef = useRef(p2p.close);
  closeRef.current = p2p.close;
  useEffect(() => () => closeRef.current(), []);

  const peerName = p2p.peer?.name ?? '接続中';
  const whiteName = role === 'host' ? myName : peerName;
  const blackName = role === 'host' ? peerName : myName;
  const summary = materialSummary(p2p.moves);

  if (!code) {
    return (
      <div className="page page--narrow">
        <p>ルームコードがありません。</p>
        <button className="btn btn--primary" onClick={() => nav('/play/online')}>
          P2P対戦を開く
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="game-shell">
        <div className="game-shell__players">
          <PlayerCard
            name={blackName}
            side="b"
            active={p2p.turn === 'b'}
            you={role === 'guest'}
            summary={summary.black}
            time={formatClock(p2p.clockRead('b'))}
          />
          <PlayerCard
            name={whiteName}
            side="w"
            active={p2p.turn === 'w'}
            you={role === 'host'}
            summary={summary.white}
            time={formatClock(p2p.clockRead('w'))}
          />
        </div>

        <div className="game-shell__board">
          <div className="board-col">
            <Board
              fen={p2p.fen}
              turn={p2p.myTurn ? p2p.myColor : null}
              orientation={orientation}
              dests={p2p.dests}
              lastMove={p2p.lastMove ?? undefined}
              check={p2p.inCheck}
              viewOnly={!p2p.myTurn}
              onMove={(f, t) => p2p.play(f, t)}
            />
          </div>
        </div>

        <div className="game-shell__side">
          <div className="card card--pad">
            <div className="p2p-status">
              <span className={`p2p-dot p2p-dot--${p2p.status}`} aria-hidden="true" />
              <span>{p2p.statusText}</span>
              {p2p.pingMs !== null ? <span className="dim num">{p2p.pingMs}ms</span> : null}
              <span className="badge badge--brass num">{formatRoomCode(code)}</span>
            </div>
            {p2p.statusDetail ? <p className="dim">{p2p.statusDetail}</p> : null}
            <div className="board-tools board-tools--wrap">
              <button
                className="btn btn--sm"
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              >
                <Icon path={ICONS.flip} size={15} />
                反転
              </button>
              <button className="btn btn--sm" onClick={p2p.resign} disabled={p2p.finished}>
                投了
              </button>
              <button className="btn btn--sm" onClick={p2p.offerDraw} disabled={p2p.finished}>
                引き分け
              </button>
              <button className="btn btn--sm" onClick={() => nav('/play/online')}>
                やめる
              </button>
            </div>
          </div>

          <div className="card card--pad">
            <h3 className="card__title">指し手</h3>
            <MoveList moves={p2p.moves} cursor={p2p.cursor} onSelect={p2p.setCursor} />
          </div>

          <div className="card card--pad">
            <h3 className="card__title">チャット</h3>
            <div className="chat">
              {p2p.chat.length === 0 ? (
                <p className="empty">メッセージはまだありません</p>
              ) : (
                p2p.chat.map((c) => (
                  <div key={c.id} className={`chat__line${c.mine ? ' chat__line--mine' : ''}`}>
                    <span className="chat__name">{c.name}</span>
                    <span>{c.text}</span>
                  </div>
                ))
              )}
            </div>
            <div className="row-inline">
              <input
                className="input"
                value={draft}
                maxLength={500}
                placeholder="メッセージ"
                aria-label="メッセージ"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    p2p.sendChat(draft);
                    setDraft('');
                  }
                }}
              />
              <button
                className="btn"
                disabled={!draft.trim()}
                onClick={() => {
                  p2p.sendChat(draft);
                  setDraft('');
                }}
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={p2p.drawOffered}
        title="引き分けの申し出"
        onClose={p2p.declineDraw}
        footer={
          <>
            <button className="btn" onClick={p2p.declineDraw}>
              辞退する
            </button>
            <button className="btn btn--primary" onClick={p2p.acceptDraw}>
              受け入れる
            </button>
          </>
        }
      >
        <p>相手が引き分けを申し出ています。</p>
      </Dialog>

      <Dialog
        open={p2p.rematchOffered}
        title="再戦の申し出"
        onClose={p2p.declineRematch}
        footer={
          <>
            <button className="btn" onClick={p2p.declineRematch}>
              やめる
            </button>
            <button className="btn btn--primary" onClick={p2p.restart}>
              再戦する
            </button>
          </>
        }
      >
        <p>相手が再戦を求めています。</p>
      </Dialog>

      <Dialog
        open={p2p.finished}
        title="対局終了"
        onClose={() => undefined}
        footer={
          <>
            <button className="btn" onClick={() => nav('/play/online')}>
              やめる
            </button>
            <button className="btn btn--primary" onClick={p2p.restart}>
              再戦
            </button>
          </>
        }
      >
        <p className="result-title">{p2p.finishedReason}</p>
      </Dialog>
    </>
  );
}

function PlayerCard({
  name,
  side,
  active,
  you,
  summary,
  time,
}: {
  name: string;
  side: Color;
  active: boolean;
  you: boolean;
  summary: { role: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; count: number }[];
  time: string;
}): React.JSX.Element {
  return (
    <div className={`player-card${active ? ' player-card--active' : ''}`}>
      <span className={`avatar avatar--${side}`} aria-hidden="true">
        {nameInitial(name)}
      </span>
      <span className="player-card__body">
        <span className="player-card__name">
          {name}
          {you ? (
            <span className="badge badge--brass" style={{ marginLeft: 6 }}>
              あなた
            </span>
          ) : null}
        </span>
        {summary.length > 0 ? (
          <span className="player-card__sub">
            {summary.map((s) => `${PIECE_JA[s.role].slice(0, 3)}×${s.count}`).join(' ')}
          </span>
        ) : null}
      </span>
      <span className="clock">
        <span className="clock__time">{time}</span>
      </span>
    </div>
  );
}
