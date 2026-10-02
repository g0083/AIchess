/**
 * The P2P game controller: owns the Room, the authoritative position and the
 * clock, and exposes a small surface for the UI.
 *
 * Host-authoritative sync: a guest never mutates its own position from a
 * remote move. It sends a proposal; the host validates it with chess.js and
 * broadcasts the resulting FEN, which the guest adopts wholesale.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Color, type Square } from 'chess.js';
import { Room, type Peer, type RoomStatus } from './Room';
import { Clock, type ClockConfig } from '../chess/clock';
import type { GradedMove } from '../chess/session';

export interface ChatLine {
  id: number;
  name: string;
  text: string;
  mine: boolean;
}

export interface P2PApi {
  ready: boolean;
  status: RoomStatus;
  statusText: string;
  statusDetail?: string;
  peer: Peer | null;
  pingMs: number | null;
  myColor: Color;
  fen: string;
  turn: Color;
  dests: Record<string, string[]>;
  lastMove: [Square, Square] | null;
  inCheck: Color | null;
  moves: GradedMove[];
  cursor: number;
  setCursor: (i: number) => void;
  myTurn: boolean;
  finished: boolean;
  finishedReason: string;
  chat: ChatLine[];
  sendChat: (text: string) => void;
  /** Applies or proposes a move from the given squares. */
  play: (from: string, to: string) => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  drawOffered: boolean;
  requestRematch: () => void;
  rematchOffered: boolean;
  restart: () => void;
  clockRead: (c: Color) => number;
  close: () => void;
}

export interface UseP2POptions {
  code: string;
  role: 'host' | 'guest';
  myName: string;
  clock: ClockConfig;
  onFinish?: (result: '1-0' | '0-1' | '1/2-1/2', moves: GradedMove[], reason: string) => void;
}
const STATUS_TEXT: Record<RoomStatus, string> = {
  idle: '相手を待っています',
  connecting: '接続しています…',
  connected: '接続しました',
  failed: '接続できませんでした',
  closed: '切断しました',
};

export function useP2P(opts: UseP2POptions): P2PApi {
  const { code, role, myName } = opts;

  const chessRef = useRef(new Chess());
  const clockRef = useRef<Clock>(new Clock(opts.clock));
  const roomRef = useRef<Room | null>(null);
  const movesRef = useRef<GradedMove[]>([]);
  const savedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<GradedMove[]>([]);
  const [cursor, setCursor] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finishedReason, setFinishedReason] = useState('');
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [drawOffered, setDrawOffered] = useState(false);
  const [rematchOffered, setRematchOffered] = useState(false);
  const [, setTicks] = useState(0);

  const myColor: Color = role === 'host' ? 'w' : 'b';

  /** Applies a validated move locally and records it. */
  const commit = useCallback((from: string, to: string) => {
    const c = chessRef.current;
    const legal = c.moves({ verbose: true }).find((m) => m.from === from && m.to === to);
    if (!legal) return false;
    const mv = c.move({ from, to, promotion: legal.promotion });
    if (!mv) return false;
    const next = c.fen();
    const rec: GradedMove = {
      ply: movesRef.current.length + 1,
      san: mv.san,
      from: mv.from as Square,
      to: mv.to as Square,
      piece: mv.piece,
      captured: (mv as { captured?: typeof mv.piece }).captured,
      color: mv.color,
      fen: next,
      castle: mv.flags.includes('k') || mv.flags.includes('q'),
      enPassant: mv.flags.includes('e'),
    };
    movesRef.current = [...movesRef.current, rec];
    setMoves(movesRef.current);
    setFen(next);
    setCursor(movesRef.current.length);
    clockRef.current.onMovePlayed(mv.color);
    clockRef.current.turn(c.turn());
    return true;
  }, []);

  const finishGame = useCallback(
    (winner: Color | 'draw', reason: string) => {
      if (savedRef.current) return;
      savedRef.current = true;
      setFinished(true);
      setFinishedReason(reason);
      clockRef.current.stop();
      const result: '1-0' | '0-1' | '1/2-1/2' =
        winner === 'draw' ? '1/2-1/2' : winner === 'w' ? '1-0' : '0-1';
      opts.onFinish?.(result, movesRef.current, reason);
    },
    [opts],
  );

  // --- room lifecycle ----------------------------------------------------
  useEffect(() => {
    if (!code) return;
    const room = new Room(code, role, myName, {
      onStatus: (s, detail) => {
        setStatus(s);
        setStatusDetail(detail);
        if (s === 'connected') setReady(true);
      },
      onRenamed: setPeer,
      onPeerJoin: setPeer,
      onPeerLeave: () => {
        setPeer(null);
        setReady(false);
      },
      onMoveProposal: (from, to) => {
        if (commit(from, to)) {
          room.sendState(chessRef.current.fen(), movesRef.current.length, `${from}${to}`);
        }
      },
      onState: (state) => {
        try {
          chessRef.current.load(state.fen);
        } catch {
          return;
        }
        setFen(state.fen);
        setCursor(state.ply);
      },
      onChat: (_id, name, text) =>
        setChat((prev) => [...prev.slice(-80), { id: Date.now(), name, text, mine: false }]),
      onResign: () => finishGame(myColor, '相手が投了しました'),
      onDrawOffer: () => setDrawOffered(true),
      onRematch: () => setRematchOffered(true),
      onRequestState: () => room.sendState(chessRef.current.fen(), movesRef.current.length, null),
    });
    roomRef.current = room;

    if (role === 'guest') {
      const t = setTimeout(() => room.requestState(), 700);
      return () => {
        clearTimeout(t);
        room.close();
        roomRef.current = null;
      };
    }
    return () => {
      room.close();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, role, myName]);

  // Clock: start on connect and keep ticking for display.
  useEffect(() => {
    const c = clockRef.current;
    return c.subscribe(
      () => setTicks((n) => n + 1),
      (side) => finishGame(side === 'w' ? 'b' : 'w', '時間切れ'),
    );
  }, [finishGame]);

  useEffect(() => {
    if (ready && clockRef.current.runningSide() === null) clockRef.current.start();
  }, [ready]);

  // Ping, so the player can see the link quality.
  useEffect(() => {
    if (!peer || status !== 'connected') return;
    let cancelled = false;
    const run = async () => {
      const ms = await roomRef.current?.ping(peer.id);
      if (!cancelled) setPingMs(ms ?? null);
    };
    void run();
    const id = setInterval(run, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [peer, status]);

  // Automatic endings, checked whenever the position changes.
  useEffect(() => {
    if (finished) return;
    const c = chessRef.current;
    if (c.isCheckmate()) finishGame(c.turn() === 'w' ? 'b' : 'w', 'チェックメイト');
    else if (c.isStalemate()) finishGame('draw', 'ステイルメイト');
    else if (c.isInsufficientMaterial()) finishGame('draw', '決着不能');
  }, [fen, finished, finishGame]);

  // --- player actions ----------------------------------------------------
  const onMove = useCallback(
    (from: string, to: string) => {
      if (finished || drawOffered) return;
      if (role === 'host') {
        if (commit(from, to)) {
          roomRef.current?.sendState(chessRef.current.fen(), movesRef.current.length, `${from}${to}`);
        }
      } else {
        // Validate locally for feedback, but do not mutate: the host decides.
        const c = new Chess(fen);
        const legal = c.moves({ verbose: true }).find((m) => m.from === from && m.to === to);
        if (legal) roomRef.current?.sendMove(from, to, legal.promotion);
      }
    },
    [finished, drawOffered, role, fen],
  );

  const sendChat = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      roomRef.current?.sendChat(t);
      setChat((prev) => [...prev, { id: Date.now(), name: myName, text: t, mine: true }]);
    },
    [myName],
  );

  const resign = useCallback(() => {
    roomRef.current?.sendResign();
    finishGame(myColor, '投了');
  }, [myColor, finishGame]);

  const offerDraw = useCallback(() => {
    roomRef.current?.sendDrawOffer();
    setDrawOffered(true);
  }, []);

  const acceptDraw = useCallback(() => finishGame('draw', '合意'), [finishGame]);
  const declineDraw = useCallback(() => setDrawOffered(false), []);
  const requestRematch = useCallback(() => roomRef.current?.sendRematch(), []);

  const restart = useCallback(() => {
    chessRef.current = new Chess();
    movesRef.current = [];
    savedRef.current = false;
    setMoves([]);
    setCursor(0);
    setFen(chessRef.current.fen());
    setFinished(false);
    setFinishedReason('');
    setDrawOffered(false);
    setRematchOffered(false);
    clockRef.current = new Clock(opts.clock);
    clockRef.current.start();
    if (role === 'host') {
      roomRef.current?.sendState(chessRef.current.fen(), 0, null);
    }
  }, [opts.clock, role]);

  const dests = useMemo(() => {
    const out: Record<string, string[]> = {};
    const c = new Chess(fen);
    const myTurn = c.turn() === myColor && !finished && !drawOffered && ready;
    if (myTurn) for (const m of c.moves({ verbose: true })) (out[m.from] ??= []).push(m.to);
    return out;
  }, [fen, myColor, finished, drawOffered, ready]);

  const lastMove = useMemo(() => {
    const m = moves[Math.min(cursor, moves.length) - 1];
    return m ? ([m.from, m.to] as [Square, Square]) : null;
  }, [moves, cursor]);

  const c = useMemo(() => new Chess(fen), [fen]);
  const inCheck = c.inCheck() ? c.turn() : null;
  const myTurn = c.turn() === myColor && !finished && !drawOffered && ready;

  return {
    ready,
    status,
    statusText: STATUS_TEXT[status],
    statusDetail,
    peer,
    pingMs,
    myColor,
    fen,
    turn: c.turn(),
    dests,
    lastMove,
    inCheck,
    moves,
    cursor,
    setCursor,
    myTurn,
    finished,
    finishedReason,
    chat,
    sendChat,
    play: onMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    drawOffered,
    requestRematch,
    rematchOffered,
    restart,
    clockRead: (side: Color) => clockRef.current.read(side).remaining,
    close: () => {
      roomRef.current?.close();
      clockRef.current.dispose();
    },
  };
}
