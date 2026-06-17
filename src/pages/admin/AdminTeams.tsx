import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Group, Team } from '../../types';

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; groupId: string }>({ name: '', groupId: '' });

  const load = () => {
    Promise.all([api.get('/teams'), api.get('/groups')])
      .then(([t, g]) => {
        setTeams(t.data);
        setGroups(g.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openEdit = (t: Team) => {
    setEdit(t.id);
    setForm({ name: t.name, groupId: t.groupId || '' });
  };

  const save = async (id: string) => {
    await api.patch(`/teams/${id}`, {
      name: form.name,
      groupId: form.groupId || null,
    });
    setEdit(null);
    load();
  };

  if (loading) return <Spinner />;

  const approved = teams.filter((t) => t.status === 'approved');
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name;

  return (
    <div>
      <span className="kicker">Torneo</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-2">Equipos</h1>
      <p className="font-mono text-[11px] text-mute mb-8">
        {approved.length} equipos aprobados. Edita nombre y grupo manualmente si hace falta.
      </p>

      <div className="flex flex-col gap-3">
        {approved.length === 0 && (
          <p className="font-mono text-xs text-mute">
            Aún no hay equipos aprobados. Aprueba inscripciones en “Inscripciones”.
          </p>
        )}
        {approved.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display font-black text-lg">{t.name}</span>
                {t.groupId && (
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border border-ignite/40 px-2 py-0.5 rounded-sm">
                    Grupo {groupName(t.groupId)}
                  </span>
                )}
                <StatusBadge status={t.status} />
              </div>
              <button className="btn" onClick={() => openEdit(t)}>
                Editar
              </button>
            </div>

            {/* roster */}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              {(t.members || [])
                .slice()
                .sort((a, b) => a.playerNumber - b.playerNumber)
                .map((m) => (
                  <span key={m.id} className="font-mono text-[11px] text-mute">
                    {m.isCaptain ? '★ ' : ''}
                    {m.epicUsername || m.steamUsername || `J${m.playerNumber}`}
                    {m.rank ? ` · ${m.rank}` : ''}
                  </span>
                ))}
            </div>

            {edit === t.id && (
              <div className="mt-4 pt-4 border-t border-line-2 grid md:grid-cols-[1fr_200px_auto] gap-3 items-end">
                <div>
                  <label className="label">Nombre</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Grupo</label>
                  <select
                    className="input"
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  >
                    <option value="">— Sin grupo —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        Grupo {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ignite" onClick={() => save(t.id)}>
                    Guardar
                  </button>
                  <button className="btn" onClick={() => setEdit(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
