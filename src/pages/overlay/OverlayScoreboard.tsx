import { useParams } from 'react-router-dom';
import {
  FORMAT_LABEL,
  PHASE_LABEL,
  useMatchPoll,
  useTransparentBody,
} from '../../lib/overlay';
import { Crest } from './parts';

/**
 * Marcador en vivo (top bar) para superponer DURANTE la partida.
 * Fondo transparente: solo las placas y el bloque central son visibles.
 * Lee el marcador del API cada 2.5 s — refleja lo que el admin va cargando.
 */
export default function OverlayScoreboard() {
  const { id } = useParams();
  useTransparentBody();
  const { match } = useMatchPoll(id);

  const home = match?.teamHome ?? null;
  const away = match?.teamAway ?? null;
  const hs = match?.homeScore ?? 0;
  const as = match?.awayScore ?? 0;

  const live = match?.status === 'live';
  const finished = match?.status === 'finished';
  const homeWin = finished && match?.winnerId != null && match.winnerId === match.teamHomeId;
  const awayWin = finished && match?.winnerId != null && match.winnerId === match.teamAwayId;
  // mientras juega: resalta a quien va al frente
  const homeLead = !finished && hs > as;
  const awayLead = !finished && as > hs;
  const homeHot = homeWin || homeLead;
  const awayHot = awayWin || awayLead;

  const phase = match ? PHASE_LABEL[match.phase] || match.phase : '';
  const fmt = match ? FORMAT_LABEL[match.format] || '' : '';

  return (
    <div className="ov-root">
      <div className="ov-sb ov-in">
        {/* local */}
        <div className={`ov-plate ov-plate--home ov-slide-l ${homeWin ? 'is-win' : ''}`}>
          <div
            className={`ov-team-name text-[clamp(20px,2vw,34px)] ${homeHot ? 'text-ignite' : 'text-ink'}`}
          >
            {home?.name || 'Local'}
          </div>
          <Crest team={home} size={56} win={homeHot} />
        </div>

        {/* bloque central */}
        <div className="ov-sb-center ov-pop">
          <span className="ov-sb-meta">
            {fmt && <span>{fmt}</span>}
            {fmt && phase && <span className="text-mute/60">·</span>}
            {phase && <span>{phase}</span>}
          </span>
          <div className="ov-sb-score">
            <span className={`ov-sb-num ${homeHot ? 'win' : ''}`}>{match ? hs : '–'}</span>
            <span className="sep">:</span>
            <span className={`ov-sb-num ${awayHot ? 'win' : ''}`}>{match ? as : '–'}</span>
          </div>
          <div className="mt-1.5">
            {live ? (
              <span className="ov-tag live">
                <span className="ov-live-dot" /> En vivo
              </span>
            ) : finished ? (
              <span className="ov-tag" style={{ color: 'var(--ignite)' }}>
                Final
              </span>
            ) : (
              <span className="ov-tag text-mute">Por jugar</span>
            )}
          </div>
        </div>

        {/* visita */}
        <div className={`ov-plate ov-plate--away ov-slide-r ${awayWin ? 'is-win' : ''}`}>
          <Crest team={away} size={56} win={awayHot} />
          <div
            className={`ov-team-name text-[clamp(20px,2vw,34px)] ${awayHot ? 'text-ignite' : 'text-ink'}`}
          >
            {away?.name || 'Visita'}
          </div>
        </div>
      </div>
    </div>
  );
}
