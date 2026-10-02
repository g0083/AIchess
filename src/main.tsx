import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

import '@lichess-org/chessground/assets/chessground.base.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/board.css';
import './styles/layout.css';
import './styles/features.css';

const el = document.getElementById('root');
if (!el) throw new Error('root element not found');

// Apply the saved theme before the first paint so there is no flash.
try {
  const raw = localStorage.getItem('shogiya-chess:settings');
  const theme = raw ? (JSON.parse(raw)?.state?.theme as string) : null;
  if (theme) document.documentElement.dataset.theme = theme;
} catch {
  /* ignore */
}

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
