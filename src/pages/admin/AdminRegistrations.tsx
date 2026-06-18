import { useEffect, useState } from 'react';
import { api, fileBase } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { useSettings } from '../../lib/useSettings';
import { useToast } from '../../components/Toast';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';
import type { Registration } from '../../types';

export default function AdminRegistrations() {
  const settings = useSettings();
  const toast = useToast();
  const STARTERS = settings.playersPerSide;
  const [list, setList] = useState<Registration[]>([]);
  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const shown = q.trim()
    ? list.filter((r) => r.teamName.toLowerCase().includes(q.trim().toLowerCase()))
    : list;

  const load = () => {
    setLoading(true);
    api
      .get(`/teams/registrations${filter ? `?status=${filter}` : ''}`)
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const approve = async (id: string) => {
    try {
      const { data } = await api.post(`/teams/registrations/${id}/approve`, {});
      setResult(data);
      toast.success('Equipo aprobado', `${data.team?.name} · credenciales generadas.`);
      load();
    } catch (e: any) {
      toast.error('No se pudo aprobar', e.response?.data?.message);
    }
  };

  const reject = async (id: string) => {
    const reason = prompt('Motivo del rechazo:');
    if (!reason) return;
    try {
      await api.post(`/teams/registrations/${id}/reject`, { reason });
      toast.info('Inscripción rechazada', 'El equipo fue marcado como rechazado.');
      load();
    } catch (e: any) {
      toast.error('No se pudo rechazar', e.response?.data?.message);
    }
  };

  return (
    <div>
      <span className="kicker">Gestión</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-6">
        Inscripciones
      </h1>

      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar equipo…" />
        <ChipGroup
          label="Estado"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'Pendientes' },
            { value: 'approved', label: 'Aprobadas' },
            { value: 'rejected', label: 'Rechazadas' },
            { value: '', label: 'Todas' },
          ]}
        />
        <ResultCount shown={shown.length} total={list.length} noun="inscripciones" onReset={() => setQ('')} />
      </FilterBar>

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
          {shown.length === 0 && (
            <p className="font-mono text-xs text-mute">
              {q ? 'Ninguna inscripción coincide.' : 'Sin inscripciones.'}
            </p>
          )}
          {shown.map((r) => (
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
                <>
                <div className="mt-4 pt-4 border-t border-line-2 font-mono text-xs">
                  <span className="text-mute">Contacto del capitán: </span>
                  {(r as any).contactValue ? (
                    <span className="text-ink">
                      {(r as any).contactMethod === 'email' ? 'Correo' : 'Discord'} ·{' '}
                      <span className="text-ignite">{(r as any).contactValue}</span>
                    </span>
                  ) : (
                    <span className="text-ignite">⚠ sin medio de contacto</span>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const epic = (r as any)[`player${n}Epic`];
                    const steam = (r as any)[`player${n}Steam`];
                    if (n > STARTERS && !epic && !steam) return null; // suplente sin datos
                    const sub = n > STARTERS;
                    return (
                      <div key={n} className="font-mono text-xs text-mute">
                        <div className="text-ink font-bold mb-1">
                          {sub ? `Suplente ${n - STARTERS}` : `Jugador ${n}`} {r.captainPlayer === n && '(C)'}
                          {sub && <span className="text-mute"> · SUP</span>}
                        </div>
                        <div>Epic: {epic || '—'}</div>
                        <div>Steam: {steam || '—'}</div>
                        <div>Rango: {(r as any)[`player${n}Rank`] || '—'}</div>
                        {(r as any)[`player${n}Screenshot`] ? (
                          <a
                            href={`${fileBase}${(r as any)[`player${n}Screenshot`]}`}
                            target="_blank"
                            className="text-ignite"
                          >
                            ver captura ↗
                          </a>
                        ) : (
                          <span className="text-ignite">⚠ sin captura</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
