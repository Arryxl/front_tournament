import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import type { Group, Standing } from '../../types';

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([api.get('/groups'), api.get('/groups/standings')])
      .then(([g, s]) => {
        setGroups(g.data);
        setStandings(s.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const draw = async () => {
    if (!confirm('¿Ejecutar el sorteo? Reasignará todos los equipos aprobados.')) return;
    setBusy(true);
    try {
      await api.post('/groups/draw', {});
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error en el sorteo');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="kicker">Torneo</span>
          <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3">Grupos</h1>
        </div>
        <button className="btn btn-ignite" onClick={draw} disabled={busy}>
          {busy ? 'Sorteando…' : 'Ejecutar sorteo'}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {groups.map((g) => {
          const rows = standings
            .filter((s) => s.groupId === g.id)
            .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
          return (
            <div key={g.id} className="card p-4">
              <div className="font-display font-extrabold text-2xl mb-3">Grupo {g.name}</div>
              <table className="w-full font-mono text-xs">
                <thead className="text-mute">
                  <tr className="text-left">
                    <th className="py-1">#</th>
                    <th>Equipo</th>
                    <th className="text-center">PJ</th>
                    <th className="text-center">DG</th>
                    <th className="text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-2 text-mute">
                        Sin equipos
                      </td>
                    </tr>
                  )}
                  {rows.map((s, i) => (
                    <tr key={s.id} className="border-t border-line-2">
                      <td className="py-2">{i + 1}</td>
                      <td className="font-display font-semibold text-sm">{s.team?.name}</td>
                      <td className="text-center">{s.played}</td>
                      <td className="text-center">{s.goalsFor - s.goalsAgainst}</td>
                      <td className="text-center font-bold text-ignite">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
