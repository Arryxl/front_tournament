import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';
import AdvancedPlayerCard from '../components/AdvancedPlayerCard';
import { matchLabel, matchFormatLabel } from '../lib/tournament';
import type { Match, PlayerExtraStats } from '../types';

interface PlayerStatRow {
  id: string;
  userId: string;
  teamId: string;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  score: number;
  demos: number;
  mvp: boolean;
  extra: PlayerExtraStats | null;
  user?: { id: string; username: string } | null;
  team?: { id: string; name: string } | null;
}
interface MatchDetail extends Match {
  playerStats: PlayerStatRow[];
}

interface SeasonSummary {
  matchesPlayed: number;
  players: number;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demos: number;
  mvps: number;
  avgGoalsPerMatch: number;
}

const COLS: { key: keyof PlayerStatRow; label: string; title: string }[] = [
  { key: 'goals', label: 'G', title: 'Goles' },
  { key: 'assists', label: 'A', title: 'Asistencias' },
  { key: 'saves', label: 'Sv', title: 'Salvadas' },
  { key: 'shots', label: 'Ti', title: 'Tiros' },
  { key: 'demos', label: 'Dm', title: 'Demoliciones' },
  { key: 'score', label: 'Score', title: 'Puntuación del juego' },
];

/** Un jugador "jugó" si tiene cualquier stat distinta de cero. */
function played(p: PlayerStatRow) {
  return p.goals || p.assists || p.saves || p.shots || p.demos || p.score;
}

/* ---------------- tabla scoreboard de un equipo ---------------- */
function TeamBoard({ title, side, rows, win }: { title: string; side: string; rows: PlayerStatRow[]; win: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className={`px-4 py-3 border-b border-line flex items-center justify-between gap-3 ${win ? 'bg-ignite/[0.06]' : ''}`}>
        <div className="min-w-0">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-mute">{side}</div>
          <div className="font-display font-black italic uppercase tracking-tight text-lg leading-none truncate">{title}</div>
        </div>
        {win && (
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ignite border border-ignite/40 rounded-sm px-2 py-1 shrink-0">
            Ganó
          </span>
        )}
      </div>
      {/* scroll horizontal de seguridad en móvil muy estrecho */}
      <div className="overflow-x-auto">
        <div className="min-w-[300px]">
          <div className="grid grid-cols-[1fr_repeat(6,34px)] gap-1 px-3 py-2 font-mono text-[9px] tracking-[0.06em] uppercase text-mute border-b border-line-2">
            <span>Jugador</span>
            {COLS.map((c) => (
              <span key={c.key} className="text-center" title={c.title}>{c.label}</span>
            ))}
          </div>
          <div className="divide-y divide-line-2">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_repeat(6,34px)] gap-1 px-3 py-2.5 items-center">
                <span className="font-display font-semibold text-sm truncate pr-1">
                  {r.mvp && <span className="text-ignite" title="MVP del partido">★ </span>}
                  {r.user?.username || '—'}
                </span>
                {COLS.map((c) => (
                  <span
                    key={c.key}
                    className={`text-center tabular-nums text-sm ${c.key === 'goals' && (r[c.key] as number) > 0 ? 'font-display font-black italic text-ignite' : 'text-ink'}`}
                  >
                    {r[c.key] as number}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- detalle expandible de un partido ---------------- */
function MatchDetailView({ matchId }: { matchId: string }) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MatchDetail>(`/matches/${matchId}`)
      .then((r) => setDetail(r.data))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return <div className="py-8"><Spinner /></div>;
  if (!detail) return null;

  const ps = detail.playerStats || [];
  // Solo quienes jugaron (descarta suplentes con todo en 0), ordenados por score.
  const sortByScore = (a: PlayerStatRow, b: PlayerStatRow) => b.score - a.score;
  const homeRows = ps.filter((p) => p.teamId === detail.teamHomeId && played(p)).sort(sortByScore);
  const awayRows = ps.filter((p) => p.teamId === detail.teamAwayId && played(p)).sort(sortByScore);
  const homeWin = detail.winnerId === detail.teamHomeId;
  const awayWin = detail.winnerId === detail.teamAwayId;
  const withExtra = [...homeRows, ...awayRows].filter((p) => p.extra);

  if (homeRows.length === 0 && awayRows.length === 0) {
    return (
      <p className="font-mono text-xs text-mute py-4">
        Este partido no tiene estadísticas detalladas cargadas.
      </p>
    );
  }

  return (
    <div className="pt-4 flex flex-col gap-6">
      <div className="grid lg:grid-cols-2 gap-4">
        <TeamBoard title={detail.teamHome?.name || 'Local'} side="Local" rows={homeRows} win={homeWin} />
        <TeamBoard title={detail.teamAway?.name || 'Visita'} side="Visita" rows={awayRows} win={awayWin} />
      </div>

      {withExtra.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute">
              Rendimiento avanzado
            </div>
            <div className="font-mono text-[10px] text-mute">datos leídos del replay</div>
          </div>
          <p className="font-mono text-[10px] text-mute leading-relaxed mb-3 max-w-[70ch]">
            Cómo jugó cada uno: gestión de boost, velocidad y posición en cancha.
            <span className="text-ink"> uu/s</span> = velocidad del juego (máx. ~2300).
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {withExtra.map((p) => (
              <AdvancedPlayerCard key={p.id} name={p.user?.username || '—'} e={p.extra!} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- resumen general de la temporada ---------------- */
function SeasonBoard({ s }: { s: SeasonSummary }) {
  const cells = [
    [s.matchesPlayed, 'Partidos jugados'],
    [s.goals, 'Goles'],
    [s.avgGoalsPerMatch, 'Goles por partido'],
    [s.saves, 'Salvadas'],
    [s.assists, 'Asistencias'],
    [s.demos, 'Demoliciones'],
    [s.mvps, 'MVPs'],
    [s.players, 'Jugadores'],
  ] as const;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line mb-12">
      {cells.map(([num, label]) => (
        <div key={label} className="bg-void p-4 sm:p-5">
          <div className="font-display font-black italic text-[clamp(28px,5vw,52px)] leading-none tracking-tight tabular-nums text-ignite">
            {num}
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-mute mt-2 leading-tight">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- página ---------------- */
export default function MatchSummary() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Match[]>('/matches'),
      api.get<SeasonSummary>('/stats/summary').catch(() => ({ data: null })),
    ])
      .then(([m, s]) => {
        setMatches(m.data);
        setSummary(s.data as SeasonSummary | null);
      })
      .finally(() => setLoading(false));
  }, []);

  const finished = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'finished')
        .sort((a, b) => {
          const da = a.playedAt || a.scheduledAt || '';
          const db = b.playedAt || b.scheduledAt || '';
          return db.localeCompare(da);
        }),
    [matches],
  );

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <span className="kicker">Temporada 01 · resúmenes</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(40px,9vw,120px)] tracking-tight leading-[0.82] mt-3 mb-3">
        Resultados
      </h1>
      <p className="font-display text-mute text-[clamp(15px,1.8vw,20px)] leading-[1.4] max-w-[46ch] mb-10">
        Cada partido jugado, con el marcador y las estadísticas completas de cada
        jugador — incluido el rendimiento avanzado leído de los replays.
      </p>

      {summary && summary.matchesPlayed > 0 && <SeasonBoard s={summary} />}

      <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-5">
        Partidos jugados
      </h2>

      {finished.length === 0 ? (
        <p className="font-mono text-xs text-mute">
          Todavía no hay partidos finalizados. Vuelve cuando ruede el balón.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {finished.map((m) => {
            const isOpen = open === m.id;
            const homeWin = m.winnerId === m.teamHomeId;
            const awayWin = m.winnerId === m.teamAwayId;
            return (
              <div key={m.id} className={`card overflow-hidden transition-colors ${isOpen ? 'border-ignite/50' : ''}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : m.id)}
                  className="w-full text-left px-3 sm:px-6 py-4 flex items-center gap-2 sm:gap-4 hover:bg-void-2 transition-colors"
                >
                  <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.12em] uppercase text-mute shrink-0 w-16 sm:w-24 leading-tight">
                    {matchLabel({ phase: m.phase, group: m.group })}
                  </span>
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 min-w-0">
                    <span className={`font-display font-black italic uppercase tracking-tight text-right truncate text-sm sm:text-base ${homeWin ? 'text-ignite' : ''}`}>
                      {m.teamHome?.name || 'TBD'}
                    </span>
                    <span className="font-display font-black italic text-xl sm:text-2xl tabular-nums px-1 sm:px-2 shrink-0">
                      <span className={homeWin ? 'text-ignite' : ''}>{m.homeScore ?? '–'}</span>
                      <span className="text-mute mx-1 sm:mx-1.5">:</span>
                      <span className={awayWin ? 'text-ignite' : ''}>{m.awayScore ?? '–'}</span>
                    </span>
                    <span className={`font-display font-black italic uppercase tracking-tight truncate text-sm sm:text-base ${awayWin ? 'text-ignite' : ''}`}>
                      {m.teamAway?.name || 'TBD'}
                    </span>
                  </div>
                  <span className="hidden sm:flex flex-col items-end shrink-0 w-28">
                    <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute">
                      {matchFormatLabel(m)}
                    </span>
                    {m.playedAt && (
                      <span className="font-mono text-[10px] text-mute mt-0.5">
                        {new Date(m.playedAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </span>
                  <span className={`font-display text-ignite text-lg shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 sm:px-6 pb-6 border-t border-line-2">
                    <MatchDetailView matchId={m.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
