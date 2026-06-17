import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Team, TeamMember } from '../types';

type StatVals = { goals: string; assists: string; saves: string; score: string };
const EMPTY: StatVals = { goals: '', assists: '', saves: '', score: '' };
const FIELDS: (keyof StatVals)[] = ['goals', 'assists', 'saves', 'score'];

function memberLabel(m: TeamMember) {
  return m.user?.username || m.epicUsername || `Jugador ${m.playerNumber}`;
}

/**
 * Editor independiente de estadísticas por jugador de un partido.
 * Guarda con POST /stats/match/:matchId (no toca el marcador).
 */
export function StatEditor({
  matchId,
  homeId,
  awayId,
  onSaved,
}: {
  matchId: string;
  homeId?: string | null;
  awayId?: string | null;
  onSaved?: () => void;
}) {
  const [home, setHome] = useState<Team | null>(null);
  const [away, setAway] = useState<Team | null>(null);
  const [stats, setStats] = useState<Record<string, StatVals>>({});
  const [mvp, setMvp] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [h, a, existing] = await Promise.all([
        homeId ? api.get(`/teams/${homeId}`).then((r) => r.data) : Promise.resolve(null),
        awayId ? api.get(`/teams/${awayId}`).then((r) => r.data) : Promise.resolve(null),
        api.get(`/stats/match/${matchId}`).then((r) => r.data).catch(() => []),
      ]);
      if (!active) return;
      setHome(h);
      setAway(a);
      const map: Record<string, StatVals> = {};
      let foundMvp = '';
      (existing || []).forEach((s: any) => {
        map[s.userId] = {
          goals: String(s.goals),
          assists: String(s.assists),
          saves: String(s.saves),
          score: String(s.score),
        };
        if (s.mvp) foundMvp = s.userId;
      });
      setStats(map);
      setMvp(foundMvp);
    })();
    return () => {
      active = false;
    };
  }, [matchId, homeId, awayId]);

  const setStat = (uid: string, key: keyof StatVals, val: string) =>
    setStats((s) => ({ ...s, [uid]: { ...(s[uid] || EMPTY), [key]: val } }));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const rows: any[] = [];
      [home, away].forEach((team) => {
        if (!team) return;
        (team.members || []).forEach((mem) => {
          if (!mem.user?.id) return;
          const v = stats[mem.user.id] || EMPTY;
          rows.push({
            userId: mem.user.id,
            teamId: team.id,
            goals: Number(v.goals) || 0,
            assists: Number(v.assists) || 0,
            saves: Number(v.saves) || 0,
            score: Number(v.score) || 0,
            mvp: mvp === mem.user.id,
          });
        });
      });
      await api.post(`/stats/match/${matchId}`, { stats: rows });
      setMsg('Estadísticas guardadas');
      onSaved?.();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!home && !away)
    return (
      <p className="font-mono text-xs text-mute">
        Este partido aún no tiene equipos asignados. Asígnalos en “Partidos”.
      </p>
    );

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-5">
        {[home, away].map((team, idx) =>
          team ? (
            <div key={team.id} className="card p-3">
              <div className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <span className="font-mono text-[10px] text-mute">{idx === 0 ? 'LOCAL' : 'VISITA'}</span>
                {team.name}
              </div>
              <div className="grid grid-cols-[1fr_repeat(4,40px)_28px] gap-1.5 font-mono text-[9px] tracking-[0.1em] uppercase text-mute mb-1">
                <span>Jugador</span>
                <span className="text-center">Gol</span>
                <span className="text-center">Asi</span>
                <span className="text-center">Salv</span>
                <span className="text-center">Score</span>
                <span className="text-center">MVP</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {(team.members || [])
                  .slice()
                  .sort((a, b) => a.playerNumber - b.playerNumber)
                  .map((mem) => {
                    const uid = mem.user?.id;
                    const v = (uid && stats[uid]) || EMPTY;
                    const noAccount = !uid;
                    return (
                      <div key={mem.id} className="grid grid-cols-[1fr_repeat(4,40px)_28px] gap-1.5 items-center">
                        <span className="text-sm truncate font-display font-semibold">
                          {memberLabel(mem)}
                          {noAccount && (
                            <span className="block font-mono text-[8px] text-ignite/70 tracking-[0.1em]">
                              SIN CUENTA
                            </span>
                          )}
                        </span>
                        {FIELDS.map((k) => (
                          <input
                            key={k}
                            type="number"
                            disabled={noAccount}
                            className="input px-1 py-1.5 text-center text-xs disabled:opacity-30"
                            value={uid ? v[k] : ''}
                            onChange={(e) => uid && setStat(uid, k, e.target.value)}
                          />
                        ))}
                        <div className="flex justify-center">
                          <input
                            type="radio"
                            name={`mvp-${matchId}`}
                            disabled={noAccount}
                            checked={!!uid && mvp === uid}
                            onChange={() => uid && setMvp(uid)}
                            className="accent-[#CCFF33] disabled:opacity-30"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null,
        )}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button className="btn btn-ignite" disabled={saving} onClick={save}>
          {saving ? 'Guardando…' : 'Guardar estadísticas'}
        </button>
        {msg && <span className="font-mono text-xs text-ignite">{msg}</span>}
      </div>
    </div>
  );
}
