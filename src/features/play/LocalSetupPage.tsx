/**
 * Pass-and-play setup: one device, two players.
 */
import { useNavigate } from 'react-router-dom';
import { CLOCK_PRESETS } from '../../chess/clock';
import { useSettings, playerName, sanitizeName } from '../../store/settings';
import { Field, Icon, ICONS, Switch } from '../../components/ui';
import { useState } from 'react';

export function LocalSetupPage(): React.JSX.Element {
  const nav = useNavigate();
  const name = useSettings((s) => s.displayName);
  const clockPresetId = useSettings((s) => s.clockPresetId);
  const set = useSettings((s) => s.set);
  const confirmResign = useSettings((s) => s.confirmResign);
  const [whiteName, setWhiteName] = useState(playerName(name));
  const [blackName, setBlackName] = useState('黒');
  const [dualClock, setDualClock] = useState(true);

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">オフライン2人対戦</h1>
        <p className="page__lede">
          同じ端末で2人が交互に指します。通信は一切使わないので、機内モードでも遊べます。
        </p>
      </div>

      <section className="card card--pad">
        <h2 className="card__title">
          <Icon path={ICONS.people} size={18} />
          設定
        </h2>

        <Field label="白の呼称" hint="盤面と棋譜に表示されます。">
          <input
            className="input"
            value={whiteName}
            maxLength={24}
            onChange={(e) => setWhiteName(sanitizeName(e.target.value))}
          />
        </Field>
        <Field label="黒の呼称">
          <input
            className="input"
            value={blackName}
            maxLength={24}
            onChange={(e) => setBlackName(sanitizeName(e.target.value))}
          />
        </Field>
        <Field label="持ち時間">
          <select
            className="select"
            value={clockPresetId}
            onChange={(e) => set('clockPresetId', e.target.value)}
          >
            {CLOCK_PRESETS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Switch
          label="2人分の時計を使う"
          checked={dualClock}
          onChange={setDualClock}
        />
        <Switch
          label="投了の確認を出す"
          checked={confirmResign}
          onChange={(v) => set('confirmResign', v)}
        />
      </section>

      <div className="sticky-actions">
        <button
          className="btn btn--primary btn--lg btn--block"
          onClick={() =>
            nav('/play/local/game', {
              state: { whiteName: whiteName || '白', blackName: blackName || '黒', dualClock },
            })
          }
        >
          対局を始める
        </button>
      </div>
    </div>
  );
}
