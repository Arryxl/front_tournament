import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';
import type { Match, Standing, TournamentSettings } from '../types';

/* ============================================================
   Estructura fija de la llave (según el plan GRV).
   Si la API ya trae partidos, se fusionan por matchCode;
   si no, se muestran los cruces / seeds como referencia.
   ============================================================ */

type Slot = {
  code: string;
  format: 'bo3' | 'bo5' | 'bo7';
  home: string; // nombre real o seed ("1°A", "Ganador Q01")
  away: string;
};

const BRACKET: Record<string, Slot> = {
  Q01: { code: 'Q01', format: 'bo3', home: '1° Grupo A', away: '2° Grupo B' },
  Q02: { code: 'Q02', format: 'bo3', home: '1° Grupo B', away: '2° Grupo A' },
  Q03: { code: 'Q03', format: 'bo3', home: '1° Grupo C', away: '2° Grupo D' },
  Q04: { code: 'Q04', format: 'bo3', home: '1° Grupo D', away: '2° Grupo C' },
  SF1: { code: 'SF1', format: 'bo5', home: 'Ganador Q01', away: 'Ganador Q04' },
  SF2: { code: 'SF2', format: 'bo5', home: 'Ganador Q02', away: 'Ganador Q03' },
  GF: { code: 'GF', format: 'bo7', home: 'Ganador SF1', away: 'Ganador SF2' },
  '3L': { code: '3L', format: 'bo7', home: 'Perdedor SF1', away: 'Perdedor SF2' },
};

const FORMAT_LABEL: Record<string, string> = { bo3: 'BO3', bo5: 'BO5', bo7: 'BO7' };

/* ---------------- Tarjeta de partido del bracket ---------------- */
function BracketMatch({ slot, live, isFinal }: { slot: ResolvedSlot; live?: boolean; isFinal?: boolean }) {
  const { code, format, home, away, homeScore, awayScore, homeWin, awayWin, status } = slot;
  return (
    <div className={`bk-match ${isFinal ? 'is-final' : ''}`}>
      <div className="bk-cap">
        <span>{code} · {FORMAT_LABEL[format]}</span>
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

type ResolvedSlot = Slot & {
  homeScore: number | null;
  awayScore: number | null;
  homeWin: boolean;
  awayWin: boolean;
  homeTbd: boolean;
  awayTbd: boolean;
  status: Match['status'] | 'scheduled';
};

/* ---------------- Nodo recursivo del árbol ---------------- */
type Node = { slot: ResolvedSlot; children?: Node[]; isFinal?: boolean };

function BracketNode({ node }: { node: Node }) {
  return (
    <div className="bk-node">
      <div className="bk-slot">
        <BracketMatch slot={node.slot} isFinal={node.isFinal} />
      </div>
      {node.children && (
        <div className="bk-branches">
          {node.children.map((c) => (
            <BracketNode key={c.slot.code} node={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ColHead({ w, children }: { w: number; children: string }) {
  return (
    <div
      style={{ width: w }}
      className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute text-center"
    >
      {children}
    </div>
  );
}

/* ============================================================
   Fase de grupos — DATOS REALES desde /groups/standings.
   Si un grupo aún no tiene equipos, se muestran filas
   "Por confirmar" como marcador de posición.
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

const GROUP_LETTERS = ['A', 'B', 'C', 'D'] as const;

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

function GroupTable({ name, rows, started }: { name: string; rows: Row[]; started: boolean }) {
  const isPlaceholder = rows.every((r) => r.placeholder);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line-2 bg-void-2">
        <span className="font-display font-black uppercase tracking-tight text-2xl">Grupo {name}</span>
        <span
          className={`font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded ${
            isPlaceholder ? 'text-mute border border-line' : 'text-ignite border border-ignite/40'
          }`}
        >
          {isPlaceholder ? (started ? 'Sin sorteo' : 'Por confirmar') : 'En juego'}
        </span>
      </div>

      <div className="grid grid-cols-[28px_1fr_34px_34px_34px_34px_44px_44px] gap-x-2 px-5 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase text-mute border-b border-line-2">
        <span>#</span>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">E</span>
        <span className="text-center">P</span>
        <span className="text-center">DG</span>
        <span className="text-right">Pts</span>
      </div>

      {rows.map((r) => {
        const top2 = r.pos <= 2;
        const dg = r.gf - r.gc;
        return (
          <div
            key={`${name}-${r.pos}`}
            className={`grid grid-cols-[28px_1fr_34px_34px_34px_34px_44px_44px] gap-x-2 px-5 py-3 items-center border-b border-line-2 last:border-0 ${
              top2 && !r.placeholder ? 'bg-ignite/[0.04]' : ''
            }`}
          >
            <span
              className={`font-display font-black text-base tabular-nums ${
                top2 ? 'text-ignite' : 'text-mute'
              }`}
            >
              {r.pos}
            </span>
            <span
              className={`font-display font-bold text-[15px] truncate ${
                r.placeholder ? 'italic text-mute' : 'text-ink'
              }`}
            >
              {r.placeholder ? `“${r.name}”` : r.name}
            </span>
            <span className="text-center font-mono text-sm text-mute tabular-nums">{r.pj}</span>
            <span className="text-center font-mono text-sm tabular-nums">{r.g}</span>
            <span className="text-center font-mono text-sm tabular-nums">{r.e}</span>
            <span className="text-center font-mono text-sm tabular-nums">{r.p}</span>
            <span className="text-center font-mono text-sm tabular-nums">
              {dg > 0 ? '+' : ''}
              {dg}
            </span>
            <span className="text-right font-display font-black text-lg tabular-nums">{r.pts}</span>
          </div>
        );
      })}

      <div className="px-5 py-2.5 font-mono text-[9px] tracking-[0.15em] uppercase text-mute bg-void/40">
        <span className="text-ignite">1° · 2°</span> clasifican a cuartos
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
        <div className="font-display font-black uppercase tracking-tight text-base leading-none">
          {title}
        </div>
        <div className="font-mono text-[11px] text-mute mt-1.5 leading-snug">{detail}</div>
      </div>
    </div>
  );
}

/* ============================================================ */
export default function Bracket() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/matches/bracket').catch(() => ({ data: [] })),
      api.get('/groups/standings').catch(() => ({ data: [] })),
      api.get('/settings').catch(() => ({ data: null })),
    ])
      .then(([m, s, st]) => {
        setMatches(m.data);
        setStandings(s.data);
        setSettings(st.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Construye las tablas de cada grupo a partir de los standings reales.
  const groups = useMemo(() => {
    return GROUP_LETTERS.map((letter) => {
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
  }, [standings]);

  // Fusiona la estructura fija con los datos reales (si existen).
  const resolve = useMemo(() => {
    const byCode = new Map(matches.map((m) => [m.matchCode, m]));
    return (code: string): ResolvedSlot => {
      const base = BRACKET[code];
      const m = byCode.get(code);
      const homeName = m?.teamHome?.name;
      const awayName = m?.teamAway?.name;
      const homeWin = !!(m?.winnerId && m.winnerId === m.teamHomeId);
      const awayWin = !!(m?.winnerId && m.winnerId === m.teamAwayId);
      return {
        ...base,
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

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-24">
        <Spinner />
      </div>
    );

  const tournamentStarted = !!settings?.tournamentStarted;

  const tree: Node = {
    isFinal: true,
    slot: resolve('GF'),
    children: [
      {
        slot: resolve('SF1'),
        children: [{ slot: resolve('Q01') }, { slot: resolve('Q04') }],
      },
      {
        slot: resolve('SF2'),
        children: [{ slot: resolve('Q02') }, { slot: resolve('Q03') }],
      },
    ],
  };

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <StatusBanner settings={settings} />

      {/* ---------- FASE DE GRUPOS ---------- */}
      <section className="mb-24">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="kicker">Fase 1</span>
            <h1 className="font-display font-black uppercase tracking-tight text-4xl md:text-6xl mt-3 leading-none">
              Fase de grupos
            </h1>
          </div>
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-mute max-w-[34ch] leading-[1.9]">
            {tournamentStarted
              ? 'Tablas en tiempo real. Los dos primeros de cada grupo avanzan a la llave.'
              : 'Las tablas se llenan tras el sorteo. Hasta entonces verás «Por confirmar».'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {groups.map((g) => (
            <GroupTable key={g.name} name={g.name} rows={g.rows} started={tournamentStarted} />
          ))}
        </div>
      </section>

      {/* ---------- LLAVE ELIMINATORIA ---------- */}
      <section>
        <div className="mb-8">
          <span className="kicker">Fase 2</span>
          <h2 className="font-display font-black uppercase tracking-tight text-4xl md:text-6xl mt-3 leading-none">
            La llave
          </h2>
        </div>

        <div className="bk-scroll">
          <div className="inline-flex flex-row-reverse gap-[34px] mb-4 min-w-full">
            <ColHead w={230}>Gran Final</ColHead>
            <ColHead w={210}>Semifinales</ColHead>
            <ColHead w={210}>Cuartos de Final</ColHead>
          </div>
          <BracketNode node={tree} />
        </div>

        {/* Tercer lugar */}
        <div className="mt-12">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute">
            Tercer lugar · BO7
          </span>
          <div className="mt-3 max-w-[230px]">
            <BracketMatch slot={resolve('3L')} />
          </div>
        </div>
      </section>
    </div>
  );
}
