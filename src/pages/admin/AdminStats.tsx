import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';
import type { Match, TopStat } from '../../types';

const PHASE_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'groups', label: 'Grupos' },
  { value: 'round16', label: 'Octavos' },
  { value: 'quarters', label: 'Cuartos' },
  { value: 'semis', label: 'Semis' },
  { value: 'third', label: '3er' },
  { value: 'final', label: 'Final' },
];

function MiniRanking({ title, data }: { title: string; data: TopStat[] }) {
  return (
    <div className="card">
      <div className="p-3 border-b border-line-2 font-display font-bold uppercase tracking-tight text-sm">
        {title}
      </div>
      {data.length === 0 ? (
        <div className="p-3 font-mono text-[11px] text-mute">Sin datos aún.</div>
      ) : (
        <div className="divide-y divide-line-2">
          {data.slice(0, 5).map((s, i) => (
            <div key={s.userId} className="flex items-center gap-2 p-2.5">
              <span className="font-mono text-mute w-4 text-xs">{i + 1}</span>
              <span className="flex-1 truncate font-display font-semibold text-sm">{s.username}</span>
              <span className="font-display font-black italic text-ignite">{s.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminStats() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Record<string, TopStat[]>>({});
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('');
  const [q, setQ] = useState('');
  const [done, setDone] = useState<'all' | 'finished' | 'pending'>('all');

  const loadRankings = () =>
    Promise.all([
      api.get('/stats/top-scorers'),
      api.get('/stats/top-assists'),
      api.get('/stats/top-saves'),
      api.get('/stats/top-score'),
    ]).then(([g, a, s, sc]) =>
      setRankings({ goleadores: g.data, asistencias: a.data, salvadas: s.data, score: sc.data }),
    );

  useEffect(() => {
    Promise.all([api.get('/matches'), loadRankings()])
      .then(([m]) => setMatches(m.data))
      .finally(() => setLoading(false));
  }, []);

  const withTeams = useMemo(() => matches.filter((m) => m.teamHomeId && m.teamAwayId), [matches]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return withTeams.filter((m) => {
      if (phase && m.phase !== phase) return false;
      if (done === 'finished' && m.status !== 'finished') return false;
      if (done === 'pending' && m.status === 'finished') return false;
      if (term) {
        const hay = `${m.matchCode} ${m.teamHome?.name || ''} ${m.teamAway?.name || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [withTeams, phase, done, q]);

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Rendimiento</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-2">
        Estadísticas
      </h1>
      <p className="font-mono text-[11px] text-mute mb-8 max-w-[60ch] leading-[1.8]">
        Carga o corrige las estadísticas individuales de cada partido. Alimentan los rankings
        públicos y el panel de cada jugador.
      </p>

      {/* rankings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <MiniRanking title="Goleadores" data={rankings.goleadores || []} />
        <MiniRanking title="Asistencias" data={rankings.asistencias || []} />
        <MiniRanking title="Salvadas" data={rankings.salvadas || []} />
        <MiniRanking title="Score" data={rankings.score || []} />
      </div>

      <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-1">
        Cargar stats por partido
      </h2>
      <p className="font-mono text-[11px] text-mute mb-4 leading-[1.7] max-w-[60ch]">
        Elige un partido para abrir su página de resultado: ahí cargas el marcador
        y las estadísticas (o las autocompletas desde el replay).
      </p>

      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por código o equipo…" />
        <ChipGroup label="Fase" value={phase} onChange={setPhase} options={PHASE_OPTS} />
        <ChipGroup
          label="Estado"
          value={done}
          onChange={setDone}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'finished', label: 'Finalizados' },
            { value: 'pending', label: 'Pendientes' },
          ]}
        />
        <ResultCount
          shown={filtered.length}
          total={withTeams.length}
          noun="partidos"
          onReset={() => {
            setQ('');
            setPhase('');
            setDone('all');
          }}
        />
      </FilterBar>

      {filtered.length === 0 && (
        <p className="font-mono text-xs text-mute">
          {withTeams.length === 0
            ? 'No hay partidos con ambos equipos asignados todavía. Asigna equipos en “Partidos”.'
            : 'Ningún partido coincide con los filtros.'}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] text-mute tracking-[0.2em] w-12 shrink-0">{m.matchCode}</span>
                <span className="font-display font-semibold text-sm truncate">
                  {m.teamHome?.name} <span className="text-mute">vs</span> {m.teamAway?.name}
                </span>
                {m.status === 'finished' && (
                  <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-green border border-green/40 rounded-sm px-1.5 py-0.5 shrink-0">
                    {m.homeScore}–{m.awayScore}
                  </span>
                )}
              </div>
              <Link to={`/admin/matches/${m.id}`} className="btn shrink-0">
                {m.status === 'finished' ? 'Ver / editar' : 'Cargar resultado'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
