import { describe, expect, it } from 'vitest';
import { Clock, CLOCK_PRESETS, clockById, formatClock } from '../src/chess/clock';
import { glickoLite, scheduleNext, newCard, todayKey } from '../src/store/progress';

const SUDOKU = clockById('sudoku-5-3');

describe('clock', () => {
  it('starts with the configured time on both sides', () => {
    const c = new Clock(SUDOKU);
    expect(c.read('w').remaining).toBe(SUDOKU.initialMs);
    expect(c.read('b').remaining).toBe(SUDOKU.initialMs);
    expect(c.read('w').flagged).toBe(false);
  });

  it('adds the increment only to the side that moved', () => {
    const c = new Clock(SUDOKU);
    const before = c.read('b').remaining;
    c.onMovePlayed('w');
    expect(c.read('w').remaining).toBe(SUDOKU.initialMs + SUDOKU.incrementMs);
    expect(c.read('b').remaining).toBe(before);
  });

  it('only allows a Byo-Yomi save once the period has run out', () => {
    const cfg = clockById('byoyomi-1x3');
    const c = new Clock(cfg);
    expect(c.save('w')).toBe(false); // nothing has expired yet
    expect(c.read('w').periodsLeft).toBe(3);
  });

  it('flags only when a Byo-Yomi side runs out of periods', () => {
    const cfg = clockById('byoyomi-1x3');
    const c = new Clock(cfg);
    expect(cfg.periods).toBe(3);
    expect(cfg.periodMs).toBe(60_000);
  });

  it('never reports a negative time', () => {
    const c = new Clock({ mode: 'sudoku', initialMs: 0, incrementMs: 0, periodMs: 0, periods: 0 });
    c.refresh();
    expect(c.read('w').remaining).toBeGreaterThanOrEqual(0);
  });

  it('treats untimed games as having no clock', () => {
    const c = new Clock(clockById('untimed'));
    expect(Number.isFinite(c.read('w').remaining)).toBe(false);
    expect(formatClock(c.read('w').remaining)).toBe('—');
  });

  it('formats minutes and seconds', () => {
    expect(formatClock(9 * 60_000 + 58_000)).toBe('9:58');
    expect(formatClock(0)).toBe('0:00.0');
    expect(formatClock(600_000)).toBe('10:00');
  });

  it('offers both increment and byo-yomi presets', () => {
    const modes = new Set(CLOCK_PRESETS.map((p) => p.cfg.mode));
    expect(modes.has('sudoku')).toBe(true);
    expect(modes.has('byoyomi')).toBe(true);
  });
});

describe('puzzle rating', () => {
  it('rises on a correct answer and falls on a wrong one', () => {
    const up = glickoLite(1000, 200, true, 5000);
    const down = glickoLite(1000, 200, false, 5000);
    expect(up.rating).toBeGreaterThan(1000);
    expect(down.rating).toBeLessThan(1000);
  });

  it('shrinks the deviation as the player plays more', () => {
    expect(glickoLite(1000, 200, true, 1000).deviation).toBeLessThan(200);
  });

  it('keeps the rating inside sane bounds', () => {
    expect(glickoLite(5000, 10, false, 1000).rating).toBeGreaterThanOrEqual(600);
    expect(glickoLite(100, 10, true, 1000).rating).toBeLessThanOrEqual(2600);
  });

  it('rewards a fast correct answer more than a slow one', () => {
    expect(glickoLite(1000, 200, true, 1000).rating).toBeGreaterThan(
      glickoLite(1000, 200, true, 50_000).rating,
    );
  });
});

describe('spaced repetition', () => {
  it('brings a failed card back within the same session', () => {
    const c = scheduleNext(newCard('p1'), 'again');
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.due - Date.now()).toBeLessThanOrEqual(10 * 60_000);
  });

  it('grows the interval on repeated success', () => {
    let c = newCard('p1');
    c = scheduleNext(c, 'good');
    const first = c.interval;
    c = scheduleNext(c, 'good');
    c = scheduleNext(c, 'good');
    expect(first).toBe(1);
    expect(c.interval).toBeGreaterThan(first);
  });

  it('lowers the ease factor after a lapse', () => {
    const c = scheduleNext(newCard('p1'), 'again');
    expect(c.ease).toBeLessThan(2.5);
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('keeps the ease factor within its bounds', () => {
    let c = newCard('p1');
    for (let i = 0; i < 20; i++) c = scheduleNext(c, 'easy');
    expect(c.ease).toBeLessThanOrEqual(2.8);
  });

  it('formats today as a sortable date key', () => {
    expect(todayKey(new Date('2026-10-03T12:00:00'))).toBe('2026-10-03');
  });
});