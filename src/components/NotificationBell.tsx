import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import type { AppNotification } from '../types';

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

/** Campana de notificaciones in-app con badge de no leídas y dropdown. */
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = () => {
    api
      .get('/notifications/unread-count')
      .then((r) => setCount(r.data?.count ?? 0))
      .catch(() => {});
  };

  // Polling del contador mientras hay sesión.
  useEffect(() => {
    if (!user) {
      setCount(0);
      setItems([]);
      return;
    }
    loadCount();
    const id = setInterval(loadCount, 30000);
    return () => clearInterval(id);
  }, [user]);

  // Cerrar al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      api.get('/notifications').then((r) => setItems(r.data)).catch(() => setItems([]));
    }
  };

  const openItem = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      try {
        await api.post(`/notifications/${n.id}/read`);
        setCount((c) => Math.max(0, c - 1));
      } catch {
        /* noop */
      }
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* noop */
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative text-mute hover:text-ink transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.5l-1.5 3h15L18 12.5V9a6 6 0 0 0-6-6Z M9.5 19a2.5 2.5 0 0 0 5 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-ignite text-void font-mono text-[9px] font-bold grid place-items-center tabular-nums">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-h-[400px] overflow-y-auto card p-0 z-[120] shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line-2 sticky top-0 bg-void-2">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">Notificaciones</span>
            <button type="button" onClick={markAll} className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute hover:text-ignite">
              Marcar todas
            </button>
          </div>
          {items.length === 0 ? (
            <div className="p-4 font-mono text-xs text-mute">Sin notificaciones.</div>
          ) : (
            <div className="divide-y divide-line-2">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-void-3/40 transition-colors ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-ignite mt-1.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-display text-sm leading-tight">{n.title}</div>
                      {n.body && <div className="font-mono text-[10px] text-mute mt-0.5">{n.body}</div>}
                      <div className="font-mono text-[9px] text-mute mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
