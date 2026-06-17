import { useEffect, useMemo, useRef, useState } from 'react';
import { api, fileBase } from '../../lib/api';
import { Spinner } from '../../components/ui';
import {
  GROUPS,
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // -------- sorteo en vivo --------
  const [approved, setApproved] = useState<TeamLite[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [pointer, setPointer] = useState(0);
  const [prepared, setPrepared] = useState(false);
  const [saved, setSaved] = useState(false);

  const planRef = useRef<{ order: Assignment[]; assignments: Assignment[] } | null>(null);
  const channelRef = useRef<ReturnType<typeof openDrawChannel> | null>(null);
  const snapshotRef = useRef<DrawEvent>({
    type: 'sync',
    phase: 'idle',
    board: emptyBoard(),
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
            .map((x) => ({ id: x.id, name: x.name, shieldUrl: x.shieldUrl })),
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
    const assignments: Assignment[] = arr.map((team, i) => ({ team, group: GROUPS[i % 4] }));
    planRef.current = { assignments, order: shuffle(assignments) };
    setBoard(emptyBoard());
    setPointer(0);
    setPrepared(true);
    setSaved(false);
  };

  const openStage = () => {
    window.open('/draw/stage', 'gravity_draw_stage', 'width=1280,height=720');
  };

  const doIntro = () => {
    if (!prepared) prepare();
    setBoard(emptyBoard());
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
    setBoard(emptyBoard());
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
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al guardar el sorteo');
    } finally {
      setBusy(false);
    }
  };

  const quickDraw = async () => {
    if (!confirm('Sorteo rápido (sin show): reasignará todos los equipos aprobados.')) return;
    setBusy(true);
    try {
      await api.post('/groups/draw', {});
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error en el sorteo');
    } finally {
      setBusy(false);
    }
  };

  const savedGroups = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        rows: standings
          .filter((s) => s.groupId === g.id)
          .sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
      })),
    [groups, standings],
  );

  if (loading) return <Spinner />;

  const done = pointer >= total && total > 0;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="kicker">Torneo</span>
          <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3">Grupos</h1>
        </div>
        <button className="btn" onClick={quickDraw} disabled={busy}>
          Sorteo rápido
        </button>
      </div>

      {/* ============ SORTEO EN VIVO ============ */}
      <div className="card p-5 mb-8 border-ignite/30">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <div className="font-display font-black uppercase tracking-tight text-2xl">
            Sorteo en vivo
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute">
            {total} equipos · 4 grupos
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
                {GROUPS.map((g) => (
                  <div key={g} className="card p-3">
                    <div className="font-display font-black uppercase tracking-tight text-sm mb-2 flex justify-between">
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

      {/* ============ GRUPOS GUARDADOS ============ */}
      <div className="grid md:grid-cols-2 gap-5">
        {savedGroups.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="font-display font-black text-2xl mb-3">Grupo {g.name}</div>
            <table className="w-full font-mono text-xs">
              <thead className="text-mute">
                <tr className="text-left">
                  <th className="py-1">#</th>
                  <th>Equipo</th>
                  <th className="text-center">PJ</th>
                  <th className="text-center">DG</th>
                  <th className="text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-2 text-mute">
                      Sin equipos
                    </td>
                  </tr>
                )}
                {g.rows.map((s, i) => (
                  <tr key={s.id} className="border-t border-line-2">
                    <td className="py-2">{i + 1}</td>
                    <td className="font-display font-semibold text-sm">{s.team?.name}</td>
                    <td className="text-center">{s.played}</td>
                    <td className="text-center">{s.goalsFor - s.goalsAgainst}</td>
                    <td className="text-center font-bold text-ignite">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
