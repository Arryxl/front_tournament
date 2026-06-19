import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';
import { rankLabel, positionLabel } from '../../lib/ranks';
import type { JoinRequest, RecruitmentPost, TeamDraft } from '../../types';

const fileUrl = (u: string) => (u.startsWith('http') ? u : `${fileBase}${u}`);

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierto',
  closed: 'Cerrado',
  hidden: 'Oculto',
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

export default function AdminRecruitment() {
  const confirm = useConfirm();
  const toast = useToast();
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [drafts, setDrafts] = useState<TeamDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/recruitment/admin/posts').catch(() => ({ data: [] })),
      api.get('/recruitment/admin/requests').catch(() => ({ data: [] })),
      api.get('/recruitment/admin/drafts').catch(() => ({ data: [] })),
    ])
      .then(([p, r, d]) => {
        setPosts(p.data);
        setRequests(r.data);
        setDrafts(d.data);
      })
      .finally(() => setLoading(false));
  };

  const cancelDraft = async (id: string) => {
    const ok = await confirm({
      title: 'Cancelar equipo en formación',
      body: 'El equipo en formación se cancelará y se anularán sus invitaciones pendientes. ¿Continuar?',
      confirmLabel: 'Cancelar equipo',
      danger: true,
    });
    if (!ok) return;
    await api.post(`/recruitment/admin/drafts/${id}/cancel`);
    toast.info('Equipo en formación cancelado');
    load();
  };

  const submitDraft = async (id: string) => {
    const ok = await confirm({
      title: 'Postular a inscripción',
      body: 'El equipo pasará a Inscripciones para que lo apruebes y entre al torneo. ¿Continuar?',
      confirmLabel: 'Postular',
    });
    if (!ok) return;
    try {
      await api.post(`/recruitment/admin/drafts/${id}/submit`);
      toast.success('Equipo postulado', 'Disponible en Inscripciones.');
      load();
    } catch (e: any) {
      toast.error('No se pudo postular', e?.response?.data?.message);
    }
  };

  const deleteDraft = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminar equipo en formación',
      body: 'Se eliminará este equipo en formación del panel. Esta acción no se puede deshacer. ¿Continuar?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/recruitment/admin/drafts/${id}`);
    toast.success('Equipo en formación eliminado');
    load();
  };

  const draftStatusLabel: Record<string, string> = {
    pending: 'En formación',
    completed: 'Postulado a inscripción',
    cancelled: 'Cancelado',
  };

  useEffect(load, []);

  const hide = async (id: string) => {
    await api.patch(`/recruitment/${id}/moderate`);
    toast.info('Anuncio ocultado');
    load();
  };
  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminar anuncio',
      body: 'El anuncio se eliminará del tablón. ¿Continuar?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/recruitment/${id}`);
    toast.success('Anuncio eliminado');
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Comunidad</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-2">
        Reclutamiento
      </h1>
      <p className="font-mono text-[11px] text-mute mb-6">
        Modera el tablón de fichajes: oculta o elimina anuncios y revisa las solicitudes.
      </p>

      {/* Anuncios */}
      <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-3">
        Anuncios <span className="text-ignite">{posts.length}</span>
      </h2>
      {posts.length === 0 ? (
        <p className="font-mono text-xs text-mute mb-8">No hay anuncios.</p>
      ) : (
        <div className="card divide-y divide-line-2 mb-10">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.type === 'player_lft' && p.screenshotUrl && (
                  <a href={fileUrl(p.screenshotUrl)} target="_blank" rel="noreferrer">
                    <img
                      src={fileUrl(p.screenshotUrl)}
                      alt=""
                      className="w-9 h-9 rounded-md object-cover border border-line shrink-0"
                    />
                  </a>
                )}
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm truncate">
                    {p.type === 'player_lft'
                      ? p.epicUsername || p.steamUsername || p.author?.username
                      : p.team?.name || p.teamName || 'Equipo'}
                    <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-mute ml-2">
                      {p.type === 'player_lft' ? 'Jugador' : 'Equipo'}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-mute mt-0.5 truncate">
                    {p.type === 'player_lft'
                      ? `${rankLabel(p.rank)} · ${positionLabel(p.position)}`
                      : `Busca ${p.slotsNeeded}`}
                    {' · '}
                    {STATUS_LABEL[p.status] || p.status}
                    {p.author?.username ? ` · por ${p.author.username}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {p.status !== 'hidden' && (
                  <button type="button" className="btn !py-1.5" onClick={() => hide(p.id)}>
                    Ocultar
                  </button>
                )}
                <button type="button" className="btn !py-1.5" onClick={() => remove(p.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Equipos en formación */}
      <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-3">
        Equipos en formación <span className="text-ignite">{drafts.length}</span>
      </h2>
      {drafts.length === 0 ? (
        <p className="font-mono text-xs text-mute mb-10">No hay equipos en formación.</p>
      ) : (
        <div className="card divide-y divide-line-2 mb-10">
          {drafts.map((d) => {
            const accepted = 1 + (d.invites?.filter((i) => i.status === 'accepted').length ?? 0);
            return (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm truncate">
                    {d.teamName}
                    <span className="font-mono text-[10px] text-mute"> · cap. {d.captain?.username}</span>
                  </div>
                  <div className="font-mono text-[10px] text-mute mt-0.5">
                    {d.status === 'completed' && !d.registrationId
                      ? 'Completado · sin postular'
                      : draftStatusLabel[d.status] || d.status}{' '}
                    · {accepted}/{d.requiredStarters} titulares
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {d.status === 'pending' ? (
                    <button type="button" className="btn !py-1.5" onClick={() => cancelDraft(d.id)}>
                      Cancelar
                    </button>
                  ) : d.status === 'completed' && d.registrationId ? (
                    <Link to="/admin/registrations" className="btn !py-1.5">
                      Ver inscripción →
                    </Link>
                  ) : d.status === 'completed' ? (
                    <button type="button" className="btn btn-ignite !py-1.5" onClick={() => submitDraft(d.id)}>
                      Postular a inscripción
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn !py-1.5 !text-ignite !border-ignite/40"
                    onClick={() => deleteDraft(d.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Solicitudes */}
      <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-3">
        Solicitudes <span className="text-ignite">{requests.length}</span>
      </h2>
      {requests.length === 0 ? (
        <p className="font-mono text-xs text-mute">No hay solicitudes.</p>
      ) : (
        <div className="card divide-y divide-line-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-display font-bold text-sm truncate">
                  {r.applicant?.username || r.epicUsername || r.steamUsername}
                  <span className="font-mono text-[10px] text-mute"> → {r.team?.name}</span>
                </div>
                <div className="font-mono text-[10px] text-mute mt-0.5">
                  {r.direction === 'player_to_team' ? 'Postulación' : 'Invitación'} ·{' '}
                  {rankLabel(r.rank)} · {STATUS_LABEL[r.status] || r.status}
                </div>
              </div>
              {r.screenshotUrl && (
                <a href={fileUrl(r.screenshotUrl)} target="_blank" rel="noreferrer">
                  <img
                    src={fileUrl(r.screenshotUrl)}
                    alt=""
                    className="w-9 h-9 rounded-md object-cover border border-line shrink-0"
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
