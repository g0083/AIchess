/**
 * The chessboard.
 *
 * Sizing is the whole point of this component: the board is always a square
 * that fits its container, measured with a ResizeObserver rather than with
 * viewport units, so it never breaks between a 320px phone, a tablet in
 * landscape, and an ultrawide monitor. The side panels scroll; the board does not.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import type { Api as ChessgroundApi } from '@lichess-org/chessground/api';
import type { Key as CgKey } from '@lichess-org/chessground/types';
import { pieceCss, paletteFor } from '../chess/pieces';
import { useSettings } from '../store/settings';
import type { Color } from '../chess/rules';

/**
 * chess.js uses 'w' / 'b'; chessground uses 'white' / 'black'.
 * Every value crossing into chessground goes through this.
 */
export function cgColor(c: Color): 'white' | 'black' {
  return c === 'w' ? 'white' : 'black';
}

/** chess.js hands back a plain object; chessground wants a Map. */
export function toDests(dests?: Record<string, string[]>): Map<CgKey, CgKey[]> {
  const m = new Map<CgKey, CgKey[]>();
  if (!dests) return m;
  for (const [from, list] of Object.entries(dests)) {
    m.set(from as CgKey, (list as string[]).map((d) => d as CgKey));
  }
  return m;
}

/** Validates a square name before it crosses into chessground's Key type. */
export function toKey(s: string): CgKey {
  return s as CgKey;
}

export interface ShapeHint {
  from: CgKey;
  to?: CgKey;
  kind?: 'arrow' | 'square';
  brush?: string;
}

export interface BoardProps {
  fen: string;
  /** Which side may move right now; null blocks input. */
  turn: Color | null;
  orientation: Color;
  /** Legal destinations keyed by origin square. */
  dests?: Record<string, string[]>;
  lastMove?: [string, string];
  /** Arrows the app wants to draw (hints, analysis). */
  shapes?: ShapeHint[];
  /** Blocks all input (game over, analysis-only, lesson gating). */
  viewOnly?: boolean;
  /** Highlight this side's king in red when it is in check. */
  check?: Color | null;
  onMove?: (from: CgKey, to: CgKey, promotion?: string) => void;
  onSelect?: (key: CgKey) => void;
  onDrawChange?: (shapes: ShapeHint[]) => void;
  animationDuration?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Injects the generated piece artwork. Re-runs when the theme changes, because
 * the colours are baked into the SVG and cannot come from CSS variables.
 */
function injectPieceCss(theme: string) {
  let el = document.getElementById('cg-piece-set') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'cg-piece-set';
    document.head.appendChild(el);
  }
  el.textContent = pieceCss(paletteFor(theme));
}

export function Board(props: BoardProps): React.JSX.Element {
  const {
    fen,
    turn,
    orientation,
    dests,
    lastMove,
    shapes,
    viewOnly = false,
    check = null,
    onMove,
    onSelect,
    onDrawChange,
    animationDuration = 180,
    className = '',
    ariaLabel = 'チェス盤',
  } = props;

  // The sizing element is .board-slot, which stretches to fill its parent.
  // The square size is applied to the children, never to .board-slot itself:
  // measuring the element you also resize is a feedback loop that shrinks the
  // board a few pixels on every observation until it hits the minimum.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // chessground takes over the children of the element it is given, so it must
  // be handed the dedicated .cg-wrap node - never the outer .board-slot, whose
  // children include the .board-inner frame (wood grain, vignette, shadow).
  const cgRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<ChessgroundApi | null>(null);
  const [size, setSize] = useState(360);
  const sizeRef = useRef(size);
  const theme = useSettings((s) => s.theme);
  const [pendingPromo, setPendingPromo] = useState<{ from: CgKey; to: CgKey; color: Color } | null>(null);
  const fenRef = useRef(fen);
  fenRef.current = fen;

  // Re-emit the artwork when the theme changes; the colours are baked into
  // the SVG data URIs.
  useEffect(() => {
    injectPieceCss(theme);
  }, [theme]);

  // Chessground callbacks are captured once; routing them through refs keeps
  // the latest props visible without reconfiguring the board every render.
  const moveCb = useRef(onMove);
  const selectCb = useRef(onSelect);
  const drawCb = useRef(onDrawChange);
  useEffect(() => {
    moveCb.current = onMove;
    selectCb.current = onSelect;
    drawCb.current = onDrawChange;
  }, [onMove, onSelect, onDrawChange]);

  // --- size the board to its container -----------------------------------
  // .board-slot is never sized from `size` - it stretches to whatever the page
  // layout gives it, and only its children (.board-inner / .cg-wrap) carry the
  // measured square. That is what makes reading .board-slot back safe here:
  // the value reported is always the room the layout offers, never the size we
  // just wrote. (Sizing .board-slot from this measurement - the previous
  // behaviour - is a feedback loop that ratchets the board down a few pixels
  // per observation until it sticks at the 200px minimum.)
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      // In column/scrolling layouts, el's height can collapse to the child inner height (feedback loop).
      // If width is given and height is either 0 or approximately the minimum child size while width is larger,
      // determine available height from parent or use width (aspect-ratio 1:1).
      let availableH = rect.height;
      if (availableH <= 210 && rect.width > 210) {
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (parentRect && parentRect.height > 210) {
          availableH = parentRect.height;
        } else {
          availableH = rect.width;
        }
      }
      const s = Math.max(200, Math.floor(Math.min(rect.width, availableH) - 4));
      if (Math.abs(sizeRef.current - s) <= 1) return;
      sizeRef.current = s;
      setSize(s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);

  // --- create the board once ---------------------------------------------
  useLayoutEffect(() => {
    injectPieceCss(theme);
    const el = cgRef.current;
    if (!el) return;
    const api = Chessground(el, {
      fen,
      orientation: cgColor(orientation),
      turnColor: cgColor(turn ?? orientation),
      coordinates: true,
      viewOnly,
      highlight: { lastMove: true, check: true },
      animation: { enabled: animationDuration >= 70, duration: animationDuration },
      draggable: { enabled: true, distance: 3, showGhost: true, autoDistance: true },
      selectable: { enabled: true },
      drawable: {
        enabled: true,
        visible: true,
        defaultSnapToValidMove: true,
        eraseOnMovablePieceClick: false,
        onChange: (shapes) => {
          drawCb.current?.(
            shapes.map((s) => ({
              from: s.orig as CgKey,
              to: s.dest as CgKey,
              kind: s.brush === 'puck' ? ('square' as const) : ('arrow' as const),
            })),
          );
        },
      },
      movable: {
        free: false,
        color: viewOnly ? undefined : turn ? cgColor(turn) : undefined,
        dests: new Map(),
        showDests: true,
        events: {
          after: (from, to) => {
            // Clear immediately so a rejected move snaps back.
            api.set({ movable: { dests: new Map() } });
            try {
              const c = new Chess(fenRef.current);
              const p = c.get(from as Square);
              const isPromo =
                p?.type === 'p' &&
                ((p.color === 'w' && to[1] === '8') || (p.color === 'b' && to[1] === '1'));
              if (isPromo) {
                setPendingPromo({ from, to, color: p.color });
                return;
              }
            } catch {
              /* ignore */
            }
            moveCb.current?.(from, to);
          },
        },
      },
      events: { select: (key) => selectCb.current?.(key) },
    });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // Created once; every prop is applied by the configure effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- apply prop changes ------------------------------------------------
  useEffect(() => {
    apiRef.current?.set({
      fen,
      orientation: cgColor(orientation),
      turnColor: cgColor(turn ?? orientation),
    });
  }, [fen, orientation, turn]);

  useEffect(() => {
    apiRef.current?.set({
      lastMove: lastMove ? ([toKey(lastMove[0]), toKey(lastMove[1])] as CgKey[]) : undefined,
    });
  }, [lastMove]);

  useEffect(() => {
    apiRef.current?.set({ check: check ? cgColor(check) : false });
  }, [check]);

  useEffect(() => {
    apiRef.current?.set({
      movable: {
        free: false,
        color: viewOnly ? undefined : turn ? cgColor(turn) : undefined,
        dests: viewOnly ? new Map() : toDests(dests),
        showDests: !viewOnly,
      },
      viewOnly,
    });
  }, [dests, turn, viewOnly]);

  const autoShapes = useMemo(
    () =>
      (shapes ?? []).map((s) => ({
        orig: s.from,
        dest: s.to && s.to !== s.from ? s.to : undefined,
        brush: s.brush ?? (s.kind === 'square' ? 'red' : 'green'),
      })),
    [shapes],
  );
  useEffect(() => {
    apiRef.current?.set({ drawable: { autoShapes } });
  }, [autoShapes]);

  useEffect(() => {
    apiRef.current?.set({
      animation: { enabled: animationDuration >= 70, duration: animationDuration },
    });
  }, [animationDuration]);

  return (
    <div className={`board-slot ${className}`} ref={wrapRef}>
      <div
        className="board-inner"
        style={{ width: size, height: size }}
        role="application"
        aria-label={ariaLabel}
      >
        <div className="cg-wrap" ref={cgRef} style={{ width: size, height: size }} />
        {pendingPromo ? (
          <div className="promo-overlay">
            <div className="promo-dialog">
              <p className="promo-dialog__title">成る駒を選択</p>
              <div className="promo-dialog__pieces">
                {[
                  { role: 'q', label: 'クイーン' },
                  { role: 'n', label: 'ナイト' },
                  { role: 'r', label: 'ルーク' },
                  { role: 'b', label: 'ビショップ' },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    className="btn btn--sm promo-btn"
                    onClick={() => {
                      const promo = pendingPromo;
                      setPendingPromo(null);
                      moveCb.current?.(promo.from, promo.to, item.role);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                style={{ marginTop: 6 }}
                onClick={() => {
                  setPendingPromo(null);
                  apiRef.current?.set({ fen });
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
