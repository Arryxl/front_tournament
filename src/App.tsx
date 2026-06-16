import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { DashboardLayout, ProtectedRoute, PublicLayout } from './components/Layout';

import Landing from './pages/Landing';
import Bracket from './pages/Bracket';
import Stats from './pages/Stats';
import Register from './pages/Register';
import Login from './pages/Login';

import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerPredictions from './pages/player/PlayerPredictions';
import PlayerRewards from './pages/player/PlayerRewards';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import AdminGroups from './pages/admin/AdminGroups';
import AdminMatches from './pages/admin/AdminMatches';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRewards from './pages/admin/AdminRewards';

const playerLinks = [
  { to: '/player', label: 'Dashboard' },
  { to: '/player/predictions', label: 'Predicciones' },
  { to: '/player/rewards', label: 'Tienda' },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/registrations', label: 'Inscripciones' },
  { to: '/admin/groups', label: 'Grupos' },
  { to: '/admin/matches', label: 'Partidos' },
  { to: '/admin/rewards', label: 'Recompensas' },
  { to: '/admin/users', label: 'Usuarios' },
];

export default function App() {
  const { fetchMe } = useAuth();
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="/login" element={<Login />} />

        {/* Candidato */}
        <Route
          element={
            <ProtectedRoute roles={['candidate', 'admin', 'public']}>
              <DashboardLayout title="Jugador" links={playerLinks} />
            </ProtectedRoute>
          }
        >
          <Route path="/player" element={<PlayerDashboard />} />
          <Route path="/player/predictions" element={<PlayerPredictions />} />
          <Route path="/player/rewards" element={<PlayerRewards />} />
        </Route>

        {/* Admin */}
        <Route
          element={
            <ProtectedRoute roles={['admin']}>
              <DashboardLayout title="Admin" links={adminLinks} />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/groups" element={<AdminGroups />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          <Route path="/admin/rewards" element={<AdminRewards />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
