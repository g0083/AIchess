/**
 * In-app QR scanner, for players who installed the PWA.
 *
 * Decoding uses the native BarcodeDetector when the browser has it and falls
 * back to jsQR everywhere else, because BarcodeDetector is still limited
 * availability (notably absent in Firefox and Safari). getUserMedia requires a
 * secure context, so manual entry is always offered as well.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Icon, ICONS } from '../components/ui';

/** Frame budget: decoding every animation frame is wasteful on phones. */
const DECODE_HZ = 10;

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

export function QrScanner({
  onResult,
  onCancel,
}: {
  onResult: (text: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const lastDecodeRef = useRef(0);
  const doneRef = useRef(false);

  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (mode: 'environment' | 'user') => {
      setError('');
      if (!window.isSecureContext) {
        setError('カメラを使うには HTTPS が必要です。下から手動で入力してください。');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('このブラウザはカメラに対応していません。下から手動で入力してください。');
        return;
      }

      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        v.muted = true;
        await v.play();
// Prefer the native detector when it exists; it is considerably faster.
        const Ctor = (
          window as unknown as {
            BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike;
          }
        ).BarcodeDetector;
        if (Ctor) {
          try {
            detectorRef.current = new Ctor({ formats: ['qr_code'] });
          } catch {
            detectorRef.current = null;
          }
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true }) ?? null;

        const loop = async () => {
          if (doneRef.current) return;
          rafRef.current = requestAnimationFrame(() => void loop());
          const now = performance.now();
          if (now - lastDecodeRef.current < 1000 / DECODE_HZ) return;
          lastDecodeRef.current = now;

          const el = videoRef.current;
          if (!el || el.readyState < 2 || !canvas || !ctx) return;
          const w = el.videoWidth;
          const h = el.videoHeight;
          if (!w || !h) return;

          let text: string | null = null;
          const det = detectorRef.current;
          if (det) {
            try {
              const found = await det.detect(el);
              if (found.length > 0) text = found[0].rawValue;
            } catch {
              /* fall through to jsQR for this frame */
            }
          }
          if (text === null) {
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(el, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            text = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
          }
          if (text) {
            doneRef.current = true;
            stop();
            onResult(text);
          }
        };
        rafRef.current = requestAnimationFrame(() => void loop());
      } catch (e) {
        const name = (e as DOMException)?.name;
        if (name === 'NotAllowedError') {
          setError('カメラへのアクセスが許可されていません。権限を許可してから再試行してください。');
        } else if (name === 'NotFoundError') {
          setError('カメラが見つかりません。下から手動で入力してください。');
        } else {
          setError(`カメラを開始できませんでした：${(e as Error).message}`);
        }
      }
    },
    [onResult, stop],
  );

  useEffect(() => {
    void start(facing);
    return stop;
  }, [start, stop, facing]);

  const submitManual = () => {
    if (!manual.trim()) return;
    doneRef.current = true;
    stop();
    onResult(manual.trim());
  };

  return (
    <div className="scanner">
      <div className="scanner__stage">
        <video ref={videoRef} className="scanner__video" playsInline muted />
        <canvas ref={canvasRef} className="sr-only" />
        <div className="scanner__frame" aria-hidden="true" />
      </div>

      {error ? <p className="scanner__error">{error}</p> : null}

      <div className="board-tools board-tools--wrap">
        <button
          className="btn btn--sm"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
        >
          <Icon path={ICONS.refresh} size={15} />
          カメラ切替
        </button>
        <button className="btn btn--sm" onClick={() => void start(facing)}>
          <Icon path={ICONS.scan} size={15} />
          再試行
        </button>
        <button className="btn btn--sm" onClick={onCancel}>
          やめる
        </button>
      </div>

      <div className="scanner__manual">
        <label className="field__label" htmlFor="qr-manual">
          手動で入力
        </label>
        <div className="row-inline">
          <input
            id="qr-manual"
            className="input input--mono"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ROOM-XXXX-XXXX またはURL"
          />
          <button className="btn" disabled={!manual.trim()} onClick={submitManual}>
            参加
          </button>
        </div>
        <p className="field__hint">
          カメラが利用できないときは、ここにコードまたはURLを直接入力してください。
        </p>
      </div>
    </div>
  );
}