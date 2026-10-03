/**
 * @vitest-environment jsdom
 *
 * Render smoke test.
 *
 * The app is a client-side React tree, so a mistake like calling useLocation()
 * from the component that renders <HashRouter> throws only at runtime: the
 * production build succeeds and CI stays green while the deployed page is
 * blank. Mounting <App /> in jsdom exercises exactly that path and fails here
 * instead of in the browser.
 *
 * jsdom (rather than renderToString) is required because HashRouter reads
 * document.defaultView while creating its history.
 */
import { describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, createElement } from 'react';
import { App } from '../src/App';

function mount(): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(createElement(App));
  });
  return {
    container,
    unmount: () => {
      act(() => root!.unmount());
      container.remove();
    },
  };
}

describe('App', () => {
  it('mounts without throwing', () => {
    const { unmount } = mount();
    expect(document.querySelector('.app')).not.toBeNull();
    unmount();
  });

  it('renders the app shell and the brand', () => {
    const { container, unmount } = mount();
    expect(container.querySelector('.app__header')).not.toBeNull();
    expect(container.textContent).toContain('将棋盤チェス');
    unmount();
  });

  it('renders every navigation entry', () => {
    const { container, unmount } = mount();
    for (const label of ['ホーム', '対戦', '学習', '実績', '設定']) {
      expect(container.textContent).toContain(label);
    }
    unmount();
  });

  it('renders the router-driven bottom navigation', () => {
    // Regression: useLocation() must not be called by the component that renders
    // <HashRouter>. It threw "useLocation() may be used only in the context of
    // a <Router> component" and left the deployed page blank.
    const { container, unmount } = mount();
    expect(container.querySelector('.app__nav')).not.toBeNull();
    unmount();
  });
});