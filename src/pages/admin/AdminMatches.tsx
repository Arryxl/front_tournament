import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { useSettings } from '../../lib/useSettings';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';
import type { Group, Match, Team, TeamMember } from '../../types';

type StatVals = { goals: string; assists: string; saves: string; score: string };
const EMPTY: StatVals = { goals: '', assists: '', saves: '', score: '' };

function memberLabel(m: TeamMember) {
  return m.user?.username || m.epicUsername || `Jugador ${m.playerNumber}`;
}

/** Convierte una fecha ISO a valor para <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

// Hora por defecto 18:00: deja margen para varios partidos seguidos sin cruzar
// medianoche (lo que arruinaría los días de descanso entre jornadas).
const defaultStartLocal = () => {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  return toLocalInput(d.toISOString());
};

export default function AdminMatches() {
  const settings = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const GROUP_LETTERS = settings.groupLetters;
  const KNOCKOUT: { key: Match['phase']; label: string }[] = [
    ...(settings.hasRound16 ? [{ key: 'round16' as const, label: 'Octavos de final' }] : []),
    { key: 'quarters', label: 'Cuartos de final' },
    { key: 'semis', label: 'Semifinales' },
    { key: 'final', label: 'Gran final' },
    { key: 'third', label: 'Tercer lugar' },
  ];

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  // -------- generación / relleno de partidos --------
  const [generating, setGenerating] = useState(false);
  const [preserveDates, setPreserveDates] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // -------- filtros de la lista --------
  const [fSearch, setFSearch] = useState('');
  const [fStatus, setFStatus] = useState<'all' | 'scheduled' | 'live' | 'finished'>('all');
  const [fTeams, setFTeams] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [fDate, setFDate] = useState<'all' | 'dated' | 'undated'>('all');

  // -------- programación masiva (por fase) --------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  // config por fase. restDays = días de descanso entre jornadas
  // (0 = días seguidos, 1 = un día por medio, 2 = cada tres días…).
  type PhaseCfg = { start: string; perDay: string; gap: string; restDays: string; enabled: boolean };
  const [phaseCfg, setPhaseCfg] = useState<Record<string, PhaseCfg>>({});

  const defaultPerDay: Record<string, string> = {
    groups: '4',
    round16: '4',
    quarters: '2',
    semis: '1',
    third: '1',
    final: '1',
  };
  const phaseDefaults = (key: string): PhaseCfg => ({
    start: defaultStartLocal(),
    perDay: defaultPerDay[key] || '2',
    gap: '90',
    restDays: '0',
    enabled: true,
  });
  const getCfg = (key: string): PhaseCfg => phaseCfg[key] || phaseDefaults(key);
  // Actualización funcional: lee SIEMPRE el estado más reciente para no perder
  // campos ya configurados (p. ej. "días entre jornadas").
  const setCfg = (key: string, patch: Partial<PhaseCfg>) =>
    setPhaseCfg((c) => ({ ...c, [key]: { ...(c[key] || phaseDefaults(key)), ...patch } }));

  // Calcula las fechas de una fase según su config.
  const itemsForPhase = (phaseKey: Match['phase']): { id: string; scheduledAt: string }[] => {
    const cfg = getCfg(phaseKey);
    const start = new Date(cfg.start);
    if (Number.isNaN(start.getTime())) return [];
    const perDay = Math.max(1, Number(cfg.perDay) || 1);
    const gap = Math.max(0, Number(cfg.gap) || 0);
    // días de descanso → paso entre jornadas (0 descanso ⇒ paso 1 = seguidos).
    const dayStep = Math.max(1, (Number(cfg.restDays) || 0) + 1);
    const list = matches
      .filter((m) => m.phase === phaseKey)
      .sort((a, b) => a.matchCode.localeCompare(b.matchCode, undefined, { numeric: true }));
    return list.map((m, i) => {
      const day = Math.floor(i / perDay) * dayStep;
      const slot = i % perDay;
      const d = new Date(start);
      d.setDate(d.getDate() + day);
      d.setMinutes(d.getMinutes() + slot * gap);
      return { id: m.id, scheduledAt: d.toISOString() };
    });
  };

  const generate = async () => {
    const ok = await confirm({
      title: 'Generar partidos',
      body:
        `Se crearán ${settings.matchesTotal} partidos para ${settings.teamCount} equipos ` +
        `(${settings.groups} grupos${settings.hasRound16 ? ' + octavos' : ''}).\n\n` +
        'Se borran los partidos actuales SIN resultados y se recrean sin equipos asignados.\n' +
        (preserveDates
          ? 'Las fechas ya programadas se conservarán por código de partido.'
          : 'También se borrarán las fechas programadas.'),
      confirmLabel: 'Generar',
      danger: true,
    });
    if (!ok) return;
    setGenerating(true);
    try {
      const { data } = await api.post('/matches/generate', { preserveDates });
      toast.success(
        'Partidos generados',
        `${data.created} partidos para ${data.teamCount} equipos` +
          (preserveDates ? ` · ${data.datesKept ?? 0} fechas conservadas.` : '.'),
      );
      load();
    } catch (e: any) {
      toast.error('No se generaron los partidos', e.response?.data?.message);
    } finally {
      setGenerating(false);
    }
  };

  const saveSchedule = async (id: string, value: string, code: string) => {
    let scheduledAt: string | null = null;
    if (value) {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        toast.error(`Fecha inválida · ${code}`, 'Revisa el día y la hora.');
        return;
      }
      scheduledAt = d.toISOString();
    }
    try {
      await api.patch(`/matches/${id}/schedule`, { scheduledAt });
      setMatches((ms) => ms.map((m) => (m.id === id ? { ...m, scheduledAt } : m)));
      toast.success(
        scheduledAt ? `Fecha guardada · ${code}` : `Fecha borrada · ${code}`,
        scheduledAt ? new Date(scheduledAt).toLocaleString('es') : undefined,
      );
    } catch (e: any) {
      toast.error(`No se pudo agendar ${code}`, e.response?.data?.message);
    }
  };

  // Programa una sola fase (o todas las presentes con key='__all__').
  const runBulkSchedule = async (phaseKey: Match['phase'] | '__all__', presentPhases: Match['phase'][]) => {
    const keys = phaseKey === '__all__' ? presentPhases.filter((k) => getCfg(k).enabled) : [phaseKey];
    if (keys.length === 0) {
      toast.error('Nada que programar', 'Activa al menos una fase.');
      return;
    }
    const items = keys.flatMap((k) => itemsForPhase(k));
    if (items.length === 0) {
      toast.error('Sin partidos', 'No hay partidos en la(s) fase(s) elegida(s).');
      return;
    }
    setBulkBusy(phaseKey);
    try {
      const { data } = await api.patch('/matches/schedule-bulk', { items });
      toast.success('Programación aplicada', `${data.updated} partidos agendados.`);
      load();
    } catch (e: any) {
      toast.error('No se pudo programar', e.response?.data?.message);
    } finally {
      setBulkBusy(null);
    }
  };

  // Limpia (deja sin fecha) todos los partidos de una fase.
  const clearPhaseDates = async (phaseKey: Match['phase']) => {
    const list = matches.filter((m) => m.phase === phaseKey);
    if (list.length === 0) {
      toast.info('Sin partidos', 'No hay partidos en esta fase.');
      return;
    }
    setBulkBusy(`clear-${phaseKey}`);
    try {
      const items = list.map((m) => ({ id: m.id, scheduledAt: null }));
      const { data } = await api.patch('/matches/schedule-bulk', { items });
      toast.success('Fechas limpiadas', `${data.updated} partidos quedaron sin fecha.`);
      load();
    } catch (e: any) {
      toast.error('No se pudo limpiar', e.response?.data?.message);
    } finally {
      setBulkBusy(null);
    }
  };

  // Rellena los partidos de grupo con los cruces del sorteo actual.
  const assignGroupMatches = async () => {
    setAssigning(true);
    try {
      const { data } = await api.post('/groups/assign-matches', {});
      if (data.assigned > 0) {
        toast.success(
          'Partidos de grupo rellenados',
          `${data.assigned} cruces asignados desde el sorteo.` +
            (data.pendingGroups ? ` ${data.pendingGroups} grupo(s) aún incompletos.` : ''),
        );
      } else {
        toast.info('Nada que rellenar', 'Haz el sorteo de grupos primero (en «Grupos»).');
      }
      load();
    } catch (e: any) {
      toast.error('No se pudo rellenar', e.response?.data?.message);
    } finally {
      setAssigning(false);
    }
  };

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
        toast.success('Resultado guardado', `${form.homeScore} : ${form.awayScore} · stats y predicciones actualizadas.`);
      } else {
        toast.success('Equipos asignados', 'Carga el marcador para finalizar el partido.');
      }
      setEdit(null);
      load();
    } catch (e: any) {
      toast.error('No se pudo guardar el resultado', e.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const markLive = async (id: string, code: string, live: boolean) => {
    try {
      await api.patch(`/matches/${id}/live`, { live });
      toast.success(live ? `Partido en vivo · ${code}` : `Quitado de en vivo · ${code}`);
      load();
    } catch (e: any) {
      toast.error('No se pudo cambiar el estado', e.response?.data?.message);
    }
  };

  const openPredictions = async (id: string, code: string) => {
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 3600 * 1000);
    try {
      await api.post('/predictions/windows', {
        matchId: id,
        openFrom: now.toISOString(),
        openUntil: until.toISOString(),
      });
      toast.success(`Predicciones abiertas · ${code}`, 'Ventana activa por 24 horas.');
      load();
    } catch (e: any) {
      toast.error('No se pudieron abrir predicciones', e.response?.data?.message);
    }
  };

  if (loading) return <Spinner />;

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name || null;

  // Predicado de filtro aplicado a todas las secciones.
  const passes = (m: Match) => {
    if (fStatus !== 'all' && m.status !== fStatus) return false;
    if (fTeams === 'assigned' && !(m.teamHomeId && m.teamAwayId)) return false;
    if (fTeams === 'unassigned' && m.teamHomeId && m.teamAwayId) return false;
    if (fDate === 'dated' && !m.scheduledAt) return false;
    if (fDate === 'undated' && m.scheduledAt) return false;
    const term = fSearch.trim().toLowerCase();
    if (term) {
      const hay = `${m.matchCode} ${m.teamHome?.name || ''} ${m.teamAway?.name || ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  };
  const filtersActive =
    !!fSearch.trim() || fStatus !== 'all' || fTeams !== 'all' || fDate !== 'all';
  const visibleCount = matches.filter(passes).length;
  const resetFilters = () => {
    setFSearch('');
    setFStatus('all');
    setFTeams('all');
    setFDate('all');
  };

  const groupMatches = matches.filter((m) => m.phase === 'groups');

  // --- métricas de estado para la guía ---
  const PHASE_LABELS: Record<string, string> = {
    groups: 'Fase de grupos',
    round16: 'Octavos de final',
    quarters: 'Cuartos de final',
    semis: 'Semifinales',
    third: 'Tercer lugar',
    final: 'Gran final',
  };
  const PHASE_ORDER: Match['phase'][] = ['groups', 'round16', 'quarters', 'semis', 'third', 'final'];
  const presentPhases = PHASE_ORDER.filter((k) => matches.some((m) => m.phase === k));
  const totalMatches = matches.length;
  const assignedMatches = matches.filter((m) => m.teamHomeId && m.teamAwayId).length;
  const groupAssigned = groupMatches.filter((m) => m.teamHomeId && m.teamAwayId).length;
  const groupsDrawn = teams.some((t) => t.groupId);
  const scheduledMatches = matches.filter((m) => m.scheduledAt).length;

  const fmtRange = (phaseKey: Match['phase']) => {
    const items = itemsForPhase(phaseKey);
    if (!items.length) return null;
    const dates = items.map((i) => new Date(i.scheduledAt)).sort((a, b) => a.getTime() - b.getTime());
    const f = (d: Date) =>
      d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (dates.length === 1) return f(dates[0]);
    const jornadas = new Set(dates.map((d) => d.toDateString())).size;
    return `${jornadas} jornada${jornadas > 1 ? 's' : ''} · ${f(dates[0])} → ${f(dates[dates.length - 1])}`;
  };

  // ¿Una jornada de esta fase cruza medianoche? (rompería los días de descanso)
  const phaseSpills = (phaseKey: Match['phase']): boolean => {
    const cfg = getCfg(phaseKey);
    const start = new Date(cfg.start);
    if (Number.isNaN(start.getTime())) return false;
    const perDay = Math.max(1, Number(cfg.perDay) || 1);
    const gap = Math.max(0, Number(cfg.gap) || 0);
    const startMin = start.getHours() * 60 + start.getMinutes();
    return startMin + (perDay - 1) * gap >= 24 * 60;
  };

  /* ---------------- Tarjeta de un partido ---------------- */
  const renderMatch = (m: Match) => {
    const open = edit === m.id;
    return (
      <div key={m.id} className={`card p-4 ${open ? 'border-ignite/50' : ''}`}>
        <div className="flex flex-col gap-3">
          {/* fila de info: código + equipos + marcador + estado */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-mono text-[10px] sm:text-[11px] text-mute tracking-[0.15em] shrink-0">
              {m.matchCode}
            </span>
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute hidden sm:inline shrink-0">
              {m.format.toUpperCase()}
            </span>
            <div className="flex items-center gap-2 font-display text-sm min-w-0 flex-1">
              <span className={`font-semibold truncate text-right flex-1 min-w-0 ${!m.teamHome ? 'text-mute italic' : ''}`}>
                {m.teamHome?.name || 'Por confirmar'}
              </span>
              <span className="font-black tabular-nums text-base px-1 shrink-0">
                {m.homeScore ?? '–'} <span className="text-mute">:</span> {m.awayScore ?? '–'}
              </span>
              <span className={`font-semibold truncate flex-1 min-w-0 ${!m.teamAway ? 'text-mute italic' : ''}`}>
                {m.teamAway?.name || 'Por confirmar'}
              </span>
            </div>
            <span className="shrink-0">
              <StatusBadge status={m.status} />
            </span>
          </div>
          {/* fila de acciones — compacta, envuelve en móvil */}
          <div className="flex items-center gap-2 flex-wrap">
            <button className={`btn !px-3 !py-2 text-[11px] ${open ? 'btn-ignite' : ''}`} onClick={() => openEdit(m)}>
              {open ? 'Cerrar' : 'Resultado'}
            </button>
            <button
              className={`btn !px-3 !py-2 text-[11px] ${m.status === 'live' ? 'btn-ignite' : ''}`}
              disabled={m.status === 'finished'}
              onClick={() => markLive(m.id, m.matchCode, m.status !== 'live')}
            >
              {m.status === 'live' ? 'Quitar en vivo' : 'En vivo'}
            </button>
            <button className="btn !px-3 !py-2 text-[11px]" onClick={() => openPredictions(m.id, m.matchCode)}>
              Predicciones
            </button>
          </div>
        </div>

        {/* Fecha/hora del partido (manual) */}
        <div className="mt-3 pt-3 border-t border-line-2 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute">Fecha</span>
          <input
            type="datetime-local"
            className="input !py-1.5 !px-2 text-xs max-w-[230px]"
            value={toLocalInput(m.scheduledAt)}
            onChange={(e) => saveSchedule(m.id, e.target.value, m.matchCode)}
          />
          {!m.scheduledAt && (
            <span className="font-mono text-[10px] text-mute">sin programar</span>
          )}
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
      <p className="font-mono text-[11px] text-mute mb-6 max-w-[60ch] leading-relaxed">
        Organizado por fase de grupos y por llave eliminatoria. Pulsa «Resultado» en cualquier
        partido para cargar el marcador y las estadísticas.
      </p>

      {/* ===== Guía del flujo ===== */}
      <div className="card p-5 mb-6">
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute mb-3">
          Cómo se arma el torneo
        </div>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { n: 1, t: 'Generar estructura', d: `Crea los ${settings.matchesTotal} partidos vacíos.`, done: totalMatches > 0 },
            { n: 2, t: 'Sortear grupos', d: 'En «Grupos». Reparte los equipos.', done: groupsDrawn },
            { n: 3, t: 'Rellenar grupos', d: 'Los cruces de grupo se llenan solos.', done: groupAssigned > 0 },
            { n: 4, t: 'Programar fechas', d: 'Agenda manual o masiva por fase.', done: scheduledMatches > 0 },
          ].map((s) => (
            <li
              key={s.n}
              className={`rounded-md border p-3 ${s.done ? 'border-green/40 bg-green/[0.04]' : 'border-line'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] w-5 h-5 grid place-items-center rounded-full border ${
                    s.done ? 'border-green text-green' : 'border-line text-mute'
                  }`}
                >
                  {s.done ? '✓' : s.n}
                </span>
                <span className="font-display font-bold text-sm">{s.t}</span>
              </div>
              <div className="font-mono text-[10px] text-mute mt-1.5 leading-snug">{s.d}</div>
            </li>
          ))}
        </ol>
      </div>

      {/* ===== Estructura + acciones ===== */}
      <div className="card p-5 mb-6 border-ignite/30">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-display font-black uppercase tracking-tight text-xl">
              Estructura del torneo
            </div>
            <p className="font-mono text-[11px] text-mute mt-1.5 leading-[1.7] max-w-[62ch]">
              Config: <b className="text-ink">{settings.formatLabel}</b> ·{' '}
              <b className="text-ink">{settings.teamCount} equipos</b> ·{' '}
              <b className="text-ink">{settings.groups} grupos</b> ·{' '}
              <b className="text-ignite">{settings.matchesTotal} partidos</b>.
              <br />
              Estado: <b className="text-ink">{totalMatches}</b> partidos creados ·{' '}
              <b className={assignedMatches === totalMatches && totalMatches > 0 ? 'text-green' : 'text-ink'}>
                {assignedMatches}
              </b>{' '}
              con equipos · <b className="text-ink">{scheduledMatches}</b> con fecha.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 font-mono text-[11px] text-mute cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preserveDates}
                onChange={(e) => setPreserveDates(e.target.checked)}
                className="accent-[#EC571E]"
              />
              Conservar fechas
            </label>
            <button className="btn btn-ignite" onClick={generate} disabled={generating}>
              {generating ? 'Generando…' : totalMatches > 0 ? 'Regenerar partidos' : 'Generar partidos'}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-line-2 flex items-center gap-3 flex-wrap">
          <button className="btn" onClick={assignGroupMatches} disabled={assigning || totalMatches === 0}>
            {assigning ? 'Rellenando…' : 'Rellenar partidos de grupo'}
          </button>
          <button className="btn" onClick={() => setBulkOpen((o) => !o)} disabled={totalMatches === 0}>
            {bulkOpen ? 'Cerrar programación masiva' : 'Programación masiva por fase'}
          </button>
          <span className="font-mono text-[10px] text-mute">
            «Rellenar» asigna los cruces de grupo desde el sorteo (se hace solo al sortear). La llave
            se completa con los resultados.
          </span>
        </div>
      </div>

      {/* ===== Programación masiva por fase ===== */}
      {bulkOpen && (
        <div className="card p-5 mb-10">
          <div className="font-display font-black uppercase tracking-tight text-lg mb-1">
            Programación masiva por fase
          </div>
          <p className="font-mono text-[11px] text-mute mb-5 leading-[1.7] max-w-[70ch]">
            Para cada fase elige cuándo arranca, cuántos partidos por día, los minutos entre partidos
            y los días de descanso entre jornadas (0 = días seguidos, 1 = un día por medio…).
          </p>

          <div className="flex flex-col gap-3">
            {presentPhases.map((key) => {
              const cfg = getCfg(key);
              const count = matches.filter((m) => m.phase === key).length;
              const range = cfg.enabled ? fmtRange(key) : null;
              return (
                <div key={key} className="rounded-lg border border-line p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => setCfg(key, { enabled: e.target.checked })}
                        className="accent-[#EC571E]"
                      />
                      <span className="font-display font-black uppercase tracking-tight text-base">
                        {PHASE_LABELS[key]}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                        {count} {count === 1 ? 'partido' : 'partidos'}
                      </span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {range && (
                        <span className="font-mono text-[10px] text-ignite mr-1">{range}</span>
                      )}
                      <button
                        className="btn text-[10px] px-3 py-1.5"
                        disabled={bulkBusy !== null}
                        onClick={() => clearPhaseDates(key)}
                        title="Deja esta fase sin fechas"
                      >
                        {bulkBusy === `clear-${key}` ? '…' : 'Limpiar fechas'}
                      </button>
                      <button
                        className="btn btn-ignite text-[10px] px-3 py-1.5"
                        disabled={!cfg.enabled || bulkBusy !== null}
                        onClick={() => runBulkSchedule(key, presentPhases)}
                      >
                        {bulkBusy === key ? '…' : 'Programar fase'}
                      </button>
                    </div>
                  </div>
                  <div
                    className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-3 ${cfg.enabled ? '' : 'opacity-40 pointer-events-none'}`}
                  >
                    <div>
                      <label className="label">Inicio (fecha y hora)</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={cfg.start}
                        onChange={(e) => setCfg(key, { start: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Partidos por día</label>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        value={cfg.perDay}
                        onChange={(e) => setCfg(key, { perDay: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Minutos entre partidos</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={cfg.gap}
                        onChange={(e) => setCfg(key, { gap: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Días de descanso</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={cfg.restDays}
                        onChange={(e) => setCfg(key, { restDays: e.target.value })}
                      />
                      <div className="font-mono text-[9px] text-mute mt-1">
                        0 = días seguidos · 1 = un día por medio
                      </div>
                    </div>
                  </div>
                  {cfg.enabled && phaseSpills(key) && (
                    <div className="mt-3 font-mono text-[10px] text-ignite border border-ignite/40 rounded px-3 py-2 leading-relaxed">
                      ⚠ Con esta hora de inicio y {cfg.perDay} partidos cada {cfg.gap} min, la jornada
                      cruza la medianoche y se come el día de descanso. Usa una hora más temprana,
                      menos partidos por día o menos minutos entre partidos.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button
              className="btn btn-ignite"
              disabled={bulkBusy !== null}
              onClick={() => runBulkSchedule('__all__', presentPhases)}
            >
              {bulkBusy === '__all__' ? 'Programando…' : 'Programar todas las fases activas'}
            </button>
            <span className="font-mono text-[10px] text-mute">
              Aplica la configuración de cada fase marcada a la vez.
            </span>
          </div>
        </div>
      )}

      {/* ===== FILTROS ===== */}
      <FilterBar>
        <SearchBox value={fSearch} onChange={setFSearch} placeholder="Buscar por código o equipo…" />
        <ChipGroup
          label="Estado"
          value={fStatus}
          onChange={setFStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'scheduled', label: 'Program.' },
            { value: 'live', label: 'En vivo' },
            { value: 'finished', label: 'Finaliz.' },
          ]}
        />
        <ChipGroup
          label="Equipos"
          value={fTeams}
          onChange={setFTeams}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'assigned', label: 'Con equipos' },
            { value: 'unassigned', label: 'Por confirmar' },
          ]}
        />
        <ChipGroup
          label="Fecha"
          value={fDate}
          onChange={setFDate}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'dated', label: 'Con fecha' },
            { value: 'undated', label: 'Sin fecha' },
          ]}
        />
        <ResultCount shown={visibleCount} total={matches.length} noun="partidos" onReset={resetFilters} />
      </FilterBar>

      {/* ===== FASE DE GRUPOS ===== */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="kicker mb-0">Fase 1</span>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl">Fase de grupos</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-x-8 gap-y-10">
          {GROUP_LETTERS.map((letter) => {
            const list = groupMatches.filter((m) => groupName(m.groupId) === letter && passes(m));
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
                    {filtersActive ? 'Ningún partido coincide con los filtros.' : 'Sin partidos. Aparecerán tras el sorteo de grupos.'}
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
          const orphan = groupMatches.filter((m) => !groupName(m.groupId) && passes(m));
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
            const list = matches.filter((m) => m.phase === key && passes(m));
            return (
              <div key={key}>
                <SectionHead kicker="Llave" title={label} count={list.length} />
                {list.length === 0 ? (
                  <p className="font-mono text-xs text-mute py-2">
                    {filtersActive ? 'Ningún partido coincide con los filtros.' : 'Sin partidos todavía en esta ronda.'}
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
