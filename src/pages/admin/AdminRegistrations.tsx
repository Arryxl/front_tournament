import { useEffect, useState } from 'react';
import { api, fileBase } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Registration } from '../../types';

export default function AdminRegistrations() {
  const [list, setList] = useState<Registration[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/teams/registrations${filter ? `?status=${filter}` : ''}`)
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const approve = async (id: string) => {
    const { data } = await api.post(`/teams/registrations/${id}/approve`, {});
    setResult(data);
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt('Motivo del rechazo:');
    if (!reason) return;
    await api.post(`/teams/registrations/${id}/reject`, { reason });
    load();
  };

  return (
    <div>
      <span className="kicker">Gestión</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-6">
        Inscripciones
      </h1>

      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected', ''].map((f) => (
          <button
            key={f || 'all'}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? 'btn-ignite' : ''}`}
          >
            {f === '' ? 'Todas' : f}
          </button>
        ))}
      </div>

      {result && (
        <div className="card p-5 mb-6 border-green/40">
          <div className="font-display font-bold text-green mb-2">Equipo aprobado: {result.team?.name}</div>
          <div className="font-mono text-xs text-mute mb-2">Credenciales generadas (guárdalas):</div>
          {result.credentials?.map((c: any) => (
            <div key={c.playerNumber} className="font-mono text-sm">
              J{c.playerNumber}: <span className="text-ink">{c.username}</span> /{' '}
              <span className="text-ignite">{c.password}</span>
            </div>
          ))}
          <button className="btn mt-3" onClick={() => setResult(null)}>
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-3">
          {list.length === 0 && <p className="font-mono text-xs text-mute">Sin inscripciones.</p>}
          {list.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {r.shieldUrl && (
                    <img
                      src={r.shieldUrl.startsWith('http') ? r.shieldUrl : `${fileBase}${r.shieldUrl}`}
                      className="w-10 h-10 rounded-sm object-cover border border-line"
                    />
                  )}
                  <div>
                    <div className="font-display font-bold">{r.teamName}</div>
                    <div className="font-mono text-[10px] text-mute">
                      {new Date(r.submittedAt).toLocaleString('es')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <button className="btn" onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                    Ver
                  </button>
                  {r.status === 'pending' && (
                    <>
                      <button className="btn btn-ignite" onClick={() => approve(r.id)}>
                        Aprobar
                      </button>
                      <button className="btn" onClick={() => reject(r.id)}>
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
              {selected?.id === r.id && (
                <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-line-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="font-mono text-xs text-mute">
                      <div className="text-ink font-bold mb-1">
                        Jugador {n} {r.captainPlayer === n && '(C)'}
                      </div>
                      <div>Epic: {(r as any)[`player${n}Epic`] || '—'}</div>
                      <div>Steam: {(r as any)[`player${n}Steam`] || '—'}</div>
                      <div>Rango: {(r as any)[`player${n}Rank`] || '—'}</div>
                      {(r as any)[`player${n}Screenshot`] && (
                        <a
                          href={`${fileBase}${(r as any)[`player${n}Screenshot`]}`}
                          target="_blank"
                          className="text-ignite"
                        >
                          ver captura ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
