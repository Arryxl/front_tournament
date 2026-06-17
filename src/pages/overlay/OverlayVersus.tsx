import { useParams } from 'react-router-dom';
import {
  FORMAT_LABEL,
  PHASE_LABEL,
  useMatchPoll,
  useTransparentBody,
} from '../../lib/overlay';
import { Crest, OverlayMark } from './parts';

export default function OverlayVersus() {
  const { id } = useParams();
  useTransparentBody();
  const { match } = useMatchPoll(id);

  const home = match?.teamHome ?? null;
  const away = match?.teamAway ?? null;
  const phase = match ? PHASE_LABEL[match.phase] || match.phase : '';
  const group = match?.group?.name ? `Grupo ${match.group.name}` : '';
  const fmt = match ? FORMAT_LABEL[match.format] || '' : '';
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
    <div className="ov-root grid place-items-center" style={{ padding: 'clamp(24px,5vw,80px)' }}>
      {/* trazos racing */}
      <span className="ov-slash" style={{ top: '20%', left: '-5%', width: '30%' }} />
      <span className="ov-slash thin" style={{ top: '24%', left: '-5%', width: '18%' }} />
      <span className="ov-slash" style={{ bottom: '20%', right: '-5%', width: '28%' }} />
      <span className="ov-slash thin ivory" style={{ bottom: '24%', right: '-5%', width: '16%' }} />

      {/* marca arriba */}
      <div className="absolute top-[clamp(24px,4vh,48px)] left-1/2 -translate-x-1/2 ov-in">
        <OverlayMark />
      </div>

      <div className="w-full max-w-[1400px]">
        {/* encabezado */}
        <div className="text-center mb-[clamp(24px,4vh,56px)] ov-in">
          <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
            Próximo partido
          </span>
          <div className="font-mono text-[clamp(12px,1.4vw,16px)] tracking-[0.24em] uppercase text-mute mt-3">
            {[phase, group, fmt].filter(Boolean).join('  ·  ')}
          </div>
        </div>

        {/* enfrentamiento */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[clamp(16px,3vw,56px)]">
          {/* local */}
          <div className="flex flex-col items-center gap-5 ov-pop" style={{ animationDelay: '0.1s' }}>
            <Crest team={home} size={180} />
            <div className="text-center">
              <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-mute mb-1">Local</div>
              <div className="font-display font-black italic uppercase tracking-tight text-[clamp(28px,4vw,64px)] leading-[0.9]">
                {home?.name || 'Por definir'}
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center ov-pop" style={{ animationDelay: '0.25s' }}>
            <div className="font-display font-black italic uppercase text-ignite leading-none text-[clamp(56px,10vw,150px)]">
              VS
            </div>
          </div>

          {/* visita */}
          <div className="flex flex-col items-center gap-5 ov-pop" style={{ animationDelay: '0.1s' }}>
            <Crest team={away} size={180} />
            <div className="text-center">
              <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-mute mb-1">Visita</div>
              <div className="font-display font-black italic uppercase tracking-tight text-[clamp(28px,4vw,64px)] leading-[0.9]">
                {away?.name || 'Por definir'}
              </div>
            </div>
          </div>
        </div>

        {/* pie */}
        {when && (
          <div className="text-center mt-[clamp(24px,4vh,56px)] ov-in" style={{ animationDelay: '0.35s' }}>
            <span className="inline-flex items-center gap-3 ov-panel px-6 py-3">
              <span className="ov-live-dot" />
              <span className="font-mono text-[clamp(12px,1.3vw,15px)] tracking-[0.2em] uppercase text-ink first-letter:uppercase">
                {when}
              </span>
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
