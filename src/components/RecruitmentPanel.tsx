import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { useConfirm } from './Confirm';
import { rankLabel } from '../lib/ranks';
import type {
  JoinRequest,
  RecruitmentPost,
  Team,
  TeamDraft,
  TeamDraftInvite,
} from '../types';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

/**
 * Panel de reclutamiento del jugador (vive en el perfil): postulaciones
 * enviadas, invitaciones recibidas, anuncios propios y salida del equipo.
 */
export default function RecruitmentPanel({
  team,
  userId,
}: {
  team: Team | null;
  userId: string;
}) {
  const [applications, setApplications] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<JoinRequest[]>([]);
  const [myPosts, setMyPosts] = useState<RecruitmentPost[]>([]);
  const [draftAsCaptain, setDraftAsCaptain] = useState<TeamDraft | null>(null);
  const [draftInvites, setDraftInvites] = useState<TeamDraftInvite[]>([]);
  const [committedDraft, setCommittedDraft] = useState<TeamDraft | null>(null);
  const [pendingReg, setPendingReg] = useState<{ teamName: string; submittedAt: string } | null>(null);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { fetchMe } = useAuth();
  const confirm = useConfirm();
  const isCaptain = !!(team && team.captainId === userId);

  const flash = (m: string) => {
    setMsg(m);
    setErr('');
    setTimeout(() => setMsg(''), 4500);
  };
  const flashErr = (e: any) => {
    setErr(e?.response?.data?.message || 'Algo salió mal');
    setMsg('');
    setTimeout(() => setErr(''), 5000);
  };

  const load = () => {
    Promise.all([
      api.get('/recruitment/requests/outgoing').catch(() => ({ data: [] })),
      api.get('/recruitment/requests/incoming').catch(() => ({ data: [] })),
      api.get('/recruitment/mine').catch(() => ({ data: [] })),
      api.get('/recruitment/drafts/mine').catch(() => ({ data: { asCaptain: null, asInvited: [] } })),
    ]).then(([out, inc, mine, drafts]) => {
      const outgoing: JoinRequest[] = out.data;
      const incoming: JoinRequest[] = inc.data;
      setApplications(outgoing.filter((r) => r.direction === 'player_to_team'));
      setInvites(incoming.filter((r) => r.direction === 'team_to_player'));
      setMyPosts(mine.data);
      setDraftAsCaptain(drafts.data?.asCaptain ?? null);
      setDraftInvites(drafts.data?.asInvited ?? []);
      setCommittedDraft(drafts.data?.committedDraft ?? null);
      setPendingReg(drafts.data?.pendingRegistration ?? null);
    });
  };

  useEffect(load, []);

  const act = async (fn: () => Promise<any>, ok: string, refreshRole = false) => {
    try {
      await fn();
      if (refreshRole) await fetchMe();
      flash(ok);
      load();
    } catch (e) {
      flashErr(e);
    }
  };

  // Aceptar invitación a formar equipo: muestra feedback según el resultado.
  const acceptDraft = async (id: string) => {
    try {
      const { data } = await api.post(`/recruitment/drafts/invites/${id}/accept`);
      await fetchMe();
      if (data.status === 'submitted') {
        setInfo({
          title: '¡Equipo completo y postulado!',
          body: `${data.teamName ?? 'Tu equipo'} quedó completo y se postuló a inscripción. Ahora está a la espera de que el administrador apruebe su ingreso al torneo (igual que el registro normal). Te avisaremos cuando se resuelva.`,
        });
      } else {
        setInfo({
          title: 'Invitación aceptada',
          body: `Listo. Faltan ${data.remaining ?? '—'} jugador(es) por aceptar para completar el equipo. Te avisaremos cuando esté completo.`,
        });
      }
      load();
    } catch (e) {
      flashErr(e);
    }
  };

  const leave = async () => {
    const ok = await confirm({
      title: 'Salir del equipo',
      body: 'Se enviará una solicitud de salida a tu capitán, que debe aceptarla para desvincularte. ¿Continuar?',
      confirmLabel: 'Solicitar salida',
      danger: true,
    });
    if (!ok) return;
    act(() => api.post('/recruitment/leave', {}), 'Solicitud de salida enviada al capitán.');
  };

  const acceptedInDraft = draftAsCaptain
    ? 1 + (draftAsCaptain.invites?.filter((i) => i.status === 'accepted').length ?? 0)
    : 0;
  const committedAccepted = committedDraft
    ? 1 + (committedDraft.invites?.filter((i) => i.status === 'accepted').length ?? 0)
    : 0;
  const committedRemaining = committedDraft
    ? Math.max(0, committedDraft.requiredStarters - committedAccepted)
    : 0;

  const hasAnything =
    applications.length > 0 ||
    invites.length > 0 ||
    myPosts.length > 0 ||
    !!team ||
    !!draftAsCaptain ||
    !!committedDraft ||
    !!pendingReg ||
    draftInvites.length > 0;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl">
          Reclutamiento
        </h2>
        <Link
          to="/reclutamiento"
          className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ignite"
        >
          Ir al tablón →
        </Link>
      </div>

      {msg && (
        <div className="font-mono text-xs text-green border border-green/40 rounded-md px-4 py-3 mb-4">
          {msg}
        </div>
      )}
      {err && (
        <div className="font-mono text-xs text-ignite border border-ignite/40 rounded-md px-4 py-3 mb-4">
          {err}
        </div>
      )}

      {/* Invitaciones para formar equipo */}
      {draftInvites.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute mb-2">
            Invitaciones para formar equipo
          </div>
          <div className="card divide-y divide-line-2">
            {draftInvites.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-display text-sm truncate">
                  {iv.draft?.captain?.username || 'Alguien'} te invitó a{' '}
                  <b className="text-ink">{iv.draft?.teamName}</b>
                </span>
                <div className="flex gap-2 shrink-0">
                  <button type="button" className="btn btn-ignite !py-1.5" onClick={() => acceptDraft(iv.id)}>
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className="btn !py-1.5"
                    onClick={() =>
                      act(() => api.post(`/recruitment/drafts/invites/${iv.id}/reject`), 'Invitación rechazada.')
                    }
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mi equipo en formación (capitán del draft) */}
      {draftAsCaptain && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <div className="font-display font-black italic uppercase tracking-tight text-lg">
                {draftAsCaptain.teamName}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite mt-1">
                Formando equipo · {acceptedInDraft}/{draftAsCaptain.requiredStarters} titulares
              </div>
            </div>
            <button
              type="button"
              className="btn !py-2 shrink-0"
              onClick={() =>
                act(() => api.post(`/recruitment/drafts/${draftAsCaptain.id}/cancel`), 'Creación cancelada.')
              }
            >
              Cancelar
            </button>
          </div>
          <div className="divide-y divide-line-2">
            {(draftAsCaptain.invites || []).map((iv) => (
              <div key={iv.id} className="flex items-center justify-between gap-3 py-2">
                <span className="font-display text-sm truncate">{iv.user?.username}</span>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                  {iv.status === 'accepted'
                    ? 'Aceptó'
                    : iv.status === 'rejected'
                      ? 'Rechazó'
                      : iv.status === 'cancelled'
                        ? 'Cancelado'
                        : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipo postulado a inscripción, esperando aprobación del admin */}
      {pendingReg && (
        <div className="card p-4 mb-4 border-ignite/40">
          <div className="font-display font-black italic uppercase tracking-tight text-lg">
            {pendingReg.teamName}
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite mt-1">
            Postulado · pendiente de inscripción
          </div>
          <p className="font-mono text-[11px] text-mute mt-2 leading-[1.6]">
            Tu equipo está completo y postulado. El administrador debe aprobar la inscripción al
            torneo. Te llegará una notificación cuando se resuelva.
          </p>
        </div>
      )}

      {/* Estoy comprometido en una formación (acepté, espero a los demás) */}
      {committedDraft && (
        <div className="card p-4 mb-4">
          <div className="font-display font-black italic uppercase tracking-tight text-lg">
            {committedDraft.teamName}
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite mt-1">
            En formación · {committedAccepted}/{committedDraft.requiredStarters} titulares
          </div>
          <p className="font-mono text-[11px] text-mute mt-2 leading-[1.6]">
            Aceptaste unirte. {committedRemaining > 0
              ? `Faltan ${committedRemaining} jugador(es) por aceptar para formar el equipo.`
              : 'Completando el equipo…'}
          </p>
        </div>
      )}

      {/* Acceso del capitán */}
      {isCaptain && (
        <div className="card p-4 mb-4 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-mute">
            Eres capitán de <b className="text-ink">{team?.name}</b>: gestiona postulaciones y salidas.
          </span>
          <Link to="/mi-equipo" className="btn btn-ignite !py-2 shrink-0">
            Gestionar equipo
          </Link>
        </div>
      )}

      {/* Salir del equipo (no capitán) */}
      {team && !isCaptain && (
        <div className="card p-4 mb-4 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-mute">
            ¿Ya no quieres seguir en <b className="text-ink">{team.name}</b>?
          </span>
          <button type="button" className="btn !py-2 shrink-0" onClick={leave}>
            Solicitar salir del equipo
          </button>
        </div>
      )}

      {/* Invitaciones recibidas */}
      {invites.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute mb-2">
            Invitaciones recibidas
          </div>
          <div className="card divide-y divide-line-2">
            {invites.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-display text-sm truncate">
                  {r.team?.name || 'Un equipo'} te invitó
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="btn btn-ignite !py-1.5"
                    onClick={() =>
                      act(
                        () => api.post(`/recruitment/requests/${r.id}/accept`),
                        'Te uniste al equipo.',
                        true,
                      )
                    }
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className="btn !py-1.5"
                    onClick={() =>
                      act(
                        () => api.post(`/recruitment/requests/${r.id}/reject`),
                        'Invitación rechazada.',
                      )
                    }
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mis postulaciones */}
      {applications.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute mb-2">
            Mis postulaciones
          </div>
          <div className="card divide-y divide-line-2">
            {applications.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-display text-sm truncate">
                  {r.team?.name || 'Equipo'}
                  <span className="font-mono text-[10px] text-mute"> · {rankLabel(r.rank)}</span>
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      className="btn !py-1.5"
                      onClick={() =>
                        act(
                          () => api.post(`/recruitment/requests/${r.id}/cancel`),
                          'Postulación cancelada.',
                        )
                      }
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mis anuncios */}
      {myPosts.length > 0 && (
        <div>
          <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute mb-2">
            Mis anuncios
          </div>
          <div className="card divide-y divide-line-2">
            {myPosts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-display text-sm truncate">
                  {p.type === 'player_lft'
                    ? `Jugador libre · ${rankLabel(p.rank)}`
                    : `Vacante · ${p.teamName || p.team?.name || ''}`}
                  <span className="font-mono text-[10px] text-mute"> · {STATUS_LABEL[p.status] || p.status}</span>
                </span>
                <div className="flex gap-2 shrink-0">
                  {p.status === 'open' && (
                    <button
                      type="button"
                      className="btn !py-1.5"
                      onClick={() =>
                        act(
                          () => api.patch(`/recruitment/${p.id}`, { status: 'closed' }),
                          'Anuncio cerrado.',
                        )
                      }
                    >
                      Cerrar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn !py-1.5"
                    onClick={() =>
                      act(() => api.delete(`/recruitment/${p.id}`), 'Anuncio eliminado.')
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasAnything && (
        <p className="font-mono text-xs text-mute">
          Aún no tienes actividad de reclutamiento.{' '}
          <Link to="/reclutamiento" className="text-ignite">
            Explora el tablón
          </Link>
          .
        </p>
      )}

      {info && (
        <div
          className="fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setInfo(null)}
        >
          <div className="card p-6 w-full max-w-[440px] flex flex-col gap-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-display font-black italic uppercase tracking-tight text-2xl">{info.title}</div>
            <p className="font-display text-mute leading-[1.6]">{info.body}</p>
            <button type="button" className="btn btn-ignite self-center" onClick={() => setInfo(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
