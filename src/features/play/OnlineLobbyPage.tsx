/**
 * P2P lobby: create a room and show its QR, or scan / type a code to join.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, Field, Icon, ICONS } from '../../components/ui';
import { QrInvite } from '../../p2p/QrCode';
import { QrScanner } from '../../p2p/QrScanner';
import { makeRoomCode, formatRoomCode } from '../../p2p/roomCodes';
import { getPublicOrigin, parseRoomInput } from '../../config/site';
import { useSettings, playerName } from '../../store/settings';
import { CLOCK_PRESETS } from '../../chess/clock';
import { useToast } from '../../components/Toast';

export function OnlineLobbyPage(): React.JSX.Element {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const name = useSettings((s) => s.displayName);
  const clockPresetId = useSettings((s) => s.clockPresetId);
  const set = useSettings((s) => s.set);

  const [room, setRoom] = useState(() => makeRoomCode());
  const [scanning, setScanning] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  // A join link carries ?room=CODE. Honour it on arrival, and again when the
  // app is brought back to the foreground from a background tab.
  useEffect(() => {
    const check = () => {
      const raw = params.get('room') ?? new URLSearchParams(window.location.search).get('room');
      if (!raw) return;
      const code = parseRoomInput(raw);
      if (code) setPending(code);
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [params]);
const origin = getPublicOrigin();

  const host = () =>
    nav('/play/online/host', { state: { room, whiteName: playerName(name), clockPresetId } });

  const join = (code: string) =>
    nav('/play/online/join', { state: { room: code, blackName: playerName(name), clockPresetId } });

  const submitInput = () => {
    const code = parseRoomInput(input);
    if (!code) {
      toast.error('コードまたはURLを読み取れませんでした。');
      return;
    }
    join(code);
  };

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">P2P対戦</h1>
        <p className="page__lede">
          サーバを経由せず、端末どうしで直接つなぎます。QRを読み取るだけで参加できます。
        </p>
      </div>

      <section className="card card--pad" style={{ marginBottom: 'var(--sp-4)' }}>
        <h2 className="card__title">
          <Icon path={ICONS.scan} size={18} />
          参加する
        </h2>
        <p className="dim" style={{ marginBottom: 'var(--sp-3)' }}>
          相手の画面にあるQRを、このアプリのスキャナか、通常のQRコードリーダーで読み取ってください。
        </p>
        <div className="board-tools board-tools--wrap">
          <button className="btn btn--primary" onClick={() => setScanning(true)}>
            <Icon path={ICONS.camera} size={16} />
            QRを読み取る
          </button>
        </div>
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Field
            label="またはコードを手入力"
            hint="ROOM-XXXX-XXXX 形式でも、URLをそのまま貼っても構いません。"
          >
            <div className="row-inline">
              <input
                className="input input--mono"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ROOM-XXXX-XXXX"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitInput();
                }}
              />
              <button className="btn" disabled={!input.trim()} onClick={submitInput}>
                参加
              </button>
            </div>
          </Field>
        </div>
      </section>

      <section className="card card--pad">
        <h2 className="card__title">
          <Icon path={ICONS.share} size={18} />
          部屋をつくる
        </h2>
        <Field label="あなたの表示名" hint="相手の画面にもこの名前が表示されます。">
          <input
            className="input"
            value={playerName(name)}
            maxLength={24}
            onChange={(e) => set('displayName', e.target.value.slice(0, 24))}
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

        <QrInvite code={room} />

        <div className="board-tools board-tools--wrap" style={{ marginTop: 'var(--sp-3)' }}>
          <button className="btn" onClick={() => setRoom(makeRoomCode())}>
            <Icon path={ICONS.refresh} size={15} />
            コードを作り直す
          </button>
          <button className="btn btn--primary" onClick={host}>
            この部屋で待つ
          </button>
        </div>
        <p className="field__hint" style={{ marginTop: 8 }}>
          現在の公開リンク: <span className="mono">{origin}</span>
        </p>
      </section>

      <Dialog open={scanning} title="QRを読み取る" onClose={() => setScanning(false)}>
        <QrScanner
          onCancel={() => setScanning(false)}
          onResult={(text) => {
            setScanning(false);
            const code = parseRoomInput(text);
            if (code) join(code);
            else toast.error('対戦用のQRコードではありませんでした。');
          }}
        />
      </Dialog>

      <Dialog
        open={!!pending && !scanning}
        title="対戦室が見つかりました"
        onClose={() => setPending(null)}
        footer={
          <>
            <button className="btn" onClick={() => setPending(null)}>
              やめる
            </button>
            <button className="btn btn--primary" onClick={() => join(pending!)}>
              この部屋に参加する
            </button>
          </>
        }
      >
        <p>
          ルームコード <span className="num">{formatRoomCode(pending ?? '')}</span> に参加します。
        </p>
      </Dialog>
    </div>
  );
}