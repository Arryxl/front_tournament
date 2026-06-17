import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../lib/api';
import { useAuth } from '../store/auth';
import { Spinner } from '../components/ui';
import type { Team } from '../types';

const RANK_LABEL: Record<string, string> = {
  plat3: 'Platino 3', plat4: 'Platino 4', dia1: 'Diamante 1', dia2: 'Diamante 2',
  dia3: 'Diamante 3', champ1: 'Champion 1', champ2: 'Champion 2', champ3: 'Champion 3',
};

export default function Profile() {
  const { user } = useAuth();
  const isPlayer = user?.role === 'candidate' || user?.role === 'admin';

  const [history, setHistory] = useState<any[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const calls: Promise<any>[] = [api.get('/coins/history').catch(() => ({ data: [] }))];
    if (isPlayer) {
      calls.push(api.get('/teams/mine').catch(() => ({ data: null })));
      calls.push(api.get(`/users/${user.id}/stats`).catch(() => ({ data: null })));
    }
    Promise.all(calls)
      .then((res) => {
        setHistory(res[0].data);
        if (isPlayer) {
          setTeam(res[1].data);
          setStats(res[2].data);
        }
      })
      .finally(() => setLoading(false));
  }, [user, isPlayer]);

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-20">
        <Spinner />
      </div>
    );

  const t = stats?.totals || {};
  const perMatch: any[] = stats?.perMatch || [];
  const maxScore = Math.max(...perMatch.map((s) => s.score || 0), 1);
  const shield = team?.shieldUrl
    ? team.shieldUrl.startsWith('http')
      ? team.shieldUrl
      : `${fileBase}${team.shieldUrl}`
    : null;

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      {/* header */}
      <span className="kicker">Mi perfil</span>
      <div className="flex items-end justify-between flex-wrap gap-4 mt-3 mb-12">
        <h1 className="font-display font-black uppercase text-[clamp(36px,7vw,84px)] tracking-tight leading-[0.88]">
          {user?.username}
        </h1>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-mute text-xs tracking-[0.2em] uppercase">Saldo</span>
          <span className="font-display font-black text-ignite text-3xl">{user?.coins ?? 0}</span>
          <span className="text-mute text-xs">GRV</span>
        </div>
      </div>

      {/* ===== sección de jugador ===== */}
      {isPlayer && (
        <>
          {/* equipo */}
          {team ? (
            <section className="mb-12">
              <h2 className="font-display font-black uppercase tracking-tight text-2xl mb-4">Mi equipo</h2>
              <div className="card p-5 flex items-center gap-5 mb-4">
                {shield ? (
                  <img src={shield} alt="" className="w-16 h-16 rounded-lg object-cover border border-line" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-void border border-line grid place-items-center font-display font-black text-xl">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-display font-black uppercase text-2xl tracking-tight leading-none">
                    {team.name}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mt-1.5">
                    {team.group ? `Grupo ${team.group.name}` : 'Sin grupo asignado'}
                  </div>
                </div>
              </div>
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
                      <div className="font-mono text-[10px] text-mute mt-1">
                        {m.rank ? RANK_LABEL[m.rank] || m.rank : '—'}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ) : (
            <p className="font-mono text-xs text-mute mb-12">
              Tu cuenta aún no está vinculada a un equipo.
            </p>
          )}

          {/* stats */}
          <section className="mb-12">
            <h2 className="font-display font-black uppercase tracking-tight text-2xl mb-4">Mis estadísticas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                ['Partidos', stats?.matchesPlayed ?? 0],
                ['Goles', t.goals ?? 0],
                ['Asistencias', t.assists ?? 0],
                ['Salvadas', t.saves ?? 0],
                ['Score total', t.score ?? 0],
                ['MVPs', t.mvps ?? 0],
              ].map(([label, value]) => (
                <div key={label as string} className="card p-4">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">{label}</div>
                  <div className="stat-num text-3xl mt-2">{value as number}</div>
                </div>
              ))}
            </div>

            {perMatch.length > 0 ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-bold uppercase tracking-tight text-sm">
                    Score por partido
                  </span>
                  <span className="font-mono text-[10px] text-mute">puntos de Rocket League por partido</span>
                </div>
                <div className="flex items-end gap-2 h-36">
                  {perMatch.map((s) => {
                    const h = Math.max(6, Math.round(((s.score || 0) / maxScore) * 100));
                    return (
                      <div key={s.id} className="flex-1 flex flex-col items-center gap-2 group">
                        <span className="font-mono text-[10px] text-mute tabular-nums">{s.score}</span>
                        <div
                          className="w-full rounded-t-sm bg-ignite/30 group-hover:bg-ignite transition-colors"
                          style={{ height: `${h}%` }}
                        />
                        <span className="font-mono text-[8px] text-mute tracking-[0.1em] truncate w-full text-center">
                          {s.match?.matchCode || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="font-mono text-xs text-mute">
                Todavía no tienes estadísticas. Aparecerán cuando juegues tu primer partido.
              </p>
            )}
          </section>
        </>
      )}

      {/* ===== historial de monedas (todos) ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-black uppercase tracking-tight text-2xl">Historial de monedas</h2>
          <Link to="/rewards" className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ignite">
            Ir a la tienda →
          </Link>
        </div>
        <div className="card divide-y divide-line-2">
          {history.length === 0 && (
            <div className="p-4 font-mono text-xs text-mute">Sin movimientos todavía.</div>
          )}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-3">
              <span className="font-mono text-xs text-mute">{h.concept}</span>
              <span className={`font-display font-black ${h.amount >= 0 ? 'text-green' : 'text-mute'}`}>
                {h.amount >= 0 ? '+' : ''}
                {h.amount}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
