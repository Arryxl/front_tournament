import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTransparentBody } from '../../lib/overlay';
import { useSettings } from '../../lib/useSettings';
import { SOCIALS } from '../../config';
import type { TeamCount } from '../../types';
import { SceneSlashes } from './parts';

/* Countdown al cierre de inscripciones (mismo cálculo que la landing). */
function useCountdown(target?: string | null) {
  const [parts, setParts] = useState({ d: '00', h: '00', m: '00', s: '00', done: false });
  useEffect(() => {
    if (!target) return;
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

/* Sondea /teams/count para que el medidor de cupos se actualice en vivo. */
function useTeamCount(ms = 8000) {
  const [count, setCount] = useState<TeamCount | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () =>
      api.get('/teams/count').then((r) => alive && setCount(r.data)).catch(() => {});
    tick();
    const id = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [ms]);
  return count;
}

function CountdownCells({ target }: { target: string }) {
  const { d, h, m, s, done } = useCountdown(target);
  if (done)
    return (
      <span className="font-display font-black italic uppercase text-ignite text-[clamp(22px,3vw,40px)] tracking-tight">
        Inscripciones cerradas
      </span>
    );
  const cells: [string, string][] = [
    [d, 'días'],
    [h, 'hrs'],
    [m, 'min'],
    [s, 'seg'],
  ];
  return (
    <div className="flex gap-px bg-line border border-line rounded-lg overflow-hidden">
      {cells.map(([v, l]) => (
        <div key={l} className="bg-void px-[clamp(12px,1.6vw,24px)] py-[clamp(8px,1.2vh,16px)] text-center min-w-[clamp(54px,5.5vw,92px)]">
          <div className="font-display font-black italic text-[clamp(30px,4vw,62px)] tabular-nums leading-none">
            {v}
          </div>
          <div className="font-mono text-[clamp(10px,1vw,14px)] tracking-[0.2em] uppercase text-mute mt-1.5">
            {l}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OverlayRegistration() {
  useTransparentBody();
  // Overlay de OBS: nunca debe haber scroll (todo cabe en el canvas).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const [params] = useSearchParams();
  const s = useSettings();
  const count = useTeamCount();

  // Link de inscripción que se muestra en pantalla. Por defecto el dominio
  // actual + /register (el overlay se sirve del mismo sitio, así que en prod
  // saldrá tu dominio real, p. ej. gravity.arryxl.me/register). Se puede forzar
  // con ?url=tudominio.com/register para limpiar puertos/subdominios.
  const host =
    typeof window !== 'undefined' ? window.location.host.replace(/^www\./, '') : '';
  const registerUrl = params.get('url')?.trim() || `${host}/register`;

  // Discord configurable: ?discord=discord.gg/xxxx ; si no, cae al de config.ts.
  const discord = (params.get('discord')?.trim() || SOCIALS.discord).replace(
    /^https?:\/\//,
    '',
  );

  // Fichas técnicas (sin plataforma).
  const specs: [string, string, string?][] = [
    ['Formato', `${s.formatLabel} · ${s.teamCount} equipos`],
    ['Rango', s.rankRangeLabel],
    ['Entrada', s.entryFree ? 'Gratis' : 'De pago', s.entryFree ? 'text-green' : 'text-ink'],
  ];

  const approved = count?.approved ?? 0;
  const capacity = count?.capacity ?? s.teamCount;
  const full = approved >= capacity;
  const pct = Math.min(100, Math.round((approved / Math.max(1, capacity)) * 100));

  return (
    <div className="ov-root ov-scene grid place-items-center" style={{ minHeight: '100vh', padding: 'clamp(20px,4vw,72px)' }}>
      <div className="ov-ghost text-[26vw]">{s.tournamentName.toUpperCase()}</div>
      <SceneSlashes />

      <div className="w-full max-w-[1500px] relative z-[2] grid gap-[clamp(16px,2.6vh,34px)] text-center">
        {/* encabezado */}
        <div className="ov-in grid gap-[clamp(6px,1.2vh,16px)]">
          <span className="inline-flex items-center justify-center gap-3 font-mono font-bold text-[clamp(13px,1.7vw,24px)] tracking-[0.22em] uppercase text-ignite">
            <span className="ov-live-dot" />
            {full ? 'Cupo completo · reservas' : 'Inscripciones abiertas'}
          </span>
          <h1 className="font-display font-black italic uppercase leading-[0.85] tracking-tight text-[clamp(60px,10vw,168px)]">
            {s.tournamentName}
          </h1>
          <div className="font-mono text-[clamp(13px,1.6vw,22px)] tracking-[0.24em] uppercase text-mute">
            {s.seasonLabel} · Rocket League
          </div>
        </div>

        {/* fichas técnicas (formato · rango · entrada) */}
        <div className="ov-in flex flex-wrap items-stretch justify-center gap-[clamp(8px,1.2vw,18px)]" style={{ animationDelay: '0.1s' }}>
          {specs.map(([label, value, cls]) => (
            <div
              key={label}
              className="ov-panel px-[clamp(16px,2vw,34px)] py-[clamp(10px,1.6vh,20px)] flex flex-col items-center justify-center min-w-[clamp(150px,15vw,260px)]"
            >
              <div className="font-mono text-[clamp(11px,1.1vw,15px)] tracking-[0.22em] uppercase text-mute mb-1.5">
                {label}
              </div>
              <div className={`font-display font-black italic uppercase tracking-tight leading-none text-[clamp(20px,2.4vw,34px)] whitespace-nowrap ${cls || 'text-ink'}`}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* HERO: dónde inscribirse — lo más grande y legible de la escena */}
        <div className="ov-panel ov-pop px-[clamp(20px,3vw,56px)] py-[clamp(22px,3.4vh,44px)]" style={{ animationDelay: '0.22s' }}>
          <div className="font-mono font-bold text-[clamp(13px,1.6vw,24px)] tracking-[0.24em] uppercase text-mute mb-[clamp(8px,1.4vh,16px)]">
            Inscribe a tu equipo en
          </div>
          {/* 5vw nunca desborda el ancho para este largo de texto → sin truncado */}
          <div className="font-display font-black italic uppercase tracking-tight leading-[0.9] text-ignite text-[clamp(36px,5vw,92px)] whitespace-nowrap">
            {registerUrl}
          </div>

          {/* fila inferior: cierre + cupos */}
          <div className="mt-[clamp(18px,2.6vh,32px)] pt-[clamp(16px,2.2vh,26px)] border-t border-line flex flex-wrap items-end justify-center gap-x-[clamp(28px,5vw,72px)] gap-y-5">
            {s.registrationDeadline && (
              <div className="flex flex-col items-center gap-2.5">
                <span className="font-mono text-[clamp(11px,1.1vw,15px)] tracking-[0.24em] uppercase text-mute">
                  Cierran en
                </span>
                <CountdownCells target={s.registrationDeadline} />
              </div>
            )}
            <div className="flex flex-col items-center gap-2.5">
              <span className="font-mono text-[clamp(11px,1.1vw,15px)] tracking-[0.24em] uppercase text-mute">
                Cupos
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-black italic tabular-nums leading-none text-ignite text-[clamp(34px,4.6vw,62px)]">
                  {String(approved).padStart(2, '0')}
                </span>
                <span className="font-display font-black italic tabular-nums leading-none text-mute text-[clamp(20px,2.6vw,36px)]">
                  / {capacity}
                </span>
              </div>
            </div>
          </div>

          {/* barra de progreso de cupos */}
          <div className="mt-[clamp(14px,2vh,22px)] h-[clamp(6px,0.8vh,10px)] w-full bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-ignite rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%`, boxShadow: '0 0 16px var(--ignite)' }}
            />
          </div>
        </div>

        {/* discord */}
        <div className="ov-in font-mono text-[clamp(13px,1.5vw,22px)] tracking-[0.2em] uppercase text-mute" style={{ animationDelay: '0.32s' }}>
          Discord · <span className="text-ink">{discord}</span>
        </div>
      </div>
    </div>
  );
}
