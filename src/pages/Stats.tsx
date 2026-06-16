import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Section, Spinner } from '../components/ui';
import type { TopStat } from '../types';

function StatTable({ title, data }: { title: string; data: TopStat[] }) {
  return (
    <div className="card">
      <div className="p-4 border-b border-line-2 font-display font-bold uppercase tracking-tight">
        {title}
      </div>
      {data.length === 0 ? (
        <div className="p-4 font-mono text-xs text-mute">Sin datos.</div>
      ) : (
        <div className="divide-y divide-line-2">
          {data.map((s, i) => (
            <div key={s.userId} className="flex items-center gap-3 p-3">
              <span className="font-mono text-mute w-5">{i + 1}</span>
              <span className="flex-1 truncate font-display font-semibold">{s.username}</span>
              <span className="font-mono text-[11px] text-mute truncate max-w-[90px]">
                {s.teamName}
              </span>
              <span className="font-display font-extrabold text-ignite text-lg w-10 text-right">
                {s.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const [data, setData] = useState<Record<string, TopStat[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats/top-scorers'),
      api.get('/stats/top-assists'),
      api.get('/stats/top-saves'),
      api.get('/stats/top-score'),
    ])
      .then(([g, a, s, sc]) =>
        setData({ goleadores: g.data, asistencias: a.data, salvadas: s.data, score: sc.data }),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <Section kicker="Rendimiento" title="Estadísticas">
      <div className="grid md:grid-cols-2 gap-5">
        <StatTable title="Top Goleadores" data={data.goleadores || []} />
        <StatTable title="Top Asistencias" data={data.asistencias || []} />
        <StatTable title="Top Salvadas" data={data.salvadas || []} />
        <StatTable title="Top Score" data={data.score || []} />
      </div>
    </Section>
  );
}
