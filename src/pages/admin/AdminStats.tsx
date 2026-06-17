import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { StatEditor } from '../../components/StatEditor';
import type { Match, TopStat } from '../../types';

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
              <span className="font-display font-black text-ignite">{s.total}</span>
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [phase, setPhase] = useState('');

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

  if (loading) return <Spinner />;

  const phases = ['', 'groups', 'quarters', 'semis', 'third', 'final'];
  const withTeams = matches.filter((m) => m.teamHomeId && m.teamAwayId);
  const filtered = phase ? withTeams.filter((m) => m.phase === phase) : withTeams;

  return (
    <div>
      <span className="kicker">Rendimiento</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-2">
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

      <h2 className="font-display font-black uppercase tracking-tight text-2xl mb-4">
        Cargar stats por partido
      </h2>
      <div className="flex gap-2 mb-5 flex-wrap">
        {phases.map((p) => (
          <button key={p || 'all'} onClick={() => setPhase(p)} className={`btn ${phase === p ? 'btn-ignite' : ''}`}>
            {p === '' ? 'Todos' : p}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="font-mono text-xs text-mute">
          No hay partidos con ambos equipos asignados todavía. Asigna equipos en “Partidos”.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-mute tracking-[0.2em] w-12">{m.matchCode}</span>
                <span className="font-display font-semibold text-sm">
                  {m.teamHome?.name} <span className="text-mute">vs</span> {m.teamAway?.name}
                </span>
              </div>
              <button className="btn" onClick={() => setOpenId(openId === m.id ? null : m.id)}>
                {openId === m.id ? 'Cerrar' : 'Editar stats'}
              </button>
            </div>
            {openId === m.id && (
              <div className="mt-4 pt-4 border-t border-line-2">
                <StatEditor
                  matchId={m.id}
                  homeId={m.teamHomeId}
                  awayId={m.teamAwayId}
                  onSaved={loadRankings}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
