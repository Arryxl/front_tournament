import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Group, Match, Team, TeamMember } from '../../types';

type StatVals = { goals: string; assists: string; saves: string; score: string };
const EMPTY: StatVals = { goals: '', assists: '', saves: '', score: '' };

const GROUP_LETTERS = ['A', 'B', 'C', 'D'] as const;
const KNOCKOUT: { key: Match['phase']; label: string }[] = [
  { key: 'quarters', label: 'Cuartos de final' },
  { key: 'semis', label: 'Semifinales' },
  { key: 'final', label: 'Gran final' },
  { key: 'third', label: 'Tercer lugar' },
];

function memberLabel(m: TeamMember) {
  return m.user?.username || m.epicUsername || `Jugador ${m.playerNumber}`;
}

export default function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  // rosters + stats del partido en edición
  const [rosters, setRosters] = useState<{ home?: Team | null; away?: Team | null }>({});
  const [stats, setStats] = useState<Record<string, StatVals>>({});
  const [mvp, setMvp] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([api.get('/matches'), api.get('/teams'), api.get('/groups')])
      .then(([m, t, g]) => {
        setMatches(m.data);
        setTeams(t.data.filter((x: Team) => x.status === 'approved'));
        setGroups(g.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const loadRosters = async (homeId?: string | null, awayId?: string | null) => {
    const [home, away] = await Promise.all([
      homeId ? api.get(`/teams/${homeId}`).then((r) => r.data as Team) : Promise.resolve(null),
      awayId ? api.get(`/teams/${awayId}`).then((r) => r.data as Team) : Promise.resolve(null),
    ]);
    setRosters({ home, away });
  };

  const openEdit = async (m: Match) => {
    if (edit === m.id) {
      setEdit(null);
      return;
    }
    setEdit(m.id);
    setForm({
      teamHomeId: m.teamHomeId || '',
      teamAwayId: m.teamAwayId || '',
      homeScore: m.homeScore ?? '',
      awayScore: m.awayScore ?? '',
    });
    setRosters({});
    setStats({});
    setMvp('');
    // prefill stats existentes
    try {
      const detail = await api.get(`/matches/${m.id}`).then((r) => r.data);
      const existing: any[] = detail.playerStats || [];
      const map: Record<string, StatVals> = {};
      let foundMvp = '';
      existing.forEach((s) => {
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
    } catch {
      /* sin detalle todavía */
    }
    loadRosters(m.teamHomeId, m.teamAwayId);
  };

  const setStat = (uid: string, key: keyof StatVals, val: string) =>
    setStats((s) => ({ ...s, [uid]: { ...(s[uid] || EMPTY), [key]: val } }));

  const submitResult = async (id: string) => {
    setSaving(true);
    try {
      await api.patch(`/matches/${id}/teams`, {
        teamHomeId: form.teamHomeId || null,
        teamAwayId: form.teamAwayId || null,
      });

      const statsArr: any[] = [];
      [rosters.home, rosters.away].forEach((team) => {
        if (!team) return;
        (team.members || []).forEach((mem) => {
          if (!mem.user?.id) return;
          const v = stats[mem.user.id] || EMPTY;
          statsArr.push({
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

      if (form.homeScore !== '' && form.awayScore !== '') {
        await api.patch(`/matches/${id}/result`, {
          homeScore: Number(form.homeScore),
          awayScore: Number(form.awayScore),
          stats: statsArr.length ? statsArr : undefined,
        });
      }
      setEdit(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const markLive = async (id: string) => {
    await api.patch(`/matches/${id}/live`, {});
    load();
  };

  const openPredictions = async (id: string) => {
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 3600 * 1000);
    await api.post('/predictions/windows', {
      matchId: id,
      openFrom: now.toISOString(),
      openUntil: until.toISOString(),
    });
    alert('Predicciones abiertas por 24h');
    load();
  };

  if (loading) return <Spinner />;

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name || null;

  const groupMatches = matches.filter((m) => m.phase === 'groups');

  /* ---------------- Tarjeta de un partido ---------------- */
  const renderMatch = (m: Match) => {
    const open = edit === m.id;
    return (
      <div key={m.id} className={`card p-4 ${open ? 'border-ignite/50' : ''}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <span className="font-mono text-[11px] text-mute tracking-[0.2em] w-12 shrink-0">
              {m.matchCode}
            </span>
            <div className="flex items-center gap-2 font-display text-sm min-w-0">
              <span className={`font-semibold truncate text-right w-28 ${!m.teamHome ? 'text-mute italic' : ''}`}>
                {m.teamHome?.name || 'Por confirmar'}
              </span>
              <span className="font-black tabular-nums text-base px-2 shrink-0">
                {m.homeScore ?? '–'} <span className="text-mute">:</span> {m.awayScore ?? '–'}
              </span>
              <span className={`font-semibold truncate w-28 ${!m.teamAway ? 'text-mute italic' : ''}`}>
                {m.teamAway?.name || 'Por confirmar'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute hidden md:inline">
              {m.format.toUpperCase()}
            </span>
            <StatusBadge status={m.status} />
            <button className={`btn ${open ? 'btn-ignite' : ''}`} onClick={() => openEdit(m)}>
              {open ? 'Cerrar' : 'Resultado'}
            </button>
            <button className="btn" onClick={() => markLive(m.id)}>
              En vivo
            </button>
            <button className="btn" onClick={() => openPredictions(m.id)}>
              Predicciones
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4 pt-4 border-t border-line-2">
            {/* equipos + marcador */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Equipo local</label>
                <select
                  className="input"
                  value={form.teamHomeId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, teamHomeId: v });
                    loadRosters(v, form.teamAwayId);
                  }}
                >
                  <option value="">— Seleccionar —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Equipo visitante</label>
                <select
                  className="input"
                  value={form.teamAwayId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, teamAwayId: v });
                    loadRosters(form.teamHomeId, v);
                  }}
                >
                  <option value="">— Seleccionar —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Marcador local</label>
                <input
                  type="number"
                  className="input"
                  value={form.homeScore}
                  onChange={(e) => setForm({ ...form, homeScore: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Marcador visitante</label>
                <input
                  type="number"
                  className="input"
                  value={form.awayScore}
                  onChange={(e) => setForm({ ...form, awayScore: e.target.value })}
                />
              </div>
            </div>

            {/* estadísticas por jugador */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="label mb-0">Estadísticas por jugador</span>
                <span className="font-mono text-[10px] text-mute">
                  MVP = punto · se guardan junto al resultado
                </span>
              </div>
              {!rosters.home && !rosters.away ? (
                <p className="font-mono text-xs text-mute">
                  Selecciona ambos equipos para cargar la alineación.
                </p>
              ) : (
                <div className="grid lg:grid-cols-2 gap-5">
                  {([rosters.home, rosters.away] as (Team | null | undefined)[]).map((team, idx) =>
                    team ? (
                      <div key={team.id} className="card p-3">
                        <div className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-mute">
                            {idx === 0 ? 'LOCAL' : 'VISITA'}
                          </span>
                          {team.name}
                        </div>
                        <div className="grid grid-cols-[1fr_repeat(4,40px)_28px] gap-1.5 font-mono text-[9px] tracking-[0.1em] uppercase text-mute mb-1 items-end">
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
                                <div
                                  key={mem.id}
                                  className="grid grid-cols-[1fr_repeat(4,40px)_28px] gap-1.5 items-center"
                                >
                                  <span className="text-sm truncate font-display font-semibold">
                                    {memberLabel(mem)}
                                    {noAccount && (
                                      <span className="block font-mono text-[8px] text-ignite/70 tracking-[0.1em]">
                                        SIN CUENTA
                                      </span>
                                    )}
                                  </span>
                                  {(['goals', 'assists', 'saves', 'score'] as (keyof StatVals)[]).map(
                                    (k) => (
                                      <input
                                        key={k}
                                        type="number"
                                        disabled={noAccount}
                                        className="input px-1 py-1.5 text-center text-xs disabled:opacity-30"
                                        value={uid ? v[k] : ''}
                                        onChange={(e) => uid && setStat(uid, k, e.target.value)}
                                      />
                                    ),
                                  )}
                                  <div className="flex justify-center">
                                    <input
                                      type="radio"
                                      name="mvp"
                                      disabled={noAccount}
                                      checked={!!uid && mvp === uid}
                                      onChange={() => uid && setMvp(uid)}
                                      className="accent-[#EC571E] disabled:opacity-30"
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
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button className="btn btn-ignite" disabled={saving} onClick={() => submitResult(m.id)}>
                {saving ? 'Guardando…' : 'Guardar resultado y stats'}
              </button>
              <button className="btn" onClick={() => setEdit(null)}>
                Cancelar
              </button>
            </div>
            <p className="font-mono text-[10px] text-mute mt-2">
              El marcador es obligatorio para guardar (finaliza el partido y reparte monedas de
              predicciones).
            </p>
          </div>
        )}
      </div>
    );
  };

  /* ---------------- Encabezado de sección ---------------- */
  const SectionHead = ({ kicker, title, count }: { kicker: string; title: string; count: number }) => (
    <div className="flex items-center gap-3 mb-3">
      <span className="font-display font-black uppercase tracking-tight text-xl">{title}</span>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
        {kicker} · {count} {count === 1 ? 'partido' : 'partidos'}
      </span>
    </div>
  );

  return (
    <div>
      <span className="kicker">Torneo</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-2">Partidos</h1>
      <p className="font-mono text-[11px] text-mute mb-10 max-w-[60ch] leading-relaxed">
        Organizado por fase de grupos y por llave eliminatoria. Pulsa «Resultado» en cualquier
        partido para cargar el marcador y las estadísticas.
      </p>

      {/* ===== FASE DE GRUPOS ===== */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="kicker mb-0">Fase 1</span>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl">Fase de grupos</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-x-8 gap-y-10">
          {GROUP_LETTERS.map((letter) => {
            const list = groupMatches.filter((m) => groupName(m.groupId) === letter);
            return (
              <div key={letter}>
                <div className="flex items-center gap-3 mb-3 border-b border-line-2 pb-2">
                  <span className="font-display font-black uppercase tracking-tight text-2xl text-ignite">
                    Grupo {letter}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                    {list.length} {list.length === 1 ? 'partido' : 'partidos'}
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="font-mono text-xs text-mute py-3">
                    Sin partidos. Aparecerán tras el sorteo de grupos.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">{list.map(renderMatch)}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* partidos de grupo sin grupo asignado */}
        {(() => {
          const orphan = groupMatches.filter((m) => !groupName(m.groupId));
          if (orphan.length === 0) return null;
          return (
            <div className="mt-10">
              <SectionHead kicker="Sin grupo" title="Por asignar" count={orphan.length} />
              <div className="flex flex-col gap-3">{orphan.map(renderMatch)}</div>
            </div>
          );
        })()}
      </div>

      {/* ===== LLAVE ELIMINATORIA ===== */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="kicker mb-0">Fase 2</span>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl">La llave</h2>
        </div>

        <div className="flex flex-col gap-10">
          {KNOCKOUT.map(({ key, label }) => {
            const list = matches.filter((m) => m.phase === key);
            return (
              <div key={key}>
                <SectionHead kicker="Llave" title={label} count={list.length} />
                {list.length === 0 ? (
                  <p className="font-mono text-xs text-mute py-2">
                    Sin partidos todavía en esta ronda.
                  </p>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-3">{list.map(renderMatch)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
