import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', email: '' });
  const [msg, setMsg] = useState('');

  const load = () => {
    api
      .get('/users')
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/users/candidate', form);
      setMsg('Candidato creado');
      setForm({ username: '', password: '', email: '' });
      load();
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Error');
    }
  };

  const grant = async (id: string) => {
    const amount = prompt('Cantidad de monedas (+/-):');
    if (!amount) return;
    await api.patch(`/users/${id}/coins`, { amount: Number(amount), concept: 'Ajuste manual admin' });
    load();
  };

  const toggle = async (id: string, isActive: boolean) => {
    if (isActive) await api.delete(`/users/${id}`);
    else await api.patch(`/users/${id}`, { isActive: true });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Sistema</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-6">
        Usuarios
      </h1>

      <form onSubmit={create} className="card p-5 mb-8 grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label">Usuario</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn btn-ignite">Crear candidato</button>
      </form>
      {msg && <div className="font-mono text-xs text-ignite mb-4">{msg}</div>}

      <div className="card divide-y divide-line-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <span className="font-display font-semibold">{u.username}</span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">{u.role}</span>
              {!u.isActive && <span className="font-mono text-[10px] text-ignite">inactivo</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-ignite">{u.coins} GRV</span>
              <button className="btn" onClick={() => grant(u.id)}>
                Monedas
              </button>
              <button className="btn" onClick={() => toggle(u.id, u.isActive)}>
                {u.isActive ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
