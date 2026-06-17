import { useEffect, useRef, useState } from 'react';
import { fileBase } from '../lib/api';
import {
  GROUPS,
  emptyBoard,
  openDrawChannel,
  type Board,
  type DrawEvent,
  type GroupName,
  type Phase,
  type TeamLite,
} from '../lib/drawChannel';

const fileUrl = (u: string | null) => (u ? (u.startsWith('http') ? u : `${fileBase}${u}`) : '');
const initials = (n: string) => n.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 2).toUpperCase() || '??';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Escudo o iniciales */
function Crest({ team, size }: { team: TeamLite; size: number }) {
  const src = fileUrl(team.shieldUrl);
  return src ? (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-lg object-cover border border-line shrink-0"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg bg-void-2 border border-line grid place-items-center font-display font-black text-mute shrink-0"
    >
      {initials(team.name)}
    </div>
  );
}

export default function DrawStage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [parade, setParade] = useState<TeamLite[]>([]);
  const [counter, setCounter] = useState<{ i: number; total: number }>({ i: 0, total: 0 });

  // estado de la animación del reveal actual
  const [orb, setOrb] = useState<{ team: TeamLite; group: GroupName; reel: string; locked: boolean } | null>(null);
  const [pulse, setPulse] = useState<GroupName | null>(null);
  const [flash, setFlash] = useState(false);

  const queue = useRef<Extract<DrawEvent, { type: 'reveal' }>[]>([]);
  const busy = useRef(false);
  const paradeRef = useRef<TeamLite[]>([]);

  // -------- cola de reveals (se procesan de a uno, animados) --------
  const processQueue = async () => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) return;
    busy.current = true;
    setPhase('draw');

    const pool = paradeRef.current.length ? paradeRef.current : [next.team];
    setOrb({ team: next.team, group: next.group, reel: next.team.name, locked: false });

    // 1) tómbola: cicla nombres
    const reelEnd = Date.now() + 1100;
    while (Date.now() < reelEnd) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      setOrb((o) => (o ? { ...o, reel: r.name } : o));
      await sleep(70);
    }

    // 2) bloqueo en el equipo real
    setOrb((o) => (o ? { ...o, reel: next.team.name, locked: true } : o));
    setFlash(true);
    await sleep(260);
    setFlash(false);
    await sleep(620);

    // 3) cae al grupo
    setBoard((b) => ({ ...b, [next.group]: [...b[next.group], next.team] }));
    setPulse(next.group);
    setCounter({ i: next.index, total: next.total });
    setOrb(null);
    await sleep(520);
    setPulse(null);

    busy.current = false;
    if (queue.current.length) processQueue();
  };

  useEffect(() => {
    const onMessage = (e: DrawEvent) => {
      switch (e.type) {
        case 'intro':
          queue.current = [];
          busy.current = false;
          setOrb(null);
          setBoard(emptyBoard());
          setCounter({ i: 0, total: 0 });
          setPhase('intro');
          break;
        case 'parade':
          paradeRef.current = e.teams;
          setParade(e.teams);
          setPhase('parade');
          break;
        case 'reveal':
          queue.current.push(e);
          processQueue();
          break;
        case 'complete':
          setPhase('complete');
          break;
        case 'reset':
          queue.current = [];
          busy.current = false;
          setOrb(null);
          setBoard(emptyBoard());
          setParade([]);
          setCounter({ i: 0, total: 0 });
          setPhase('idle');
          break;
        case 'sync':
          // catch-up sin animación (escenario reabierto a mitad del show)
          paradeRef.current = e.parade;
          setParade(e.parade);
          setBoard(e.board);
          setCounter({ i: e.revealed, total: e.total });
          setOrb(null);
          setPhase(e.phase);
          break;
      }
    };
    const ch = openDrawChannel(onMessage);
    ch.post({ type: 'hello' }); // pedir estado por si el deck ya empezó
    return () => ch.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="draw-stage cursor-host">
      <div className="grain" />
      <div className="cover-halo" />
      {flash && <div className="draw-flash" />}

      {/* marca + contador */}
      <div className="draw-topbar">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-ignite">
            ● Sorteo en vivo
          </span>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-mute">
            Temporada 01
          </span>
        </div>
        {(phase === 'draw' || phase === 'complete') && counter.total > 0 && (
          <div className="font-display font-black tabular-nums text-2xl tracking-tight">
            <span className="text-ignite">{String(counter.i).padStart(2, '0')}</span>
            <span className="text-mute"> / {counter.total}</span>
          </div>
        )}
      </div>

      {/* ---------- IDLE ---------- */}
      {phase === 'idle' && (
        <div className="draw-center">
          <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
            En breve
          </span>
          <h1 className="wordmark lit draw-bigword">
            GRAV<span className="o">I</span>TY
          </h1>
          <p className="font-mono text-sm tracking-[0.3em] uppercase text-mute mt-4">
            El sorteo está por comenzar
          </p>
        </div>
      )}

      {/* ---------- INTRO ---------- */}
      {phase === 'intro' && (
        <div className="draw-center">
          <span className="kicker justify-center draw-pop" style={{ display: 'inline-flex' }}>
            Temporada 01 · Sorteo de grupos
          </span>
          <h1 className="draw-title font-display font-black uppercase tracking-tight">
            El sorteo
          </h1>
          <p className="draw-pop font-display text-[clamp(18px,2.4vw,30px)] text-mute mt-4">
            16 equipos · 4 grupos · una sola final
          </p>
        </div>
      )}

      {/* ---------- PARADE ---------- */}
      {phase === 'parade' && (
        <div className="draw-body">
          <div className="text-center mb-8">
            <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
              Los participantes
            </span>
            <h2 className="font-display font-black uppercase tracking-tight text-[clamp(32px,5vw,68px)] leading-none mt-3">
              {parade.length} equipos en órbita
            </h2>
          </div>
          <div className="draw-parade-grid">
            {parade.map((t, i) => (
              <div key={t.id} className="draw-parade-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <Crest team={t} size={52} />
                <span className="font-display font-bold uppercase tracking-tight truncate">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- DRAW / COMPLETE ---------- */}
      {(phase === 'draw' || phase === 'complete') && (
        <div className="draw-body">
          <div className="draw-groups">
            {GROUPS.map((g) => (
              <div key={g} className={`draw-col ${pulse === g ? 'is-hot' : ''}`}>
                <div className="draw-col-head">
                  <span className="font-display font-black uppercase tracking-tight text-2xl">
                    Grupo {g}
                  </span>
                  <span className="font-mono text-[11px] text-mute tabular-nums">
                    {board[g].length}/4
                  </span>
                </div>
                <div className="draw-col-body">
                  {board[g].map((t) => (
                    <div key={t.id} className="draw-chip">
                      <Crest team={t} size={34} />
                      <span className="font-display font-bold uppercase tracking-tight truncate text-[15px]">
                        {t.name}
                      </span>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - board[g].length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="draw-chip is-empty">
                      <span className="font-mono text-[11px] text-mute tracking-[0.2em]">—</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {phase === 'complete' && (
            <div className="draw-finale">
              <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
                Listo
              </span>
              <div className="font-display font-black uppercase tracking-tight text-[clamp(36px,6vw,84px)] leading-none mt-2 text-ignite">
                Grupos definidos
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- ORBE DEL REVEAL ---------- */}
      {orb && (
        <div className="draw-orb-layer">
          <div className={`draw-orb ${orb.locked ? 'is-locked' : ''}`}>
            <div className="draw-orb-ring" />
            {orb.locked ? (
              <div className="flex flex-col items-center gap-3">
                <Crest team={orb.team} size={72} />
                <span className="font-display font-black uppercase tracking-tight text-[clamp(28px,4vw,52px)] leading-none text-center">
                  {orb.team.name}
                </span>
                <span className="draw-arrow font-mono text-sm tracking-[0.3em] uppercase text-ignite">
                  → Grupo {orb.group}
                </span>
              </div>
            ) : (
              <span className="font-display font-black uppercase tracking-tight text-[clamp(28px,4vw,52px)] leading-none text-center text-mute">
                {orb.reel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
