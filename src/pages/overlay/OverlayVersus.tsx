import { useParams } from 'react-router-dom';
import {
  FORMAT_LABEL,
  PHASE_LABEL,
  useMatchPoll,
  useTransparentBody,
} from '../../lib/overlay';
import { Crest, OverlayMark, SceneSlashes } from './parts';

export default function OverlayVersus() {
  const { id } = useParams();
  useTransparentBody();
  const { match } = useMatchPoll(id);

  const home = match?.teamHome ?? null;
  const away = match?.teamAway ?? null;
  const phase = match ? PHASE_LABEL[match.phase] || match.phase : '';
  const group = match?.group?.name ? `Grupo ${match.group.name}` : '';
  const fmt = match ? FORMAT_LABEL[match.format] || '' : '';
  const meta = [phase, group, fmt].filter(Boolean).join('  ·  ');
  const when = match?.scheduledAt
    ? new Date(match.scheduledAt).toLocaleString('es', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="ov-root ov-scene grid place-items-center" style={{ padding: 'clamp(24px,5vw,80px)' }}>
      <div className="ov-ghost text-[26vw]">GRAVITY</div>
      <SceneSlashes />

      {/* marca arriba */}
      <div className="absolute top-[clamp(28px,5vh,56px)] left-1/2 -translate-x-1/2 ov-in z-10">
        <OverlayMark />
      </div>

      <div className="w-full max-w-[1500px] relative z-[2]">
        {/* encabezado */}
        <div className="text-center mb-[clamp(28px,5vh,64px)] ov-in">
          <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
            Próximo partido
          </span>
          {meta && (
            <div className="font-mono text-[clamp(12px,1.4vw,16px)] tracking-[0.26em] uppercase text-mute mt-4">
              {meta}
            </div>
          )}
        </div>

        {/* enfrentamiento — placas diagonales que convergen en el VS */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
          {/* local */}
          <div className="ov-plate ov-plate--home ov-slide-l" style={{ animationDelay: '0.1s' }}>
            <div className="min-w-0">
              <div className="font-mono text-[clamp(11px,1vw,14px)] tracking-[0.26em] uppercase text-mute mb-2">
                Local
              </div>
              <div className="ov-team-name text-[clamp(28px,3.4vw,60px)]">
                {home?.name || 'Por definir'}
              </div>
            </div>
            <Crest team={home} size={132} />
          </div>

          {/* VS */}
          <div
            className="relative z-10 self-center -mx-[clamp(14px,1.6vw,28px)] ov-pop"
            style={{ animationDelay: '0.28s' }}
          >
            <div className="grid place-items-center w-[clamp(96px,9vw,150px)] h-[clamp(96px,9vw,150px)] bg-void border border-line rounded-2xl rotate-45 shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
              <span className="-rotate-45 font-display font-black italic uppercase text-ignite leading-none text-[clamp(34px,4.4vw,72px)]">
                VS
              </span>
            </div>
          </div>

          {/* visita */}
          <div className="ov-plate ov-plate--away ov-slide-r" style={{ animationDelay: '0.1s' }}>
            <Crest team={away} size={132} />
            <div className="min-w-0">
              <div className="font-mono text-[clamp(11px,1vw,14px)] tracking-[0.26em] uppercase text-mute mb-2">
                Visita
              </div>
              <div className="ov-team-name text-[clamp(28px,3.4vw,60px)]">
                {away?.name || 'Por definir'}
              </div>
            </div>
          </div>
        </div>

        {/* pie: cuándo + código */}
        {(when || match?.matchCode) && (
          <div className="flex justify-center mt-[clamp(28px,5vh,64px)] ov-in" style={{ animationDelay: '0.4s' }}>
            <span className="inline-flex items-center gap-3 ov-panel px-6 py-3">
              <span className="ov-live-dot" />
              {when && (
                <span className="font-mono text-[clamp(12px,1.3vw,15px)] tracking-[0.2em] uppercase text-ink first-letter:uppercase">
                  {when}
                </span>
              )}
              {match?.matchCode && (
                <span className="font-mono text-[clamp(11px,1.2vw,14px)] tracking-[0.2em] uppercase text-mute border-l border-line pl-3">
                  {match.matchCode}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
