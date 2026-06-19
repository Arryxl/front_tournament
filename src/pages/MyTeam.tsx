import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../lib/api';
import { useAuth } from '../store/auth';
import { Spinner, BackButton } from '../components/ui';
import { rankLabel } from '../lib/ranks';
import type { JoinRequest, Team, TeamLeaveRequest } from '../types';

const fileUrl = (u: string) => (u.startsWith('http') ? u : `${fileBase}${u}`);

export default function MyTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [applications, setApplications] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<JoinRequest[]>([]);
  const [leaves, setLeaves] = useState<TeamLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

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
    setLoading(true);
    Promise.all([
      api.get('/teams/mine').catch(() => ({ data: null })),
      api.get('/recruitment/requests/incoming').catch(() => ({ data: [] })),
      api.get('/recruitment/requests/outgoing').catch(() => ({ data: [] })),
      api.get('/recruitment/leave/incoming').catch(() => ({ data: [] })),
    ])
      .then(([t, inc, out, lv]) => {
        setTeam(t.data);
        const incoming: JoinRequest[] = inc.data;
        const outgoing: JoinRequest[] = out.data;
        setApplications(incoming.filter((r) => r.direction === 'player_to_team'));
        setInvites(outgoing.filter((r) => r.direction === 'team_to_player'));
        setLeaves(lv.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (fn: () => Promise<any>, ok: string) => {
    try {
      await fn();
      flash(ok);
      load();
    } catch (e) {
      flashErr(e);
    }
  };

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-20">
        <Spinner />
      </div>
    );

  const isCaptain = !!(team && user && team.captainId === user.id);

  if (!team) {
    return (
      <div className="max-w-[760px] mx-auto px-[var(--pad)] py-24 text-center">
        <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mb-4">
          Sin equipo
        </h1>
        <p className="font-display text-mute mb-8">
          No perteneces a ningún equipo todavía. Encuentra uno en el reclutamiento.
        </p>
        <Link to="/reclutamiento" className="btn btn-ignite">
          Ir al reclutamiento
        </Link>
      </div>
    );
  }

  if (!isCaptain) {
    return (
      <div className="max-w-[760px] mx-auto px-[var(--pad)] py-24 text-center">
        <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mb-4">
          {team.name}
        </h1>
        <p className="font-display text-mute mb-8">
          Solo el capitán gestiona el reclutamiento del equipo. Puedes ver tu equipo y
          tus solicitudes en tu perfil.
        </p>
        <Link to="/me" className="btn btn-ignite">
          Ir a mi perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <BackButton className="mb-5" to="/me" label="Mi perfil" />
      <span className="kicker">Capitán · {team.name}</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(32px,6vw,72px)] tracking-tight leading-[0.9] mt-3 mb-10">
        Gestión del equipo
      </h1>

      {msg && (
        <div className="font-mono text-xs text-green border border-green/40 rounded-md px-4 py-3 mb-6">
          {msg}
        </div>
      )}
      {err && (
        <div className="font-mono text-xs text-ignite border border-ignite/40 rounded-md px-4 py-3 mb-6">
          {err}
        </div>
      )}

      {/* Postulaciones entrantes */}
      <section className="mb-12">
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-4">
          Postulaciones <span className="text-ignite">{applications.length}</span>
        </h2>
        {applications.length === 0 ? (
          <p className="font-mono text-xs text-mute">
            No hay jugadores postulándose por ahora.{' '}
            <Link to="/reclutamiento" className="text-ignite">
              Publica una vacante
            </Link>{' '}
            para atraerlos.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {applications.map((r) => (
              <div key={r.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-black italic uppercase tracking-tight text-lg truncate">
                      {r.epicUsername || r.steamUsername || r.applicant?.username}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite mt-1">
                      {rankLabel(r.rank)}
                    </div>
                  </div>
                  {r.screenshotUrl && (
                    <a href={fileUrl(r.screenshotUrl)} target="_blank" rel="noreferrer">
                      <img
                        src={fileUrl(r.screenshotUrl)}
                        alt="Rango"
                        className="w-14 h-14 rounded-md object-cover border border-line shrink-0"
                      />
                    </a>
                  )}
                </div>
                {r.message && (
                  <p className="font-display text-sm text-mute leading-[1.5]">{r.message}</p>
                )}
                <div className="flex gap-2 mt-auto pt-2">
                  <button
                    type="button"
                    className="btn btn-ignite !py-2 flex-1"
                    onClick={() =>
                      act(
                        () => api.post(`/recruitment/requests/${r.id}/accept`),
                        'Jugador añadido al equipo.',
                      )
                    }
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className="btn !py-2"
                    onClick={() =>
                      act(
                        () => api.post(`/recruitment/requests/${r.id}/reject`),
                        'Postulación rechazada.',
                      )
                    }
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Solicitudes de salida */}
      <section className="mb-12">
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-4">
          Solicitudes de salida <span className="text-ignite">{leaves.length}</span>
        </h2>
        {leaves.length === 0 ? (
          <p className="font-mono text-xs text-mute">Nadie quiere dejar el equipo.</p>
        ) : (
          <div className="card divide-y divide-line-2">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="font-display font-bold truncate">{l.user?.username}</div>
                  {l.reason && (
                    <div className="font-mono text-[10px] text-mute mt-1 truncate">{l.reason}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="btn btn-ignite !py-1.5"
                    onClick={() =>
                      act(
                        () => api.post(`/recruitment/leave/${l.id}/accept`),
                        'Jugador desvinculado del equipo.',
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
                        () => api.post(`/recruitment/leave/${l.id}/reject`),
                        'Solicitud rechazada.',
                      )
                    }
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invitaciones enviadas */}
      {invites.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-4">
            Invitaciones enviadas
          </h2>
          <div className="card divide-y divide-line-2">
            {invites.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-display text-sm truncate">
                  {r.epicUsername || r.steamUsername || r.applicant?.username}
                  <span className="font-mono text-[10px] text-mute"> · {rankLabel(r.rank)}</span>
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                    {r.status === 'pending' ? 'Esperando respuesta' : r.status}
                  </span>
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      className="btn !py-1.5"
                      onClick={() =>
                        act(
                          () => api.post(`/recruitment/requests/${r.id}/cancel`),
                          'Invitación cancelada.',
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
        </section>
      )}

      {/* Roster actual */}
      <section>
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-4">
          Roster actual
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(team.members || [])
            .slice()
            .sort((a, b) => a.playerNumber - b.playerNumber)
            .map((m) => (
              <div key={m.id} className="card p-4">
                <div className="font-display font-bold truncate">
                  {m.isCaptain && <span className="text-ignite">★ </span>}
                  {m.user?.username || m.epicUsername}
                </div>
                <div className="font-mono text-[10px] text-mute mt-1">{rankLabel(m.rank)}</div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
