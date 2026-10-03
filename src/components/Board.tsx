/**
 * The chessboard.
 *
 * Sizing is the whole point of this component: the board is always a square
 * that fits its container, measured with a ResizeObserver rather than with
 * viewport units, so it never breaks between a 320px phone, a tablet in
 * landscape, and an ultrawide monitor. The side panels scroll; the board does not.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  to: CgKey;
  kind: 'arrow' | 'square';
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
  onMove?: (from: CgKey, to: CgKey) => void;
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

  const wrapRef = useRef<HTMLDivElement | null>(null);
  // chessground takes over the children of the element it is given, so it must
  // be handed the dedicated .cg-wrap node - never the outer .board-slot, whose
  // children include the .board-inner frame (wood grain, vignette, shadow).
  const cgRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<ChessgroundApi | null>(null);
  const [size, setSize] = useState(360);
  const theme = useSettings((s) => s.theme);

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
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Leave a couple of pixels so the drop shadow is never clipped.
      const s = Math.max(200, Math.floor(Math.min(rect.width, rect.height) - 4));
      setSize((prev) => (Math.abs(prev - s) > 1 ? s : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
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
        dest: s.to,
        brush: s.kind === 'square' ? ('puck' as const) : ('arrow' as const),
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
    <div className={`board-slot ${className}`} ref={wrapRef} style={{ width: size, height: size }}>
      <div
        className="board-inner"
        style={{ width: size, height: size }}
        role="application"
        aria-label={ariaLabel}
      >
        <div className="cg-wrap" ref={cgRef} style={{ width: size, height: size }} />
      </div>
    </div>
  );
}
