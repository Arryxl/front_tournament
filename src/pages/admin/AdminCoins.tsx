import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, Coin, gratsLabel } from '../../components/ui';

export default function AdminCoins() {
  const [board, setBoard] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ userId: '', amount: '', concept: '' });
  const [msg, setMsg] = useState('');

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
    setMsg('');
    if (!form.userId || !form.amount) return;
    try {
      await api.post('/coins/grant', {
        userId: form.userId,
        amount: Number(form.amount),
        concept: form.concept || 'Ajuste manual admin',
      });
      setMsg('Grats actualizados');
      setForm({ userId: '', amount: '', concept: '' });
      load();
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Error');
    }
  };

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
      {msg && <div className="font-mono text-xs text-ignite mb-4">{msg}</div>}

      <h2 className="font-display font-black uppercase tracking-tight text-2xl mb-4">Ranking</h2>
      <div className="card divide-y divide-line-2">
        {board.length === 0 && <div className="p-4 font-mono text-xs text-mute">Sin datos.</div>}
        {board.map((u, i) => (
          <div key={u.userId || u.id} className="flex items-center gap-3 p-3">
            <span className="font-mono text-mute w-6">{i + 1}</span>
            <span className="flex-1 truncate font-display font-semibold">{u.username}</span>
            <span className="flex items-center gap-1.5">
              <Coin size={15} />
              <span className="font-display font-black italic text-ignite tabular-nums">{u.coins}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
