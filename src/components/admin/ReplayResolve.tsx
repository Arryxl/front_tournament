import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../Toast';
import type { Replay, Team } from '../../types';

interface RosterOption {
  value: string; // `${userId}|${teamId}`
  label: string;
}

const playerKey = (platform: string, platformId: string) =>
  `${platform}|${platformId}`;

/**
 * Corrección manual de un replay en revisión: el admin asigna cada jugador
 * a un usuario/equipo y confirma el partido, luego reimporta.
 */
export default function ReplayResolve({
  replay,
  onDone,
}: {
  replay: Replay;
  onDone: () => void;
}) {
  const toast = useToast();
  const players = replay.rawStats?.players ?? [];
  const [matchCode, setMatchCode] = useState(replay.match?.matchCode ?? '');
  const [options, setOptions] = useState<RosterOption[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Cargar los rosters de los dos equipos del partido para los desplegables.
  useEffect(() => {
    const ids = [replay.match?.teamHomeId, replay.match?.teamAwayId].filter(
      Boolean,
    ) as string[];
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => api.get<Team>(`/teams/${id}`)))
      .then((res) => {
        const opts: RosterOption[] = [];
        for (const { data: team } of res) {
          for (const m of team.members ?? []) {
            if (!m.user?.id) continue;
            const name =
              m.user.username || m.epicUsername || m.steamUsername || '—';
            opts.push({
              value: `${m.user.id}|${team.id}`,
              label: `${name} · ${team.name}`,
            });
          }
        }
        setOptions(opts);
      })
      .catch(() => setOptions([]));
  }, [replay.match?.teamHomeId, replay.match?.teamAwayId]);

  // Preseleccionar la resolución automática que ya tuviera cada jugador.
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const p of players) {
      if (p.userId && p.teamId) {
        initial[playerKey(p.platform, p.platformId)] = `${p.userId}|${p.teamId}`;
      }
    }
    setPicks(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay.id]);

  const allAssigned = useMemo(
    () => players.every((p) => picks[playerKey(p.platform, p.platformId)]),
    [players, picks],
  );

  const submit = async () => {
    if (!matchCode) return toast.error('Indica el código de partido');
    setBusy(true);
    try {
      const assignments = players
        .map((p) => {
          const v = picks[playerKey(p.platform, p.platformId)];
          if (!v) return null;
          const [userId, teamId] = v.split('|');
          return { platform: p.platform, platformId: p.platformId, userId, teamId };
        })
        .filter(Boolean);
      const { data } = await api.post<Replay>(`/replays/${replay.id}/resolve`, {
        matchCode,
        assignments,
      });
      if (data.status === 'imported') {
        toast.success('Replay importado', `Resultado ${data.homeScore}–${data.awayScore}.`);
      } else {
        toast.info('Sigue en revisión', data.reviewReason || undefined);
      }
      onDone();
    } catch (err: any) {
      toast.error('No se pudo importar', err.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 border-t border-line-2 pt-3 flex flex-col gap-3">
      <div className="grid sm:grid-cols-[160px_1fr] gap-3 items-end">
        <div>
          <label className="label">Partido (código)</label>
          <input
            className="input"
            value={matchCode}
            onChange={(e) => setMatchCode(e.target.value)}
            placeholder="Ej. A1"
          />
        </div>
        <div className="font-mono text-[10px] text-mute self-center">
          Azul {replay.rawStats?.blueGoals ?? 0} – {replay.rawStats?.orangeGoals ?? 0} Naranja ·
          asigna cada jugador a su usuario/equipo
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((p) => {
          const key = playerKey(p.platform, p.platformId);
          const dotColor = p.color === 'blue' ? 'text-cyan' : 'text-ignite';
          return (
            <div key={key} className="grid sm:grid-cols-[1fr_1fr] gap-2 items-center">
              <div className="font-mono text-xs truncate">
                <span className={dotColor}>●</span> {p.name}{' '}
                <span className="text-mute">
                  ({p.platform}) · {p.goals}g {p.assists}a {p.saves}s
                </span>
              </div>
              <select
                className="input"
                value={picks[key] || ''}
                onChange={(e) => setPicks({ ...picks, [key]: e.target.value })}
              >
                <option value="">— Sin asignar —</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-ignite" disabled={busy} onClick={submit}>
          {busy ? 'Importando…' : 'Importar con estas asignaciones'}
        </button>
        {!allAssigned && (
          <span className="font-mono text-[10px] text-mute">
            Faltan jugadores por asignar — se quedará en revisión si no completas.
          </span>
        )}
      </div>
    </div>
  );
}
