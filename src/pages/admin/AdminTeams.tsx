import { useEffect, useState } from 'react';
import { api, fileBase } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { useSettings } from '../../lib/useSettings';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';
import type { Group, Team } from '../../types';

const RANKS = [
  ['plat3', 'Platino 3'],
  ['dia1', 'Diamante 1'],
  ['dia2', 'Diamante 2'],
  ['dia3', 'Diamante 3'],
  ['champ1', 'Champion 1'],
  ['champ2', 'Champion 2'],
  ['champ3', 'Champion 3'],
];

type AddForm = {
  epicUsername: string;
  steamUsername: string;
  rank: string;
  screenshotUrl: string;
  username: string;
  password: string;
};
const emptyAdd = (): AddForm => ({
  epicUsername: '',
  steamUsername: '',
  rank: 'plat3',
  screenshotUrl: '',
  username: '',
  password: '',
});

export default function AdminTeams() {
  const toast = useToast();
  const confirm = useConfirm();
  const settings = useSettings();
  const STARTERS = settings.playersPerSide;
  const [q, setQ] = useState('');
  const [fGroup, setFGroup] = useState('all');
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    groupId: string;
    contactMethod: 'discord' | 'email';
    contactValue: string;
  }>({ name: '', groupId: '', contactMethod: 'discord', contactValue: '' });

  // alta de reemplazo
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd());
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [cred, setCred] = useState<{ username: string; password: string; playerNumber: number } | null>(null);

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
    setForm({
      name: t.name,
      groupId: t.groupId || '',
      contactMethod: t.contactMethod || 'discord',
      contactValue: t.contactValue || '',
    });
  };

  const save = async (id: string) => {
    try {
      await api.patch(`/teams/${id}`, {
        name: form.name,
        groupId: form.groupId || null,
        contactMethod: form.contactMethod,
        contactValue: form.contactValue.trim() || null,
      });
      toast.success('Equipo actualizado', form.name);
      setEdit(null);
      load();
    } catch (err: any) {
      toast.error('No se pudo guardar', err.response?.data?.message);
    }
  };

  const toggleAccess = async (memberId: string, active: boolean, name: string) => {
    try {
      await api.patch(`/teams/members/${memberId}/access`, { active });
      toast.success(active ? `Acceso restaurado · ${name}` : `Acceso revocado · ${name}`);
      load();
    } catch (err: any) {
      toast.error('No se pudo cambiar el acceso', err.response?.data?.message);
    }
  };

  const setCaptain = async (memberId: string, name: string) => {
    try {
      await api.patch(`/teams/members/${memberId}`, { isCaptain: true });
      toast.success(`Nuevo capitán · ${name}`);
      load();
    } catch (err: any) {
      toast.error('No se pudo asignar capitán', err.response?.data?.message);
    }
  };

  const removeMember = async (memberId: string, name: string) => {
    const ok = await confirm({
      title: `Quitar a ${name}`,
      body: 'Se eliminará del equipo y se deshabilitará su cuenta. ¿Continuar?',
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/teams/members/${memberId}`);
      toast.success(`${name} fue quitado del equipo`);
      load();
    } catch (err: any) {
      toast.error('No se pudo quitar', err.response?.data?.message);
    }
  };

  const uploadShot = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/uploads/screenshot', fd);
      setAddForm((f) => ({ ...f, screenshotUrl: data.url }));
    } catch {
      setAddError('Error al subir la captura');
    }
  };

  const submitAdd = async (teamId: string) => {
    setAddError('');
    if (!addForm.epicUsername && !addForm.steamUsername) {
      setAddError('Indica al menos un usuario (Epic o Steam).');
      return;
    }
    setAddBusy(true);
    try {
      const { data } = await api.post(`/teams/${teamId}/members`, addForm);
      setCred({ ...data.credentials });
      toast.success('Jugador agregado', 'Credenciales generadas abajo.');
      setAddForm(emptyAdd());
      setAddingFor(null);
      load();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Error al agregar jugador');
      toast.error('No se pudo agregar', err.response?.data?.message);
    } finally {
      setAddBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const approved = teams.filter((t) => t.status === 'approved');
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name;
  const term = q.trim().toLowerCase();
  const shown = approved.filter((t) => {
    if (fGroup === 'all' && term === '') return true;
    if (fGroup === 'none' && t.groupId) return false;
    if (fGroup !== 'all' && fGroup !== 'none' && groupName(t.groupId) !== fGroup) return false;
    if (term) {
      const members = (t.members || [])
        .map((m) => `${m.epicUsername || ''} ${m.steamUsername || ''} ${m.user?.username || ''}`)
        .join(' ');
      if (!`${t.name} ${members}`.toLowerCase().includes(term)) return false;
    }
    return true;
  });
  const groupOptions = [
    { value: 'all', label: 'Todos' },
    ...groups.map((g) => ({ value: g.name, label: g.name })),
    { value: 'none', label: 'Sin grupo' },
  ];

  return (
    <div>
      <span className="kicker">Torneo</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-2">Equipos</h1>
      <p className="font-mono text-[11px] text-mute mb-6">
        {approved.length} equipos aprobados. Gestiona el roster: revoca accesos, reemplaza o agrega
        jugadores.
      </p>

      {approved.length > 0 && (
        <FilterBar>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar equipo o jugador…" />
          <ChipGroup label="Grupo" value={fGroup} onChange={setFGroup} options={groupOptions} />
          <ResultCount shown={shown.length} total={approved.length} noun="equipos" onReset={() => { setQ(''); setFGroup('all'); }} />
        </FilterBar>
      )}

      {cred && (
        <div className="card p-5 mb-6 border-green/40">
          <div className="font-display font-bold text-green mb-2">
            Jugador agregado (J{cred.playerNumber}). Credenciales (guárdalas):
          </div>
          <div className="font-mono text-sm">
            <span className="text-ink">{cred.username}</span> /{' '}
            <span className="text-ignite">{cred.password}</span>
          </div>
          <button className="btn mt-3" onClick={() => setCred(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {approved.length === 0 ? (
          <p className="font-mono text-xs text-mute">
            Aún no hay equipos aprobados. Aprueba inscripciones en “Inscripciones”.
          </p>
        ) : shown.length === 0 ? (
          <p className="font-mono text-xs text-mute">Ningún equipo coincide con los filtros.</p>
        ) : null}
        {shown.map((t) => {
          const members = (t.members || []).slice().sort((a, b) => a.playerNumber - b.playerNumber);
          return (
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
                  {t.contactValue ? (
                    <span className="font-mono text-[10px] text-mute">
                      {t.contactMethod === 'email' ? '✉' : 'DC'}{' '}
                      <span className="text-ink">{t.contactValue}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-ignite">⚠ sin contacto</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn"
                    onClick={() => {
                      setAddingFor(addingFor === t.id ? null : t.id);
                      setAddForm(emptyAdd());
                      setAddError('');
                    }}
                  >
                    {addingFor === t.id ? 'Cancelar' : '+ Jugador'}
                  </button>
                  <button className="btn" onClick={() => openEdit(t)}>
                    Editar
                  </button>
                </div>
              </div>

              {/* roster */}
              <div className="mt-4 flex flex-col divide-y divide-line-2 border-t border-line-2">
                {members.map((m) => {
                  const name = m.epicUsername || m.steamUsername || `J${m.playerNumber}`;
                  const sub = m.playerNumber > STARTERS;
                  const active = m.user?.isActive !== false && !!m.user;
                  const hasAccount = !!m.user;
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[10px] text-mute w-5 shrink-0">
                          {m.playerNumber}
                        </span>
                        <span className="font-display font-semibold truncate">
                          {m.isCaptain && <span className="text-ignite">★ </span>}
                          {name}
                        </span>
                        {sub && (
                          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute border border-line px-1.5 py-0.5 rounded-sm">
                            SUP
                          </span>
                        )}
                        {m.rank && (
                          <span className="font-mono text-[10px] text-mute">· {m.rank}</span>
                        )}
                        {/* estado de acceso */}
                        {!hasAccount ? (
                          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute">
                            sin cuenta
                          </span>
                        ) : active ? (
                          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-green">
                            ● acceso
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-ignite">
                            ● sin acceso
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.isCaptain && !sub && (
                          <button
                            className="btn text-[10px] px-2.5 py-1.5"
                            onClick={() => setCaptain(m.id, name)}
                          >
                            ★ Capitán
                          </button>
                        )}
                        {hasAccount && (
                          <button
                            className="btn text-[10px] px-2.5 py-1.5"
                            onClick={() => toggleAccess(m.id, !active, name)}
                          >
                            {active ? 'Revocar acceso' : 'Restaurar'}
                          </button>
                        )}
                        <button
                          className="btn text-[10px] px-2.5 py-1.5"
                          onClick={() => removeMember(m.id, name)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <p className="font-mono text-xs text-mute py-2">Sin jugadores registrados.</p>
                )}
              </div>

              {/* alta de reemplazo */}
              {addingFor === t.id && (
                <div className="mt-4 pt-4 border-t border-line-2 flex flex-col gap-3">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                    Agregar jugador / reemplazo
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Usuario Epic</label>
                      <input
                        className="input"
                        value={addForm.epicUsername}
                        onChange={(e) => setAddForm({ ...addForm, epicUsername: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Usuario Steam (opcional)</label>
                      <input
                        className="input"
                        value={addForm.steamUsername}
                        onChange={(e) => setAddForm({ ...addForm, steamUsername: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Rango</label>
                      <select
                        className="input"
                        value={addForm.rank}
                        onChange={(e) => setAddForm({ ...addForm, rank: e.target.value })}
                      >
                        {RANKS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Captura principal</label>
                      <div className="flex items-center gap-3">
                        {addForm.screenshotUrl && (
                          <img
                            src={`${fileBase}${addForm.screenshotUrl}`}
                            className="w-10 h-10 rounded-md object-cover border border-line"
                          />
                        )}
                        <label className="btn cursor-pointer">
                          {addForm.screenshotUrl ? 'Cambiar' : 'Subir'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && uploadShot(e.target.files[0])}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="label">Usuario de acceso (opcional)</label>
                      <input
                        className="input"
                        placeholder="Se genera si lo dejas vacío"
                        value={addForm.username}
                        onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Contraseña (opcional)</label>
                      <input
                        className="input"
                        placeholder="Se genera si lo dejas vacío"
                        value={addForm.password}
                        onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                  {addError && <div className="font-mono text-xs text-ignite">{addError}</div>}
                  <div>
                    <button
                      className="btn btn-ignite"
                      disabled={addBusy}
                      onClick={() => submitAdd(t.id)}
                    >
                      {addBusy ? 'Agregando…' : 'Agregar jugador'}
                    </button>
                  </div>
                </div>
              )}

              {edit === t.id && (
                <div className="mt-4 pt-4 border-t border-line-2 flex flex-col gap-3">
                  <div className="grid md:grid-cols-[1fr_200px] gap-3">
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
                  </div>
                  <div className="grid md:grid-cols-[200px_1fr] gap-3">
                    <div>
                      <label className="label">Medio de contacto</label>
                      <select
                        className="input"
                        value={form.contactMethod}
                        onChange={(e) =>
                          setForm({ ...form, contactMethod: e.target.value as 'discord' | 'email' })
                        }
                      >
                        <option value="discord">Discord</option>
                        <option value="email">Correo</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        {form.contactMethod === 'discord' ? 'Usuario de Discord' : 'Correo electrónico'}
                      </label>
                      <input
                        className="input"
                        type={form.contactMethod === 'email' ? 'email' : 'text'}
                        value={form.contactValue}
                        onChange={(e) => setForm({ ...form, contactValue: e.target.value })}
                        placeholder={form.contactMethod === 'discord' ? 'usuario' : 'tu@correo.com'}
                      />
                    </div>
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
          );
        })}
      </div>
    </div>
  );
}
