import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { useSettings } from './lib/useSettings';
import { DashboardLayout, ProtectedRoute, PublicLayout } from './components/Layout';

import Landing from './pages/Landing';
import Bracket from './pages/Bracket';
import Stats from './pages/Stats';
import MatchSummary from './pages/MatchSummary';
import Predictions from './pages/Predictions';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Recruitment from './pages/Recruitment';
import MyTeam from './pages/MyTeam';
import Login from './pages/Login';
import DrawStage from './pages/DrawStage';
import OverlayVersus from './pages/overlay/OverlayVersus';
import OverlayScoreboard from './pages/overlay/OverlayScoreboard';
import OverlayStats from './pages/overlay/OverlayStats';
import OverlayPredictions from './pages/overlay/OverlayPredictions';
import OverlayRegistration from './pages/overlay/OverlayRegistration';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPresetTeams from './pages/admin/AdminPresetTeams';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import AdminRecruitment from './pages/admin/AdminRecruitment';
import AdminTeams from './pages/admin/AdminTeams';
import AdminTeamDetail from './pages/admin/AdminTeamDetail';
import AdminGroups from './pages/admin/AdminGroups';
import AdminMatches from './pages/admin/AdminMatches';
import AdminMatchResult from './pages/admin/AdminMatchResult';
import AdminStats from './pages/admin/AdminStats';
import AdminReplays from './pages/admin/AdminReplays';
import AdminPredictions from './pages/admin/AdminPredictions';
import AdminCoins from './pages/admin/AdminCoins';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRewards from './pages/admin/AdminRewards';
import AdminOverlays from './pages/admin/AdminOverlays';

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/settings', label: 'Configuración' },
  { to: '/admin/preset-teams', label: 'Equipos predefinidos' },
  { to: '/admin/registrations', label: 'Inscripciones' },
  { to: '/admin/recruitment', label: 'Reclutamiento' },
  { to: '/admin/teams', label: 'Equipos' },
  { to: '/admin/groups', label: 'Grupos' },
  { to: '/admin/matches', label: 'Partidos' },
  { to: '/admin/stats', label: 'Estadísticas' },
  { to: '/admin/replays', label: 'Replays' },
  { to: '/admin/predictions', label: 'Predicciones' },
  { to: '/admin/rewards', label: 'Recompensas' },
  { to: '/admin/coins', label: 'Grats' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/overlays', label: 'Overlays' },
];

// Cualquier usuario autenticado (fan, jugador o admin).
const ANY = ['public', 'candidate', 'admin'] as const;

export default function App() {
  const { fetchMe, handleSessionExpired } = useAuth();
  const { tournamentName } = useSettings();
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);
  // Cuando el refresh token también falla, el interceptor avisa por evento.
  useEffect(() => {
    window.addEventListener('gravity:session-expired', handleSessionExpired);
    return () =>
      window.removeEventListener('gravity:session-expired', handleSessionExpired);
  }, [handleSessionExpired]);
  // El nombre del torneo (configurable) alimenta el título de la pestaña.
  useEffect(() => {
    document.title = `${tournamentName} · Rocket League`;
  }, [tournamentName]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ===== Sitio público (nav superior) ===== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="/resultados" element={<MatchSummary />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reclutamiento" element={<Recruitment />} />

          {/* Panel del capitán: gestionar solicitudes de su equipo */}
          <Route
            path="/mi-equipo"
            element={
              <ProtectedRoute roles={['candidate', 'admin']}>
                <MyTeam />
              </ProtectedRoute>
            }
          />

          {/* Predicciones: visibles para todos; predecir exige sesión */}
          <Route path="/predictions" element={<Predictions />} />
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

        {/* Overlay informativo (no depende de partidos): promo de inscripción */}
        <Route path="/overlay/registration" element={<OverlayRegistration />} />

        {/* Overlays de partido para OBS (Browser Source, fondo transparente) */}
        <Route path="/overlay/match/:id/versus" element={<OverlayVersus />} />
        <Route path="/overlay/match/:id/scoreboard" element={<OverlayScoreboard />} />
        <Route path="/overlay/match/:id/stats" element={<OverlayStats />} />
        <Route path="/overlay/match/:id/predictions" element={<OverlayPredictions />} />

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
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/preset-teams" element={<AdminPresetTeams />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/recruitment" element={<AdminRecruitment />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/teams/:id" element={<AdminTeamDetail />} />
          <Route path="/admin/groups" element={<AdminGroups />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          <Route path="/admin/matches/:id" element={<AdminMatchResult />} />
          <Route path="/admin/stats" element={<AdminStats />} />
          <Route path="/admin/replays" element={<AdminReplays />} />
          <Route path="/admin/predictions" element={<AdminPredictions />} />
          <Route path="/admin/rewards" element={<AdminRewards />} />
          <Route path="/admin/coins" element={<AdminCoins />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/overlays" element={<AdminOverlays />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
