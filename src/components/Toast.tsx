import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Hook para emitir notificaciones desde cualquier componente. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

const KIND_META: Record<ToastKind, { label: string; bar: string; tone: string }> = {
  success: { label: 'Listo', bar: 'bg-green', tone: 'text-green' },
  error: { label: 'Error', bar: 'bg-ignite', tone: 'text-ignite' },
  info: { label: 'Info', bar: 'bg-cyan', tone: 'text-cyan' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, detail?: string) => {
      const id = ++seq.current;
      setItems((xs) => [...xs, { id, kind, title, detail }]);
      // auto-cierre: errores duran más para poder leerlos.
      window.setTimeout(() => remove(id), kind === 'error' ? 6000 : 4000);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    info: (t, d) => push('info', t, d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
        {items.map((t) => {
          const meta = KIND_META[t.kind];
          return (
            <div
              key={t.id}
              onClick={() => remove(t.id)}
              role="status"
              className="toast-in pointer-events-auto cursor-pointer flex gap-0 overflow-hidden rounded-lg border border-line bg-void-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
            >
              <span className={`w-1 shrink-0 ${meta.bar}`} />
              <div className="px-4 py-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[9px] tracking-[0.22em] uppercase ${meta.tone}`}
                  >
                    {meta.label}
                  </span>
                  <span className="font-display font-black italic uppercase tracking-tight text-sm text-ink truncate">
                    {t.title}
                  </span>
                </div>
                {t.detail && (
                  <div className="font-mono text-[11px] text-mute mt-1 leading-snug break-words">
                    {t.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
