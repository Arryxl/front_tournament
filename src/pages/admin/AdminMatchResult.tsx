import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { useToast } from '../../components/Toast';
import AdvancedPlayerCard from '../../components/AdvancedPlayerCard';
import { seriesLabel } from '../../lib/tournament';
import type { Match, Team, TeamMember, PlayerExtraStats, Replay } from '../../types';

type StatVals = { goals: string; assists: string; saves: string; score: string; shots: string; demos: string };
const EMPTY: StatVals = { goals: '', assists: '', saves: '', score: '', shots: '', demos: '' };
const FIELDS: { key: keyof StatVals; label: string }[] = [
  { key: 'goals', label: 'Gol' },
  { key: 'assists', label: 'Asi' },
  { key: 'saves', label: 'Salv' },
  { key: 'score', label: 'Score' },
  { key: 'shots', label: 'Tiro' },
  { key: 'demos', label: 'Demo' },
];

function memberLabel(m: TeamMember) {
  return m.user?.username || m.epicUsername || `Jugador ${m.playerNumber}`;
}

interface StatRow {
  id: string;
  userId: string;
  teamId: string;
  goals: number; assists: number; saves: number; score: number; shots: number; demos: number;
  mvp: boolean;
  extra: PlayerExtraStats | null;
  user?: { username: string } | null;
  team?: { id: string; name: string } | null;
}
interface MatchDetail extends Match {
  playerStats?: StatRow[];
}

export default function AdminMatchResult() {
  const { id = '' } = useParams();
  const toast = useToast();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rosters, setRosters] = useState<{ home?: Team | null; away?: Team | null }>({});
  const [games, setGames] = useState<Replay[]>([]);
  const [form, setForm] = useState({ teamHomeId: '', teamAwayId: '', homeScore: '', awayScore: '' });
  const [stats, setStats] = useState<Record<string, StatVals>>({});
  const [extraByUser, setExtraByUser] = useState<Record<string, unknown>>({});
  const [mvp, setMvp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replayBusy, setReplayBusy] = useState(false);

  const isSeries = !!match && match.format !== 'single';

  const loadRosters = async (homeId?: string | null, awayId?: string | null) => {
    const [home, away] = await Promise.all([
      homeId ? api.get(`/teams/${homeId}`).then((r) => r.data as Team) : Promise.resolve(null),
      awayId ? api.get(`/teams/${awayId}`).then((r) => r.data as Team) : Promise.resolve(null),
    ]);
    setRosters({ home, away });
  };

  const load = async () => {
    const [m, t, allReplays] = await Promise.all([
      api.get<MatchDetail>(`/matches/${id}`).then((r) => r.data),
      api.get('/teams').then((r) => r.data.filter((x: Team) => x.status === 'approved')),
      api.get<Replay[]>('/replays').then((r) => r.data).catch(() => []),
    ]);
    setMatch(m);
    setTeams(t);
    setGames(allReplays.filter((r) => r.match?.id === id || r.matchId === id));
    setForm({
      teamHomeId: m.teamHomeId || '',
      teamAwayId: m.teamAwayId || '',
      homeScore: m.homeScore != null ? String(m.homeScore) : '',
      awayScore: m.awayScore != null ? String(m.awayScore) : '',
    });
    const map: Record<string, StatVals> = {};
    const extras: Record<string, unknown> = {};
    let foundMvp = '';
    (m.playerStats || []).forEach((s) => {
      map[s.userId] = {
        goals: String(s.goals), assists: String(s.assists), saves: String(s.saves),
        score: String(s.score), shots: String(s.shots ?? 0), demos: String(s.demos ?? 0),
      };
      if (s.extra) extras[s.userId] = s.extra;
      if (s.mvp) foundMvp = s.userId;
    });
    setStats(map);
    setExtraByUser(extras);
    setMvp(foundMvp);
    await loadRosters(m.teamHomeId, m.teamAwayId);
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStat = (uid: string, key: keyof StatVals, val: string) =>
    setStats((s) => ({ ...s, [uid]: { ...(s[uid] || EMPTY), [key]: val } }));

  const teamOptions = useMemo(() => teams.map((t) => ({ id: t.id, name: t.name })), [teams]);

  // --- guardar solo los equipos (necesario antes de subir replays en series) ---
  const saveTeams = async () => {
    if (!match) return;
    setSaving(true);
    try {
      await api.patch(`/matches/${match.id}/teams`, {
        teamHomeId: form.teamHomeId || null,
        teamAwayId: form.teamAwayId || null,
      });
      toast.success('Equipos guardados');
      load();
    } catch (e: any) {
      toast.error('No se pudo guardar', e.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  // --- SINGLE (grupos): autocompletar desde replay rellena el formulario ---
  const autofillFromReplay = async (file: File) => {
    if (!match) return;
    setReplayBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('matchCode', match.matchCode);
      const { data } = await api.post('/replays/preview', fd);
      setForm((f) => ({ ...f, homeScore: String(data.homeScore ?? ''), awayScore: String(data.awayScore ?? '') }));
      const map: Record<string, StatVals> = {};
      const extras: Record<string, unknown> = {};
      let foundMvp = '';
      (data.stats || []).forEach((s: any) => {
        map[s.userId] = {
          goals: String(s.goals ?? 0), assists: String(s.assists ?? 0), saves: String(s.saves ?? 0),
          score: String(s.score ?? 0), shots: String(s.shots ?? 0), demos: String(s.demos ?? 0),
        };
        if (s.extra) extras[s.userId] = s.extra;
        if (s.mvp) foundMvp = s.userId;
      });
      setStats(map);
      setExtraByUser(extras);
      setMvp(foundMvp);
      const warns: string[] = data.warnings || [];
      if (warns.length) toast.info('Replay cargado con avisos', warns.join(' · '));
      else toast.success('Replay cargado', `Marcador ${data.homeScore}–${data.awayScore}. Revisa y guarda.`);
    } catch (e: any) {
      toast.error('No se pudo leer el replay', e.response?.data?.message);
    } finally {
      setReplayBusy(false);
    }
  };

  const saveSingle = async () => {
    if (!match) return;
    setSaving(true);
    try {
      await api.patch(`/matches/${match.id}/teams`, {
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
            userId: mem.user.id, teamId: team.id,
            goals: Number(v.goals) || 0, assists: Number(v.assists) || 0, saves: Number(v.saves) || 0,
            score: Number(v.score) || 0, shots: Number(v.shots) || 0, demos: Number(v.demos) || 0,
            mvp: mvp === mem.user.id, extra: extraByUser[mem.user.id] ?? null,
          });
        });
      });
      if (form.homeScore !== '' && form.awayScore !== '') {
        await api.patch(`/matches/${match.id}/result`, {
          homeScore: Number(form.homeScore),
          awayScore: Number(form.awayScore),
          stats: statsArr.length ? statsArr : undefined,
        });
        toast.success('Resultado guardado', `${form.homeScore} : ${form.awayScore}`);
      } else {
        toast.success('Equipos asignados', 'Carga el marcador para finalizar.');
      }
      load();
    } catch (e: any) {
      toast.error('No se pudo guardar', e.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  // --- SERIE (eliminatorias): subir un replay por juego, se importa y consolida ---
  const uploadGame = async (file: File) => {
    if (!match) return;
    setReplayBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('matchCode', match.matchCode);
      const { data } = await api.post<Replay>('/replays', fd);
      if (data.status === 'imported') toast.success('Juego cargado', 'La serie se actualizó.');
      else if (data.status === 'needs_review') toast.info('Juego en revisión', data.reviewReason || 'Revísalo en Replays.');
      else if (data.status === 'failed') toast.error('No se pudo procesar', data.reviewReason || undefined);
      else toast.info('Juego en proceso', 'Reintenta en unos segundos.');
      load();
    } catch (e: any) {
      toast.error('No se pudo subir el juego', e.response?.data?.message);
    } finally {
      setReplayBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!match) {
    return (
      <div>
        <Link to="/admin/matches" className="font-mono text-[11px] tracking-[0.15em] uppercase text-mute hover:text-ignite">
          ← Volver a partidos
        </Link>
        <p className="font-mono text-xs text-ignite mt-6">No se encontró el partido.</p>
      </div>
    );
  }

  const teamsReady = !!match.teamHomeId && !!match.teamAwayId;
  const consolidated = match.playerStats || [];
  const advanced = consolidated.filter((s) => s.extra);

  return (
    <div className="max-w-[1100px]">
      <Link to="/admin/matches" className="inline-block mb-5 font-mono text-[11px] tracking-[0.15em] uppercase text-mute hover:text-ignite">
        ← Volver a partidos
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <span className="kicker">Cargar resultado · {match.matchCode}</span>
          <h1 className="font-display font-black italic uppercase text-3xl sm:text-4xl tracking-tight mt-2 leading-none">
            {match.teamHome?.name || 'Local'} <span className="text-mute">vs</span> {match.teamAway?.name || 'Visita'}
          </h1>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <p className="font-mono text-[11px] text-mute mb-6">
        {isSeries ? `Serie eliminatoria · ${seriesLabel(match.format)}` : 'Fase de grupos · Partido único'}
      </p>

      {/* ===== equipos ===== */}
      <div className="card p-5 mb-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Equipo local</label>
            <select className="input" value={form.teamHomeId}
              onChange={(e) => { setForm({ ...form, teamHomeId: e.target.value }); loadRosters(e.target.value, form.teamAwayId); }}>
              <option value="">— Seleccionar —</option>
              {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Equipo visitante</label>
            <select className="input" value={form.teamAwayId}
              onChange={(e) => { setForm({ ...form, teamAwayId: e.target.value }); loadRosters(form.teamHomeId, e.target.value); }}>
              <option value="">— Seleccionar —</option>
              {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {/* En single, los equipos se guardan junto al resultado; en serie hay que fijarlos antes de subir juegos */}
        {isSeries && (
          <div className="mt-4 pt-4 border-t border-line-2">
            <button className="btn" disabled={saving} onClick={saveTeams}>
              {saving ? 'Guardando…' : 'Guardar equipos'}
            </button>
            <span className="font-mono text-[10px] text-mute ml-3">
              Fija los equipos antes de subir los juegos de la serie.
            </span>
          </div>
        )}
      </div>

      {isSeries ? (
        /* ===================== SERIE ===================== */
        <>
          {/* marcador de serie + juegos */}
          <div className="card p-5 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="label mb-0">Serie · {seriesLabel(match.format)}</div>
              <div className="font-display font-black italic text-2xl tabular-nums">
                {match.homeScore ?? 0} <span className="text-mute text-base">:</span> {match.awayScore ?? 0}
                <span className="font-mono text-[10px] text-mute ml-2 uppercase tracking-[0.15em]">juegos</span>
              </div>
            </div>

            {!teamsReady ? (
              <p className="font-mono text-xs text-ignite">Guarda los dos equipos antes de subir juegos.</p>
            ) : match.status === 'finished' ? (
              <p className="font-mono text-xs text-green">
                Serie finalizada ({match.homeScore}–{match.awayScore}). No se pueden añadir más juegos.
              </p>
            ) : (
              <label className={`btn btn-ignite !py-2.5 cursor-pointer ${replayBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                {replayBusy ? 'Procesando…' : '⬆ Subir juego (.replay)'}
                <input type="file" accept=".replay" className="hidden" disabled={replayBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadGame(f); e.target.value = ''; }} />
              </label>
            )}

            {/* lista de juegos cargados */}
            <div className="mt-4 flex flex-col gap-2">
              {games.length === 0 && (
                <p className="font-mono text-[11px] text-mute">Aún no se ha cargado ningún juego.</p>
              )}
              {games
                .slice()
                .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
                .map((g, i) => (
                  <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-line-2 flex-wrap">
                    <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute w-16">Juego {i + 1}</span>
                    <span className="font-display font-black italic tabular-nums">
                      {g.homeScore ?? '–'} : {g.awayScore ?? '–'}
                    </span>
                    <span className="ml-auto"><StatusBadge status={g.status === 'imported' ? 'finished' : 'scheduled'} /></span>
                    {g.reviewReason && (
                      <span className="w-full font-mono text-[10px] text-ignite">{g.reviewReason}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* stats consolidadas (solo lectura) */}
          {consolidated.length > 0 && (
            <div className="card p-5 mb-5">
              <div className="label mb-3">Estadísticas acumuladas de la serie</div>
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-[1fr_repeat(6,40px)] gap-1.5 font-mono text-[9px] tracking-[0.05em] uppercase text-mute mb-1">
                    <span>Jugador</span>
                    {FIELDS.map((f) => <span key={f.key} className="text-center">{f.label}</span>)}
                  </div>
                  <div className="flex flex-col divide-y divide-line-2">
                    {consolidated
                      .slice()
                      .sort((a, b) => b.score - a.score)
                      .map((s) => (
                        <div key={s.id} className="grid grid-cols-[1fr_repeat(6,40px)] gap-1.5 items-center py-1.5">
                          <span className="text-sm truncate font-display font-semibold">
                            {s.mvp && <span className="text-ignite">★ </span>}
                            {s.user?.username || '—'}
                          </span>
                          {FIELDS.map((f) => (
                            <span key={f.key} className="text-center tabular-nums text-sm">{(s as any)[f.key]}</span>
                          ))}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {advanced.length > 0 && (
            <div className="mb-5">
              <div className="label mb-3">Rendimiento avanzado (promedio de la serie)</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {advanced.map((s) => <AdvancedPlayerCard key={s.id} name={s.user?.username || '—'} e={s.extra!} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ===================== PARTIDO ÚNICO (grupos) ===================== */
        <div className="card p-5 mb-5">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Marcador local</label>
              <input type="number" className="input" value={form.homeScore} onChange={(e) => setForm({ ...form, homeScore: e.target.value })} />
            </div>
            <div>
              <label className="label">Marcador visitante</label>
              <input type="number" className="input" value={form.awayScore} onChange={(e) => setForm({ ...form, awayScore: e.target.value })} />
            </div>
          </div>
          <div className="mb-4 pb-4 border-b border-line-2 flex items-center gap-3 flex-wrap">
            <label className={`btn !py-2.5 cursor-pointer ${replayBusy || !rosters.home || !rosters.away ? 'opacity-50 pointer-events-none' : ''}`}>
              {replayBusy ? 'Leyendo replay…' : '⬆ Autocompletar desde replay'}
              <input type="file" accept=".replay" className="hidden" disabled={replayBusy || !rosters.home || !rosters.away}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) autofillFromReplay(f); e.target.value = ''; }} />
            </label>
            <span className="font-mono text-[10px] text-mute">Rellena marcador y stats. Revisa y guarda.</span>
          </div>

          <div className="label mb-3">Estadísticas por jugador</div>
          {!rosters.home && !rosters.away ? (
            <p className="font-mono text-xs text-mute">Selecciona ambos equipos para cargar la alineación.</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-5">
              {([rosters.home, rosters.away] as (Team | null | undefined)[]).map((team, idx) =>
                team ? (
                  <div key={team.id}>
                    <div className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-mute">{idx === 0 ? 'LOCAL' : 'VISITA'}</span>
                      {team.name}
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[330px]">
                        <div className="grid grid-cols-[1fr_repeat(6,38px)_28px] gap-1.5 font-mono text-[9px] tracking-[0.05em] uppercase text-mute mb-1">
                          <span>Jugador</span>
                          {FIELDS.map((f) => <span key={f.key} className="text-center">{f.label}</span>)}
                          <span className="text-center">MVP</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {(team.members || []).slice().sort((a, b) => a.playerNumber - b.playerNumber).map((mem) => {
                            const uid = mem.user?.id;
                            const v = (uid && stats[uid]) || EMPTY;
                            const noAccount = !uid;
                            return (
                              <div key={mem.id} className="grid grid-cols-[1fr_repeat(6,38px)_28px] gap-1.5 items-center">
                                <span className="text-sm truncate font-display font-semibold pr-1">
                                  {memberLabel(mem)}
                                  {noAccount && <span className="block font-mono text-[8px] text-ignite/70 tracking-[0.1em]">SIN CUENTA</span>}
                                </span>
                                {FIELDS.map((f) => (
                                  <input key={f.key} type="number" disabled={noAccount}
                                    className="input px-1 py-1.5 text-center text-xs disabled:opacity-30"
                                    value={uid ? v[f.key] : ''} onChange={(e) => uid && setStat(uid, f.key, e.target.value)} />
                                ))}
                                <div className="flex justify-center">
                                  <input type="radio" name="mvp" disabled={noAccount} checked={!!uid && mvp === uid}
                                    onChange={() => uid && setMvp(uid)} className="accent-[#EC571E] disabled:opacity-30" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
          <div className="flex gap-2 mt-5">
            <button className="btn btn-ignite" disabled={saving} onClick={saveSingle}>
              {saving ? 'Guardando…' : 'Guardar resultado y stats'}
            </button>
            <Link to="/admin/matches" className="btn">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  );
}
