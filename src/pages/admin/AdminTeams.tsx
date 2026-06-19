import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useSettings } from '../../lib/useSettings';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';
import { FilterBar, SearchBox, ChipGroup, ResultCount } from '../../components/admin/Filters';
import type { Group, Team } from '../../types';

type SortKey = 'name' | 'group' | 'roster';

export default function AdminTeams() {
  const settings = useSettings();
  const confirm = useConfirm();
  const toast = useToast();
  const STARTERS = settings.playersPerSide;
  const [q, setQ] = useState('');
  const [fGroup, setFGroup] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([api.get('/teams'), api.get('/groups')])
      .then(([t, g]) => {
        setTeams(t.data);
        setGroups(g.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const groupName = (gid: string | null) => groups.find((g) => g.id === gid)?.name;

  const approved = useMemo(() => teams.filter((t) => t.status === 'approved'), [teams]);
  const pending = useMemo(() => teams.filter((t) => t.status === 'pending'), [teams]);

  const approveTeam = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Inscribir a ${name}`,
      body: 'El equipo quedará inscrito en el torneo y se notificará a sus jugadores. ¿Continuar?',
      confirmLabel: 'Inscribir',
    });
    if (!ok) return;
    try {
      await api.post(`/teams/${id}/approve`);
      toast.success('Equipo inscrito', name);
      load();
    } catch (e: any) {
      toast.error('No se pudo inscribir', e?.response?.data?.message);
    }
  };
  const rejectTeam = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Rechazar a ${name}`,
      body: 'No se inscribirá al torneo, se eliminará y sus jugadores quedarán libres (sus cuentas siguen activas). ¿Continuar?',
      confirmLabel: 'Rechazar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.post(`/teams/${id}/reject`);
      toast.info('Equipo rechazado', name);
      load();
    } catch (e: any) {
      toast.error('No se pudo rechazar', e?.response?.data?.message);
    }
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = approved.filter((t) => {
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
    return [...list].sort((a, b) => {
      if (sort === 'roster') return (b.members?.length ?? 0) - (a.members?.length ?? 0);
      if (sort === 'group') {
        const ga = groupName(a.groupId) || 'zzz';
        const gb = groupName(b.groupId) || 'zzz';
        return ga.localeCompare(gb) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, groups, q, fGroup, sort]);

  const groupOptions = [
    { value: 'all', label: 'Todos' },
    ...groups.map((g) => ({ value: g.name, label: g.name })),
    { value: 'none', label: 'Sin grupo' },
  ];

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Torneo</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-2">Equipos</h1>
      <p className="font-mono text-[11px] text-mute mb-6">
        {approved.length} equipos aprobados. Pulsa un equipo para ver su roster y gestionarlo.
      </p>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-black italic uppercase tracking-tight text-xl mb-3">
            Pendientes de inscripción <span className="text-ignite">{pending.length}</span>
          </h2>
          <div className="card divide-y divide-line-2">
            {pending.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link to={`/admin/teams/${t.id}`} className="font-display font-bold text-sm hover:text-ignite truncate">
                  {t.name}
                  <span className="font-mono text-[10px] text-mute"> · {(t.members || []).length} jug.</span>
                </Link>
                <div className="flex gap-2 shrink-0">
                  <button className="btn btn-ignite text-[10px] px-2.5 py-1.5" onClick={() => approveTeam(t.id, t.name)}>
                    Inscribir
                  </button>
                  <button className="btn text-[10px] px-2.5 py-1.5" onClick={() => rejectTeam(t.id, t.name)}>
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <FilterBar>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar equipo o jugador…" />
          <ChipGroup label="Grupo" value={fGroup} onChange={setFGroup} options={groupOptions} />
          <ChipGroup
            label="Orden"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'name', label: 'Nombre' },
              { value: 'group', label: 'Grupo' },
              { value: 'roster', label: 'Roster' },
            ]}
          />
          <ResultCount
            shown={shown.length}
            total={approved.length}
            noun="equipos"
            onReset={() => {
              setQ('');
              setFGroup('all');
            }}
          />
        </FilterBar>
      )}

      {approved.length === 0 ? (
        <p className="font-mono text-xs text-mute">
          Aún no hay equipos aprobados. Aprueba inscripciones en “Inscripciones”.
        </p>
      ) : shown.length === 0 ? (
        <p className="font-mono text-xs text-mute">Ningún equipo coincide con los filtros.</p>
      ) : (
        <div className="card divide-y divide-line-2">
          {shown.map((t) => {
            const members = t.members || [];
            const captain = members.find((m) => m.isCaptain);
            const captainName = captain
              ? captain.epicUsername || captain.steamUsername || captain.user?.username || `J${captain.playerNumber}`
              : null;
            const total = members.length;
            const noContact = !t.contactValue;
            return (
              <Link
                key={t.id}
                to={`/admin/teams/${t.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-void-3/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {t.shieldUrl ? (
                    <img
                      src={t.shieldUrl.startsWith('http') ? t.shieldUrl : `${fileBase}${t.shieldUrl}`}
                      className="w-9 h-9 rounded-md object-cover border border-line shrink-0"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-md bg-void-2 border border-line shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-black italic text-base group-hover:text-ignite transition-colors truncate">
                        {t.name}
                      </span>
                      {t.groupId ? (
                        <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-ignite border border-ignite/40 px-1.5 py-0.5 rounded-sm">
                          Grupo {groupName(t.groupId)}
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-mute border border-line px-1.5 py-0.5 rounded-sm">
                          Sin grupo
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-mute mt-0.5 truncate">
                      {captainName ? (
                        <>
                          <span className="text-ignite">★</span> {captainName}
                        </>
                      ) : (
                        'sin capitán'
                      )}
                      {noContact && <span className="text-ignite"> · ⚠ sin contacto</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute">
                    <b className={total < STARTERS ? 'text-ignite' : 'text-ink'}>{total}</b>/{STARTERS}{' '}
                    <span className="hidden sm:inline">jug.</span>
                  </span>
                  <span className="font-mono text-mute group-hover:text-ignite transition-colors">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
