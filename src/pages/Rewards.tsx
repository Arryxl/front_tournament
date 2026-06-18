import { useEffect, useState } from 'react';
import { api, fileBase } from '../lib/api';
import { useAuth } from '../store/auth';
import { Spinner, Coin, BackButton, gratsLabel } from '../components/ui';
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
      <BackButton className="mb-5" />
      <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
        <div>
          <span className="kicker">Tienda</span>
          <h1 className="font-display font-black italic uppercase text-[clamp(40px,8vw,96px)] tracking-tight leading-[0.85] mt-3">
            Recompensas
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-void-2 border border-line rounded-lg px-4 py-3">
          <Coin size={28} />
          <div className="leading-none">
            <div className="font-display font-black italic text-ignite text-2xl tabular-nums">
              {(user?.coins ?? 0).toLocaleString('es')}
            </div>
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-mute mt-1">
              {gratsLabel(user?.coins ?? 0)} · tu saldo
            </div>
          </div>
        </div>
      </div>
      <p className="font-display text-mute text-base max-w-[52ch] mb-10 leading-[1.6]">
        Gana grats prediciendo partidos y canjéalos por premios de la liga.
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
                  <Coin size={56} className="opacity-25" />
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="font-display font-black italic text-lg uppercase tracking-tight">{r.name}</div>
                <p className="font-mono text-[11px] text-mute mt-2 mb-4 flex-1 leading-[1.6]">
                  {r.description}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <Coin size={20} />
                    <span className="font-display font-black italic text-ignite text-xl tabular-nums">
                      {r.costCoins.toLocaleString('es')}
                    </span>
                    <span className="font-mono text-[10px] text-mute uppercase tracking-[0.12em]">
                      {gratsLabel(r.costCoins)}
                    </span>
                  </span>
                  <button
                    onClick={() => redeem(r.id)}
                    disabled={!afford || out}
                    className="btn btn-ignite disabled:opacity-40 disabled:bg-transparent disabled:text-mute disabled:border-line"
                  >
                    {out ? 'Agotado' : afford ? 'Canjear' : 'Faltan grats'}
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
