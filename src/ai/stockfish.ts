/**
 * Stockfish WASM wrapper.
 *
 * Two builds are supported:
 *   - lite : stockfish-19-lite-single.{js,wasm}, ~1.8 MB, single threaded.
 *            Needs no COOP/COEP headers and is precached, so AI play works
 *            completely offline. This is the default.
 *   - full : stockfish-19-single.{js,wasm}, ~99 MB. Only available after the
 *            user explicitly downloads it from Settings; never precached.
 *
 * The engine runs inside a Web Worker and speaks plain UCI over postMessage.
 */
import type { EngineVariant } from './profile';

export interface SearchInfo {
  depth: number;
  seldepth: number;
  multipv: number;
  /** Raw score in centipawns, from the side-to-move's point of view. */
  scoreCp: number;
  /** Forced-mate distance in plies, when the engine reports a mate score. */
  scoreMate: number | null;
  /** Normalised centipawns, always from White's point of view. */
  evalCp: number;
  nodes: number;
  timeMs: number;
  pv: string[];
}

export interface EngineStatus {
  ready: boolean;
  loading: boolean;
  variant: EngineVariant;
  error?: string;
}

const BASE = import.meta.env.BASE_URL || '/';

export function engineUrl(variant: EngineVariant, ext: 'js' | 'wasm'): string {
  const file = variant === 'full' ? 'stockfish-19-single' : 'stockfish-19-lite-single';
  return `${BASE}engine/${file}.${ext}`;
}

type LineHandler = (line: string) => void;

/** A single engine instance. Owns its Worker and its pending-search state. */
export class Engine {
  private worker: Worker | null = null;
  private lineHandler: LineHandler | null = null;
  private resolveSearch: ((line: string) => void) | null = null;
  private readyResolve: (() => void) | null = null;
  private readyPromise: Promise<void>;
  private readonly variant: EngineVariant;
  private disposed = false;

  readonly status: EngineStatus = { ready: false, loading: false, variant: 'lite' };

  constructor() {
    this.variant = 'lite';
    this.readyPromise = new Promise((res) => {
      this.readyResolve = res;
    });
  }

  /** Spawns the worker and completes the UCI handshake. */
  async init(variant: EngineVariant): Promise<void> {
    if (this.worker) return;
    this.status.variant = variant;
    this.status.loading = true;
    this.status.error = undefined;

    const url = engineUrl(variant, 'js');
    let w: Worker;
    try {
      w = spawnWorker(url);
    } catch (e) {
      this.status.loading = false;
      this.status.error = e instanceof Error ? e.message : String(e);
      throw e;
    }
    this.worker = w;

    w.onmessage = (ev: MessageEvent) => this.handleLine(String(ev.data));
    w.onerror = (ev: ErrorEvent) => {
      this.status.error = ev.message || 'エンジンの起動に失敗しました';
      this.status.loading = false;
    };

    this.raw('uci');
    await this.readyPromise;
    this.status.ready = true;
    this.status.loading = false;
  }

  private handleLine(rawLine: string): void {
    const line = rawLine.trim();
    if (!line) return;
    this.lineHandler?.(line);

    if (line === 'uciok') {
      this.raw('isready');
      return;
    }
    if (line === 'readyok') {
      this.readyResolve?.();
      return;
    }
    if (line.startsWith('bestmove')) {
      const r = this.resolveSearch;
      this.resolveSearch = null;
      r?.(line);
    }
  }

  /** Sends a command without waiting for output. */
  raw(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  setOption(name: string, value: string): void {
    this.raw(`setoption name ${name} value ${value}`);
  }

  /**
   * Runs a search and resolves with the bestmove. Info lines are streamed to
   * `onInfo` as they arrive, which is what drives the live evaluation bar.
   */
  async go(opts: {
    fen: string;
    multiPv: number;
    budgetType: 'depth' | 'time' | 'nodes';
    budgetValue: number;
    /** 'w' or 'b': used to normalise the score to White's point of view. */
    sideToMove: 'w' | 'b';
    onInfo?: (info: SearchInfo) => void;
  }): Promise<{ bestmove: string; infos: SearchInfo[] }> {
    if (!this.worker) throw new Error('エンジンが起動していません');
    this.raw('stop');

    this.setOption('MultiPV', String(Math.max(1, Math.floor(opts.multiPv))));
    this.raw('position fen ' + opts.fen);

    const v = Math.max(1, Math.floor(opts.budgetValue));
    const goCmd =
      opts.budgetType === 'depth'
        ? `go depth ${v}`
        : opts.budgetType === 'nodes'
          ? `go nodes ${v}`
          : `go movetime ${v}`;

    const infos: SearchInfo[] = [];
    this.lineHandler = (line) => {
      if (!line.startsWith('info ')) return;
      const info = parseInfo(line, opts.sideToMove);
      if (info) {
        infos.push(info);
        opts.onInfo?.(info);
      }
    };

    const line = await new Promise<string>((resolve) => {
      this.resolveSearch = resolve;
      this.raw(goCmd);
    });
    this.lineHandler = null;
    this.resolveSearch = null;

    const bestmove = line.split(/\s+/)[1] ?? '';
    return { bestmove, infos };
  }

  /** Stops the current search; the pending go() promise resolves. */
  stop(): void {
    this.raw('stop');
  }

  quit(): void {
    this.disposed = true;
    try {
      this.worker?.terminate();
    } catch {
      /* already gone */
    }
    this.worker = null;
    this.status.ready = false;
  }

  get variantName(): EngineVariant {
    return this.variant;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Tries a module worker first (what the Vite dev server serves), then a
 * classic worker. The emscripten output boots in either.
 */
function spawnWorker(url: string): Worker {
  try {
    return new Worker(url, { type: 'module' });
  } catch {
    return new Worker(url);
  }
}

/** Parses one `info ...` line into a SearchInfo, or null if it carries no score. */
export function parseInfo(line: string, sideToMove: 'w' | 'b'): SearchInfo | null {
  const parts = line.split(/\s+/);
  const get = (k: string): string | undefined => {
    const i = parts.indexOf(k);
    return i >= 0 ? parts[i + 1] : undefined;
  };
  const depth = Number(get('depth') ?? 0);
  if (!Number.isFinite(depth) || depth === 0) return null;

  const scoreCp = Number(get('cp') ?? '0');
  const mateStr = get('mate');
  const scoreMate = mateStr === undefined ? null : Number(mateStr);

  const pv: string[] = [];
  const pvIdx = parts.indexOf('pv');
  if (pvIdx >= 0) pv.push(...parts.slice(pvIdx + 1));

  // A mate score is worth far more than any pawn count; scale it so the
  // evaluation bar can display it as a very large but finite advantage.
  let raw = scoreMate !== null ? (scoreMate > 0 ? 100_000 : -100_000) : scoreCp;

  // UCI reports scores from the side to move. Flip to White for display.
  const evalCp = sideToMove === 'b' ? -raw : raw;

  return {
    depth,
    seldepth: Number(get('seldepth') ?? depth),
    multipv: Number(get('multipv') ?? 1),
    scoreCp: raw,
    scoreMate,
    evalCp,
    nodes: Number(get('nodes') ?? 0),
    timeMs: Number(get('time') ?? 0),
    pv,
  };
}

/** Collapses a stream of info lines into one candidate per MultiPV slot. */
export function latestByPv(infos: SearchInfo[]): SearchInfo[] {
  const map = new Map<number, SearchInfo>();
  for (const i of infos) map.set(i.multipv, i);
  return [...map.values()].sort((a, b) => a.multipv - b.multipv);
}

/** Human-readable Japanese label for a centipawn score, from White's view. */
export function evalLabelJa(evalCp: number): string {
  const pawns = evalCp / 100;
  const a = Math.abs(pawns);
  if (a < 0.25) return '均衡';
  if (a < 0.75) return pawns > 0 ? '白やや優勢' : '黒やや優勢';
  if (a < 2) return pawns > 0 ? '白が優勢' : '黒が優勢';
  if (a < 5) return pawns > 0 ? '白が明確に優勢' : '黒が明確に優勢';
  return pawns > 0 ? '白の必勝' : '黒の必勝';
}

/** Maps a centipawn score onto 0..1 for the evaluation bar (White at the top). */
export function evalToRatio(evalCp: number): number {
  return 1 / (1 + Math.exp(-evalCp / 350));
}
