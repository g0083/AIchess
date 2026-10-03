import { useEffect, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useLocation,
} from 'react-router-dom';
import { useSettings } from './store/settings';
import { Icon, ICONS } from './components/ui';
import { ToastProvider } from './components/Toast';
import { loadSiteConfig } from './config/site';
import { t } from './i18n/ja';
import { HomePage } from './features/home/HomePage';
import { AiSetupPage } from './features/play/AiSetupPage';
import { AiGamePage } from './features/play/AiGamePage';
import { LocalSetupPage } from './features/play/LocalSetupPage';
import { LocalGamePage } from './features/play/LocalGamePage';
import { OnlineLobbyPage } from './features/play/OnlineLobbyPage';
import { P2PGamePage } from './features/play/P2PGamePage';
import { AnalysisPage } from './features/play/AnalysisPage';
import { LearnHomePage } from './features/learn/LearnHomePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { MetaPage } from './features/meta/MetaPage';

const NAV = [
  { to: '/', label: 'ホーム', icon: ICONS.home, end: true },
  { to: '/play', label: '対戦', icon: ICONS.play },
  { to: '/learn', label: '学習', icon: ICONS.learn },
  { to: '/meta', label: '実績', icon: ICONS.trophy },
  { to: '/settings', label: '設定', icon: ICONS.settings },
];

export function App(): React.JSX.Element {
  const theme = useSettings((s) => s.theme);
  const [configReady, setConfigReady] = useState(false);

  // The public link comes from app-config.json on the server. It must be
  // loaded before the P2P lobby renders, otherwise the QR would be built from
  // location.origin, which on a sub-path host is the domain root.
  useEffect(() => {
    let alive = true;
    void loadSiteConfig().then(() => {
      if (alive) setConfigReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <ToastProvider>
      <HashRouter>
        <Shell configReady={configReady} />
      </HashRouter>
    </ToastProvider>
  );
}

/**
 * Everything that needs router context lives in here.
 *
 * It must be a child of <HashRouter>: useLocation() throws when it is called
 * by a component that the Router itself renders, because that component is
 * evaluated outside the router's context.
 */
function Shell({ configReady }: { configReady: boolean }): React.JSX.Element {
  const location = useLocation();

  return (
    <div className="app">
          <header className="app__header">
            <Link to="/" className="app__brand">
              <span className="app__brand-mark" aria-hidden="true">
                <BrandMark />
              </span>
              <span>{t('app.name')}</span>
            </Link>
            <div className="app__spacer" />
            <TopNav />
          </header>

          <main className="app__main">
            {configReady ? (
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/play" element={<ModeChooser />} />
                <Route path="/play/ai" element={<AiSetupPage />} />
                <Route path="/play/ai/game" element={<AiGamePage />} />
                <Route path="/play/local" element={<LocalSetupPage />} />
                <Route path="/play/local/game" element={<LocalGamePage />} />
                <Route path="/play/online" element={<OnlineLobbyPage />} />
                <Route path="/play/online/host" element={<P2PGamePage role="host" />} />
                <Route path="/play/online/join" element={<P2PGamePage role="guest" />} />
                <Route path="/play/analysis" element={<AnalysisPage />} />
                <Route path="/learn/*" element={<LearnHomePage />} />
                <Route path="/meta" element={<MetaPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
              <div className="page">
                <p className="dim">{t('app.loading')}</p>
              </div>
            )}
          </main>

          <BottomNav pathname={location.pathname} />
        </div>
  );
}

/**
 * The app mark: a rook drawn as SVG. Unicode chess glyphs and emoji are
 * banned by the design rules, so every symbol in the product is drawn.
 */
function BrandMark(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <rect x="5" y="3" width="3.2" height="2.6" rx="0.5" />
        <rect x="8.4" y="3" width="3.2" height="2.6" rx="0.5" />
        <rect x="11.8" y="3" width="3.2" height="2.6" rx="0.5" />
        <rect x="15.2" y="3" width="3.2" height="2.6" rx="0.5" />
        <rect x="4.4" y="6.2" width="15.2" height="2.2" rx="0.6" />
        <path d="M5.6 9.2h12.8l-1 8.4H6.6z" />
        <rect x="3.6" y="17.4" width="16.8" height="2.2" rx="0.7" />
        <rect x="2.8" y="20.2" width="18.4" height="2" rx="0.7" />
      </g>
    </svg>
  );
}

function TopNav(): React.JSX.Element {
  return (
    <nav className="topnav" aria-label="メインメニュー">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) => (isActive ? 'topnav__item topnav__item--on' : 'topnav__item')}
        >
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }): React.JSX.Element {
  // Full-bleed game screens provide their own chrome and action bar.
  const hidden = /^\/play\/(ai|local|online)\/(game|host|join)/.test(pathname);
  if (hidden) return <></>;
  return (
    <nav className="app__nav" aria-label="メインメニュー">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}>
          <Icon path={n.icon} />
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ModeChooser(): React.JSX.Element {
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">対戦</h1>
        <p className="page__lede">4つの遊び方から選べます。</p>
      </div>
      <div className="mode-grid">
        <ModeCard
          to="/play/ai"
          icon={ICONS.bolt}
          title="AI対戦"
          desc="難易度・性格・ヒントを細かく設定。オフラインでも対戦できます。"
        />
        <ModeCard
          to="/play/local"
          icon={ICONS.people}
          title="オフライン2人"
          desc="同じ端末で2人で。時計・盤反転・引き分け・投了に対応。"
        />
        <ModeCard
          to="/play/online"
          icon={ICONS.scan}
          title="P2P対戦"
          desc="QRコードをスキャンするだけ。相手の名前が表示され、チャットも使えます。"
        />
        <ModeCard
          to="/play/analysis"
          icon={ICONS.puzzle}
          title="検討"
          desc="FEN・PGNを読み込んで、評価グラフと候補手を表示します。"
        />
      </div>
    </div>
  );
}

function ModeCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: string;
  title: string;
  desc: string;
}): React.JSX.Element {
  return (
    <Link className="mode-card" to={to}>
      <span className="mode-card__icon">
        <Icon path={icon} size={24} />
      </span>
      <h2 className="mode-card__title">{title}</h2>
      <p className="mode-card__desc">{desc}</p>
    </Link>
  );
}
