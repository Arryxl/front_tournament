import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';

export default function AdminDashboard() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/teams'),
      api.get('/matches'),
      api.get('/users'),
      api.get('/teams/registrations?status=pending'),
    ])
      .then(([t, m, u, r]) =>
        setData({
          teams: t.data.length,
          matches: m.data.length,
          played: m.data.filter((x: any) => x.status === 'finished').length,
          users: u.data.length,
          pending: r.data.length,
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const cards = [
    { label: 'Equipos', value: data.teams },
    { label: 'Usuarios', value: data.users },
    { label: 'Partidos', value: data.matches },
    { label: 'Jugados', value: data.played },
    { label: 'Inscripciones pendientes', value: data.pending, alert: data.pending > 0 },
  ];

  return (
    <div>
      <span className="kicker">Administración</span>
      <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3 mb-8">
        Dashboard
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`card p-5 ${c.alert ? 'border-ignite/50' : ''}`}>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
              {c.label}
            </div>
            <div className={`stat-num text-4xl mt-2 ${c.alert ? 'text-ignite' : ''}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
