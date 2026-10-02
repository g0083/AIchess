/**
 * Chess clocks.
 *
 * Supported formats:
 *   - Sudoku-style: fixed main time plus increment (Fischer)
 *   - Byo-Yomi: a period of time, repeated, with a save button
 *   - Untimed
 *
 * The clock accumulates from a start timestamp rather than decrementing a
 * counter, so a backgrounded tab or a slow frame cannot silently gain or lose
 * time.
 */

export type ClockMode = 'sudoku' | 'byoyomi' | 'untimed';

export interface ClockConfig {
  mode: ClockMode;
  /** Sudoku: initial time in ms. */
  initialMs: number;
  /** Sudoku: increment per move, in ms. */
  incrementMs: number;
  /** Byo-Yomi: period length, in ms. */
  periodMs: number;
  /** Byo-Yomi: how many periods each side gets. */
  periods: number;
}

export const CLOCK_PRESETS: { id: string; name: string; cfg: ClockConfig }[] = [
  { id: 'sudoku-1', name: '未定速 1分', cfg: { mode: 'sudoku', initialMs: 60_000, incrementMs: 0, periodMs: 0, periods: 0 } },
  { id: 'sudoku-3-2', name: '3分+2秒', cfg: { mode: 'sudoku', initialMs: 180_000, incrementMs: 2_000, periodMs: 0, periods: 0 } },
  { id: 'sudoku-5-3', name: '5分+3秒', cfg: { mode: 'sudoku', initialMs: 300_000, incrementMs: 3_000, periodMs: 0, periods: 0 } },
  { id: 'sudoku-10-5', name: '10分+5秒', cfg: { mode: 'sudoku', initialMs: 600_000, incrementMs: 5_000, periodMs: 0, periods: 0 } },
  { id: 'sudoku-15-10', name: '15分+10秒', cfg: { mode: 'sudoku', initialMs: 900_000, incrementMs: 10_000, periodMs: 0, periods: 0 } },
  { id: 'sudoku-30', name: '30分', cfg: { mode: 'sudoku', initialMs: 1_800_000, incrementMs: 0, periodMs: 0, periods: 0 } },
  { id: 'twilight-30-20', name: '30分+20秒', cfg: { mode: 'sudoku', initialMs: 1_800_000, incrementMs: 20_000, periodMs: 0, periods: 0 } },
  { id: 'byoyomi-1x3', name: 'バイヨミー 1分3期', cfg: { mode: 'byoyomi', initialMs: 0, incrementMs: 0, periodMs: 60_000, periods: 3 } },
  { id: 'byoyomi-3x5', name: 'バイヨミー 3分5期', cfg: { mode: 'byoyomi', initialMs: 0, incrementMs: 0, periodMs: 180_000, periods: 5 } },
  { id: 'untimed', name: '無制限', cfg: { mode: 'untimed', initialMs: 0, incrementMs: 0, periodMs: 0, periods: 0 } },
];

export function clockById(id: string): ClockConfig {
  return (CLOCK_PRESETS.find((p) => p.id === id) ?? CLOCK_PRESETS[3]).cfg;
}

export interface SideClockState {
  /** Remaining time for the current period, in ms. */
  remaining: number;
  /** Byo-Yomi: periods still available. */
  periodsLeft: number;
  /** True when a Byo-Yomi save is available right now. */
  canSave: boolean;
  /** True when time ran out with no period left: the flag has fallen. */
  flagged: boolean;
}

function initialSide(cfg: ClockConfig): SideClockState {
  if (cfg.mode === 'untimed') {
    return { remaining: Infinity, periodsLeft: 0, canSave: false, flagged: false };
  }
  if (cfg.mode === 'byoyomi') {
    return { remaining: cfg.periodMs, periodsLeft: cfg.periods, canSave: false, flagged: false };
  }
  return { remaining: cfg.initialMs, periodsLeft: 0, canSave: false, flagged: false };
}


export class Clock {
  readonly cfg: ClockConfig;
  private state: Record<'w' | 'b', SideClockState>;
  private running: 'w' | 'b' | null = null;
  private since: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onTick: (() => void) | null = null;
  private onFlag: ((side: 'w' | 'b') => void) | null = null;

  constructor(cfg: ClockConfig) {
    this.cfg = cfg;
    this.state = { w: initialSide(cfg), b: initialSide(cfg) };
  }

  start(): void {
    this.running = this.running ?? 'w';
    this.since = this.cfg.mode === 'untimed' ? null : performance.now();
    if (this.timer === null) this.timer = setInterval(() => this.onTick?.(), 100);
  }

  /** Switches the running side, banking the elapsed time first. */
  turn(next: 'w' | 'b'): void {
    this.bank();
    this.running = next;
    this.since = this.cfg.mode === 'untimed' ? null : performance.now();
  }

  /** Adds the Fischer increment and clears the Byo-Yomi save flag. */
  onMovePlayed(side: 'w' | 'b'): void {
    if (this.cfg.mode === 'sudoku') {
      this.state[side].remaining += this.cfg.incrementMs;
    } else if (this.cfg.mode === 'byoyomi') {
      this.state[side].canSave = false;
    }
  }

  /**
   * Byo-Yomi save: spends one period and restarts the clock.
   * Returns false when no save was available.
   */
  save(side: 'w' | 'b'): boolean {
    const s = this.state[side];
    if (this.cfg.mode !== 'byoyomi' || !s.canSave || s.flagged) return false;
    s.periodsLeft -= 1;
    s.remaining = this.cfg.periodMs;
    s.canSave = false;
    return true;
  }

  /** Caller-driven updates so React re-renders on our schedule. */
  subscribe(onTick: () => void, onFlag?: (side: 'w' | 'b') => void): () => void {
    this.onTick = onTick;
    this.onFlag = onFlag ?? null;
    return () => {
      this.onTick = null;
      this.onFlag = null;
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  /** Folds elapsed time into the running side's remaining time. */
  private bank(): void {
    if (this.running === null || this.since === null) return;
    const side = this.running;
    const elapsed = performance.now() - this.since;
    this.since = performance.now();
    if (!Number.isFinite(elapsed) || elapsed <= 0) return;
    const s = this.state[side];
    s.remaining -= elapsed;

    if (s.remaining > 0) return;

    if (this.cfg.mode === 'byoyomi' && s.periodsLeft > 0) {
      s.canSave = true;
      s.remaining = 0;
      return;
    }
    s.remaining = 0;
    s.flagged = true;
    this.running = null;
    this.since = null;
    this.onFlag?.(side);
  }

  stop(): void {
    this.bank();
    this.running = null;
    this.since = null;
  }

  /** Current display values; folds in elapsed time before reading. */
  refresh(): void {
    this.bank();
  }

  read(side: 'w' | 'b'): SideClockState {
    return { ...this.state[side] };
  }

  runningSide(): 'w' | 'b' | null {
    return this.running;
  }

  dispose(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/** "9:58" style display; tenths appear only when under ten seconds are left. */
export function formatClock(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const base = `${minutes}:${String(seconds).padStart(2, '0')}`;
  // Tenths only in the final seconds, where they actually matter.
  return total < 10_000 ? `${base}.${Math.floor((total % 1000) / 100)}` : base;
}
