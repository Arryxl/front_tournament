import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Match } from '../../types';

export default function PlayerPredictions() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    Promise.all([api.get('/matches'), api.get('/predictions/my')])
      .then(([m, p]) => {
        setMatches(m.data);
        setMine(p.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const predict = async (matchId: string, winnerId: string) => {
    setMsg('');
    try {
      await api.post('/predictions', { matchId, predictedWinnerId: winnerId });
      setMsg('¡Predicción registrada!');
      load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'No se pudo predecir');
    }
  };

  if (loading) return <Spinner />;

  const open = matches.filter((m) => m.predictionsOpen && m.status !== 'finished');
  const predictedIds = new Set(mine.map((p) => p.matchId));

  return (
    <div>
      <span className="kicker">Predicciones</span>
      <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3 mb-2">
        Predice y gana
      </h1>
      {msg && <div className="font-mono text-xs text-ignite mb-4">{msg}</div>}

      <h2 className="font-display font-bold uppercase tracking-tight text-lg mt-8 mb-4">Abiertas</h2>
      {open.length === 0 && <p className="font-mono text-xs text-mute">No hay predicciones abiertas ahora.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {open.map((m) => {
          const already = predictedIds.has(m.id);
          return (
            <div key={m.id} className="card p-4">
              <div className="font-mono text-[11px] text-mute tracking-[0.2em] mb-3">{m.matchCode}</div>
              <div className="flex items-center justify-between gap-2">
                <button
                  disabled={already || !m.teamHomeId}
                  onClick={() => m.teamHomeId && predict(m.id, m.teamHomeId)}
                  className="btn flex-1 disabled:opacity-40"
                >
                  {m.teamHome?.name || 'Local'}
                </button>
                <span className="font-mono text-mute text-xs">vs</span>
                <button
                  disabled={already || !m.teamAwayId}
                  onClick={() => m.teamAwayId && predict(m.id, m.teamAwayId)}
                  className="btn flex-1 disabled:opacity-40"
                >
                  {m.teamAway?.name || 'Visita'}
                </button>
              </div>
              {already && <div className="font-mono text-[10px] text-green mt-2">Ya predijiste</div>}
            </div>
          );
        })}
      </div>

      <h2 className="font-display font-bold uppercase tracking-tight text-lg mt-12 mb-4">
        Mis predicciones
      </h2>
      <div className="card divide-y divide-line-2">
        {mine.length === 0 && <div className="p-4 font-mono text-xs text-mute">Aún no has predicho.</div>}
        {mine.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3">
            <span className="font-mono text-xs">{p.match?.matchCode}</span>
            <span className="font-display font-semibold text-sm flex-1 mx-4 truncate">
              {p.predictedWinner?.name}
            </span>
            {p.isCorrect === null ? (
              <StatusBadge status="scheduled" />
            ) : (
              <span className={`font-display font-bold ${p.isCorrect ? 'text-green' : 'text-mute'}`}>
                {p.isCorrect ? `✓ +${p.coinsEarned}` : '✗'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
