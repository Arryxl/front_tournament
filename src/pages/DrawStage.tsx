import { useEffect, useRef, useState } from 'react';
import { fileBase } from '../lib/api';
import { useSettings } from '../lib/useSettings';
import {
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

const RANK_LABEL: Record<string, string> = {
  plat3: 'Platino 3', plat4: 'Platino 4', dia1: 'Diamante 1', dia2: 'Diamante 2',
  dia3: 'Diamante 3', champ1: 'Champion 1', champ2: 'Champion 2', champ3: 'Champion 3',
};
const rankLabel = (r: string | null) => (r ? RANK_LABEL[r] || r : 'Sin rango');

// Frases de relleno para que el caster tenga lore al presentar cada equipo.
const LORE = [
  'Tres pilotos, una sola órbita.',
  'Vienen a quedarse en la cima del cuadro.',
  'Sin miedo a la prórroga.',
  'Boost cargado y la mira puesta en la final.',
  'Aéreos, demos y cero excusas.',
  'No perdonan un rebote dentro del área.',
  'Listos para desafiar la gravedad.',
  'Química por encima del rango.',
  'De los que se crecen bajo presión.',
  'Velocidad de escape activada.',
  'Un kickoff y ya están en tu área.',
  'Defienden como muralla, atacan como cohete.',
  'El caos es su zona de confort.',
  'Cada save es una declaración.',
  'Juegan corto, piensan en la copa.',
  'Pisan la cancha como si fuera la final.',
];

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

type OrbState = {
  team: TeamLite;
  group: GroupName;
  reel: string;
  stage: 'reel' | 'locked';
  shown: number; // jugadores revelados
  lore: string;
};

export default function DrawStage() {
  const settings = useSettings();
  const LETTERS = settings.groupLetters;
  const qualified = LETTERS.length * 2;

  const [phase, setPhase] = useState<Phase>('idle');
  const [board, setBoard] = useState<Board>(emptyBoard(LETTERS));
  const [parade, setParade] = useState<TeamLite[]>([]);
  const [counter, setCounter] = useState<{ i: number; total: number }>({ i: 0, total: 0 });

  // estado de la animación del reveal actual
  const [orb, setOrb] = useState<OrbState | null>(null);
  const [pulse, setPulse] = useState<GroupName | null>(null);
  const [flash, setFlash] = useState(false);

  const queue = useRef<Extract<DrawEvent, { type: 'reveal' }>[]>([]);
  const busy = useRef(false);
  const paradeRef = useRef<TeamLite[]>([]);
  // Letras vigentes accesibles desde el closure del canal (evita stale state).
  const lettersRef = useRef<readonly string[]>(LETTERS);
  lettersRef.current = LETTERS;

  // -------- cola de reveals (se procesan de a uno, animados) --------
  const processQueue = async () => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) return;
    busy.current = true;
    setPhase('draw');

    const pool = paradeRef.current.length ? paradeRef.current : [next.team];
    const players = next.team.players ?? [];
    const lore = LORE[(next.index - 1 + LORE.length) % LORE.length];
    setOrb({ team: next.team, group: next.group, reel: next.team.name, stage: 'reel', shown: 0, lore });

    // 1) tómbola: cicla nombres de equipos
    const reelEnd = Date.now() + 1000;
    while (Date.now() < reelEnd) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      setOrb((o) => (o ? { ...o, reel: r.name } : o));
      await sleep(68);
    }

    // 2) bloqueo en el equipo real
    setOrb((o) => (o ? { ...o, reel: next.team.name, stage: 'locked' } : o));
    setFlash(true);
    await sleep(240);
    setFlash(false);
    await sleep(640);

    // 3) revela la alineación, jugador por jugador (ritmo pausado para narrar)
    for (let k = 0; k < players.length; k++) {
      setOrb((o) => (o ? { ...o, shown: k + 1 } : o));
      await sleep(players.length > 4 ? 950 : 1100);
    }
    // 4) sostiene la alineación completa + destino antes de soltar
    await sleep(900);

    // 5) cae al grupo
    setBoard((b) => ({ ...b, [next.group]: [...(b[next.group] ?? []), next.team] }));
    setPulse(next.group);
    setCounter({ i: next.index, total: next.total });
    await sleep(360);
    setOrb(null);
    await sleep(560);
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
          setBoard(emptyBoard(lettersRef.current));
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
          setBoard(emptyBoard(lettersRef.current));
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

  const orbPlayers = orb?.team.players ?? [];
  const rosterDone = !!orb && orb.shown >= orbPlayers.length;

  return (
    <div className="draw-stage cursor-host">
      <div className="grain" />
      <div className="cover-halo" />
      {flash && <div className="draw-flash" />}

      {/* marca + contador */}
      <div className="draw-topbar">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-ignite live-dot flex items-center gap-2">
            Sorteo en vivo
          </span>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-mute">
            Gravity · Temporada 01
          </span>
        </div>
        {(phase === 'draw' || phase === 'complete') && counter.total > 0 && (
          <div className="font-display font-black italic tabular-nums text-2xl tracking-tight">
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
          <h1 className="draw-title font-display font-black italic uppercase tracking-tight">
            El sorteo
          </h1>
          <p className="draw-pop font-display text-[clamp(18px,2.4vw,30px)] text-ink mt-4 max-w-[22ch] mx-auto leading-[1.2]">
            {settings.teamCount} equipos. {LETTERS.length} grupos.{' '}
            <span className="text-ignite">Una sola final.</span>
          </p>
          <p className="draw-pop font-mono text-[clamp(11px,1.2vw,14px)] tracking-[0.22em] uppercase text-mute mt-6" style={{ animationDelay: '0.35s' }}>
            Hoy se decide el camino hacia la copa
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
            <h2 className="font-display font-black italic uppercase tracking-tight text-[clamp(32px,5vw,68px)] leading-none mt-3">
              {parade.length} equipos en órbita
            </h2>
            <p className="font-mono text-[clamp(11px,1.2vw,14px)] tracking-[0.2em] uppercase text-mute mt-4">
              Solo {qualified} cruzarán a la fase eliminatoria
            </p>
          </div>
          <div className="draw-parade-grid">
            {parade.map((t, i) => (
              <div key={t.id} className="draw-parade-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <Crest team={t} size={52} />
                <div className="min-w-0">
                  <span className="block font-display font-bold uppercase tracking-tight truncate">{t.name}</span>
                  {t.players && t.players.length > 0 && (
                    <span className="block font-mono text-[10px] tracking-[0.14em] uppercase text-mute truncate">
                      {t.players.length} jugadores
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- DRAW / COMPLETE ---------- */}
      {(phase === 'draw' || phase === 'complete') && (
        <div className="draw-body">
          <div className="draw-groups">
            {LETTERS.map((g) => (
              <div key={g} className={`draw-col ${pulse === g ? 'is-hot' : ''}`}>
                <div className="draw-col-head">
                  <span className="font-display font-black italic uppercase tracking-tight text-2xl">
                    Grupo {g}
                  </span>
                  <span className="font-mono text-[11px] text-mute tabular-nums">
                    {(board[g] ?? []).length}/4
                  </span>
                </div>
                <div className="draw-col-body">
                  {(board[g] ?? []).map((t) => (
                    <div key={t.id} className="draw-chip">
                      <Crest team={t} size={34} />
                      <span className="font-display font-bold uppercase tracking-tight truncate text-[15px]">
                        {t.name}
                      </span>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - (board[g] ?? []).length) }).map((_, i) => (
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
              <div className="font-display font-black italic uppercase tracking-tight text-[clamp(36px,6vw,84px)] leading-none mt-2 text-ignite">
                Grupos definidos
              </div>
              <p className="font-display text-[clamp(15px,1.8vw,22px)] text-mute mt-4">
                Que empiece la carrera por la copa.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------- ORBE DEL REVEAL ---------- */}
      {orb && (
        <div className="draw-orb-layer">
          {orb.stage === 'reel' ? (
            <div className="draw-orb">
              <div className="draw-orb-ring" />
              <div className="draw-orb-cue font-mono text-[11px] tracking-[0.3em] uppercase text-mute">
                Sorteando equipo…
              </div>
              <span className="font-display font-black italic uppercase tracking-tight text-[clamp(28px,4vw,52px)] leading-none text-center text-mute">
                {orb.reel}
              </span>
            </div>
          ) : (
            <div className="draw-reveal">
              {/* cabecera del equipo */}
              <div className="draw-reveal-head">
                <Crest team={orb.team} size={84} />
                <div className="min-w-0">
                  <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-ignite mb-1.5">
                    Equipo {String(counter.i + 1).padStart(2, '0')}
                  </div>
                  <div className="font-display font-black italic uppercase tracking-tight text-[clamp(30px,4.4vw,60px)] leading-[0.9]">
                    {orb.team.name}
                  </div>
                  <div className="draw-reveal-lore font-display text-[clamp(14px,1.6vw,20px)] text-mute mt-2 italic">
                    “{orb.lore}”
                  </div>
                </div>
              </div>

              {/* alineación, jugador por jugador */}
              {orbPlayers.length > 0 && (
                <div className="draw-roster">
                  <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-mute mb-2">
                    Alineación
                  </div>
                  {orbPlayers.map((p, i) => (
                    <div
                      key={i}
                      className={`draw-roster-row ${i < orb.shown ? 'in' : ''} ${p.sub ? 'is-sub' : ''}`}
                    >
                      <span className="draw-roster-num font-mono text-[11px] text-mute tabular-nums">
                        {p.sub ? 'S' : i + 1}
                      </span>
                      <span className="draw-roster-name font-display font-bold uppercase tracking-tight truncate">
                        {p.isCaptain && <span className="text-ignite">★ </span>}
                        {p.name}
                      </span>
                      <span className="draw-roster-rank font-mono text-[10px] tracking-[0.12em] uppercase text-mute shrink-0">
                        {p.sub ? 'Suplente' : rankLabel(p.rank)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* destino */}
              <div className={`draw-reveal-dest ${rosterDone ? 'in' : ''}`}>
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-mute">Destino</span>
                <span className="font-display font-black italic uppercase tracking-tight text-[clamp(26px,3.4vw,44px)] leading-none text-ignite">
                  Grupo {orb.group}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
