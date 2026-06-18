import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, Coin, gratsLabel } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { SearchBox } from '../../components/admin/Filters';

export default function AdminCoins() {
  const toast = useToast();
  const [board, setBoard] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ userId: '', amount: '', concept: '' });
  const [q, setQ] = useState('');

  const load = () => {
    Promise.all([api.get('/coins/leaderboard'), api.get('/users')])
      .then(([b, u]) => {
        setBoard(b.data);
        setUsers(u.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.amount) return;
    try {
      await api.post('/coins/grant', {
        userId: form.userId,
        amount: Number(form.amount),
        concept: form.concept || 'Ajuste manual admin',
      });
      const u = users.find((x) => x.id === form.userId);
      toast.success('Grats actualizados', `${u?.username || ''}: ${Number(form.amount) > 0 ? '+' : ''}${form.amount}`);
      setForm({ userId: '', amount: '', concept: '' });
      load();
    } catch (err: any) {
      toast.error('No se pudo aplicar', err.response?.data?.message);
    }
  };

  const filteredBoard = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? board.filter((u) => (u.username || '').toLowerCase().includes(term)) : board;
  }, [board, q]);

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Economía</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-6 flex items-center gap-3">
        <Coin size={34} /> Grats
      </h1>

      <form onSubmit={grant} className="card p-5 mb-8 grid md:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end">
        <div>
          <label className="label">Usuario</label>
          <select
            className="input"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            required
          >
            <option value="">— Seleccionar —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.coins} {gratsLabel(u.coins)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cantidad (+/-)</label>
          <input
            type="number"
            className="input"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Concepto</label>
          <input
            className="input"
            value={form.concept}
            onChange={(e) => setForm({ ...form, concept: e.target.value })}
            placeholder="Ajuste manual admin"
          />
        </div>
        <button className="btn btn-ignite">Aplicar</button>
      </form>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="font-display font-black uppercase tracking-tight text-2xl">Ranking</h2>
        <div className="w-full sm:w-64">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar en el ranking…" />
        </div>
      </div>
      <div className="card divide-y divide-line-2">
        {filteredBoard.length === 0 && (
          <div className="p-4 font-mono text-xs text-mute">{q ? 'Sin coincidencias.' : 'Sin datos.'}</div>
        )}
        {filteredBoard.map((u) => {
          const pos = board.indexOf(u) + 1;
          const podium = pos <= 3 && !q;
          return (
            <div key={u.userId || u.id} className={`flex items-center gap-3 p-3 ${podium ? 'bg-ignite/[0.04]' : ''}`}>
              <span className={`font-display font-black tabular-nums w-7 text-center ${podium ? 'text-ignite' : 'text-mute'}`}>
                {pos}
              </span>
              <span className="flex-1 truncate font-display font-semibold">{u.username}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <Coin size={15} />
                <span className="font-display font-black italic text-ignite tabular-nums">{u.coins}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
