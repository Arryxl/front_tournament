import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { OrbitMark, Wordmark } from '../components/brand';
import { SocialRow } from '../components/Socials';
import { SCHEDULE, SOCIALS, TOURNAMENT } from '../config';
import type { Match } from '../types';

/* ---------------- Countdown ---------------- */
function useCountdown(target: string) {
  const [parts, setParts] = useState({ d: '00', h: '00', m: '00', s: '00', done: false });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setParts({ d: '00', h: '00', m: '00', s: '00', done: true });
      const p = (n: number) => String(n).padStart(2, '0');
      setParts({
        d: p(Math.floor(diff / 86400000)),
        h: p(Math.floor((diff % 86400000) / 3600000)),
        m: p(Math.floor((diff % 3600000) / 60000)),
        s: p(Math.floor((diff % 60000) / 1000)),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return parts;
}

function CountdownBox({ target }: { target: string }) {
  const { d, h, m, s, done } = useCountdown(target);
  if (done)
    return <span className="font-mono text-ignite tracking-[0.2em]">INSCRIPCIONES CERRADAS</span>;
  const cells = [
    [d, 'días'],
    [h, 'hrs'],
    [m, 'min'],
    [s, 'seg'],
  ];
  return (
    <div className="flex gap-px bg-line border border-line">
      {cells.map(([v, l]) => (
        <div key={l} className="bg-void px-4 py-3 text-center min-w-[64px]">
          <div className="font-display font-extrabold text-2xl md:text-3xl tabular-nums leading-none">
            {v}
          </div>
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-mute mt-1.5">{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Branded match card ---------------- */
function LiveMatch({ match }: { match: Match }) {
  const date = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })
    : 'Por definir';
  return (
    <div className="border border-line rounded-lg overflow-hidden bg-void-2 lift">
      <div className="px-5 py-3 flex justify-between items-center border-b border-line font-mono text-[10px] tracking-[0.18em] uppercase text-mute">
        <span>{match.matchCode} · {match.format.toUpperCase()}</span>
        {match.status === 'live' ? (
          <span className="text-ignite flex items-center gap-2 live-dot">EN VIVO</span>
        ) : (
          <span>{date}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-display font-extrabold uppercase text-lg md:text-xl leading-none tracking-tight">
            {match.teamHome?.name || 'Por definir'}
          </span>
          <span className="font-mono text-[10px] text-mute tracking-[0.14em]">LOCAL</span>
        </div>
        <div className="font-display font-extrabold text-3xl md:text-4xl px-4 flex gap-2 tabular-nums">
          <span className={match.winnerId && match.winnerId === match.teamHomeId ? 'text-ignite' : ''}>
            {match.homeScore ?? '–'}
          </span>
          <span className="text-mute font-light">:</span>
          <span className={match.winnerId && match.winnerId === match.teamAwayId ? 'text-ignite' : ''}>
            {match.awayScore ?? '–'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 items-end text-right">
          <span className="font-display font-extrabold uppercase text-lg md:text-xl leading-none tracking-tight">
            {match.teamAway?.name || 'Por definir'}
          </span>
          <span className="font-mono text-[10px] text-mute tracking-[0.14em]">VISITA</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
const PRINCIPLES = [
  {
    n: 'F1',
    title: 'Masa',
    text: 'El peso del juego. Tres jugadores, un objetivo, cero excusas. Lo que pesa, queda.',
    icon: <circle cx="18" cy="18" r="11" fill="#FF4D17" />,
    vb: '0 0 36 36',
    w: 36,
  },
  {
    n: 'F2',
    title: 'Momento',
    text: 'Velocidad con dirección. Cada partido empuja el bracket hacia la final: nunca estático.',
    icon: (
      <>
        <path d="M2 18h44" stroke="#FF4D17" strokeWidth="2" />
        <path d="M40 11l8 7-8 7" stroke="#FF4D17" strokeWidth="2" />
      </>
    ),
    vb: '0 0 56 36',
    w: 56,
  },
  {
    n: 'F3',
    title: 'Arco',
    text: 'La curva del tiro aéreo. La parábola perfecta entre el saque inicial y el gol de la final.',
    icon: <path d="M2 34C2 14 22 2 28 2s26 12 26 32" stroke="#FF4D17" strokeWidth="2" />,
    vb: '0 0 56 36',
    w: 56,
  },
];

export default function Landing() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    api.get('/matches').then((r) => setMatches(r.data)).catch(() => {});
  }, []);

  const upcoming = useMemo(() => {
    const live = matches.filter((m) => m.status === 'live');
    const next = matches.filter((m) => m.status === 'scheduled');
    return [...live, ...next].slice(0, 4);
  }, [matches]);

  return (
    <div>
      {/* ============ COVER ============ */}
      <section className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden px-[var(--pad)] pt-20">
        <div className="cover-halo" />
        <OrbitMark className="hidden md:block absolute right-[var(--pad)] top-[16vh] w-[clamp(90px,12vw,170px)] opacity-90 z-[1]" />

        <div className="max-w-[1240px] mx-auto w-full relative z-[2]">
          <div className="reveal flex flex-wrap justify-between gap-4 font-mono text-[11px] tracking-[0.18em] uppercase text-mute mb-[clamp(24px,5vh,56px)]">
            <span>LIGA — <b className="text-ink font-normal">ROCKET LEAGUE</b></span>
            <span>FORMATO · <b className="text-ink font-normal">{TOURNAMENT.format}</b></span>
            <span>TEMPORADA · <b className="text-ink font-normal">{TOURNAMENT.season}</b></span>
          </div>

          <h1 className="reveal">
            <Wordmark animateRing style={{ fontSize: 'clamp(64px,17vw,240px)' }} />
          </h1>

          <div className="reveal flex flex-wrap justify-between items-end gap-6 mt-[clamp(28px,5vh,52px)] pt-6 border-t border-line">
            <p className="font-serif italic text-[clamp(18px,2.4vw,30px)] max-w-[24ch]">
              {TOURNAMENT.tagline}
            </p>
            <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-mute text-right leading-[2]">
              RANGO · <b className="text-ignite font-normal">{TOURNAMENT.rankRange}</b><br />
              PLATAFORMA · <b className="text-ink font-normal">{TOURNAMENT.platform}</b><br />
              ENTRADA · <b className="text-green font-normal">{TOURNAMENT.free ? 'GRATIS' : 'DE PAGO'}</b>
            </div>
          </div>

          <div className="reveal flex flex-wrap items-center gap-4 mt-10">
            <Link to="/register" className="btn btn-ignite">Inscribe tu equipo</Link>
            <a href={SOCIALS.discord} target="_blank" rel="noreferrer" className="btn">
              Únete al Discord
            </a>
            <div className="flex items-center gap-4 ml-auto">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                Cierran en
              </span>
              <CountdownBox target={TOURNAMENT.registrationClose} />
            </div>
          </div>
        </div>

        <div className="scrollcue absolute bottom-7 left-1/2 -translate-x-1/2 z-[3]">
          <span>SCROLL</span>
          <span className="bar" />
        </div>
      </section>

      {/* ============ CONCEPTO ============ */}
      <section className="px-[var(--pad)] py-[clamp(80px,12vh,150px)] border-t border-line-2">
        <div className="max-w-[1240px] mx-auto">
          <span className="kicker reveal">01 / Qué es Gravity</span>
          <h2 className="reveal font-display font-extrabold uppercase text-[clamp(40px,8vw,108px)] leading-[0.92] tracking-tight mt-4">
            La física<br />como juego
          </h2>
          <p className="reveal font-serif italic text-[clamp(20px,3vw,38px)] leading-[1.25] max-w-[20ch] mt-10 mb-16">
            La pelota tiene masa, el coche tiene momento y cada jugada es un arco que termina en el
            fondo de una red.
          </p>

          <div className="grid md:grid-cols-3 gap-px bg-line border border-line">
            {PRINCIPLES.map((p) => (
              <div
                key={p.n}
                className="reveal bg-void p-[clamp(28px,3vw,44px)] min-h-[320px] flex flex-col justify-between relative lift"
              >
                <span className="font-mono text-[11px] tracking-[0.2em] text-mute">[ {p.n} ]</span>
                <svg
                  width={p.w}
                  height={36}
                  viewBox={p.vb}
                  fill="none"
                  className="absolute top-6 right-6 opacity-50"
                >
                  {p.icon}
                </svg>
                <div>
                  <h3 className="font-display font-extrabold uppercase text-[clamp(28px,3.4vw,46px)] leading-none tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-mute text-sm max-w-[32ch] mt-3.5">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FORMATO ============ */}
      <section className="px-[var(--pad)] py-[clamp(80px,12vh,150px)] border-t border-line-2 grid-paper">
        <div className="max-w-[1240px] mx-auto">
          <span className="kicker reveal">02 / El formato</span>
          <h2 className="reveal font-display font-extrabold uppercase text-[clamp(40px,8vw,108px)] leading-[0.92] tracking-tight mt-4 mb-14">
            16 equipos.<br />Una caída.
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line mb-12">
            {[
              ['16', 'Equipos'],
              ['4', 'Grupos de 4'],
              ['32', 'Partidos'],
              ['3v3', 'En cancha'],
            ].map(([num, label]) => (
              <div key={label} className="reveal bg-void p-7 lift">
                <div className="font-display font-extrabold text-[clamp(44px,7vw,88px)] leading-none tracking-tight">
                  {num}
                </div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mt-3">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-line border border-line">
            {[
              ['Fase de grupos', 'Cuatro grupos de cuatro juegan todos contra todos. Los dos mejores de cada grupo avanzan.'],
              ['Eliminatoria', 'Ocho equipos a muerte súbita: cuartos (BO3), semifinales (BO5) y la antesala del título.'],
              ['Gran final', 'Best of 7. Un solo campeón levanta la copa Gravity y se lleva el premio en efectivo.'],
            ].map(([t, d]) => (
              <div key={t} className="reveal bg-void p-7">
                <h4 className="font-display font-extrabold uppercase text-lg tracking-tight">{t}</h4>
                <p className="text-mute text-sm mt-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PREMIO ============ */}
      <section className="px-[var(--pad)] py-[clamp(80px,12vh,150px)] border-t border-line-2 relative overflow-hidden">
        <div className="cover-halo opacity-60" />
        <div className="max-w-[1240px] mx-auto relative z-[2] text-center">
          <span className="kicker reveal justify-center" style={{ display: 'inline-flex' }}>
            03 / El premio
          </span>
          <div className="reveal font-mono text-[11px] tracking-[0.25em] uppercase text-mute mt-6">
            {TOURNAMENT.prize.label}
          </div>
          <div className="reveal font-display font-extrabold uppercase text-[clamp(48px,13vw,180px)] leading-[0.85] tracking-tight mt-3 text-ignite">
            {TOURNAMENT.prize.amount}
          </div>
          <p className="reveal font-serif italic text-[clamp(18px,2.4vw,28px)] text-ink mt-8 max-w-[28ch] mx-auto">
            El que sube más alto, cae con el trofeo. Inscripción 100% gratuita.
          </p>
          <div className="reveal mt-10 flex justify-center">
            <Link to="/register" className="btn btn-ignite">Quiero competir</Link>
          </div>
        </div>
      </section>

      {/* ============ CÓMO FUNCIONA / TIMELINE ============ */}
      <section className="px-[var(--pad)] py-[clamp(80px,12vh,150px)] border-t border-line-2">
        <div className="max-w-[1240px] mx-auto">
          <span className="kicker reveal">04 / La ruta</span>
          <h2 className="reveal font-display font-extrabold uppercase text-[clamp(40px,8vw,108px)] leading-[0.92] tracking-tight mt-4 mb-14">
            Hasta la<br />final
          </h2>
          <div className="border-t border-line">
            {SCHEDULE.map((s) => (
              <div
                key={s.label}
                className="reveal grid grid-cols-[90px_1fr] md:grid-cols-[140px_120px_1fr] gap-4 items-center py-5 border-b border-line group"
              >
                <span className="font-display font-extrabold text-xl md:text-3xl tracking-tight group-hover:text-ignite transition-colors">
                  {s.date}
                </span>
                <span className="hidden md:inline font-mono text-[10px] tracking-[0.2em] uppercase text-ignite">
                  {s.tag}
                </span>
                <span className="font-mono text-sm text-mute">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PARTIDOS ============ */}
      {upcoming.length > 0 && (
        <section className="px-[var(--pad)] py-[clamp(80px,12vh,150px)] border-t border-line-2">
          <div className="max-w-[1240px] mx-auto">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div>
                <span className="kicker reveal">05 / En cancha</span>
                <h2 className="reveal font-display font-extrabold uppercase text-[clamp(32px,6vw,72px)] leading-none tracking-tight mt-4">
                  Próximos partidos
                </h2>
              </div>
              <a href={SOCIALS.twitch} target="_blank" rel="noreferrer" className="btn">
                Ver en Twitch ↗
              </a>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {upcoming.map((m) => (
                <div key={m.id} className="reveal">
                  <LiveMatch match={m} />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link to="/bracket" className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ignite">
                Ver la llave completa →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ CTA FINAL ============ */}
      <section className="px-[var(--pad)] py-[clamp(80px,12vh,160px)] border-t border-line text-center">
        <div className="max-w-[1240px] mx-auto">
          <h2 className="reveal font-display font-extrabold uppercase text-[clamp(40px,11vw,150px)] leading-[0.85] tracking-tight">
            Entra en<br />órbita
          </h2>
          <p className="reveal font-serif italic text-[clamp(18px,2.4vw,28px)] text-mute mt-8">
            Reúne a tus tres. El sorteo no espera.
          </p>
          <div className="reveal flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link to="/register" className="btn btn-ignite">Inscribe tu equipo</Link>
            <a href={SOCIALS.discord} target="_blank" rel="noreferrer" className="btn">
              Discord
            </a>
          </div>
          <div className="reveal flex justify-center mt-12">
            <SocialRow />
          </div>
        </div>
      </section>
    </div>
  );
}
