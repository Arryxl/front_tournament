import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MatchCard, Section, Spinner } from '../components/ui';
import type { Group, Match, Reward, Standing, TopStat } from '../types';

function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setLeft('EN CURSO');
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target]);
  return <span className="font-mono text-ignite">{left}</span>;
}

export default function Landing() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<TopStat[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/matches'),
      api.get('/groups'),
      api.get('/groups/standings'),
      api.get('/stats/top-scorers'),
      api.get('/rewards'),
    ])
      .then(([m, g, s, sc, r]) => {
        setMatches(m.data);
        setGroups(g.data);
        setStandings(s.data);
        setScorers(sc.data);
        setRewards(r.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const upcoming = matches
    .filter((m) => m.status !== 'finished')
    .slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-line-2 mb-14">
        <span className="kicker">Temporada 01 · Rocket League 3v3</span>
        <h1 className="font-display font-extrabold uppercase leading-[0.9] tracking-tight text-6xl md:text-8xl mt-5">
          Masa.<br />Momento.<br />
          <span className="text-ignite">Arco.</span>
        </h1>
        <p className="font-serif italic text-2xl md:text-3xl text-ink mt-8 max-w-lg">
          16 equipos. 32 partidos. Una sola final.
        </p>
        <div className="flex flex-wrap items-center gap-6 mt-10">
          <Link to="/register" className="btn btn-ignite">
            Inscribir equipo
          </Link>
          <Link to="/bracket" className="btn">
            Ver la llave
          </Link>
          <div className="font-mono text-xs tracking-[0.2em] uppercase text-mute">
            Sorteo en <Countdown target="2025-07-22T18:00:00" />
          </div>
        </div>
      </section>

      {/* Próximos partidos */}
      <Section kicker="Calendario" title="Próximos partidos">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </Section>

      {/* Grupos */}
      <Section kicker="Fase de grupos" title="Grupos">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map((g) => {
            const rows = standings
              .filter((s) => s.groupId === g.id)
              .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
            return (
              <div key={g.id} className="card p-4">
                <div className="font-display font-extrabold text-2xl mb-3">Grupo {g.name}</div>
                {rows.length === 0 && (
                  <div className="font-mono text-xs text-mute">Sin equipos asignados</div>
                )}
                {rows.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-1.5 border-t border-line-2 text-sm"
                  >
                    <span className="font-mono text-mute mr-2">{i + 1}</span>
                    <span className="flex-1 truncate font-display">{s.team?.name}</span>
                    <span className="font-mono font-bold">{s.points}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Top goleadores */}
      <Section kicker="Estadísticas" title="Top goleadores">
        {scorers.length === 0 ? (
          <p className="font-mono text-sm text-mute">Aún no hay estadísticas cargadas.</p>
        ) : (
          <div className="card divide-y divide-line-2">
            {scorers.slice(0, 5).map((s, i) => (
              <div key={s.userId} className="flex items-center gap-4 p-4">
                <span className="font-display font-extrabold text-xl text-mute w-6">{i + 1}</span>
                <span className="flex-1 font-display font-semibold">{s.username}</span>
                <span className="font-mono text-xs text-mute">{s.teamName}</span>
                <span className="font-display font-extrabold text-2xl text-ignite">{s.total}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recompensas */}
      <Section kicker="Economía" title="Recompensas">
        <div className="grid md:grid-cols-3 gap-4">
          {rewards.slice(0, 3).map((r) => (
            <div key={r.id} className="card p-5">
              <div className="font-display font-bold text-lg">{r.name}</div>
              <p className="font-mono text-xs text-mute mt-2 mb-4">{r.description}</p>
              <div className="font-display font-extrabold text-ignite">{r.costCoins} GRV</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
