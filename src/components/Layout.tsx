import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { CoinBalance } from './ui';
import { Atmosphere } from './Atmosphere';
import { GravityMark, Wordmark } from './brand';
import { SocialRow } from './Socials';
import { NavMenu, NAV_LINKS } from './NavMenu';
import type { Role } from '../types';

export function PublicLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col relative">
      <Atmosphere />
      <header className="sticky top-0 z-50 mix-blend-difference">
        <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-5 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <GravityMark size={26} />
            <span className="font-mono tracking-[0.32em] text-xs font-bold text-white">GRAVITY</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `font-mono text-[11px] tracking-[0.2em] uppercase transition-opacity ${
                    isActive ? 'text-white opacity-100' : 'text-white opacity-60 hover:opacity-100'
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
                <span className="hidden sm:inline font-mono text-[11px] tracking-[0.2em] text-white">
                  {user.coins} GRV
                </span>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="font-mono text-[11px] tracking-[0.2em] uppercase text-white opacity-70 hover:opacity-100"
                  >
                    Panel
                  </Link>
                )}
                <Link
                  to="/me"
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-white hover:opacity-70"
                >
                  Mi perfil
                </Link>
                <button
                  onClick={logout}
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-white opacity-60 hover:opacity-100"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="font-mono text-[11px] tracking-[0.2em] uppercase text-white hover:opacity-70"
              >
                Entrar
              </Link>
            )}
          </div>
          <NavMenu />
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
              Rocket League 3v3 · Temporada 01 · GRV-02
            </p>
          </div>
          <div className="flex flex-col gap-4 md:items-end">
            <SocialRow />
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
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-line-2 p-6 flex flex-col gap-6 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2">
          <GravityMark size={20} />
          <span className="font-mono tracking-[0.3em] text-sm font-bold">GRAVITY</span>
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
        <div className="mt-auto flex flex-col gap-3">
          {user && <CoinBalance coins={user.coins} />}
          <div className="font-mono text-[10px] text-mute truncate">{user?.username}</div>
          <button onClick={logout} className="btn text-left">
            Salir
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children || <Outlet />}</main>
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
