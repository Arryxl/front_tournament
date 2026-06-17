import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { DashboardLayout, ProtectedRoute, PublicLayout } from './components/Layout';

import Landing from './pages/Landing';
import Bracket from './pages/Bracket';
import Stats from './pages/Stats';
import Predictions from './pages/Predictions';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Login from './pages/Login';
import DrawStage from './pages/DrawStage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import AdminTeams from './pages/admin/AdminTeams';
import AdminGroups from './pages/admin/AdminGroups';
import AdminMatches from './pages/admin/AdminMatches';
import AdminStats from './pages/admin/AdminStats';
import AdminPredictions from './pages/admin/AdminPredictions';
import AdminCoins from './pages/admin/AdminCoins';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRewards from './pages/admin/AdminRewards';

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/registrations', label: 'Inscripciones' },
  { to: '/admin/teams', label: 'Equipos' },
  { to: '/admin/groups', label: 'Grupos' },
  { to: '/admin/matches', label: 'Partidos' },
  { to: '/admin/stats', label: 'Estadísticas' },
  { to: '/admin/predictions', label: 'Predicciones' },
  { to: '/admin/rewards', label: 'Recompensas' },
  { to: '/admin/coins', label: 'Monedas' },
  { to: '/admin/users', label: 'Usuarios' },
];

// Cualquier usuario autenticado (fan, jugador o admin).
const ANY = ['public', 'candidate', 'admin'] as const;

export default function App() {
  const { fetchMe } = useAuth();
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ===== Sitio público (nav superior) ===== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/register" element={<Register />} />

          {/* Interactivo — requiere sesión pero vive en la web pública */}
          <Route
            path="/predictions"
            element={
              <ProtectedRoute roles={[...ANY]}>
                <Predictions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute roles={[...ANY]}>
                <Rewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me"
            element={
              <ProtectedRoute roles={[...ANY]}>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/login" element={<Login />} />

        {/* Escenario del sorteo en vivo — ventana de stream / OBS (sin layout) */}
        <Route path="/draw/stage" element={<DrawStage />} />

        {/* Redirecciones de las rutas antiguas del panel de jugador */}
        <Route path="/player" element={<Navigate to="/me" replace />} />
        <Route path="/player/team" element={<Navigate to="/me" replace />} />
        <Route path="/player/stats" element={<Navigate to="/me" replace />} />
        <Route path="/player/predictions" element={<Navigate to="/predictions" replace />} />
        <Route path="/player/rewards" element={<Navigate to="/rewards" replace />} />

        {/* ===== Panel de administración (sidebar, solo admin) ===== */}
        <Route
          element={
            <ProtectedRoute roles={['admin']}>
              <DashboardLayout title="Admin" links={adminLinks} />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/groups" element={<AdminGroups />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          <Route path="/admin/stats" element={<AdminStats />} />
          <Route path="/admin/predictions" element={<AdminPredictions />} />
          <Route path="/admin/rewards" element={<AdminRewards />} />
          <Route path="/admin/coins" element={<AdminCoins />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
