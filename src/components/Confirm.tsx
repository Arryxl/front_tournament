import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Resalta la acción como destructiva (botón en brasa). */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hook: `if (await confirm({ title, body, danger })) { … }`. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            className="toast-in w-full max-w-md rounded-xl border border-line bg-void-2 overflow-hidden shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className={`h-1 w-full ${opts.danger ? 'bg-ignite' : 'bg-line'}`} />
            <div className="p-6">
              <h3 className="font-display font-black italic uppercase tracking-tight text-2xl leading-none">
                {opts.title}
              </h3>
              {opts.body && (
                <p className="font-mono text-[12px] text-mute mt-3 leading-relaxed whitespace-pre-line">
                  {opts.body}
                </p>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button className="btn" onClick={() => close(false)}>
                  {opts.cancelLabel || 'Cancelar'}
                </button>
                <button
                  className="btn btn-ignite"
                  onClick={() => close(true)}
                  autoFocus
                >
                  {opts.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
