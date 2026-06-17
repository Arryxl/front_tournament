import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { OrbitMark, Wordmark } from '../components/brand';
import { SocialRow } from '../components/Socials';
import { SCHEDULE, SOCIALS, TOURNAMENT } from '../config';
import type { Match, TeamCount, TournamentSettings } from '../types';

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
        <div
          key={l}
          className="bg-void px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-center min-w-[48px] sm:min-w-[58px]"
        >
          <div className="font-display font-black text-xl sm:text-2xl md:text-3xl tabular-nums leading-none">
            {v}
          </div>
          <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-mute mt-1">{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Match card (broadcast) ---------------- */
function LiveMatch({ match }: { match: Match }) {
  const date = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })
    : 'Por definir';
  return (
    <div className="border border-line rounded-lg overflow-hidden bg-void-2 lift">
      <div className="px-4 py-2.5 flex justify-between items-center border-b border-line font-mono text-[10px] tracking-[0.18em] uppercase text-mute">
        <span>{match.matchCode} · {match.format.toUpperCase()}</span>
        {match.status === 'live' ? (
          <span className="text-cyan flex items-center gap-2 live-dot">EN VIVO</span>
        ) : (
          <span>{date}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 sm:py-5">
        <div className="flex flex-col gap-1">
          <span className="font-display font-black uppercase text-base sm:text-lg md:text-xl leading-none tracking-tight">
            {match.teamHome?.name || 'Por definir'}
          </span>
          <span className="font-mono text-[10px] text-mute tracking-[0.14em]">LOCAL</span>
        </div>
        <div className="font-display font-black text-2xl sm:text-3xl md:text-4xl px-3 sm:px-4 flex gap-2 tabular-nums">
          <span className={match.winnerId && match.winnerId === match.teamHomeId ? 'text-ignite' : ''}>
            {match.homeScore ?? '–'}
          </span>
          <span className="text-mute font-light">:</span>
          <span className={match.winnerId && match.winnerId === match.teamAwayId ? 'text-ignite' : ''}>
            {match.awayScore ?? '–'}
          </span>
        </div>
        <div className="flex flex-col gap-1 items-end text-right">
          <span className="font-display font-black uppercase text-base sm:text-lg md:text-xl leading-none tracking-tight">
            {match.teamAway?.name || 'Por definir'}
          </span>
          <span className="font-mono text-[10px] text-mute tracking-[0.14em]">VISITA</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Medidor de inscripciones ---------------- */
function RegistrationMeter({ count }: { count: TeamCount }) {
  const { approved, capacity } = count;
  const full = approved >= capacity;
  const remaining = Math.max(0, capacity - approved);
  const pct = Math.min(100, Math.round((approved / Math.max(1, capacity)) * 100));

  return (
    <section className="px-[var(--pad)] py-[clamp(40px,6vh,72px)] border-t border-line-2">
      <div className="max-w-[1240px] mx-auto">
        <div className="reveal card p-[clamp(22px,3vw,40px)] overflow-hidden relative">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div>
              <span className="kicker">{full ? 'Cupo completo' : 'Inscripciones abiertas'}</span>
              <div className="flex items-end gap-3 mt-3">
                <span className="font-display font-black text-[clamp(48px,9vw,96px)] leading-[0.8] tracking-tight tabular-nums text-ignite">
                  {String(approved).padStart(2, '0')}
                </span>
                <span className="font-display font-black text-[clamp(24px,4vw,44px)] leading-none tracking-tight tabular-nums text-mute mb-1">
                  / {capacity}
                </span>
              </div>
              <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-mute mt-3">
                Equipos confirmados
              </div>
            </div>

            <div className="text-left sm:text-right max-w-[34ch]">
              {full ? (
                <p className="font-display text-[clamp(15px,1.8vw,20px)] leading-[1.35] text-ink">
                  Llegamos al cupo, pero <b className="text-ignite">inscríbete igual</b>: si se libera
                  un lugar por un cambio de último momento, entras tú.
                </p>
              ) : (
                <p className="font-display text-[clamp(15px,1.8vw,20px)] leading-[1.35] text-ink">
                  Faltan{' '}
                  <b className="text-ignite tabular-nums">{remaining}</b>{' '}
                  {remaining === 1 ? 'equipo' : 'equipos'} para cerrar el cuadro. Asegura tu lugar.
                </p>
              )}
              <Link to="/register" className="btn btn-ignite mt-4 inline-flex">
                {full ? 'Inscribir como reserva' : 'Inscribe tu equipo'}
              </Link>
            </div>
          </div>

          {/* barra de progreso */}
          <div className="mt-7 h-1.5 w-full bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-ignite rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%`, boxShadow: '0 0 16px var(--ignite)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Cómo funciona la plataforma ---------------- */
const FEATURES = [
  {
    n: '01',
    title: 'Compite',
    text: '16 equipos 3v3. Fase de grupos todos contra todos y una llave a eliminación directa hasta la gran final.',
  },
  {
    n: '02',
    title: 'Predice',
    text: 'Acierta los ganadores de cada partido y gana grats. Mientras más arriesgas, más sumas.',
  },
  {
    n: '03',
    title: 'Canjea',
    text: 'Cambia tus grats por recompensas: roles, merch y premios dentro de la liga.',
  },
];

export default function Landing() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [count, setCount] = useState<TeamCount | null>(null);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);

  useEffect(() => {
    api.get('/matches').then((r) => setMatches(r.data)).catch(() => {});
    api.get('/teams/count').then((r) => setCount(r.data)).catch(() => {});
    api.get('/settings').then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const upcoming = useMemo(() => {
    const live = matches.filter((m) => m.status === 'live');
    const next = matches.filter((m) => m.status === 'scheduled');
    return [...live, ...next].slice(0, 4);
  }, [matches]);

  return (
    <div>
      {/* ============ COVER ============ */}
      <section className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden px-[var(--pad)] pt-24 pb-16">
        <div className="cover-halo" />
        <OrbitMark className="hidden md:block absolute right-[var(--pad)] top-[14vh] w-[clamp(80px,10vw,150px)] opacity-90 z-[1]" />

        <div className="max-w-[1240px] mx-auto w-full relative z-[2]">
          <div className="reveal flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-mute mb-[clamp(20px,4vh,44px)]">
            <span>LIGA — <b className="text-ink font-normal">ROCKET LEAGUE</b></span>
            <span>FORMATO · <b className="text-ink font-normal">{TOURNAMENT.format}</b></span>
            <span>TEMPORADA · <b className="text-ink font-normal">{TOURNAMENT.season}</b></span>
          </div>

          <h1 className="reveal">
            <Wordmark animateRing style={{ fontSize: 'clamp(52px,13.5vw,176px)' }} />
          </h1>

          <div className="reveal flex flex-col gap-5 md:flex-row md:justify-between md:items-end md:gap-6 mt-[clamp(22px,4vh,44px)] pt-5 border-t border-line">
            <p className="font-display font-medium text-[clamp(16px,2vw,24px)] max-w-[24ch] leading-[1.25] text-ink">
              {TOURNAMENT.tagline}
            </p>
            <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-mute md:text-right leading-[1.9] shrink-0">
              RANGO · <b className="text-ignite font-normal">{TOURNAMENT.rankRange}</b><br />
              PLATAFORMA · <b className="text-ink font-normal">{TOURNAMENT.platform}</b><br />
              ENTRADA · <b className="text-green font-normal">{TOURNAMENT.free ? 'GRATIS' : 'DE PAGO'}</b>
            </div>
          </div>

          <div className="reveal flex flex-col gap-5 sm:flex-row sm:items-center mt-8">
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-ignite">Inscribe tu equipo</Link>
              <a href={SOCIALS.discord} target="_blank" rel="noreferrer" className="btn">
                Únete al Discord
              </a>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute shrink-0">
                Cierran en
              </span>
              <CountdownBox target={TOURNAMENT.registrationClose} />
            </div>
          </div>
        </div>

        <div className="scrollcue hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-[3]">
          <span>SCROLL</span>
          <span className="bar" />
        </div>
      </section>

      {/* ============ MEDIDOR DE INSCRIPCIONES ============ */}
      {settings?.registrationsOpen && count && <RegistrationMeter count={count} />}

      {/* ============ QUÉ ES GRAVITY ============ */}
      <section className="px-[var(--pad)] py-[clamp(56px,8vh,104px)] border-t border-line-2">
        <div className="max-w-[1240px] mx-auto">
          <span className="kicker reveal">01 / La plataforma</span>
          <h2 className="reveal font-display font-black uppercase text-[clamp(34px,6.5vw,82px)] leading-[0.92] tracking-tight mt-3 max-w-[14ch]">
            Juega, predice<br />y gana
          </h2>
          <p className="reveal font-display text-mute text-[clamp(15px,1.8vw,20px)] leading-[1.45] max-w-[46ch] mt-5 mb-10">
            Gravity no es solo un torneo: es la liga completa. Sigue cada partido en vivo, apuesta
            tus predicciones y escala en el ranking de la temporada.
          </p>

          <div className="grid sm:grid-cols-3 gap-px bg-line border border-line">
            {FEATURES.map((f) => (
              <div
                key={f.n}
                className="reveal bg-void p-[clamp(22px,2.6vw,36px)] min-h-[180px] flex flex-col justify-between lift"
              >
                <span className="font-mono text-[11px] tracking-[0.2em] text-ignite">[ {f.n} ]</span>
                <div>
                  <h3 className="font-display font-black uppercase text-[clamp(26px,3vw,42px)] leading-none tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-mute text-sm max-w-[34ch] mt-3 leading-[1.55]">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FORMATO ============ */}
      <section className="px-[var(--pad)] py-[clamp(56px,8vh,104px)] border-t border-line-2 grid-paper">
        <div className="max-w-[1240px] mx-auto">
          <span className="kicker reveal">02 / El formato</span>
          <h2 className="reveal font-display font-black uppercase text-[clamp(34px,6.5vw,82px)] leading-[0.92] tracking-tight mt-3 mb-10">
            16 equipos.<br />Una final.
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line mb-8">
            {[
              ['16', 'Equipos'],
              ['4', 'Grupos de 4'],
              ['32', 'Partidos'],
              ['3v3', 'En cancha'],
            ].map(([num, label]) => (
              <div key={label} className="reveal bg-void p-5 sm:p-6 lift">
                <div className="font-display font-black text-[clamp(40px,6.5vw,76px)] leading-none tracking-tight tabular-nums">
                  {num}
                </div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mt-2.5">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-px bg-line border border-line mb-8">
            {[
              ['Fase de grupos', 'Cuatro grupos de cuatro juegan todos contra todos. Los dos mejores de cada grupo avanzan.'],
              ['Eliminatoria', 'Ocho equipos a muerte súbita: cuartos (BO3), semifinales (BO5) y la antesala del título.'],
              ['Gran final', 'Best of 7. Un solo campeón levanta la copa Gravity y se lleva el premio en efectivo.'],
            ].map(([t, d]) => (
              <div key={t} className="reveal bg-void p-5 sm:p-6">
                <h4 className="font-display font-black uppercase text-lg tracking-tight">{t}</h4>
                <p className="text-mute text-sm mt-2 leading-[1.55]">{d}</p>
              </div>
            ))}
          </div>

          <Link to="/bracket" className="reveal btn inline-flex">
            Ver la llave completa →
          </Link>
        </div>
      </section>

      {/* ============ PREMIO ============ */}
      <section className="px-[var(--pad)] py-[clamp(56px,8vh,104px)] border-t border-line-2 relative overflow-hidden">
        <div className="cover-halo opacity-60" />
        <div className="max-w-[1240px] mx-auto relative z-[2] text-center">
          <span className="kicker reveal justify-center" style={{ display: 'inline-flex' }}>
            03 / El premio
          </span>
          <div className="reveal font-mono text-[11px] tracking-[0.25em] uppercase text-mute mt-5">
            {TOURNAMENT.prize.label}
          </div>
          <div className="reveal font-display font-black uppercase text-[clamp(44px,12vw,150px)] leading-[0.85] tracking-tight mt-2 text-ignite">
            {TOURNAMENT.prize.amount}
          </div>
          <p className="reveal font-display text-[clamp(15px,2vw,24px)] text-mute mt-6 max-w-[30ch] mx-auto leading-[1.3]">
            El que sube más alto, cae con el trofeo. Inscripción 100% gratuita.
          </p>
          <div className="reveal mt-8 flex justify-center">
            <Link to="/register" className="btn btn-ignite">Quiero competir</Link>
          </div>
        </div>
      </section>

      {/* ============ RUTA / TIMELINE ============ */}
      <section className="px-[var(--pad)] py-[clamp(56px,8vh,104px)] border-t border-line-2">
        <div className="max-w-[1240px] mx-auto">
          <span className="kicker reveal">04 / La ruta</span>
          <h2 className="reveal font-display font-black uppercase text-[clamp(34px,6.5vw,82px)] leading-[0.92] tracking-tight mt-3 mb-10">
            Hasta la<br />final
          </h2>
          <div className="border-t border-line">
            {SCHEDULE.map((s) => (
              <div
                key={s.label}
                className="reveal grid grid-cols-[78px_1fr] md:grid-cols-[140px_120px_1fr] gap-4 items-center py-4 border-b border-line group"
              >
                <span className="font-display font-black text-lg md:text-2xl tracking-tight group-hover:text-ignite transition-colors">
                  {s.date}
                </span>
                <span className="hidden md:inline font-mono text-[10px] tracking-[0.2em] uppercase text-ignite">
                  {s.tag}
                </span>
                <span className="font-mono text-xs sm:text-sm text-mute">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PARTIDOS ============ */}
      {upcoming.length > 0 && (
        <section className="px-[var(--pad)] py-[clamp(56px,8vh,104px)] border-t border-line-2">
          <div className="max-w-[1240px] mx-auto">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
              <div>
                <span className="kicker reveal">05 / En cancha</span>
                <h2 className="reveal font-display font-black uppercase text-[clamp(30px,5.5vw,64px)] leading-none tracking-tight mt-3">
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
      <section className="px-[var(--pad)] py-[clamp(56px,9vh,120px)] border-t border-line text-center">
        <div className="max-w-[1240px] mx-auto">
          <h2 className="reveal font-display font-black uppercase text-[clamp(38px,10vw,128px)] leading-[0.85] tracking-tight">
            Entra en<br />órbita
          </h2>
          <p className="reveal font-display text-[clamp(15px,2vw,24px)] text-mute mt-6">
            Reúne a tus tres. El sorteo no espera.
          </p>
          <div className="reveal flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link to="/register" className="btn btn-ignite">Inscribe tu equipo</Link>
            <a href={SOCIALS.discord} target="_blank" rel="noreferrer" className="btn">
              Discord
            </a>
          </div>
          <div className="reveal flex justify-center mt-10">
            <SocialRow />
          </div>
        </div>
      </section>
    </div>
  );
}
