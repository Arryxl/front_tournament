import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { CoinBalance, Spinner } from '../../components/ui';
import type { Reward } from '../../types';

export default function PlayerRewards() {
  const { user, fetchMe } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .get('/rewards')
      .then((r) => setRewards(r.data))
      .finally(() => setLoading(false));
  }, []);

  const redeem = async (id: string) => {
    setMsg('');
    try {
      await api.post(`/rewards/${id}/redeem`);
      setMsg('¡Canje realizado! El admin lo procesará.');
      fetchMe();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'No se pudo canjear');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="kicker">Tienda</span>
          <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3">
            Recompensas
          </h1>
        </div>
        <CoinBalance coins={user?.coins ?? 0} />
      </div>
      {msg && <div className="font-mono text-xs text-ignite mb-4">{msg}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        {rewards.map((r) => {
          const afford = (user?.coins ?? 0) >= r.costCoins;
          return (
            <div key={r.id} className="card p-5 flex flex-col">
              <div className="font-display font-bold text-lg">{r.name}</div>
              <p className="font-mono text-xs text-mute mt-2 mb-4 flex-1">{r.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-ignite">{r.costCoins} GRV</span>
                <button onClick={() => redeem(r.id)} disabled={!afford} className="btn disabled:opacity-40">
                  Canjear
                </button>
              </div>
              {r.stock !== null && (
                <div className="font-mono text-[10px] text-mute mt-2">Stock: {r.stock}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
