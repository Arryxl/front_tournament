import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, Coin } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';

type RoleFilter = 'all' | 'admin' | 'candidate' | 'public';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'coins' | 'username' | 'role';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  candidate: 'Jugador',
  public: 'Fan',
};

export default function AdminUsers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', email: '' });

  // filtros
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('coins');

  const load = () => {
    api
      .get('/users')
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/candidate', form);
      toast.success('Candidato creado', form.username);
      setForm({ username: '', password: '', email: '' });
      load();
    } catch (err: any) {
      toast.error('No se pudo crear', err.response?.data?.message);
    }
  };

  const grant = async (id: string, username: string) => {
    const amount = prompt(`Grats para ${username} (+/-):`);
    if (!amount) return;
    try {
      await api.patch(`/users/${id}/coins`, { amount: Number(amount), concept: 'Ajuste manual admin' });
      toast.success('Saldo ajustado', `${username}: ${Number(amount) > 0 ? '+' : ''}${amount} grats.`);
      load();
    } catch (err: any) {
      toast.error('No se pudo ajustar el saldo', err.response?.data?.message);
    }
  };

  const toggle = async (id: string, isActive: boolean, username: string) => {
    if (isActive) {
      const ok = await confirm({
        title: `Desactivar a ${username}`,
        body: 'El usuario no podrá iniciar sesión hasta que lo reactives. ¿Continuar?',
        confirmLabel: 'Desactivar',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      if (isActive) await api.delete(`/users/${id}`);
      else await api.patch(`/users/${id}`, { isActive: true });
      toast.success(isActive ? `${username} desactivado` : `${username} reactivado`);
      load();
    } catch (err: any) {
      toast.error('No se pudo actualizar', err.response?.data?.message);
    }
  };

  const counts = useMemo(() => {
    const c = { all: users.length, admin: 0, candidate: 0, public: 0, active: 0, inactive: 0 };
    for (const u of users) {
      if (u.role in c) (c as any)[u.role]++;
      if (u.isActive === false) c.inactive++;
      else c.active++;
    }
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (status === 'active' && u.isActive === false) return false;
      if (status === 'inactive' && u.isActive !== false) return false;
      if (term && !`${u.username} ${u.email || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'coins') return (b.coins ?? 0) - (a.coins ?? 0);
      if (sort === 'username') return a.username.localeCompare(b.username);
      return a.role.localeCompare(b.role) || a.username.localeCompare(b.username);
    });
    return list;
  }, [users, q, role, status, sort]);

  const resetFilters = () => {
    setQ('');
    setRole('all');
    setStatus('all');
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Sistema</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-6">Usuarios</h1>

      {/* alta de candidato */}
      <form onSubmit={create} className="card p-4 sm:p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label">Usuario</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email (opcional)</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn btn-ignite">Crear candidato</button>
      </form>

      {/* filtros */}
      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar usuario o email…" />
        <ChipGroup
          label="Rol"
          value={role}
          onChange={setRole}
          options={[
            { value: 'all', label: 'Todos', count: counts.all },
            { value: 'candidate', label: 'Jugadores', count: counts.candidate },
            { value: 'public', label: 'Fans', count: counts.public },
            { value: 'admin', label: 'Admins', count: counts.admin },
          ]}
        />
        <ChipGroup
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Activos', count: counts.active },
            { value: 'inactive', label: 'Inactivos', count: counts.inactive },
          ]}
        />
        <ChipGroup
          label="Orden"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'coins', label: 'Grats' },
            { value: 'username', label: 'Nombre' },
            { value: 'role', label: 'Rol' },
          ]}
        />
        <ResultCount shown={filtered.length} total={users.length} noun="usuarios" onReset={resetFilters} />
      </FilterBar>

      {/* tabla / lista responsive */}
      <div className="card overflow-hidden">
        {/* encabezado solo en desktop */}
        <div className="hidden lg:grid grid-cols-[1fr_120px_110px_220px] gap-3 px-4 py-2.5 border-b border-line bg-void-2 font-mono text-[9px] tracking-[0.2em] uppercase text-mute">
          <span>Usuario</span>
          <span>Rol</span>
          <span className="text-right">Grats</span>
          <span className="text-right">Acciones</span>
        </div>

        {filtered.length === 0 && (
          <p className="font-mono text-xs text-mute p-5">Ningún usuario coincide con los filtros.</p>
        )}

        {filtered.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-1 lg:grid-cols-[1fr_120px_110px_220px] gap-2 lg:gap-3 lg:items-center px-4 py-3 border-b border-line-2 last:border-0 hover:bg-void-3/40 transition-colors"
          >
            {/* usuario */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold truncate">{u.username}</span>
                {u.isActive === false && (
                  <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-ignite border border-ignite/40 px-1.5 py-0.5 rounded">
                    inactivo
                  </span>
                )}
              </div>
              {u.email && <div className="font-mono text-[10px] text-mute truncate">{u.email}</div>}
            </div>

            {/* rol */}
            <div>
              <span
                className={`font-mono text-[10px] tracking-[0.15em] uppercase px-2 py-1 rounded border ${
                  u.role === 'admin'
                    ? 'text-ignite border-ignite/40'
                    : u.role === 'candidate'
                      ? 'text-ink border-line'
                      : 'text-mute border-line'
                }`}
              >
                {ROLE_LABEL[u.role] || u.role}
              </span>
            </div>

            {/* grats */}
            <div className="lg:text-right">
              <span className="lg:hidden font-mono text-[9px] tracking-[0.2em] uppercase text-mute mr-2">Grats</span>
              <span className="inline-flex items-center gap-1.5 font-display font-black italic tabular-nums text-ignite">
                <Coin size={14} />
                {(u.coins ?? 0).toLocaleString('es')}
              </span>
            </div>

            {/* acciones */}
            <div className="flex gap-2 lg:justify-end">
              <button className="btn !px-3 !py-1.5 text-[10px]" onClick={() => grant(u.id, u.username)}>
                Grats
              </button>
              <button className="btn !px-3 !py-1.5 text-[10px]" onClick={() => toggle(u.id, u.isActive, u.username)}>
                {u.isActive === false ? 'Activar' : 'Desactivar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
