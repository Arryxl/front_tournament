import { useEffect, useMemo, useRef, useState } from 'react';
import { api, fileBase } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useSettings } from '../../lib/useSettings';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { FilterBar, SearchBox, ChipGroup } from '../../components/admin/Filters';
import {
  emptyBoard,
  openDrawChannel,
  type Board,
  type DrawEvent,
  type GroupName,
  type Phase,
  type TeamLite,
} from '../../lib/drawChannel';
import type { Group, Standing, Team } from '../../types';

const fileUrl = (u: string | null) => (u ? (u.startsWith('http') ? u : `${fileBase}${u}`) : '');
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type Assignment = { team: TeamLite; group: GroupName };

export default function AdminGroups() {
  const settings = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const LETTERS = settings.groupLetters;

  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // -------- sorteo en vivo --------
  const [approved, setApproved] = useState<TeamLite[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [board, setBoard] = useState<Board>(emptyBoard(LETTERS));
  const [pointer, setPointer] = useState(0);
  const [prepared, setPrepared] = useState(false);
  const [saved, setSaved] = useState(false);

  // filtros de las tablas guardadas
  const [fGroup, setFGroup] = useState<string>('all');
  const [fTeam, setFTeam] = useState('');

  // mostrar/ocultar el panel de sorteo (se colapsa cuando ya está sorteado)
  const [drawOpen, setDrawOpen] = useState(false);

  const planRef = useRef<{ order: Assignment[]; assignments: Assignment[] } | null>(null);
  const channelRef = useRef<ReturnType<typeof openDrawChannel> | null>(null);
  const snapshotRef = useRef<DrawEvent>({
    type: 'sync',
    phase: 'idle',
    board: emptyBoard(LETTERS),
    parade: [],
    total: 0,
    revealed: 0,
  });

  const load = () => {
    Promise.all([api.get('/groups'), api.get('/groups/standings'), api.get('/teams')])
      .then(([g, s, t]) => {
        setGroups(g.data);
        setStandings(s.data);
        setApproved(
          (t.data as Team[])
            .filter((x) => x.status === 'approved')
            .map((x) => ({
              id: x.id,
              name: x.name,
              shieldUrl: x.shieldUrl,
              players: (x.members ?? [])
                .slice()
                .sort((a, b) => (a.playerNumber ?? 99) - (b.playerNumber ?? 99))
                .map((m) => ({
                  name: m.epicUsername || m.steamUsername || m.user?.username || '—',
                  rank: m.rank ?? null,
                  isCaptain: m.isCaptain,
                  sub: (m.playerNumber ?? 0) > 3,
                })),
            })),
        );
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // mantener el snapshot al día para responder al "hello" del escenario
  useEffect(() => {
    snapshotRef.current = {
      type: 'sync',
      phase,
      board,
      parade: approved,
      total: planRef.current?.order.length ?? 0,
      revealed: pointer,
    };
  }, [phase, board, approved, pointer]);

  // canal con el escenario
  useEffect(() => {
    const ch = openDrawChannel((e) => {
      if (e.type === 'hello') ch.post(snapshotRef.current);
    });
    channelRef.current = ch;
    return () => ch.close();
  }, []);

  const post = (e: DrawEvent) => channelRef.current?.post(e);

  const total = approved.length;

  const prepare = () => {
    const arr = shuffle(approved);
    const assignments: Assignment[] = arr.map((team, i) => ({
      team,
      group: LETTERS[i % LETTERS.length],
    }));
    planRef.current = { assignments, order: shuffle(assignments) };
    setBoard(emptyBoard(LETTERS));
    setPointer(0);
    setPrepared(true);
    setSaved(false);
  };

  const openStage = () => {
    window.open('/draw/stage', 'gravity_draw_stage', 'width=1280,height=720');
  };

  const doIntro = () => {
    if (!prepared) prepare();
    setBoard(emptyBoard(LETTERS));
    setPointer(0);
    setPhase('intro');
    post({ type: 'intro' });
  };

  const doParade = () => {
    if (!planRef.current) prepare();
    setPhase('parade');
    post({ type: 'parade', teams: approved });
  };

  const revealNext = () => {
    if (!planRef.current) prepare();
    const plan = planRef.current!;
    if (pointer >= plan.order.length) return;
    const item = plan.order[pointer];
    const idx = pointer + 1;
    post({ type: 'reveal', team: item.team, group: item.group, index: idx, total: plan.order.length });
    setBoard((b) => ({ ...b, [item.group]: [...b[item.group], item.team] }));
    setPointer(idx);
    setPhase('draw');
    if (idx >= plan.order.length) {
      setPhase('complete');
      post({ type: 'complete' });
    }
  };

  const resetShow = () => {
    planRef.current = null;
    setPrepared(false);
    setSaved(false);
    setBoard(emptyBoard(LETTERS));
    setPointer(0);
    setPhase('idle');
    post({ type: 'reset' });
  };

  const saveResult = async () => {
    if (!planRef.current) return;
    setBusy(true);
    try {
      await api.post('/groups/draw/commit', {
        assignments: planRef.current.assignments.map((a) => ({
          teamId: a.team.id,
          groupName: a.group,
        })),
      });
      setSaved(true);
      toast.success('Sorteo guardado', 'Ya se refleja en la llave y en las tablas.');
      load();
    } catch (e: any) {
      toast.error('Error al guardar el sorteo', e.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  const quickDraw = async () => {
    const ok = await confirm({
      title: 'Sorteo rápido',
      body: 'Reasignará TODOS los equipos aprobados a los grupos al azar, sin la animación en vivo. ¿Continuar?',
      confirmLabel: 'Sortear',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post('/groups/draw', {});
      toast.success('Sorteo rápido completado', 'Equipos repartidos en los grupos.');
      load();
    } catch (e: any) {
      toast.error('Error en el sorteo', e.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  // Tablas construidas desde la asignación REAL equipo→grupo (groups[].teams),
  // fusionando los stats de standings cuando existen. Así los grupos se ven
  // aunque las standings estén vacías.
  const savedGroups = useMemo(
    () =>
      groups.map((g) => {
        const gteams = g.teams || [];
        const rows = gteams
          .map((team) => {
            const st = standings.find((s) => s.teamId === team.id);
            return {
              id: st?.id || team.id,
              team,
              played: st?.played ?? 0,
              won: st?.won ?? 0,
              drawn: st?.drawn ?? 0,
              lost: st?.lost ?? 0,
              goalsFor: st?.goalsFor ?? 0,
              goalsAgainst: st?.goalsAgainst ?? 0,
              points: st?.points ?? 0,
              position: st?.position ?? null,
            };
          })
          .sort((a, b) => {
            if (a.position != null && b.position != null) return a.position - b.position;
            if (b.points !== a.points) return b.points - a.points;
            return b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst);
          });
        return { ...g, rows };
      }),
    [groups, standings],
  );

  const teamsInGroups = groups.reduce((n, g) => n + (g.teams?.length ?? 0), 0);
  const isDrawn = teamsInGroups > 0;
  const standingsMissing = isDrawn && standings.length === 0;

  // Sincroniza la fase de grupos con el sorteo: reconstruye las tablas y
  // rellena los cruces de los partidos de grupo en un solo paso.
  const syncGroups = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/groups/sync', {});
      toast.success(
        'Grupos sincronizados',
        `${data.standingsCreated} filas de tabla y ${data.assigned} cruces generados.`,
      );
      load();
    } catch (e: any) {
      toast.error('No se pudo sincronizar', e.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const done = pointer >= total && total > 0;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="kicker">Torneo</span>
          <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3">Grupos</h1>
        </div>
        <div className="flex items-center gap-2">
          {isDrawn && (
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-green border border-green/40 px-2.5 py-1.5 rounded">
              ✓ Sorteado
            </span>
          )}
          {(!isDrawn || drawOpen) && (
            <button className="btn" onClick={quickDraw} disabled={busy}>
              Sorteo rápido
            </button>
          )}
        </div>
      </div>

      {/* Panel compacto cuando ya está sorteado */}
      {isDrawn && !drawOpen && (
        <div className="card p-5 mb-8 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="font-display font-black italic uppercase tracking-tight text-xl">
              Grupos sorteados
            </div>
            <p className="font-mono text-[11px] text-mute mt-1.5 leading-relaxed">
              {teamsInGroups} equipos repartidos en {LETTERS.length} grupos. Las tablas están abajo.
              {standingsMissing && ' Las posiciones aparecen vacías — pulsa «Sincronizar grupos».'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {standingsMissing && (
              <button className="btn btn-ignite" onClick={syncGroups} disabled={busy}>
                Sincronizar grupos
              </button>
            )}
            <button className="btn" onClick={() => setDrawOpen(true)}>
              Volver a sortear
            </button>
          </div>
        </div>
      )}

      {/* ============ SORTEO EN VIVO ============ */}
      {(!isDrawn || drawOpen) && (
      <div className="card p-5 mb-8 border-ignite/30">
        {isDrawn && drawOpen && (
          <div className="flex justify-end mb-2">
            <button
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute hover:text-ignite"
              onClick={() => setDrawOpen(false)}
            >
              ✕ Ocultar sorteo
            </button>
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <div className="font-display font-black italic uppercase tracking-tight text-2xl">
            Sorteo en vivo
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute">
            {total} equipos · {LETTERS.length} grupos
          </span>
        </div>
        <p className="font-mono text-[11px] text-mute mb-5 leading-[1.7]">
          Abre la ventana de transmisión y ponla como <b className="text-ink">Browser Source</b> en
          OBS (URL <span className="text-ignite">/draw/stage</span>). Tú controlas el ritmo desde
          aquí; la animación sale en esa ventana.
        </p>

        {total === 0 ? (
          <p className="font-mono text-xs text-ignite">
            No hay equipos aprobados todavía. Aprueba inscripciones primero.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <button className="btn" onClick={openStage}>
                ⧉ Abrir transmisión
              </button>
              <span className="w-px h-7 bg-line mx-1" />
              <button className="btn" onClick={doIntro}>
                1 · Intro
              </button>
              <button className="btn" onClick={doParade}>
                2 · Presentar equipos
              </button>
              <button
                className="btn btn-ignite"
                onClick={revealNext}
                disabled={done}
              >
                {done ? '✓ Sorteo completo' : `Revelar siguiente → (${pointer}/${total})`}
              </button>
              <span className="w-px h-7 bg-line mx-1" />
              <button className="btn" onClick={resetShow}>
                Reiniciar
              </button>
              <button
                className="btn btn-ignite"
                onClick={saveResult}
                disabled={!done || busy || saved}
              >
                {saved ? '✓ Guardado' : busy ? 'Guardando…' : 'Guardar resultado'}
              </button>
            </div>

            {/* progreso */}
            <div className="mt-4 h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className="h-full bg-ignite rounded-full transition-[width] duration-500"
                style={{ width: `${total ? (pointer / total) * 100 : 0}%` }}
              />
            </div>

            {/* mirror del tablero */}
            {(phase === 'draw' || phase === 'complete') && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                {LETTERS.map((g) => (
                  <div key={g} className="card p-3">
                    <div className="font-display font-black italic uppercase tracking-tight text-sm mb-2 flex justify-between">
                      <span>Grupo {g}</span>
                      <span className="font-mono text-[10px] text-mute">{board[g].length}/4</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {board[g].map((t) => (
                        <div key={t.id} className="flex items-center gap-2 min-w-0">
                          {t.shieldUrl ? (
                            <img src={fileUrl(t.shieldUrl)} className="w-5 h-5 rounded object-cover border border-line shrink-0" />
                          ) : (
                            <span className="w-5 h-5 rounded bg-void border border-line shrink-0" />
                          )}
                          <span className="font-mono text-[11px] truncate">{t.name}</span>
                        </div>
                      ))}
                      {board[g].length === 0 && (
                        <span className="font-mono text-[10px] text-mute">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saved && (
              <div className="font-mono text-xs text-green mt-4">
                Resultado guardado. Ya se refleja en la llave y en las tablas.
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* ============ GRUPOS GUARDADOS ============ */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl">Tablas</h2>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
          {LETTERS.length} grupos · clasifican 1° y 2°
        </span>
      </div>

      {savedGroups.length > 0 && (
        <FilterBar>
          <ChipGroup
            label="Grupo"
            value={fGroup}
            onChange={setFGroup}
            options={[{ value: 'all', label: 'Todos' }, ...savedGroups.map((g) => ({ value: g.name, label: g.name }))]}
          />
          <SearchBox value={fTeam} onChange={setFTeam} placeholder="Buscar equipo…" />
        </FilterBar>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {savedGroups
          .filter((g) => fGroup === 'all' || g.name === fGroup)
          .map((g) => {
            const term = fTeam.trim().toLowerCase();
            const rows = term ? g.rows.filter((s) => (s.team?.name || '').toLowerCase().includes(term)) : g.rows;
            return (
              <div key={g.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-void-2">
                  <span className="font-display font-black italic uppercase tracking-tight text-xl">Grupo {g.name}</span>
                  <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-mute">
                    {g.rows.length} equipos
                  </span>
                </div>
                {/* encabezado de columnas */}
                <div className="grid grid-cols-[22px_1fr_26px_26px_26px_26px_34px_36px] gap-x-1.5 px-4 py-2 font-mono text-[9px] tracking-[0.1em] uppercase text-mute border-b border-line-2">
                  <span>#</span>
                  <span>Equipo</span>
                  <span className="text-center">PJ</span>
                  <span className="text-center">G</span>
                  <span className="text-center">E</span>
                  <span className="text-center">P</span>
                  <span className="text-center">DG</span>
                  <span className="text-right">Pts</span>
                </div>
                {rows.length === 0 ? (
                  <p className="font-mono text-xs text-mute px-4 py-3">
                    {term ? 'Sin coincidencias.' : 'Sin equipos.'}
                  </p>
                ) : (
                  rows.map((s, i) => {
                    const pos = s.position ?? i + 1;
                    const top2 = pos <= 2;
                    const dg = s.goalsFor - s.goalsAgainst;
                    return (
                      <div
                        key={s.id}
                        className={`grid grid-cols-[22px_1fr_26px_26px_26px_26px_34px_36px] gap-x-1.5 px-4 py-2 items-center border-b border-line-2 last:border-0 ${
                          top2 ? 'bg-ignite/[0.05]' : ''
                        }`}
                      >
                        <span className={`font-display font-black italic tabular-nums ${top2 ? 'text-ignite' : 'text-mute'}`}>
                          {pos}
                        </span>
                        <span className="font-display font-bold text-sm truncate">{s.team?.name}</span>
                        <span className="text-center font-mono text-[13px] text-mute tabular-nums">{s.played}</span>
                        <span className="text-center font-mono text-[13px] tabular-nums">{s.won}</span>
                        <span className="text-center font-mono text-[13px] tabular-nums">{s.drawn}</span>
                        <span className="text-center font-mono text-[13px] tabular-nums">{s.lost}</span>
                        <span className="text-center font-mono text-[13px] tabular-nums">
                          {dg > 0 ? '+' : ''}
                          {dg}
                        </span>
                        <span className="text-right font-display font-black italic text-base tabular-nums">{s.points}</span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
