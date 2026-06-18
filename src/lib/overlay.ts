// Utilidades compartidas por los overlays de OBS (versus / stats / predicciones).
import { useEffect, useState } from 'react';
import { api, fileBase } from './api';

export const fileUrl = (u?: string | null) =>
  u ? (u.startsWith('http') ? u : `${fileBase}${u}`) : '';

export const RANK_LABEL: Record<string, string> = {
  plat3: 'Platino 3', plat4: 'Platino 4', dia1: 'Diamante 1', dia2: 'Diamante 2',
  dia3: 'Diamante 3', champ1: 'Champion 1', champ2: 'Champion 2', champ3: 'Champion 3',
};
export const rankLabel = (r?: string | null) => (r ? RANK_LABEL[r] || r : '—');

export const PHASE_LABEL: Record<string, string> = {
  groups: 'Fase de grupos',
  round16: 'Octavos de final',
  quarters: 'Cuartos de final',
  semis: 'Semifinal',
  third: 'Tercer puesto',
  final: 'Gran final',
};
export const FORMAT_LABEL: Record<string, string> = { bo3: 'BO3', bo5: 'BO5', bo7: 'BO7' };

/** Pone el fondo transparente mientras el overlay está montado (para componer en OBS). */
export function useTransparentBody() {
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.background;
    const prevBody = document.body.style.background;
    html.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.classList.add('overlay-mode');
    return () => {
      html.style.background = prevHtml;
      document.body.style.background = prevBody;
      document.body.classList.remove('overlay-mode');
    };
  }, []);
}

export interface OverlayMatch {
  id: string;
  matchCode: string;
  phase: string;
  status: string;
  format: string;
  scheduledAt: string | null;
  predictionsOpen: boolean;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  teamHomeId: string | null;
  teamAwayId: string | null;
  teamHome: { id: string; name: string; shieldUrl: string | null } | null;
  teamAway: { id: string; name: string; shieldUrl: string | null } | null;
  group?: { name: string } | null;
  playerStats?: PlayerStatRow[];
}

export interface PlayerStatRow {
  id: string;
  teamId: string;
  goals: number;
  assists: number;
  saves: number;
  score: number;
  shots: number;
  demos: number;
  mvp: boolean;
  user?: { username: string } | null;
}

/** Sondea /matches/:id cada `ms` ms. El overlay refleja lo que el admin va cargando. */
export function useMatchPoll(id?: string, ms = 2500) {
  const [match, setMatch] = useState<OverlayMatch | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const tick = () =>
      api
        .get(`/matches/${id}`)
        .then((r) => alive && (setMatch(r.data), setError(false)))
        .catch(() => alive && setError(true));
    tick();
    const t = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, ms]);

  return { match, error };
}

export const initials = (n: string) =>
  n.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 2).toUpperCase() || '??';
