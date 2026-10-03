/**
 * Settings: appearance, play, engine, public link and data.
 * Also hosts the opt-in download for the 99 MB engine.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, Field, Icon, ICONS, Segmented, Switch } from '../../components/ui';
import { useSettings, sanitizeName, playerName, type ThemeId } from '../../store/settings';
import { useProgress } from '../../store/progress';
import { useArchive } from '../../store/archive';
import { getPublicOrigin, setPublicOriginOverride, getPublicOriginOverride } from '../../config/site';
import { useToast } from '../../components/Toast';
import { engineUrl } from '../../ai/stockfish';

export function SettingsPage(): React.JSX.Element {
  const [params] = useSearchParams();
  const toast = useToast();
  const s = useSettings();
  const hydrateProgress = useProgress((p) => p.hydrate);
  const clearArchive = useArchive((a) => a.clear);
  const games = useArchive((a) => a.games);

  const [origin, setOrigin] = useState(getPublicOriginOverride());
  const [confirmReset, setConfirmReset] = useState(false);
  const [fullOpen, setFullOpen] = useState(params.get('engine') === 'full');

  useEffect(() => {
    void hydrateProgress();
  }, [hydrateProgress]);

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">設定</h1>
        <p className="page__lede">見た目、対戦、エンジン、公開リンクを設定します。</p>
      </div>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">
          <Icon path={ICONS.people} size={18} />
          表示名
        </h2>
        <Field label="あなたの名前" hint="P2P対戦の相手の画面に表示されます。24文字まで。">
          <input
            className="input"
            value={playerName(s.displayName)}
            maxLength={24}
            onChange={(e) => s.set('displayName', sanitizeName(e.target.value))}
          />
        </Field>
      </section>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">見た目</h2>
        <Field label="テーマ">
          <Segmented
            value={s.theme}
            onChange={(v) => s.set('theme', v as ThemeId)}
            options={[
              { value: 'washi', label: '和紙' },
              { value: 'sepia', label: 'セピア' },
              { value: 'ink', label: '墨' },
            ]}
          />
        </Field>
        <Switch
          label="座標を表示する"
          checked={s.showCoordinates}
          onChange={(v) => s.set('showCoordinates', v)}
        />
        <Switch
          label="直前の手をハイライトする"
          checked={s.highlightLastMove}
          onChange={(v) => s.set('highlightLastMove', v)}
        />
        <Switch
          label="指せるマスを点滅表示する"
          checked={s.showMoveHints}
          onChange={(v) => s.set('showMoveHints', v)}
        />
        <Switch label="演出音を使う" checked={s.sound} onChange={(v) => s.set('sound', v)} />
        <Switch
          label="小さい画面では盤面を自動反転する"
          checked={s.autoFlip}
          onChange={(v) => s.set('autoFlip', v)}
        />
        <Switch
          label="投了の確認を出す"
          checked={s.confirmResign}
          onChange={(v) => s.set('confirmResign', v)}
        />
      </section>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">
          <Icon path={ICONS.learn} size={18} />
          初心者サポート
        </h2>
        <Switch
          label="ヒント時にAIコーチの詳しい理由・狙いを表示する"
          checked={s.coachExplanation}
          onChange={(v) => s.set('coachExplanation', v)}
        />
        <Switch
          label="相手の危険な狙いや王手の脅威を警告する"
          checked={s.showThreats}
          onChange={(v) => s.set('showThreats', v)}
        />
        <Switch
          label="味方の無防備な駒（守られていない駒）を盤上で注意表示する"
          checked={s.highlightHanging}
          onChange={(v) => s.set('highlightHanging', v)}
        />
      </section>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">
          <Icon path={ICONS.cloud} size={18} />
          公開リンク
        </h2>
        <p className="dim" style={{ fontSize: '0.8rem' }}>
          現在の共有先: <span className="mono">{getPublicOrigin()}</span>
        </p>
        <Field
          label="公開リンクの指定"
          hint="空欄のときは、このブラウザの現在地のアドレスを使います。QRの参加リンクに反映されます。"
        >
          <div className="row-inline">
            <input
              className="input input--mono"
              value={origin}
              placeholder="https://example.com"
              onChange={(e) => setOrigin(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => {
                setPublicOriginOverride(origin);
                toast.ok('公開リンクを保存しました');
              }}
            >
              保存
            </button>
          </div>
        </Field>
        <p className="field__hint">
          サーバに置く public/app-config.json でも同じ指定ができます。ビルドし直す必要はありません。
        </p>
      </section>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">
          <Icon path={ICONS.bolt} size={18} />
          エンジン
        </h2>
        <p className="dim" style={{ fontSize: '0.85rem', marginBottom: 'var(--sp-2)' }}>
          軽量版（約1.8MB）はオフラインで動作します。フル版（約99MB）は任意でダウンロードでき、
          最上級と最強の段、および詳細な検討が使えるようになります。
        </p>
        <div className="board-tools">
          <button className="btn" onClick={() => setFullOpen(true)}>
            <Icon path={ICONS.download} size={15} />
            フル版の管理
          </button>
          <span className="badge">{s.fullEngineReady ? '追加済み' : '未ダウンロード'}</span>
        </div>
      </section>

      <section className="card card--pad">
        <h2 className="card__title">データ</h2>
        <div className="kv">
          <span className="kv__k">保存されている棋譜</span>
          <span className="num">{games.length}</span>
        </div>
        <div className="board-tools board-tools--wrap">
          <button className="btn btn--danger" onClick={() => setConfirmReset(true)}>
            <Icon path={ICONS.trash} size={15} />
            すべてのデータを初期化
          </button>
        </div>
      </section>
<FullEngineDialog
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        ready={s.fullEngineReady}
        onReady={() => s.set('fullEngineReady', true)}
      />

      <Dialog
        open={confirmReset}
        title="初期化しますか？"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <button className="btn" onClick={() => setConfirmReset(false)}>
              やめる
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                s.reset();
                clearArchive();
                setConfirmReset(false);
                toast.ok('初期化しました');
              }}
            >
              初期化する
            </button>
          </>
        }
      >
        <p>設定、棋譜、学習の進捗がすべて消えます。この操作は取り消せません。</p>
      </Dialog>
    </div>
  );
}

function FullEngineDialog({
  open,
  onClose,
  ready,
  onReady,
}: {
  open: boolean;
  onClose: () => void;
  ready: boolean;
  onReady: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const download = async () => {
    setBusy(true);
    setPct(0);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch(engineUrl('full', 'wasm'), { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length') ?? 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('ダウンロードできません');
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.length;
          setPct(total ? Math.round((received / total) * 100) : -1);
        }
      }
      onReady();
      toast.ok('フル版を追加しました');
    } catch (e) {
      toast.error(`ダウンロードに失敗しました: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  return (
    <Dialog open={open} title="フル版エンジン" onClose={onClose}>
      <p>
        フル版は約99MBあります。ダウンロードには時間がかかり、携帯のデータ量を消費します。
        軽量版だけでもすべての学習モードとAI対戦が利用できます。
      </p>
      {ready ? <p className="ok-text">フル版はすでに追加されています。</p> : null}
      {busy ? (
        <div className="progress" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="progress__bar progress__bar--brass" style={{ width: `${pct || 3}%` }} />
        </div>
      ) : null}
      <div className="board-tools">
        <button className="btn btn--primary" onClick={() => void download()} disabled={busy}>
          <Icon path={ICONS.download} size={15} />
          {busy ? 'ダウンロード中' : 'ダウンロードする'}
        </button>
        {busy ? (
          <button className="btn" onClick={() => abort.current?.abort()}>
            中止
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}