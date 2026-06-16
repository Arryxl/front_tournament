import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Reward } from '../../types';

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', costCoins: 100, stock: '' });

  const load = () => {
    Promise.all([api.get('/rewards'), api.get('/rewards/redemptions')])
      .then(([r, red]) => {
        setRewards(r.data);
        setRedemptions(red.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/rewards', {
      name: form.name,
      description: form.description,
      costCoins: Number(form.costCoins),
      stock: form.stock === '' ? null : Number(form.stock),
    });
    setForm({ name: '', description: '', costCoins: 100, stock: '' });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/rewards/redemptions/${id}`, { status });
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/rewards/${id}`);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Economía</span>
      <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3 mb-6">
        Recompensas
      </h1>

      <form onSubmit={create} className="card p-5 mb-8 grid md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Costo (GRV)</label>
          <input type="number" className="input" value={form.costCoins} onChange={(e) => setForm({ ...form, costCoins: +e.target.value })} required />
        </div>
        <div>
          <label className="label">Stock (vacío = ∞)</label>
          <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <button className="btn btn-ignite">Crear</button>
        <div className="md:col-span-5">
          <label className="label">Descripción</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </form>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h2 className="font-display font-bold uppercase tracking-tight text-lg mb-3">Catálogo</h2>
          <div className="card divide-y divide-line-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-display font-semibold">{r.name}</div>
                  <div className="font-mono text-[10px] text-mute">
                    {r.costCoins} GRV · stock {r.stock ?? '∞'}
                  </div>
                </div>
                <button className="btn" onClick={() => remove(r.id)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display font-bold uppercase tracking-tight text-lg mb-3">Canjes</h2>
          <div className="card divide-y divide-line-2">
            {redemptions.length === 0 && <div className="p-3 font-mono text-xs text-mute">Sin canjes.</div>}
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-display font-semibold text-sm">{r.reward?.name}</div>
                  <div className="font-mono text-[10px] text-mute">{r.user?.username}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {r.status === 'pending' && (
                    <>
                      <button className="btn" onClick={() => setStatus(r.id, 'delivered')}>
                        Entregar
                      </button>
                      <button className="btn" onClick={() => setStatus(r.id, 'cancelled')}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
