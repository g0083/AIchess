/**
 * P2P room over Trystero (WebRTC, no server of our own).
 *
 * Nostr is the primary relay strategy because it has hundreds of public
 * relays; BitTorrent trackers are the fallback so a flaky relay cannot take
 * the whole room down.
 *
 * SYNC MODEL: the host is authoritative. The guest never mutates its own
 * position from a remote move; it sends a *proposal*, the host validates it
 * with chess.js and broadcasts the resulting FEN. That makes divergence
 * structurally impossible rather than something we have to detect afterwards.
 */
import { joinRoom } from 'trystero/nostr';
import { P2P_APP_ID } from './roomCodes';

export type Role = 'host' | 'guest';
export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

export interface Peer {
  id: string;
  name: string;
  spectator: boolean;
}

export interface AuthState {
  fen: string;
  ply: number;
  lastMove: string | null;
}

export interface RoomHandlers {
  onStatus?: (status: RoomStatus, detail?: string) => void;
  onPeerJoin?: (peer: Peer) => void;
  onPeerLeave?: (peerId: string) => void;
  /** Host-side: the guest proposed a move. Validate and answer with onState. */
  onMoveProposal?: (from: string, to: string, promotion?: string) => void;
  /** Guest-side: the authoritative position arrived. */
  onState?: (state: AuthState) => void;
  onChat?: (peerId: string, name: string, text: string) => void;
  onResign?: (peerId: string) => void;
  onDrawOffer?: (peerId: string) => void;
  onRematch?: (peerId: string) => void;
  /** Host-side: a (re)joining peer wants the current position. */
  onRequestState?: (peerId: string) => void;
  onRenamed?: (peer: Peer) => void;
}

/* The trystero types are structurally typed; a local shape keeps the library's
   internals from leaking into the rest of the app. */
interface Action<T = unknown> {
  send: (data: T, target?: string) => void;
  onMessage: ((data: T, meta: { peerId: string }) => void) | null;
  onProgress: ((p: { peerId: string; progress: number }) => void) | null;
}
interface RoomInternal {
  makeAction: <T>(name: string) => Action<T>;
  onPeerJoin: ((id: string) => void) | null;
  onPeerLeave: ((id: string) => void) | null;
  ping: (id: string) => Promise<number>;
  leave: () => void;
  selfId: string;
}

type Empty = Record<string, never>;

export class Room {
  readonly code: string;
  readonly role: Role;
  readonly displayName: string;
  private room: RoomInternal;
  private h: RoomHandlers;
  private _status: RoomStatus = 'idle';
  private peers = new Map<string, Peer>();

  private act!: {
    hello: Action<{ name: string; spectator: boolean }>;
    move: Action<{ from: string; to: string; promotion?: string }>;
    state: Action<AuthState>;
    chat: Action<{ text: string }>;
    resign: Action<Empty>;
    draw: Action<Empty>;
    rematch: Action<Empty>;
    req: Action<Empty>;
  };

  constructor(code: string, role: Role, displayName: string, handlers: RoomHandlers = {}) {
    this.code = code.toUpperCase();
    this.role = role;
    this.displayName = displayName;
    this.h = handlers;
    this.setStatus('connecting');

    this.room = joinRoom(
      { appId: P2P_APP_ID },
      this.code,
      // onError is present at runtime but absent from the published types.
      { onError: (err: unknown) => this.onRelayError(err) } as never,
    ) as unknown as RoomInternal;

    this.act = {
      hello: this.room.makeAction('hello'),
      move: this.room.makeAction('move'),
      state: this.room.makeAction('state'),
      chat: this.room.makeAction('chat'),
      resign: this.room.makeAction('resign'),
      draw: this.room.makeAction('draw'),
      rematch: this.room.makeAction('rematch'),
      req: this.room.makeAction('req'),
    };

    this.room.onPeerJoin = (id) => this.handleJoin(id);
    this.room.onPeerLeave = (id) => this.handleLeave(id);

    this.act.hello.onMessage = (data, meta) => {
      const peer: Peer = {
        id: meta.peerId,
        name: String(data?.name ?? 'ゲスト').slice(0, 24),
        spectator: Boolean(data?.spectator),
      };
      this.peers.set(meta.peerId, peer);
      this.h.onRenamed?.(peer);
      // Reply so both sides learn each other's names immediately.
      this.act.hello.send({ name: this.displayName, spectator: false }, meta.peerId);
      if (this.peers.size > 0) this.setStatus('connected');
    };

    this.act.move.onMessage = (data) => {
      if (this.role !== 'host') return;
      this.h.onMoveProposal?.(String(data?.from), String(data?.to), data?.promotion);
    };

    this.act.state.onMessage = (data) => {
      if (this.role === 'host') return;
      this.h.onState?.(data);
    };

    this.act.chat.onMessage = (data, meta) => {
      const text = String(data?.text ?? '').slice(0, 500);
      if (text) this.h.onChat?.(meta.peerId, this.peerName(meta.peerId), text);
    };

    this.act.resign.onMessage = (_d, meta) => this.h.onResign?.(meta.peerId);
    this.act.draw.onMessage = (_d, meta) => this.h.onDrawOffer?.(meta.peerId);
    this.act.rematch.onMessage = (_d, meta) => this.h.onRematch?.(meta.peerId);

    this.act.req.onMessage = (_d, meta) => {
      if (this.role === 'host') this.h.onRequestState?.(meta.peerId);
    };

    // Announce to whoever is already in the room.
    this.sendHello();
  }

get status(): RoomStatus {
    return this._status;
  }

  get selfId(): string {
    return this.room.selfId;
  }

  peerList(): Peer[] {
    return [...this.peers.values()];
  }

  peerCount(): number {
    return this.peers.size;
  }

  peerName(id: string): string {
    return this.peers.get(id)?.name ?? 'ゲスト';
  }

  /** Round-trip time in ms, or null when the peer is unreachable. */
  async ping(peerId: string): Promise<number | null> {
    try {
      return Math.round(await this.room.ping(peerId));
    } catch {
      return null;
    }
  }

  private setStatus(s: RoomStatus, detail?: string) {
    this._status = s;
    this.h.onStatus?.(s, detail);
  }

  private onRelayError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    this.setStatus(this.peers.size > 0 ? 'connected' : 'failed', msg);
  }

  private handleJoin(id: string) {
    // The real name arrives with the hello message.
    this.peers.set(id, { id, name: '接続中', spectator: false });
    this.sendHello(id);
    this.setStatus('connected');
    const p = this.peers.get(id);
    if (p) this.h.onPeerJoin?.(p);
  }

  private handleLeave(id: string) {
    this.peers.delete(id);
    this.h.onPeerLeave?.(id);
    if (this.peers.size === 0) this.setStatus('idle');
  }

  private sendHello(target?: string) {
    this.act.hello.send({ name: this.displayName, spectator: false }, target);
  }

  // --- outbound messages --------------------------------------------------
  sendMove(from: string, to: string, promotion?: string) {
    this.act.move.send({ from, to, promotion });
  }

  /** Host only: broadcast the authoritative position. */
  sendState(fen: string, ply: number, lastMove: string | null) {
    if (this.role !== 'host') return;
    this.act.state.send({ fen, ply, lastMove });
  }

  sendChat(text: string) {
    this.act.chat.send({ text: text.slice(0, 500) });
  }

  sendResign() {
    this.act.resign.send({});
  }

  sendDrawOffer() {
    this.act.draw.send({});
  }

  sendRematch() {
    this.act.rematch.send({});
  }

  /** Guest only: ask the host to resend the current position. */
  requestState() {
    if (this.role !== 'guest') return;
    this.act.req.send({});
  }

  close() {
    try {
      this.room.leave();
    } catch {
      /* already gone */
    }
    this._status = 'closed';
  }
}