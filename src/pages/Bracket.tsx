import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';
import { useSettings } from '../lib/useSettings';
import { seriesLabel } from '../lib/tournament';
import { MatchCard } from '../components/ui';
import type { Match, Standing, TournamentSettings } from '../types';

/* ============================================================
   Estructura de la llave generada dinámicamente según el nº de
   equipos (16 ⇒ cuartos→semis→final; 32 ⇒ octavos→cuartos→semis→final).
   Si la API ya trae partidos, se fusionan por matchCode; si no, se
   muestran los cruces / seeds como referencia.
   ============================================================ */

type Slot = {
  code: string;
  format: 'bo3' | 'bo5' | 'bo7';
  home: string; // nombre real o seed ("1° Grupo A", "Ganador Q01")
  away: string;
};

type ResolvedSlot = Slot & {
  homeScore: number | null;
  awayScore: number | null;
  homeWin: boolean;
  awayWin: boolean;
  homeTbd: boolean;
  awayTbd: boolean;
  status: Match['status'] | 'scheduled';
};

type Node = { code: string; slot: ResolvedSlot; children?: Node[]; isFinal?: boolean };

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ---------------- Tarjeta de partido del bracket ---------------- */
function BracketMatch({ slot, live, isFinal }: { slot: ResolvedSlot; live?: boolean; isFinal?: boolean }) {
  const { format, home, away, homeScore, awayScore, homeWin, awayWin, status } = slot;
  return (
    <div className={`bk-match ${isFinal ? 'is-final' : ''}`}>
      <div className="bk-cap">
        <span>{seriesLabel(format)}</span>
        {status === 'live' || live ? (
          <span className="text-cyan live-dot" style={{ paddingLeft: 14 }}>EN VIVO</span>
        ) : status === 'finished' ? (
          <span className="text-mute">FINAL</span>
        ) : (
          <span className="text-mute">—</span>
        )}
      </div>
      <div className={`bk-row ${homeWin ? 'win' : ''}`}>
        <span className={`bk-team ${slot.homeTbd ? 'tbd' : ''}`}>{home}</span>
        <span className="bk-score">{homeScore ?? '–'}</span>
      </div>
      <div className={`bk-row ${awayWin ? 'win' : ''}`}>
        <span className={`bk-team ${slot.awayTbd ? 'tbd' : ''}`}>{away}</span>
        <span className="bk-score">{awayScore ?? '–'}</span>
      </div>
    </div>
  );
}

function BracketNode({ node }: { node: Node }) {
  return (
    <div className="bk-node">
      <div className="bk-slot">
        <BracketMatch slot={node.slot} isFinal={node.isFinal} />
      </div>
      {node.children && (
        <div className="bk-branches">
          {node.children.map((c) => (
            <BracketNode key={c.code} node={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ColHead({ final, children }: { final?: boolean; children: string }) {
  return (
    <div
      className={`${final ? 'bk-colw-final' : 'bk-colw'} font-mono text-[10px] tracking-[0.25em] uppercase text-mute text-center`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   Fase de grupos — DATOS REALES desde /groups/standings.
   ============================================================ */
type Row = {
  pos: number;
  name: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
  placeholder: boolean;
};

function placeholderRows(): Row[] {
  return Array.from({ length: 4 }, (_, i) => ({
    pos: i + 1,
    name: 'Por confirmar',
    pj: 0,
    g: 0,
    e: 0,
    p: 0,
    gf: 0,
    gc: 0,
    pts: 0,
    placeholder: true,
  }));
}

const COLS =
  'grid-cols-[18px_1fr_26px_30px_34px] sm:grid-cols-[22px_1fr_28px_26px_26px_26px_34px_36px]';

function GroupTable({ name, rows, started }: { name: string; rows: Row[]; started: boolean }) {
  const isPlaceholder = rows.every((r) => r.placeholder);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-2 bg-void-2">
        <span className="font-display font-black italic uppercase tracking-tight text-base">Grupo {name}</span>
        <span
          className={`font-mono text-[8px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded ${
            isPlaceholder ? 'text-mute border border-line' : 'text-ignite border border-ignite/40'
          }`}
        >
          {isPlaceholder ? (started ? 'Sin sorteo' : 'Por confirmar') : 'En juego'}
        </span>
      </div>

      <div
        className={`grid ${COLS} gap-x-1.5 px-3 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase text-mute border-b border-line-2`}
      >
        <span>#</span>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="hidden sm:block text-center">G</span>
        <span className="hidden sm:block text-center">E</span>
        <span className="hidden sm:block text-center">P</span>
        <span className="text-center">DG</span>
        <span className="text-right">Pts</span>
      </div>

      {rows.map((r) => {
        const top2 = r.pos <= 2;
        const dg = r.gf - r.gc;
        return (
          <div
            key={`${name}-${r.pos}`}
            className={`grid ${COLS} gap-x-1.5 px-3 py-1 items-center border-b border-line-2 last:border-0 ${
              top2 && !r.placeholder ? 'bg-ignite/[0.04]' : ''
            }`}
          >
            <span
              className={`font-display font-black italic text-sm tabular-nums ${
                top2 ? 'text-ignite' : 'text-mute'
              }`}
            >
              {r.pos}
            </span>
            <span
              className={`font-display font-bold text-[13px] sm:text-[15px] truncate ${
                r.placeholder ? 'italic text-mute' : 'text-ink'
              }`}
            >
              {r.placeholder ? `“${r.name}”` : r.name}
            </span>
            <span className="text-center font-mono text-[13px] text-mute tabular-nums">{r.pj}</span>
            <span className="hidden sm:block text-center font-mono text-[13px] tabular-nums">{r.g}</span>
            <span className="hidden sm:block text-center font-mono text-[13px] tabular-nums">{r.e}</span>
            <span className="hidden sm:block text-center font-mono text-[13px] tabular-nums">{r.p}</span>
            <span className="text-center font-mono text-[13px] tabular-nums">
              {dg > 0 ? '+' : ''}
              {dg}
            </span>
            <span className="text-right font-display font-black italic text-base tabular-nums">{r.pts}</span>
          </div>
        );
      })}

      <div className="px-3 py-1.5 font-mono text-[8px] tracking-[0.15em] uppercase text-mute bg-void/40">
        <span className="text-ignite">1° · 2°</span> clasifican a la llave
      </div>
    </div>
  );
}

/* ---------------- Banner de estado del torneo ---------------- */
function StatusBanner({ settings }: { settings: TournamentSettings | null }) {
  if (!settings) return null;
  const { registrationsOpen, tournamentStarted } = settings;

  let tone = 'border-line text-mute';
  let dot = 'bg-mute';
  let title = 'Pretemporada';
  let detail = 'El cuadro se publicará cuando arranque el torneo.';

  if (registrationsOpen && !tournamentStarted) {
    tone = 'border-ignite/40 text-ignite';
    dot = 'bg-ignite';
    title = 'Inscripciones abiertas';
    detail = 'Aún puedes registrar tu equipo. El cuadro se sortea al cerrar inscripciones.';
  } else if (tournamentStarted) {
    tone = 'border-cyan/40 text-cyan';
    dot = 'bg-cyan';
    title = 'Torneo en curso';
    detail = 'Las inscripciones están cerradas. Sigue los resultados en vivo.';
  }

  return (
    <div className={`card border ${tone} px-5 py-4 mb-10 flex items-center gap-4`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dot} ${tournamentStarted ? 'live-dot' : ''}`} />
      <div className="min-w-0">
        <div className="font-display font-black italic uppercase tracking-tight text-base leading-none">
          {title}
        </div>
        <div className="font-mono text-[11px] text-mute mt-1.5 leading-snug">{detail}</div>
      </div>
    </div>
  );
}

/* ============================================================ */
export default function Bracket() {
  const settings = useSettings();
  const letters = settings.groupLetters;

  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const settingsRaw: TournamentSettings | null = settings.raw;

  useEffect(() => {
    Promise.all([
      api.get('/matches/bracket').catch(() => ({ data: [] })),
      api.get('/groups/standings').catch(() => ({ data: [] })),
      api.get('/matches').catch(() => ({ data: [] })),
    ])
      .then(([m, s, all]) => {
        setMatches(m.data);
        setStandings(s.data);
        setAllMatches(all.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Próximos partidos: con ambos equipos definidos y sin terminar, por fecha.
  const upcoming = useMemo(() => {
    const playable = allMatches.filter(
      (m) => m.teamHomeId && m.teamAwayId && m.status !== 'finished',
    );
    const live = playable.filter((m) => m.status === 'live');
    const rest = playable
      .filter((m) => m.status !== 'live')
      .sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
        if (a.scheduledAt) return -1;
        if (b.scheduledAt) return 1;
        return 0;
      });
    return [...live, ...rest].slice(0, 3);
  }, [allMatches]);

  // Tablas de cada grupo a partir de los standings reales.
  const groups = useMemo(() => {
    return letters.map((letter) => {
      const rows = standings
        .filter((s) => s.group?.name === letter)
        .map((s, i) => ({
          pos: i + 1,
          name: s.team?.name || 'Por confirmar',
          pj: s.played,
          g: s.won,
          e: s.drawn,
          p: s.lost,
          gf: s.goalsFor,
          gc: s.goalsAgainst,
          pts: s.points,
          placeholder: !s.team,
        }));
      return { name: letter, rows: rows.length ? rows : placeholderRows() };
    });
  }, [standings, letters]);

  // Resolver: fusiona la estructura con datos reales por matchCode.
  const resolve = useMemo(() => {
    const byCode = new Map(matches.map((m) => [m.matchCode, m]));
    return (code: string, base: { home: string; away: string }): ResolvedSlot => {
      const m = byCode.get(code);
      const homeName = m?.teamHome?.name;
      const awayName = m?.teamAway?.name;
      const homeWin = !!(m?.winnerId && m.winnerId === m.teamHomeId);
      const awayWin = !!(m?.winnerId && m.winnerId === m.teamAwayId);
      const format = (m?.format as Slot['format']) ?? 'bo3';
      return {
        code,
        format,
        home: homeName || base.home,
        away: awayName || base.away,
        homeTbd: !homeName,
        awayTbd: !awayName,
        homeScore: m?.homeScore ?? null,
        awayScore: m?.awayScore ?? null,
        homeWin,
        awayWin,
        status: m?.status || 'scheduled',
      };
    };
  }, [matches]);

  // Estructura de la llave (rondas + seeds) según el nº de grupos.
  const { tree, colHeads, thirdSlot } = useMemo(() => {
    // Rondas, de la primera (más equipos) a la final.
    const firstRoundHasR16 = letters.length * 2 >= 16;
    const rounds: { codes: string[]; label: string }[] = [];
    if (firstRoundHasR16) {
      rounds.push({ codes: Array.from({ length: 8 }, (_, i) => `R${pad2(i + 1)}`), label: 'Octavos de Final' });
    }
    rounds.push({ codes: Array.from({ length: 4 }, (_, i) => `Q${pad2(i + 1)}`), label: 'Cuartos de Final' });
    rounds.push({ codes: ['SF1', 'SF2'], label: 'Semifinales' });
    rounds.push({ codes: ['GF'], label: 'Gran Final' });

    // Seeds de la primera ronda a partir de pares de grupos (A,B),(C,D)…
    const pairs: [string, string][] = [];
    for (let i = 0; i < letters.length; i += 2) {
      pairs.push([letters[i], letters[i + 1] ?? letters[i]]);
    }
    const firstSeeds = pairs.flatMap(([g1, g2]) => [
      { home: `1° Grupo ${g1}`, away: `2° Grupo ${g2}` },
      { home: `1° Grupo ${g2}`, away: `2° Grupo ${g1}` },
    ]);

    const lastRound = rounds.length - 1;
    const build = (roundIdx: number, matchIdx: number): Node => {
      const code = rounds[roundIdx].codes[matchIdx];
      if (roundIdx === 0) {
        const seed = firstSeeds[matchIdx] || { home: 'Por confirmar', away: 'Por confirmar' };
        return { code, slot: resolve(code, seed) };
      }
      const children = [build(roundIdx - 1, matchIdx * 2), build(roundIdx - 1, matchIdx * 2 + 1)];
      const base = {
        home: `Ganador ${children[0].code}`,
        away: `Ganador ${children[1].code}`,
      };
      return {
        code,
        slot: resolve(code, base),
        children,
        isFinal: roundIdx === lastRound,
      };
    };

    const tree = build(lastRound, 0);
    // Encabezados de columna, de la final hacia la primera ronda.
    const colHeads = [...rounds].reverse().map((r) => r.label);
    const thirdSlot = resolve('3L', { home: 'Perdedor SF1', away: 'Perdedor SF2' });
    return { tree, colHeads, thirdSlot };
  }, [letters, resolve]);

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-24">
        <Spinner />
      </div>
    );

  const tournamentStarted = !!settingsRaw?.tournamentStarted;
  const groupCols = letters.length >= 8 ? 'lg:grid-cols-4' : 'md:grid-cols-2';

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <StatusBanner settings={settingsRaw} />

      {/* ---------- PRÓXIMOS PARTIDOS ---------- */}
      {upcoming.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="kicker">Agenda</span>
            <h2 className="font-display font-black italic uppercase tracking-tight text-xl">
              Próximos partidos
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- FASE DE GRUPOS ---------- */}
      <section className="mb-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
          <div>
            <span className="kicker">Fase 1</span>
            <h1 className="font-display font-black italic uppercase tracking-tight text-3xl md:text-5xl mt-3 leading-none">
              Fase de grupos
            </h1>
          </div>
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-mute max-w-[34ch] leading-[1.8]">
            {tournamentStarted
              ? 'Tablas en tiempo real. Los dos primeros de cada grupo avanzan a la llave.'
              : 'Las tablas se llenan tras el sorteo. Hasta entonces verás «Por confirmar».'}
          </p>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${groupCols} gap-3`}>
          {groups.map((g) => (
            <GroupTable key={g.name} name={g.name} rows={g.rows} started={tournamentStarted} />
          ))}
        </div>
      </section>

      {/* ---------- LLAVE ELIMINATORIA ---------- */}
      <section>
        <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <span className="kicker">Fase 2</span>
            <h2 className="font-display font-black italic uppercase tracking-tight text-3xl md:text-5xl mt-3 leading-none">
              La llave
            </h2>
          </div>
          <span className="lg:hidden font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
            Desliza para ver →
          </span>
        </div>

        <div className="bk-scroll">
          <div className="inline-block min-w-full">
            <div className="flex flex-row-reverse gap-[var(--bk-ch)] mb-4">
              {colHeads.map((label, i) => (
                <ColHead key={label} final={i === 0}>
                  {label}
                </ColHead>
              ))}
            </div>
            <BracketNode node={tree} />
          </div>
        </div>

        {/* Tercer lugar */}
        <div className="mt-10">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute">
            Tercer puesto · {seriesLabel(thirdSlot.format)}
          </span>
          <div className="mt-3 max-w-[230px]">
            <BracketMatch slot={thirdSlot} />
          </div>
        </div>
      </section>
    </div>
  );
}
