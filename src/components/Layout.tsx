import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { CoinBalance, Grats } from './ui';
import { Atmosphere } from './Atmosphere';
import { BrandLogo, Wordmark } from './brand';
import { SocialRow } from './Socials';
import { NavMenu, NAV_LINKS } from './NavMenu';
import NotificationBell from './NotificationBell';
import { useSettings } from '../lib/useSettings';
import type { Role } from '../types';

export function PublicLayout() {
  const { user, logout } = useAuth();
  const s = useSettings();
  return (
    <div className="min-h-screen flex flex-col relative">
      <Atmosphere />
      <header className="sticky top-0 z-50 border-b border-line-2 bg-void/70 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-3.5 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Inicio">
            <BrandLogo size={36} />
            <span className="font-display font-black italic uppercase tracking-tight text-lg text-ink leading-none">
              GRAV<span className="text-ignite">I</span>TY
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `font-mono text-[11px] tracking-[0.2em] uppercase transition-colors ${
                    isActive ? 'text-ignite' : 'text-mute hover:text-ink'
                  }`
                }
                end={l.to === '/'}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          {/* Sesión — solo escritorio; en móvil/tablet vive dentro del overlay */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {user ? (
              <>
                <span className="hidden sm:inline-flex">
                  <Grats amount={user.coins} size={16} />
                </span>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ink"
                  >
                    Panel
                  </Link>
                )}
                <Link
                  to="/me"
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink hover:text-ignite"
                >
                  Mi perfil
                </Link>
                <button
                  onClick={logout}
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ink"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="btn btn-ignite !py-2 !px-4"
              >
                Entrar
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && <NotificationBell />}
            <NavMenu />
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <footer className="border-t border-line mt-10">
        <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div>
            <Wordmark className="text-5xl" />
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mt-4">
              Rocket League {s.formatLabel} · {s.seasonLabel} · GRV-03
            </p>
          </div>
          <div className="flex flex-col gap-4 md:items-end">
            <SocialRow />
            <Link
              to="/privacidad"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-mute hover:text-ignite transition-colors"
            >
              Política de privacidad
            </Link>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-mute">
              © {new Date().getFullYear()} Gravity League
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Layout con sidebar — exclusivo del panel de administración. */
export function DashboardLayout({
  title,
  links,
  children,
}: {
  title: string;
  links: { to: string; label: string }[];
  children?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Cerrar el cajón al navegar a otra sección.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Bloquear scroll de fondo y cerrar con Escape mientras el cajón está abierto.
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
    <div className="min-h-screen lg:flex">
      {/* ===== Barra superior — solo móvil/tablet ===== */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-b border-line-2 bg-void/85 backdrop-blur-md">
        <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size={28} />
          <span className="font-display font-black italic uppercase tracking-tight text-base leading-none truncate">
            GRAV<span className="text-ignite">I</span>TY
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border-l border-line pl-2.5 ml-1 truncate">
            {title}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú del panel"
          aria-expanded={open}
          className="nav-trig shrink-0"
        >
          <svg width="26" height="22" viewBox="0 0 26 22" fill="none" aria-hidden="true">
            <path
              d="M18.5 7 A7.5 7.5 0 1 0 20 13 H13.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="5.5" cy="16.5" r="2.6" fill="var(--ignite)" />
          </svg>
          <span className="nav-trig-label">Menú</span>
        </button>
      </header>

      {/* ===== Backdrop del cajón (móvil) ===== */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-void/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ===== Sidebar / cajón ===== */}
      <aside
        className={`fixed lg:sticky top-0 z-50 h-screen w-[270px] lg:w-60 shrink-0 border-r border-line-2 p-6 flex flex-col gap-6 bg-void lg:bg-transparent overflow-y-auto transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        role="dialog"
        aria-label="Navegación del panel"
      >
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size={30} />
            <span className="font-display font-black italic uppercase tracking-tight text-base leading-none truncate">
              GRAV<span className="text-ignite">I</span>TY
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="lg:hidden text-mute hover:text-ignite text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ignite transition-colors group -mt-2"
        >
          <span className="text-base leading-none transition-transform group-hover:-translate-x-1">←</span>
          Volver al sitio
        </Link>
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ignite">{title}</div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => {
            const active = location.pathname === l.to || location.pathname.startsWith(l.to + '/');
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`font-mono text-xs tracking-[0.1em] px-3 py-2 rounded-md transition-colors ${
                  active ? 'bg-ignite/10 text-ignite' : 'text-mute hover:text-ink hover:bg-void-2'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 pt-4">
          {user && <CoinBalance coins={user.coins} />}
          <div className="font-mono text-[10px] text-mute truncate">{user?.username}</div>
          <button onClick={logout} className="btn text-left">
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-auto">{children || <Outlet />}</main>
    </div>
  );
}

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-mute tracking-[0.2em]">
        CARGANDO…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
