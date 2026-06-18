import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { SearchBox, ChipGroup } from '../../components/admin/Filters';
import type { Reward } from '../../types';

type RedStatus = 'all' | 'pending' | 'delivered' | 'cancelled';

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', costCoins: 100, stock: '' });

  // filtros
  const [qCat, setQCat] = useState('');
  const [qRed, setQRed] = useState('');
  const [redStatus, setRedStatus] = useState<RedStatus>('all');

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

  const filteredRewards = useMemo(() => {
    const term = qCat.trim().toLowerCase();
    return term ? rewards.filter((r) => r.name.toLowerCase().includes(term)) : rewards;
  }, [rewards, qCat]);

  const redCounts = useMemo(() => {
    const c = { all: redemptions.length, pending: 0, delivered: 0, cancelled: 0 };
    for (const r of redemptions) if (r.status in c) (c as any)[r.status]++;
    return c;
  }, [redemptions]);

  const filteredRedemptions = useMemo(() => {
    const term = qRed.trim().toLowerCase();
    return redemptions.filter((r) => {
      if (redStatus !== 'all' && r.status !== redStatus) return false;
      if (term) {
        const hay = `${r.reward?.name || ''} ${r.user?.username || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [redemptions, qRed, redStatus]);

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Economía</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-6">
        Recompensas
      </h1>

      <form onSubmit={create} className="card p-5 mb-8 grid md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Costo (grats)</label>
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
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-bold uppercase tracking-tight text-lg">Catálogo</h2>
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute">
              {filteredRewards.length}
              {filteredRewards.length !== rewards.length && <span> / {rewards.length}</span>}
            </span>
          </div>
          <div className="mb-3">
            <SearchBox value={qCat} onChange={setQCat} placeholder="Buscar recompensa…" />
          </div>
          <div className="card divide-y divide-line-2">
            {filteredRewards.length === 0 && (
              <div className="p-3 font-mono text-xs text-mute">{qCat ? 'Sin coincidencias.' : 'Sin recompensas.'}</div>
            )}
            {filteredRewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-display font-semibold">{r.name}</div>
                  <div className="font-mono text-[10px] text-mute">
                    {r.costCoins} grats · stock {r.stock ?? '∞'}
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
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-bold uppercase tracking-tight text-lg">Canjes</h2>
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute">
              {filteredRedemptions.length}
              {filteredRedemptions.length !== redemptions.length && <span> / {redemptions.length}</span>}
            </span>
          </div>
          <div className="flex flex-col gap-3 mb-3">
            <SearchBox value={qRed} onChange={setQRed} placeholder="Buscar por usuario o recompensa…" />
            <ChipGroup
              value={redStatus}
              onChange={setRedStatus}
              options={[
                { value: 'all', label: 'Todos', count: redCounts.all },
                { value: 'pending', label: 'Pendientes', count: redCounts.pending },
                { value: 'delivered', label: 'Entregados', count: redCounts.delivered },
                { value: 'cancelled', label: 'Cancelados', count: redCounts.cancelled },
              ]}
            />
          </div>
          <div className="card divide-y divide-line-2">
            {filteredRedemptions.length === 0 && (
              <div className="p-3 font-mono text-xs text-mute">
                {redemptions.length === 0 ? 'Sin canjes.' : 'Ningún canje coincide con los filtros.'}
              </div>
            )}
            {filteredRedemptions.map((r) => (
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
