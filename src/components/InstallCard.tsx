/**
 * Install / update card.
 *
 * Shown on the home screen and in Settings. It only offers a button when the
 * browser actually reported the app as installable, so it can never be a dead
 * control.
 */
import { useEffect, useState } from 'react';
import { Icon, ICONS } from './ui';
import { useInstallPrompt, needsManualInstallSteps } from '../hooks/useInstallPrompt';
import { onPwaEvent, updateServiceWorker } from '../pwa';

export function InstallCard(): React.JSX.Element | null {
  const { state, install } = useInstallPrompt();
  const [updateReady, setUpdateReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => onPwaEvent((e) => {
    if (e.type === 'update-available') setUpdateReady(true);
  }), []);

  if (updateReady) {
    return (
      <section className="card card--pad install-card">
        <h2 className="card__title">
          <Icon path={ICONS.refresh} size={18} />
          新しいバージョンがあります
        </h2>
        <p className="dim">再読み込みすると反映されます。</p>
        <button
          className="btn btn--primary btn--block"
          onClick={() => void updateServiceWorker(true)}
        >
          今すぐ更新する
        </button>
      </section>
    );
  }

  if (state === 'installed') {
    return (
      <section className="card card--pad install-card">
        <h2 className="card__title">
          <Icon path={ICONS.check} size={18} />
          インストール済み
        </h2>
        <p className="dim">オフラインでも起動できます。</p>
      </section>
    );
  }

  if (state === 'installable') {
    return (
      <section className="card card--pad install-card">
        <h2 className="card__title">
          <Icon path={ICONS.download} size={18} />
          ホーム画面に追加する
        </h2>
        <p className="dim" style={{ marginBottom: 'var(--sp-3)' }}>
          追加するとオフラインでも起動でき、AI対戦もそのまま使えます。
        </p>
        <button
          className="btn btn--primary btn--block"
          onClick={async () => {
            const r = await install();
            setDone(r === 'accepted');
          }}
        >
          インストール
        </button>
        {done ? <p className="ok-text">追加しました。</p> : null}
      </section>
    );
  }

  // No event: either already dismissed, or the browser needs manual steps.
  if (!needsManualInstallSteps()) return null;

  return (
    <section className="card card--pad install-card">
      <h2 className="card__title">
        <Icon path={ICONS.share} size={18} />
        ホーム画面に追加する
      </h2>
      <ol className="prose" style={{ paddingLeft: '1.3em', margin: 0 }}>
        <li>Safari で分享（共有）ボタンをタップします。</li>
        <li>「ホーム画面に追加」を選びます。</li>
        <li>追加するとオフラインでも起動できます。</li>
      </ol>
    </section>
  );
}