/**
 * @vitest-environment jsdom
 *
 * Board render test.
 *
 * Two facts about chessground drive this file:
 *   1. It wipes the children of the element it is given, so the visual frame
 *      (.board-inner) must be a sibling, never the mount point.
 *   2. It does NOT create 64 <square> elements. The checkerboard is the
 *      background image of <cg-board>, which only exists if the colour
 *      stylesheet (chessground.brown.css) is imported. <square> nodes appear
 *      only for highlighted squares.
 *
 * Getting (2) wrong renders a fully transparent board - exactly what shipped,
 * with no error anywhere.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement } from 'react';
import { Board } from '../src/components/Board';
import { PALETTES, pieceCss, paletteFor } from '../src/chess/pieces';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeAll(() => {
  // jsdom has no layout engine and no animation frames. chessground schedules
  // every redraw through requestAnimationFrame and measures the wrapper with
  // getBoundingClientRect, so both have to be provided for the DOM to settle
  // the way it does in a browser.
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = RO as never;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  }) as never;
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 360,
      bottom: 360,
      width: 360,
      height: 360,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

function mountBoard(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(Board, { fen: START, turn: 'w', orientation: 'w', ...props }),
    );
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('Board', () => {
  it('keeps the frame element next to the chessground mount point', () => {
    // Regression: passing .board-slot to Chessground() made it clear that
    // element's children, deleting .board-inner and all its styling.
    const { container, unmount } = mountBoard();
    const frame = container.querySelector('.board-inner');
    const wrap = container.querySelector('.cg-wrap');
    expect(frame).not.toBeNull();
    expect(wrap).not.toBeNull();
    expect(frame!.contains(wrap!)).toBe(true);
    expect(container.firstElementChild!.classList.contains('cg-wrap')).toBe(false);
    unmount();
  });

  it('gives the board a non-zero size', () => {
    const { container, unmount } = mountBoard();
    const inner = container.querySelector<HTMLElement>('.board-inner')!;
    expect(Number(inner.style.width.replace('px', ''))).toBeGreaterThan(0);
    unmount();
  });

  it('renders all 32 men as piece elements', () => {
    const { container, unmount } = mountBoard();
    expect(container.querySelectorAll('cg-board piece').length).toBe(32);
    unmount();
  });

  it('registers a parseable CSS rule with artwork for every piece', () => {
    const { unmount } = mountBoard();
    const style = document.querySelector('#cg-piece-set') as HTMLStyleElement;
    expect(style).not.toBeNull();
    // jsdom does not resolve background-image from url(), so verify through
    // the CSSOM that the rules exist and are well formed.
    const rules = [...style.sheet!.cssRules].map((r) => r.cssText);
    for (const role of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']) {
      for (const color of ['white', 'black']) {
        const rule = rules.find((r) => r.includes(`piece.${role}.${color}`));
        expect(rule, `.cg-wrap piece.${role}.${color}`).toBeDefined();
        expect(rule).toContain('data:image/svg+xml');
        expect(rule).toContain('background-image');
      }
    }
    expect(rules.length).toBe(12);
    unmount();
  });

  it('marks the orientation class', () => {
    const white = mountBoard();
    expect(white.container.querySelector('.cg-wrap')!.className).toContain(
      'orientation-white',
    );
    white.unmount();

    const black = mountBoard({ orientation: 'b' });
    const cls = black.container.querySelector('.cg-wrap')!.className;
    expect(cls).toContain('orientation-black');
    expect(cls).not.toContain('orientation-white');
    black.unmount();
  });

  it('creates square nodes only for highlighted squares', () => {
    // Zero squares is the normal, correct state.
    const quiet = mountBoard();
    expect(quiet.container.querySelectorAll('cg-board square').length).toBe(0);
    quiet.unmount();

    const marked = mountBoard({ lastMove: ['e2', 'e4'] });
    expect(marked.container.querySelectorAll('cg-board square').length).toBe(2);
    expect(marked.container.querySelector('square.last-move')).not.toBeNull();
    marked.unmount();
  });

  it('shows destinations only for a selected square', () => {
    // chessground renders move-dest squares for the *selected* square only, so
    // passing dests alone must not draw anything.
    const idle = mountBoard({ dests: { e2: ['e3', 'e4'] } });
    expect(idle.container.querySelectorAll('cg-board square.move-dest').length).toBe(0);
    idle.unmount();
  });

  it('places men on the expected squares', () => {
    const { container, unmount } = mountBoard();
    const keys = [...container.querySelectorAll('cg-board piece')].map(
      (p) => (p as HTMLElement & { cgKey?: string }).cgKey ?? '',
    );
    for (const k of ['a1', 'h1', 'a8', 'h8', 'e1', 'e8']) expect(keys).toContain(k);
    unmount();
  });

  it('exposes an accessible label', () => {
    const { container, unmount } = mountBoard({ ariaLabel: '盤面テスト' });
    expect(container.querySelector('[role="application"]')!.getAttribute('aria-label')).toBe(
      '盤面テスト',
    );
    unmount();
  });

  it('renders a different position', () => {
    // king on f3, queen on g2, king on h1
    const { container, unmount } = mountBoard({ fen: '8/8/8/8/8/5k2/6q1/7K w - - 0 1' });
    expect(container.querySelectorAll('cg-board piece').length).toBe(3);
    unmount();
  });

  it('uses literal colours so the artwork can actually paint', () => {
    // Regression: the SVG used fill="var(--piece-white)". A data-URI SVG is an
    // isolated document with no access to page CSS variables, so the men came
    // out unpainted.
    const { unmount } = mountBoard();
    const css = (document.querySelector('#cg-piece-set') as HTMLStyleElement).textContent!;
    expect(css).not.toContain('var(--piece');

    // The rule is base64, so decode before checking the colours are in the SVG.
    const line = css.split('\n').find((r) => r.includes('piece.king.white'))!;
    expect(line, 'rule for piece.king.white').toBeTruthy();
    const m = line.match(/base64,([^)]+)\)/);
    expect(m, 'base64 payload').not.toBeNull();
    const svg = Buffer.from(m![1], 'base64').toString('utf8');
    expect(svg.slice(0, 160)).toContain('svg');
    expect(svg).toContain(PALETTES.washi.whiteFill);
    expect(svg).toContain(PALETTES.washi.whiteEdge);

    const blackLine = css.split('\n').find((r) => r.includes('piece.king.black'))!;
    const blackSvg = Buffer.from(blackLine.match(/base64,([^)]+)\)/)![1], 'base64').toString('utf8');
    expect(blackSvg).toContain(PALETTES.washi.blackFill);
    unmount();
  });

  it('emits a different palette per theme', () => {
    expect(pieceCss(paletteFor('washi'))).not.toBe(pieceCss(paletteFor('ink')));
  });
});