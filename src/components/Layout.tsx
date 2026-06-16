import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { CoinBalance } from './ui';
import type { Role } from '../types';

const APP = import.meta.env.VITE_APP_NAME || 'Gravity';

export function PublicLayout() {
  const { user, logout } = useAuth();
  const links = [
    { to: '/', label: 'Inicio' },
    { to: '/bracket', label: 'Llave' },
    { to: '/stats', label: 'Stats' },
    { to: '/register', label: 'Inscripción' },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-void/90 backdrop-blur border-b border-line-2">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-mono tracking-[0.35em] text-sm font-bold">
            {APP.toUpperCase()}
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            {links.map((l) => (
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
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <CoinBalance coins={user.coins} />
                <Link
                  to={user.role === 'admin' ? '/admin' : '/player'}
                  className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink hover:text-ignite"
                >
                  Panel
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
                className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink hover:text-ignite"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line-2 py-8 text-center font-mono text-[10px] tracking-[0.3em] uppercase text-mute">
        {APP} · Rocket League 3v3 · Temporada 01
      </footer>
    </div>
  );
}

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
        <Link to="/" className="font-mono tracking-[0.3em] text-sm font-bold">
          {APP.toUpperCase()}
        </Link>
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ignite">{title}</div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => {
            const active =
              location.pathname === l.to || location.pathname.startsWith(l.to + '/');
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
