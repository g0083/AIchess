/**
 * Toast notifications. Provider + hook, so any screen can report an error or
 * a confirmation without threading callbacks through the tree.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'ok' | 'error';
}

interface ToastApi {
  show: (text: string, kind?: ToastItem['kind']) => void;
  error: (text: string) => void;
  ok: (text: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((text: string, kind: ToastItem['kind'] = 'info') => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-3), { id, text, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3600);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      error: (t) => show(t, 'error'),
      ok: (t) => show(t, 'ok'),
    }),
    [show],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`toast${i.kind === 'info' ? '' : ` toast--${i.kind}`}`}>
            {i.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Rendering outside the provider should never crash a screen.
    return { show: () => {}, error: () => {}, ok: () => {} };
  }
  return ctx;
}
