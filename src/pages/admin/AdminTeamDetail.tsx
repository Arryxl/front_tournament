import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fileBase } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { useSettings } from '../../lib/useSettings';
import { RANKS } from '../../lib/ranks';
import { UploadField } from '../../components/UploadField';
import { TeamPicker } from '../../components/TeamPicker';
import type { Group, Team, TeamReadiness } from '../../types';

const PLATFORM_LABEL: Record<string, string> = { steam: 'Steam', epic: 'Epic' };

type AddForm = {
  epicUsername: string;
  steamUsername: string;
  psnUsername: string;
  xboxUsername: string;
  switchUsername: string;
  rank: string;
  screenshotUrl: string;
  username: string;
  password: string;
};
const emptyAdd = (): AddForm => ({
  epicUsername: '',
  steamUsername: '',
  psnUsername: '',
  xboxUsername: '',
  switchUsername: '',
  rank: 'plat3',
  screenshotUrl: '',
  username: '',
  password: '',
});

export default function AdminTeamDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const settings = useSettings();
  const STARTERS = settings.playersPerSide;

  const [team, setTeam] = useState<Team | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [readiness, setReadiness] = useState<TeamReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [pickPreset, setPickPreset] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    shieldUrl: string;
    groupId: string;
    contactMethod: 'discord' | 'email';
    contactValue: string;
  }>({ name: '', shieldUrl: '', groupId: '', contactMethod: 'discord', contactValue: '' });

  // alta de reemplazo
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd());
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [cred, setCred] = useState<{ username: string; password: string; playerNumber: number } | null>(null);

  const load = () => {
    if (!id) return;
    Promise.all([
      api.get(`/teams/${id}`),
      api.get('/groups'),
      api.get(`/link/team/${id}`).catch(() => ({ data: null })),
    ])
      .then(([t, g, r]) => {
        setTeam(t.data);
        setGroups(g.data);
        setReadiness(r.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const groupName = (gid: string | null) => groups.find((g) => g.id === gid)?.name;

  const openEdit = () => {
    if (!team) return;
    setEditing(true);
    setPickPreset(false);
    setForm({
      name: team.name,
      shieldUrl: team.shieldUrl || '',
      groupId: team.groupId || '',
      contactMethod: team.contactMethod || 'discord',
      contactValue: team.contactValue || '',
    });
  };

  const save = async () => {
    if (!team) return;
    try {
      await api.patch(`/teams/${team.id}`, {
        name: form.name.trim(),
        shieldUrl: form.shieldUrl || null,
        groupId: form.groupId || null,
        contactMethod: form.contactMethod,
        contactValue: form.contactValue.trim() || null,
      });
      toast.success('Equipo actualizado', form.name);
      setEditing(false);
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

  const approveTeam = async () => {
    if (!team) return;
    const ok = await confirm({
      title: `Inscribir a ${team.name}`,
      body: 'El equipo quedará inscrito en el torneo y se notificará a sus jugadores. ¿Continuar?',
      confirmLabel: 'Inscribir',
    });
    if (!ok) return;
    try {
      await api.post(`/teams/${team.id}/approve`);
      toast.success('Equipo inscrito', team.name);
      load();
    } catch (err: any) {
      toast.error('No se pudo inscribir', err.response?.data?.message);
    }
  };

  const rejectTeam = async () => {
    if (!team) return;
    const ok = await confirm({
      title: `Rechazar a ${team.name}`,
      body: 'No se inscribirá al torneo, se notificará a los jugadores y el equipo se eliminará (sus cuentas quedan libres). ¿Continuar?',
      confirmLabel: 'Rechazar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.post(`/teams/${team.id}/reject`);
      toast.success('Equipo rechazado', team.name);
      window.location.href = '/admin/teams';
    } catch (err: any) {
      toast.error('No se pudo rechazar', err.response?.data?.message);
    }
  };

  const deleteTeam = async () => {
    if (!team) return;
    const ok = await confirm({
      title: `Eliminar a ${team.name}`,
      body: 'El equipo se eliminará del torneo y se notificará a sus jugadores (sus cuentas quedan libres). Esta acción no se puede deshacer. ¿Continuar?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/teams/${team.id}`);
      toast.success('Equipo eliminado', team.name);
      window.location.href = '/admin/teams';
    } catch (err: any) {
      toast.error('No se pudo eliminar', err.response?.data?.message);
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

  const submitAdd = async () => {
    if (!team) return;
    setAddError('');
    if (
      !addForm.epicUsername &&
      !addForm.steamUsername &&
      !addForm.psnUsername &&
      !addForm.xboxUsername &&
      !addForm.switchUsername
    ) {
      setAddError('Indica al menos un usuario (Epic, Steam, PSN, Xbox o Switch).');
      return;
    }
    setAddBusy(true);
    try {
      const { data } = await api.post(`/teams/${team.id}/members`, addForm);
      setCred({ ...data.credentials });
      toast.success('Jugador agregado', 'Credenciales generadas abajo.');
      setAddForm(emptyAdd());
      setAdding(false);
      load();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Error al agregar jugador');
      toast.error('No se pudo agregar', err.response?.data?.message);
    } finally {
      setAddBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (notFound || !team) {
    return (
      <div>
        <Link to="/admin/teams" className="font-mono text-[11px] tracking-[0.15em] uppercase text-mute hover:text-ignite">
          ← Volver a equipos
        </Link>
        <p className="font-mono text-xs text-ignite mt-6">No se encontró el equipo solicitado.</p>
      </div>
    );
  }

  const members = (team.members || []).slice().sort((a, b) => a.playerNumber - b.playerNumber);

  return (
    <div>
      <Link
        to="/admin/teams"
        className="inline-block mb-5 font-mono text-[11px] tracking-[0.15em] uppercase text-mute hover:text-ignite"
      >
        ← Volver a equipos
      </Link>

      {/* encabezado del equipo */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          {team.shieldUrl ? (
            <div className="w-14 h-14 rounded-md border border-line shrink-0 grid place-items-center bg-white/[0.02] p-1">
              <img
                src={team.shieldUrl.startsWith('http') ? team.shieldUrl : `${fileBase}${team.shieldUrl}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <span className="w-14 h-14 rounded-md bg-void-2 border border-line shrink-0" />
          )}
          <div className="min-w-0">
            <span className="kicker">Equipo</span>
            <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-1 leading-none truncate">
              {team.name}
            </h1>
            <div className="flex items-center gap-2.5 flex-wrap mt-2">
              {team.groupId ? (
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border border-ignite/40 px-2 py-0.5 rounded-sm">
                  Grupo {groupName(team.groupId)}
                </span>
              ) : (
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute border border-line px-2 py-0.5 rounded-sm">
                  Sin grupo
                </span>
              )}
              <StatusBadge status={team.status} />
              {team.contactValue ? (
                <span className="font-mono text-[10px] text-mute">
                  {team.contactMethod === 'email' ? '✉' : 'DC'}{' '}
                  <span className="text-ink">{team.contactValue}</span>
                </span>
              ) : (
                <span className="font-mono text-[10px] text-ignite">⚠ sin contacto</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {team.status === 'pending' && (
            <>
              <button className="btn btn-ignite" onClick={approveTeam}>
                ✓ Inscribir
              </button>
              <button className="btn" onClick={rejectTeam}>
                Rechazar
              </button>
            </>
          )}
          <button
            className="btn"
            onClick={() => {
              setAdding((a) => !a);
              setAddForm(emptyAdd());
              setAddError('');
            }}
          >
            {adding ? 'Cancelar' : '+ Jugador'}
          </button>
          <button className="btn" onClick={openEdit}>
            Editar
          </button>
          <button className="btn !text-ignite !border-ignite/40" onClick={deleteTeam}>
            Eliminar
          </button>
        </div>
      </div>

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

      {/* edición de datos del equipo */}
      {editing && (
        <div className="card p-5 mb-6 flex flex-col gap-3">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">Editar equipo</div>

          {/* Identidad: escudo + (opcional) elegir del catálogo de predefinidos */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-16 w-16 shrink-0 grid place-items-center rounded-md border border-line bg-white/[0.02]">
              {form.shieldUrl ? (
                <img
                  src={form.shieldUrl.startsWith('http') ? form.shieldUrl : `${fileBase}${form.shieldUrl}`}
                  className="max-h-[80%] max-w-[80%] object-contain"
                />
              ) : (
                <span className="font-display font-black italic text-mute">{(form.name || '??').slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-[180px]">
              <UploadField
                label="Escudo"
                endpoint="shield"
                value={form.shieldUrl}
                onChange={(u) => setForm({ ...form, shieldUrl: u })}
              />
            </div>
            <button
              type="button"
              className={`btn ${pickPreset ? 'btn-ignite' : ''}`}
              onClick={() => setPickPreset((v) => !v)}
            >
              {pickPreset ? 'Cerrar catálogo' : 'Elegir del catálogo'}
            </button>
          </div>

          {pickPreset && (
            <div className="border border-line rounded-md p-3">
              <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute mb-2">
                Asigna un equipo predefinido (rellena nombre y escudo)
              </div>
              <TeamPicker
                value={null}
                onSelect={(p) => {
                  setForm((f) => ({ ...f, name: p.name, shieldUrl: p.logo ?? '' }));
                  setPickPreset(false);
                  toast.info('Asignado del catálogo', `${p.name} · revisa y guarda`);
                }}
              />
            </div>
          )}

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
                onChange={(e) => setForm({ ...form, contactMethod: e.target.value as 'discord' | 'email' })}
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
            <button className="btn btn-ignite" onClick={save}>
              Guardar
            </button>
            <button className="btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* alta de reemplazo */}
      {adding && (
        <div className="card p-5 mb-6 flex flex-col gap-3">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
            Agregar jugador / reemplazo
          </div>
          <div className="font-mono text-[10px] text-ignite border border-ignite/40 rounded-md px-3 py-2">
            ⚠ Solo 1 Grand Champion 1 (GC1) por equipo. No podrás agregar un GC1 si el equipo ya tiene uno.
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
              <label className="label">ID de PSN (opcional)</label>
              <input
                className="input"
                value={addForm.psnUsername}
                onChange={(e) => setAddForm({ ...addForm, psnUsername: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Gamertag de Xbox (opcional)</label>
              <input
                className="input"
                value={addForm.xboxUsername}
                onChange={(e) => setAddForm({ ...addForm, xboxUsername: e.target.value })}
              />
            </div>
            <div>
              <label className="label">ID de Switch (opcional)</label>
              <input
                className="input"
                value={addForm.switchUsername}
                onChange={(e) => setAddForm({ ...addForm, switchUsername: e.target.value })}
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
            <button className="btn btn-ignite" disabled={addBusy} onClick={submitAdd}>
              {addBusy ? 'Agregando…' : 'Agregar jugador'}
            </button>
          </div>
        </div>
      )}

      {/* roster */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display font-black italic uppercase tracking-tight text-xl">Roster</h2>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
          {members.length} {members.length === 1 ? 'jugador' : 'jugadores'} · {STARTERS} titulares
        </span>
      </div>

      <div className="card">
        <div className="flex flex-col divide-y divide-line-2">
          {members.map((m) => {
            const name = m.epicUsername || m.steamUsername || `J${m.playerNumber}`;
            const sub = m.playerNumber > STARTERS;
            const active = m.user?.isActive !== false && !!m.user;
            const hasAccount = !!m.user;
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[10px] text-mute w-5 shrink-0">{m.playerNumber}</span>
                  <span className="font-display font-semibold truncate">
                    {m.isCaptain && <span className="text-ignite">★ </span>}
                    {name}
                  </span>
                  {sub && (
                    <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute border border-line px-1.5 py-0.5 rounded-sm">
                      SUP
                    </span>
                  )}
                  {m.rank && <span className="font-mono text-[10px] text-mute">· {m.rank}</span>}
                  {!hasAccount ? (
                    <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute">sin cuenta</span>
                  ) : active ? (
                    <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-green">● acceso</span>
                  ) : (
                    <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-ignite">● sin acceso</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!m.isCaptain && !sub && (
                    <button className="btn text-[10px] px-2.5 py-1.5" onClick={() => setCaptain(m.id, name)}>
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
                  <button className="btn text-[10px] px-2.5 py-1.5" onClick={() => removeMember(m.id, name)}>
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="font-mono text-xs text-mute px-4 py-3">Sin jugadores registrados.</p>
          )}
        </div>
      </div>

      {/* verificación de cuentas (gate "listo para jugar") */}
      {readiness && (
        <>
          <div className="flex items-center gap-3 mt-8 mb-3">
            <h2 className="font-display font-black italic uppercase tracking-tight text-xl">
              Verificación de cuentas
            </h2>
            {readiness.ready ? (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-green border border-green/40 rounded-sm px-2.5 py-1">
                Listo para jugar ✓
              </span>
            ) : (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border border-ignite/50 bg-ignite/10 rounded-sm px-2.5 py-1">
                Vinculaciones pendientes
              </span>
            )}
          </div>
          <div className="card">
            <div className="flex flex-col divide-y divide-line-2">
              {readiness.players.map((p) => (
                <div key={p.memberId} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] text-mute w-5 shrink-0">{p.playerNumber}</span>
                    <span className="font-display font-semibold truncate">{p.username || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.expected.length === 0 && (
                      <span className="font-mono text-[10px] text-mute">sin plataformas en la inscripción</span>
                    )}
                    {p.expected.map((plat) => {
                      const ok = p.linked.includes(plat);
                      return (
                        <span
                          key={plat}
                          className={`font-mono text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border ${
                            ok ? 'text-green border-green/40' : 'text-ignite border-ignite/40'
                          }`}
                        >
                          {ok ? '✓' : '○'} {PLATFORM_LABEL[plat] || plat}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
