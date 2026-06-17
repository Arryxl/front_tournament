import { useEffect, useState } from 'react';
import { api, fileBase } from '../lib/api';
import { useAuth } from '../store/auth';
import { Spinner } from '../components/ui';
import type { Reward } from '../types';

export default function Rewards() {
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

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
        <div>
          <span className="kicker">Tienda</span>
          <h1 className="font-display font-black uppercase text-[clamp(40px,8vw,96px)] tracking-tight leading-[0.88] mt-3">
            Recompensas
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-mute text-xs tracking-[0.2em] uppercase">Tu saldo</span>
          <span className="font-display font-black text-ignite text-2xl">{user?.coins ?? 0}</span>
          <span className="text-mute text-xs">GRV</span>
        </div>
      </div>
      <p className="font-display text-mute text-base max-w-[52ch] mb-10 leading-[1.6]">
        Gana monedas prediciendo partidos y canjéalas por premios de la liga.
      </p>

      {msg && <div className="font-mono text-xs text-ignite mb-6">{msg}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rewards.map((r) => {
          const afford = (user?.coins ?? 0) >= r.costCoins;
          const out = r.stock !== null && r.stock <= 0;
          const img = r.imageUrl
            ? r.imageUrl.startsWith('http')
              ? r.imageUrl
              : `${fileBase}${r.imageUrl}`
            : null;
          return (
            <div key={r.id} className="card overflow-hidden flex flex-col lift">
              <div className="aspect-[16/9] bg-void grid place-items-center border-b border-line-2 overflow-hidden">
                {img ? (
                  <img src={img} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-black text-4xl text-line uppercase">GRV</span>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="font-display font-black text-lg uppercase tracking-tight">{r.name}</div>
                <p className="font-mono text-[11px] text-mute mt-2 mb-4 flex-1 leading-[1.6]">
                  {r.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-ignite text-xl">{r.costCoins} GRV</span>
                  <button
                    onClick={() => redeem(r.id)}
                    disabled={!afford || out}
                    className="btn btn-ignite disabled:opacity-40 disabled:bg-transparent disabled:text-mute disabled:border-line"
                  >
                    {out ? 'Agotado' : afford ? 'Canjear' : 'Faltan monedas'}
                  </button>
                </div>
                {r.stock !== null && !out && (
                  <div className="font-mono text-[10px] text-mute mt-2">Stock: {r.stock}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
