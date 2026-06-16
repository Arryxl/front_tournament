import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner, StatusBadge } from '../../components/ui';
import type { Match, Team } from '../../types';

export default function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [phase, setPhase] = useState('');

  const load = () => {
    Promise.all([api.get('/matches'), api.get('/teams')])
      .then(([m, t]) => {
        setMatches(m.data);
        setTeams(t.data.filter((x: Team) => x.status === 'approved'));
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openEdit = (m: Match) => {
    setEdit(m.id);
    setForm({
      teamHomeId: m.teamHomeId || '',
      teamAwayId: m.teamAwayId || '',
      homeScore: m.homeScore ?? '',
      awayScore: m.awayScore ?? '',
    });
  };

  const submitResult = async (id: string) => {
    // primero asignamos los equipos del partido
    await api.patch(`/matches/${id}/teams`, {
      teamHomeId: form.teamHomeId || null,
      teamAwayId: form.teamAwayId || null,
    });
    if (form.homeScore !== '' && form.awayScore !== '') {
      await api.patch(`/matches/${id}/result`, {
        homeScore: Number(form.homeScore),
        awayScore: Number(form.awayScore),
      });
    }
    setEdit(null);
    load();
  };

  const markLive = async (id: string) => {
    await api.patch(`/matches/${id}/live`, {});
    load();
  };

  const openPredictions = async (id: string) => {
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 3600 * 1000);
    await api.post('/predictions/windows', {
      matchId: id,
      openFrom: now.toISOString(),
      openUntil: until.toISOString(),
    });
    alert('Predicciones abiertas por 24h');
    load();
  };

  if (loading) return <Spinner />;

  const phases = ['', 'groups', 'quarters', 'semis', 'third', 'final'];
  const filtered = phase ? matches.filter((m) => m.phase === phase) : matches;

  return (
    <div>
      <span className="kicker">Torneo</span>
      <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mt-3 mb-6">
        Partidos
      </h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {phases.map((p) => (
          <button key={p || 'all'} onClick={() => setPhase(p)} className={`btn ${phase === p ? 'btn-ignite' : ''}`}>
            {p === '' ? 'Todos' : p}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-mute tracking-[0.2em] w-12">{m.matchCode}</span>
                <span className="font-display font-semibold text-sm">
                  {m.teamHome?.name || 'TBD'} {m.homeScore ?? '-'} : {m.awayScore ?? '-'}{' '}
                  {m.teamAway?.name || 'TBD'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                <button className="btn" onClick={() => openEdit(m)}>
                  Resultado
                </button>
                <button className="btn" onClick={() => markLive(m.id)}>
                  En vivo
                </button>
                <button className="btn" onClick={() => openPredictions(m.id)}>
                  Predicciones
                </button>
              </div>
            </div>

            {edit === m.id && (
              <div className="mt-4 pt-4 border-t border-line-2 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Equipo local</label>
                  <select
                    className="input"
                    value={form.teamHomeId}
                    onChange={(e) => setForm({ ...form, teamHomeId: e.target.value })}
                  >
                    <option value="">— Seleccionar —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Equipo visitante</label>
                  <select
                    className="input"
                    value={form.teamAwayId}
                    onChange={(e) => setForm({ ...form, teamAwayId: e.target.value })}
                  >
                    <option value="">— Seleccionar —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Marcador local</label>
                  <input
                    type="number"
                    className="input"
                    value={form.homeScore}
                    onChange={(e) => setForm({ ...form, homeScore: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Marcador visitante</label>
                  <input
                    type="number"
                    className="input"
                    value={form.awayScore}
                    onChange={(e) => setForm({ ...form, awayScore: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button className="btn btn-ignite" onClick={() => submitResult(m.id)}>
                    Guardar
                  </button>
                  <button className="btn" onClick={() => setEdit(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
