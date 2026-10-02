/**
 * QR code generation for room invites.
 *
 * The QR encodes the full join URL, not just the room code, so scanning it with
 * a stock phone camera app opens the app straight into the room. The raw room
 * code is always shown next to it as a fallback for typing by hand.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatRoomCode } from './roomCodes';
import { joinUrl } from '../config/site';
import { Icon, ICONS } from '../components/ui';
import { useToast } from '../components/Toast';

export function QrInvite({ code }: { code: string }): React.JSX.Element {
  const toast = useToast();
  const [svg, setSvg] = useState('');
  const url = joinUrl(code);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: { dark: '#1f1b16', light: '#fbf7f0' },
    })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => {
        if (!cancelled) setSvg('');
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '将棋盤チェス', text: 'このQRから対戦に参加してください', url });
        return;
      }
      throw new Error('share unavailable');
    } catch (e) {
      if ((e as Error).message === 'share unavailable') {
        try {
          await navigator.clipboard.writeText(url);
          toast.ok('リンクをコピーしました');
        } catch {
          toast.error('リンクをコピーできませんでした');
        }
      }
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(formatRoomCode(code));
      toast.ok('ルームコードをコピーしました');
    } catch {
      toast.error('コピーできませんでした');
    }
  };

  return (
    <div className="qr-panel">
      <div className="qr-panel__frame">
        {svg ? (
          // eslint-disable-next-line react/no-danger
          <div className="qr-panel__svg" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="qr-panel__placeholder">QRを生成しています</div>
        )}
      </div>

      <p className="qr-panel__hint">
        通常のQRコードリーダーで読み取ると、そのまま対戦に参加できます。
      </p>

      <div className="qr-panel__code" aria-label="ルームコード">
        <span className="num">{formatRoomCode(code)}</span>
      </div>

      <div className="qr-panel__url mono dim">{url}</div>

      <div className="board-tools board-tools--wrap">
        <button className="btn btn--sm" onClick={share}>
          <Icon path={ICONS.share} size={15} />
          共有
        </button>
        <button className="btn btn--sm" onClick={copyCode}>
          <Icon path={ICONS.copy} size={15} />
          コードをコピー
        </button>
        <a className="btn btn--sm" href={url} target="_blank" rel="noreferrer">
          <Icon path={ICONS.chevron} size={15} />
          参加リンクを開く
        </a>
      </div>
    </div>
  );
}