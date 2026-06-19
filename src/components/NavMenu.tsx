import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { Wordmark } from './brand';
import { SocialRow } from './Socials';
import { Grats } from './ui';

/** Enlaces públicos — fuente única para el nav de escritorio y el overlay. */
export const NAV_LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/bracket', label: 'Llave' },
  { to: '/resultados', label: 'Resultados' },
  { to: '/stats', label: 'Estadísticas' },
  { to: '/predictions', label: 'Predicciones' },
  { to: '/rewards', label: 'Tienda' },
  { to: '/reclutamiento', label: 'Reclutamiento' },
  { to: '/register', label: 'Inscripción' },
];

/**
 * Navegación móvil/tablet de Gravity. En lugar de una hamburguesa, el
 * disparador es el "nodo de gravedad" de la marca (bracket → punto lima) y
 * abre un overlay a pantalla completa con las secciones como filas de un
 * marcador de transmisión, que entran en cascada.
 */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Cerrar al navegar a otra ruta.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Bloquear scroll del fondo y cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Disparador — solo móvil/tablet (en escritorio está el nav inline) */}
      <button
        type="button"
        className="nav-trig lg:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="26" height="22" viewBox="0 0 26 22" fill="none" aria-hidden="true">
          <path
            d="M18.5 7 A7.5 7.5 0 1 0 20 13 H13.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="node" cx="5.5" cy="16.5" r="2.6" fill="var(--ignite)" />
        </svg>
        <span className="nav-trig-label">Menú</span>
      </button>

      {/* Overlay scoreboard — vía portal a <body> para no heredar el
          mix-blend-difference del header (invertiría los colores). */}
      {createPortal(
        <div
          className={`nav-overlay ${open ? 'open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
        >
        <div className="nav-top">
          <Link to="/" onClick={() => setOpen(false)} aria-label="Inicio">
            <Wordmark className="text-3xl" />
          </Link>
          <button
            type="button"
            className="nav-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            Cerrar <span className="x">✕</span>
          </button>
        </div>

        <nav className="nav-list">
          {NAV_LINKS.map((l, i) => {
            const active =
              l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to);
            return (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`nav-item ${active ? 'active' : ''}`}
                style={{ '--d': `${0.12 + i * 0.05}s` } as CSSProperties}
              >
                <span className="nav-idx">{String(i).padStart(2, '0')}</span>
                <span className="nav-label">{l.label}</span>
                <span className="nav-arrow">→</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="nav-foot">
          <div className="nav-foot-links">
            {user ? (
              <>
                <Grats amount={user.coins} size={16} tone="ignite" />
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ink"
                  >
                    Panel
                  </Link>
                )}
                <Link
                  to="/me"
                  onClick={() => setOpen(false)}
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink"
                >
                  Mi perfil
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ink"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink"
              >
                Entrar
              </Link>
            )}
          </div>
          <SocialRow />
        </div>
        </div>,
        document.body,
      )}
    </>
  );
}
