import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Match } from '../../types';

export default function AdminPredictions() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preds, setPreds] = useState<any[]>([]);
  const [hours, setHours] = useState('24');

  const load = () => {
    api
      .get('/matches')
      .then((r) => setMatches(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openWindow = async (id: string) => {
    const now = new Date();
    const until = new Date(now.getTime() + (Number(hours) || 24) * 3600 * 1000);
    await api.post('/predictions/windows', {
      matchId: id,
      openFrom: now.toISOString(),
      openUntil: until.toISOString(),
    });
    load();
  };

  const closeWindow = async (id: string) => {
    await api.patch(`/predictions/match/${id}/close`, {});
    load();
  };

  const viewPreds = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const r = await api.get(`/predictions/match/${id}`);
    setPreds(r.data);
    setOpenId(id);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Engagement</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-2">
        Predicciones
      </h1>
      <p className="font-mono text-[11px] text-mute mb-6 max-w-[60ch] leading-[1.8]">
        Abre la ventana de predicciones de un partido. Mientras esté abierta, los usuarios pueden
        predecir el ganador (y el marcador para ganar más monedas). Al cargar el resultado se
        reparten las monedas automáticamente.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <label className="label mb-0">Duración (horas)</label>
        <input
          type="number"
          className="input w-24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {matches.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-mute tracking-[0.2em] w-12">{m.matchCode}</span>
                <span className="font-display font-semibold text-sm">
                  {m.teamHome?.name || 'TBD'} <span className="text-mute">vs</span>{' '}
                  {m.teamAway?.name || 'TBD'}
                </span>
                {m.predictionsOpen ? (
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-green border border-green/40 px-2 py-0.5 rounded-sm">
                    Abiertas
                  </span>
                ) : (
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute border border-line px-2 py-0.5 rounded-sm">
                    Cerradas
                  </span>
                )}
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center gap-2">
                {m.predictionsOpen ? (
                  <button className="btn" onClick={() => closeWindow(m.id)}>
                    Cerrar
                  </button>
                ) : (
                  <button className="btn btn-ignite" onClick={() => openWindow(m.id)}>
                    Abrir
                  </button>
                )}
                <button className="btn" onClick={() => viewPreds(m.id)}>
                  {openId === m.id ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {openId === m.id && (
              <div className="mt-4 pt-4 border-t border-line-2">
                {preds.length === 0 ? (
                  <p className="font-mono text-xs text-mute">Sin predicciones todavía.</p>
                ) : (
                  <div className="divide-y divide-line-2">
                    {preds.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2">
                        <span className="font-display font-semibold text-sm">{p.user?.username}</span>
                        <span className="font-mono text-xs text-mute">
                          {p.predictedWinner?.name}
                          {p.predictedHomeScore != null && (
                            <span className="text-ignite ml-2">
                              {p.predictedHomeScore}-{p.predictedAwayScore}
                            </span>
                          )}
                        </span>
                        {p.isCorrect === null ? (
                          <span className="font-mono text-[10px] text-mute">pendiente</span>
                        ) : (
                          <span className={`font-display font-bold ${p.isCorrect ? 'text-green' : 'text-mute'}`}>
                            {p.isCorrect ? `✓ +${p.coinsEarned}` : '✗'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
