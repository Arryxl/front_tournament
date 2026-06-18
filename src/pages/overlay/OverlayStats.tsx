import { useParams } from 'react-router-dom';
import {
  PHASE_LABEL,
  useMatchPoll,
  useTransparentBody,
  type OverlayMatch,
  type PlayerStatRow,
} from '../../lib/overlay';
import { Crest, OverlayMark, SceneSlashes } from './parts';

const COLS: { key: keyof PlayerStatRow; label: string }[] = [
  { key: 'goals', label: 'G' },
  { key: 'assists', label: 'A' },
  { key: 'saves', label: 'S' },
  { key: 'shots', label: 'T' },
  { key: 'demos', label: 'D' },
  { key: 'score', label: 'PTS' },
];

function TeamStats({
  team,
  rows,
  side,
  win,
  delay,
}: {
  team: OverlayMatch['teamHome'];
  rows: PlayerStatRow[];
  side: string;
  win: boolean;
  delay: number;
}) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return (
    <div className="ov-panel p-[clamp(16px,1.6vw,26px)] ov-in" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-line-2">
        <Crest team={team} size={48} />
        <div className="min-w-0">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-mute">{side}</div>
          <div className="font-display font-black italic uppercase tracking-tight text-[clamp(20px,2.2vw,32px)] leading-none truncate">
            {team?.name || '—'}
          </div>
        </div>
        {win && (
          <span className="ml-auto font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border border-ignite/50 rounded px-2 py-1">
            Ganador
          </span>
        )}
      </div>

      {/* cabecera de columnas */}
      <div className="grid grid-cols-[1fr_repeat(6,2.2ch)] gap-x-2 items-center font-mono text-[10px] tracking-[0.14em] uppercase text-mute pb-2">
        <span>Jugador</span>
        {COLS.map((c) => (
          <span key={c.key} className="text-center">{c.label}</span>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="font-mono text-xs text-mute py-3">Sin estadísticas cargadas.</div>
      ) : (
        sorted.map((r, i) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_repeat(6,2.2ch)] gap-x-2 items-center py-2 border-t border-line-2 ov-stat-row"
            style={{ animationDelay: `${delay + 0.08 * (i + 1)}s` }}
          >
            <span className="font-display font-bold truncate text-[clamp(13px,1.4vw,17px)]">
              {r.mvp && <span className="text-ignite">★ </span>}
              {r.user?.username || '—'}
            </span>
            {COLS.map((c) => (
              <span
                key={c.key}
                className={`text-center font-display font-black italic tabular-nums text-[clamp(13px,1.4vw,18px)] ${
                  c.key === 'score' ? 'text-ignite' : ''
                }`}
              >
                {r[c.key] as number}
              </span>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default function OverlayStats() {
  const { id } = useParams();
  useTransparentBody();
  const { match } = useMatchPoll(id);

  const home = match?.teamHome ?? null;
  const away = match?.teamAway ?? null;
  const stats = match?.playerStats ?? [];
  const homeStats = stats.filter((s) => s.teamId === match?.teamHomeId);
  const awayStats = stats.filter((s) => s.teamId === match?.teamAwayId);
  const homeWin = !!match?.winnerId && match.winnerId === match.teamHomeId;
  const awayWin = !!match?.winnerId && match.winnerId === match.teamAwayId;
  const phase = match ? PHASE_LABEL[match.phase] || match.phase : '';
  const mvp = stats.find((s) => s.mvp);
  const finished = match?.status === 'finished';

  return (
    <div className="ov-root ov-scene flex flex-col" style={{ padding: 'clamp(24px,4vw,64px)' }}>
      <div className="ov-ghost text-[24vw]">FINAL</div>
      <SceneSlashes />

      {/* encabezado + marcador */}
      <div className="flex items-center justify-between gap-4 mb-[clamp(16px,2.5vh,32px)] ov-in relative z-[2]">
        <OverlayMark />
        <span className="font-mono text-[11px] tracking-[0.24em] uppercase text-mute">
          {[phase, 'Resultado final'].filter(Boolean).join('  ·  ')}
        </span>
      </div>

      {/* scoreboard */}
      <div className="ov-panel p-[clamp(18px,2vw,32px)] mb-[clamp(16px,2.5vh,32px)] ov-pop relative z-[2]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[clamp(12px,2vw,40px)]">
          <div className="flex items-center gap-4 min-w-0">
            <Crest team={home} size={72} win={homeWin} />
            <div className={`font-display font-black italic uppercase tracking-tight text-[clamp(22px,3vw,46px)] leading-[0.9] truncate ${homeWin ? 'text-ignite' : ''}`}>
              {home?.name || 'Local'}
            </div>
          </div>
          <div className="flex items-center gap-[clamp(10px,1.5vw,24px)] font-display font-black italic tabular-nums text-[clamp(48px,8vw,110px)] leading-none">
            <span className={homeWin ? 'text-ignite' : 'text-ink'}>{match?.homeScore ?? '–'}</span>
            <span className="text-mute text-[0.5em]">:</span>
            <span className={awayWin ? 'text-ignite' : 'text-ink'}>{match?.awayScore ?? '–'}</span>
          </div>
          <div className="flex items-center gap-4 min-w-0 justify-end text-right">
            <div className={`font-display font-black italic uppercase tracking-tight text-[clamp(22px,3vw,46px)] leading-[0.9] truncate ${awayWin ? 'text-ignite' : ''}`}>
              {away?.name || 'Visita'}
            </div>
            <Crest team={away} size={72} win={awayWin} />
          </div>
        </div>

        {mvp && (
          <div className="mt-4 pt-4 border-t border-line-2 text-center font-mono text-[clamp(11px,1.3vw,15px)] tracking-[0.2em] uppercase">
            <span className="text-mute">MVP del partido · </span>
            <span className="text-ignite font-bold">★ {mvp.user?.username}</span>
          </div>
        )}
      </div>

      {/* tablas por equipo */}
      {stats.length === 0 ? (
        <div className="ov-panel p-8 text-center ov-in relative z-[2]">
          <div className="font-display font-black italic uppercase tracking-tight text-2xl">
            {finished ? 'Estadísticas en proceso…' : 'Partido en curso'}
          </div>
          <p className="font-mono text-xs text-mute mt-2 tracking-[0.18em] uppercase">
            Aparecerán aquí en cuanto se carguen desde el panel.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-[clamp(12px,1.5vw,24px)] relative z-[2]">
          <TeamStats team={home} rows={homeStats} side="Local" win={homeWin} delay={0.15} />
          <TeamStats team={away} rows={awayStats} side="Visita" win={awayWin} delay={0.25} />
        </div>
      )}
    </div>
  );
}
