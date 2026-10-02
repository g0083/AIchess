/**
 * Small shared UI pieces. Every label here is Japanese.
 * Icons are drawn as SVG paths - no emoji anywhere in the product.
 */
import { useEffect, useRef, type ReactNode } from 'react';

export function Icon({ path, size = 20 }: { path: string; size?: number }): React.JSX.Element {
  return (
    <svg
      className="nav-glyph"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path.split('|').map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export const ICONS = {
  home: 'M3 11.5 12 4l9 7.5|M5.5 10v9.5h13V10',
  play: 'M7 4.5 19 12 7 19.5z',
  learn: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z|M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0z|M7 6H4v1.5A3 3 0 0 0 6 10.4|M17 6h3v1.5A3 3 0 0 1 18 10.4|M9.5 20h5|M12 14v6',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z|M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-2.6-1.5L14 2.6h-4l-.4 2.4a7.7 7.7 0 0 0-2.6 1.5l-2.3-.9-2 3.4 1.9 1.5a7.6 7.6 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 2.6 1.5l.4 2.4h4l.4-2.4a7.7 7.7 0 0 0 2.6-1.5l2.3.9 2-3.4z',
  back: 'M15 5 8 12l7 7',
  flip: 'M4 8h13l-3-3|M20 16H7l3 3',
  share: 'M12 15V3|M8 7l4-4 4 4|M5 13v6.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V13',
  plus: 'M12 5v14|M5 12h14',
  close: 'M6 6l12 12|M18 6 6 18',
  copy: 'M9 9h10v11H9z|M5 15H4V4h11v1',
  check: 'M4 12.5 9.5 18 20 6',
  chevron: 'M9 5l7 7-7 7',
  download: 'M12 3v12|M8 11l4 4 4-4|M4 20h16',
  trash: 'M4 7h16|M9 7V4h6v3|M6 7l1 13h10l1-13',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 11v5|M12 7.6v.1',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4z|M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3.5 2',
  people:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M2.5 20a6.5 6.5 0 0 1 13 0|M16 4.3a3.5 3.5 0 0 1 0 6.9|M17.5 13.4A6.5 6.5 0 0 1 21.5 20',
  device: 'M4 3h9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z|M19 8h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-1|M7 18h3',
  cloud: 'M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 8.5 4.75 4.75 0 0 1 17.5 18z',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3|M20 8V5a1 1 0 0 0-1-1h-3|M4 16v3a1 1 0 0 0 1 1h3|M20 16v3a1 1 0 0 1-1 1h-3|M4 12h16',
  refresh: 'M20 11a8 8 0 1 0-1.5 5.5|M20 5v6h-6',
  puzzle:
    'M9 4h2a2 2 0 1 1 4 0h2v3h3v2a2 2 0 1 0 0 4v3h-3v2H9v-2H6v-3H3v-4H6V7h3z',
};

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}): React.JSX.Element {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <div className="field__hint">{hint}</div> : null}
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" />
      <span>{label}</span>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}): React.JSX.Element {
  const id = `slider-${label}`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        <span className="num" style={{ float: 'right' }}>
          {value}
          {suffix ?? ''}
        </span>
      </label>
      <input
        id={id}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}): React.JSX.Element {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          className="segmented__item"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        style={wide ? { width: 'min(880px, 100%)' } : undefined}
      >
        <div className="dialog__head">
          <h2 className="dialog__title">{title}</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="閉じる">
            <Icon path={ICONS.close} size={18} />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer ? <div className="dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

