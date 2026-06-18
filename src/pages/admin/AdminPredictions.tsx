import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';
import type { Match } from '../../types';

type WindowFilter = 'all' | 'open' | 'closed';
type StatusFilter = 'all' | 'scheduled' | 'live' | 'finished';
type PhaseFilter = 'all' | 'groups' | 'knockout';

export default function AdminPredictions() {
  const toast = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preds, setPreds] = useState<any[]>([]);
  const [hours, setHours] = useState('24');

  // filtros
  const [q, setQ] = useState('');
  const [win, setWin] = useState<WindowFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [phase, setPhase] = useState<PhaseFilter>('all');

  const load = () => {
    api
      .get('/matches')
      .then((r) => setMatches(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openWindow = async (id: string, code: string) => {
    const now = new Date();
    const until = new Date(now.getTime() + (Number(hours) || 24) * 3600 * 1000);
    try {
      await api.post('/predictions/windows', { matchId: id, openFrom: now.toISOString(), openUntil: until.toISOString() });
      toast.success(`Predicciones abiertas · ${code}`, `Ventana de ${Number(hours) || 24}h.`);
      load();
    } catch (e: any) {
      toast.error('No se pudo abrir', e.response?.data?.message);
    }
  };

  const closeWindow = async (id: string, code: string) => {
    try {
      await api.patch(`/predictions/match/${id}/close`, {});
      toast.info(`Predicciones cerradas · ${code}`);
      load();
    } catch (e: any) {
      toast.error('No se pudo cerrar', e.response?.data?.message);
    }
  };

  const viewPreds = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const r = await api.get(`/predictions/match/${id}`);
    setPreds(r.data);
    setOpenId(id);
  };

  const counts = useMemo(() => {
    return {
      all: matches.length,
      open: matches.filter((m) => m.predictionsOpen).length,
      closed: matches.filter((m) => !m.predictionsOpen).length,
    };
  }, [matches]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return matches.filter((m) => {
      if (win === 'open' && !m.predictionsOpen) return false;
      if (win === 'closed' && m.predictionsOpen) return false;
      if (status !== 'all' && m.status !== status) return false;
      if (phase === 'groups' && m.phase !== 'groups') return false;
      if (phase === 'knockout' && m.phase === 'groups') return false;
      if (term) {
        const hay = `${m.matchCode} ${m.teamHome?.name || ''} ${m.teamAway?.name || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [matches, q, win, status, phase]);

  const resetFilters = () => {
    setQ('');
    setWin('all');
    setStatus('all');
    setPhase('all');
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Engagement</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-2">Predicciones</h1>
      <p className="font-mono text-[11px] text-mute mb-6 max-w-[60ch] leading-[1.8]">
        Abre la ventana de predicciones de un partido. Mientras esté abierta, los usuarios predicen el
        ganador (y el marcador para ganar más). Al cargar el resultado se reparten las monedas.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <label className="label mb-0">Duración (horas)</label>
        <input type="number" className="input w-24" value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>

      {/* filtros */}
      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por código o equipo…" />
        <ChipGroup
          label="Ventana"
          value={win}
          onChange={setWin}
          options={[
            { value: 'all', label: 'Todas', count: counts.all },
            { value: 'open', label: 'Abiertas', count: counts.open },
            { value: 'closed', label: 'Cerradas', count: counts.closed },
          ]}
        />
        <ChipGroup
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'scheduled', label: 'Program.' },
            { value: 'live', label: 'En vivo' },
            { value: 'finished', label: 'Finaliz.' },
          ]}
        />
        <ChipGroup
          label="Fase"
          value={phase}
          onChange={setPhase}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'groups', label: 'Grupos' },
            { value: 'knockout', label: 'Llave' },
          ]}
        />
        <ResultCount shown={filtered.length} total={matches.length} noun="partidos" onReset={resetFilters} />
      </FilterBar>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="font-mono text-xs text-mute">Ningún partido coincide con los filtros.</p>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <span className="font-mono text-[11px] text-mute tracking-[0.2em]">{m.matchCode}</span>
                <span className="font-display font-semibold text-sm truncate">
                  {m.teamHome?.name || 'TBD'} <span className="text-mute">vs</span> {m.teamAway?.name || 'TBD'}
                </span>
                <span
                  className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border ${
                    m.predictionsOpen ? 'text-green border-green/40' : 'text-mute border-line'
                  }`}
                >
                  {m.predictionsOpen ? 'Abiertas' : 'Cerradas'}
                </span>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.predictionsOpen ? (
                  <button className="btn !px-3 !py-2 text-[10px]" onClick={() => closeWindow(m.id, m.matchCode)}>
                    Cerrar
                  </button>
                ) : (
                  <button className="btn btn-ignite !px-3 !py-2 text-[10px]" onClick={() => openWindow(m.id, m.matchCode)}>
                    Abrir
                  </button>
                )}
                <button className="btn !px-3 !py-2 text-[10px]" onClick={() => viewPreds(m.id)}>
                  {openId === m.id ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {openId === m.id && (
              <div className="mt-4 pt-4 border-t border-line-2">
                {preds.length === 0 ? (
                  <p className="font-mono text-xs text-mute">Sin predicciones todavía.</p>
                ) : (
                  <>
                    <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-2">
                      {preds.length} predicciones
                    </div>
                    <div className="divide-y divide-line-2">
                      {preds.map((p) => (
                        <div key={p.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2">
                          <span className="font-display font-semibold text-sm truncate">{p.user?.username}</span>
                          <span className="font-mono text-xs text-mute">
                            {p.predictedWinner?.name}
                            {p.predictedHomeScore != null && (
                              <span className="text-ignite ml-2">
                                {p.predictedHomeScore}-{p.predictedAwayScore}
                              </span>
                            )}
                          </span>
                          {p.isCorrect === null ? (
                            <span className="font-mono text-[10px] text-mute text-right">pendiente</span>
                          ) : (
                            <span className={`font-display font-bold text-right ${p.isCorrect ? 'text-green' : 'text-mute'}`}>
                              {p.isCorrect ? `✓ +${p.coinsEarned}` : '✗'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
