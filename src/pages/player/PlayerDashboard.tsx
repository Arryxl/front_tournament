import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { Spinner } from '../../components/ui';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get(`/users/${user.id}/stats`), api.get('/coins/history')])
      .then(([s, h]) => {
        setStats(s.data);
        setHistory(h.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner />;

  const t = stats?.totals || {};
  const cards = [
    { label: 'Monedas', value: user?.coins ?? 0 },
    { label: 'Partidos', value: stats?.matchesPlayed ?? 0 },
    { label: 'Goles', value: t.goals ?? 0 },
    { label: 'Asistencias', value: t.assists ?? 0 },
    { label: 'Salvadas', value: t.saves ?? 0 },
    { label: 'MVPs', value: t.mvps ?? 0 },
  ];

  return (
    <div>
      <span className="kicker">Mi panel</span>
      <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3 mb-8">
        Hola, {user?.username}
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">{c.label}</div>
            <div className="stat-num text-3xl mt-2">{c.value}</div>
          </div>
        ))}
      </div>

      <h2 className="font-display font-bold uppercase tracking-tight text-xl mb-4">
        Historial de monedas
      </h2>
      <div className="card divide-y divide-line-2">
        {history.length === 0 && <div className="p-4 font-mono text-xs text-mute">Sin movimientos.</div>}
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-3">
            <span className="font-mono text-xs text-mute">{h.concept}</span>
            <span
              className={`font-display font-extrabold ${h.amount >= 0 ? 'text-green' : 'text-ignite'}`}
            >
              {h.amount >= 0 ? '+' : ''}
              {h.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
