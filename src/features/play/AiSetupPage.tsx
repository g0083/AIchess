/**
 * AI match setup: difficulty, personality, side, clock, engine, hints.
 * Every control writes straight into the persisted settings store.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../store/settings';
import { LEVELS, PERSONALITIES, getLevel, levelName, type LevelId } from '../../ai/profile';
import { CLOCK_PRESETS } from '../../chess/clock';
import { Icon, ICONS, Field, Segmented, Slider, Switch } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function AiSetupPage(): React.JSX.Element {
  const nav = useNavigate();
  const toast = useToast();
  const ai = useSettings((s) => s.ai);
  const setAi = useSettings((s) => s.setAi);
  const fullEngineReady = useSettings((s) => s.fullEngineReady);
  const clockPresetId = useSettings((s) => s.clockPresetId);
  const setSetting = useSettings((s) => s.set);
  const [showCustom, setShowCustom] = useState(ai.level === 'custom');

  const spec = getLevel(ai.level);
  const needsFull = spec.needsFullEngine && !fullEngineReady;

  const start = () => {
    if (needsFull) {
      toast.error('このレベルにはフル版エンジン（99MB）が必要です。設定画面からダウンロードしてください。');
      return;
    }
    nav('/play/ai/game');
  };

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">AI対戦の設定</h1>
        <p className="page__lede">
          強さだけでなく、性格やヒント、エンジンまで細かく指定できます。
        </p>
      </div>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">
          <Icon path={ICONS.bolt} size={18} />
          難易度
        </h2>
        <div className="level-list">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              className={`level-item${ai.level === l.id ? ' level-item--on' : ''}`}
              onClick={() => setAi({ level: l.id as LevelId })}
            >
              <span className="level-item__name">{l.name}</span>
              <span className="level-item__elo num">{l.elo > 0 ? `約${l.elo}` : '—'}</span>
              <span className="level-item__note">{l.note}</span>
            </button>
          ))}
          <button
            className={`level-item${ai.level === 'custom' ? ' level-item--on' : ''}`}
            onClick={() => {
              setAi({ level: 'custom' });
              setShowCustom(true);
            }}
          >
            <span className="level-item__name">カスタム</span>
            <span className="level-item__elo num">—</span>
            <span className="level-item__note">数値を自分で調整します。</span>
          </button>
        </div>

        {ai.level === 'custom' || showCustom ? (
          <CustomBox />
        ) : null}
      </section>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">性格</h2>
        <div className="level-list">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              className={`level-item${ai.personality === p.id ? ' level-item--on' : ''}`}
              onClick={() => setAi({ personality: p.id })}
            >
              <span className="level-item__name">{p.name}</span>
              <span className="level-item__note">{p.description}</span>
            </button>
          ))}
        </div>
      </section>


      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">対戦の条件</h2>
        <Field label="手番">
          <Segmented
            value={ai.side}
            onChange={(v) => setAi({ side: v })}
            options={[
              { value: 'white', label: '先手（白）' },
              { value: 'black', label: '後手（黒）' },
              { value: 'random', label: 'ランダム' },
            ]}
          />
        </Field>
        <Field label="持ち時間">
          <select
            className="select"
            value={clockPresetId}
            onChange={(e) => setSetting('clockPresetId', e.target.value)}
          >
            {CLOCK_PRESETS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="エンジン"
          hint="軽量版は1.8MBでオフラインでも動作します。フル版は99MBのダウンロードが必要です。"
        >
          <Segmented
            value={ai.engine}
            onChange={(v) => setAi({ engine: v })}
            options={[
              { value: 'lite', label: '軽量版' },
              { value: 'full', label: 'フル版' },
            ]}
          />
        </Field>
        {ai.engine === 'full' && !fullEngineReady ? (
          <button className="btn btn--block" onClick={() => nav('/settings?engine=full')}>
            <Icon path={ICONS.download} size={15} />
            フル版をダウンロードする
          </button>
        ) : null}
      </section>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">ヒントと分析</h2>
        <Field label="ヒントの強さ" hint="評価と候補手だけが表示され、答えは出ません。">
          <Segmented
            value={String(ai.hintLevel) as '0' | '1' | '2' | '3'}
            onChange={(v) => setAi({ hintLevel: Number(v) as 0 | 1 | 2 | 3 })}
            options={[
              { value: '0', label: 'なし' },
              { value: '1', label: '評価のみ' },
              { value: '2', label: '候補手' },
              { value: '3', label: '次の一手' },
            ]}
          />
        </Field>
        <Switch
          label="指し手を評価して、悪手や疑問手を指摘する"
          checked={ai.blunderDetection}
          onChange={(v) => setAi({ blunderDetection: v })}
        />
        <Switch
          label="エンジンが考えている間は時計を止める"
          checked={ai.clockStopsOnEngine}
          onChange={(v) => setAi({ clockStopsOnEngine: v })}
        />
      </section>

      <div className="sticky-actions">
        <button className="btn btn--primary btn--lg btn--block" onClick={start}>
          {levelName(ai.level)}と対戦する
        </button>
      </div>
    </div>
  );
}

function CustomBox(): React.JSX.Element {
  const ai = useSettings((s) => s.ai);
  const setAi = useSettings((s) => s.setAi);
  const type = ai.custom.budgetType;
  const bounds =
    type === 'depth'
      ? { min: 1, max: 40, step: 1 }
      : type === 'time'
        ? { min: 100, max: 10_000, step: 100 }
        : { min: 10_000, max: 5_000_000, step: 10_000 };

  return (
    <div className="custom-box">
      <Field label="探索方法">
        <select
          className="select"
          value={type}
          onChange={(e) =>
            setAi({
              custom: { ...ai.custom, budgetType: e.target.value as 'depth' | 'time' | 'nodes' },
            })
          }
        >
          <option value="depth">深さ（手数）</option>
          <option value="time">時間（ミリ秒）</option>
          <option value="nodes">探索ノード数</option>
        </select>
      </Field>
      <Slider
        label="探索量"
        value={ai.custom.budgetValue}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        onChange={(v) => setAi({ custom: { ...ai.custom, budgetValue: v } })}
      />
      <Slider
        label="候補手の幅（MultiPV）"
        value={ai.custom.multiPv}
        min={1}
        max={8}
        onChange={(v) => setAi({ custom: { ...ai.custom, multiPv: v } })}
      />
      <Slider
        label="弱い手を出す確率"
        value={Math.round(ai.custom.blendChance * 100)}
        min={0}
        max={90}
        suffix="％"
        onChange={(v) => setAi({ custom: { ...ai.custom, blendChance: v / 100 } })}
      />
      <Slider
        label="弱い手とみなす幅"
        value={ai.custom.blendWindow}
        min={0}
        max={300}
        suffix="cp"
        onChange={(v) => setAi({ custom: { ...ai.custom, blendWindow: v } })}
      />
      <Slider
        label="指し手の多様性（ランダム度）"
        value={ai.custom.temperature}
        min={0}
        max={200}
        onChange={(v) => setAi({ custom: { ...ai.custom, temperature: v } })}
      />
    </div>
  );
}
