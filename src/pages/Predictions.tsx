import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { Spinner, StatusBadge, Coin, BackButton } from '../components/ui';
import type { Match } from '../types';

type ScoreState = Record<string, { home: string; away: string }>;

export default function Predictions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [scores, setScores] = useState<ScoreState>({});

  const load = () => {
    Promise.all([
      api.get('/matches'),
      // Solo con sesión: las predicciones propias requieren autenticación.
      user ? api.get('/predictions/my').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.get('/predictions/leaderboard').catch(() => ({ data: [] })),
    ])
      .then(([m, p, b]) => {
        setMatches(m.data);
        setMine(p.data);
        setBoard(b.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [user]);

  const setScore = (id: string, key: 'home' | 'away', val: string) =>
    setScores((s) => {
      const prev = s[id] || { home: '', away: '' };
      return { ...s, [id]: { ...prev, [key]: val } };
    });

  const predict = async (matchId: string, winnerId: string) => {
    setMsg('');
    // Si no hay sesión, llevar a iniciar sesión (y volver aquí después).
    if (!user) {
      navigate('/login', { state: { from: '/predictions' } });
      return;
    }
    const sc = scores[matchId];
    const payload: any = { matchId, predictedWinnerId: winnerId };
    if (sc && sc.home !== '' && sc.away !== '') {
      payload.predictedHomeScore = Number(sc.home);
      payload.predictedAwayScore = Number(sc.away);
    }
    try {
      await api.post('/predictions', payload);
      setMsg('¡Predicción registrada!');
      load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'No se pudo predecir');
    }
  };

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-20">
        <Spinner />
      </div>
    );

  const open = matches.filter((m) => m.predictionsOpen && m.status !== 'finished');
  const predictedIds = new Set(mine.map((p) => p.matchId));

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <BackButton className="mb-5" />
      <span className="kicker">Juega con nosotros</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(40px,8vw,96px)] tracking-tight leading-[0.85] mt-3 mb-3">
        Predice<br />y gana
      </h1>
      <p className="font-display text-mute text-base max-w-[54ch] mb-10 leading-[1.6] inline-flex flex-wrap items-center gap-x-1.5">
        Acierta el ganador y suma <b className="text-ink inline-flex items-center gap-1"><Coin size={15} />+10</b> grats. Si clavas el marcador exacto,
        <b className="text-ignite inline-flex items-center gap-1"><Coin size={15} />+25</b> grats. Se reparten al cerrar cada partido.
      </p>

      {msg && <div className="font-mono text-xs text-ignite mb-6">{msg}</div>}

      {!user && (
        <div className="card p-4 mb-8 flex items-center justify-between gap-3 flex-wrap">
          <span className="font-mono text-xs text-mute leading-[1.6]">
            Puedes ver los partidos y el ranking. Para <b className="text-ink">hacer predicciones</b> y
            ganar grats necesitas iniciar sesión.
          </span>
          <Link to="/login" className="btn btn-ignite !py-2 shrink-0">
            Iniciar sesión
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
        {/* abiertas + mis predicciones */}
        <div>
          <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-4">Abiertas ahora</h2>
          {open.length === 0 && (
            <p className="font-mono text-xs text-mute mb-10">
              No hay predicciones abiertas en este momento. Vuelve cuando empiece el próximo partido.
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {open.map((m) => {
              const already = predictedIds.has(m.id);
              return (
                <div key={m.id} className="card p-5">
                  <div className="font-mono text-[11px] text-mute tracking-[0.2em] mb-3">
                    {m.matchCode} · {m.format.toUpperCase()}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      disabled={already || !m.teamHomeId}
                      onClick={() => m.teamHomeId && predict(m.id, m.teamHomeId)}
                      className="btn flex-1 disabled:opacity-40"
                    >
                      {m.teamHome?.name || 'Local'}
                    </button>
                    <span className="font-mono text-mute text-xs">vs</span>
                    <button
                      disabled={already || !m.teamAwayId}
                      onClick={() => m.teamAwayId && predict(m.id, m.teamAwayId)}
                      className="btn flex-1 disabled:opacity-40"
                    >
                      {m.teamAway?.name || 'Visita'}
                    </button>
                  </div>
                  {!already ? (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute">
                        Marcador exacto (+25)
                      </span>
                      <input
                        type="number"
                        className="input w-12 px-1 py-1 text-center text-xs"
                        value={scores[m.id]?.home ?? ''}
                        onChange={(e) => setScore(m.id, 'home', e.target.value)}
                      />
                      <span className="text-mute">:</span>
                      <input
                        type="number"
                        className="input w-12 px-1 py-1 text-center text-xs"
                        value={scores[m.id]?.away ?? ''}
                        onChange={(e) => setScore(m.id, 'away', e.target.value)}
                      />
                      <span className="font-mono text-[9px] text-mute">elige ganador para enviar</span>
                    </div>
                  ) : (
                    <div className="font-mono text-[10px] text-green mt-3">✓ Ya predijiste</div>
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-4">Mis predicciones</h2>
          <div className="card divide-y divide-line-2">
            {mine.length === 0 && (
              <div className="p-4 font-mono text-xs text-mute">Aún no has predicho ningún partido.</div>
            )}
            {mine.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3">
                <span className="font-mono text-xs text-mute w-12">{p.match?.matchCode}</span>
                <span className="font-display font-semibold text-sm flex-1 mx-4 truncate">
                  {p.predictedWinner?.name}
                  {p.predictedHomeScore != null && (
                    <span className="text-mute ml-2 font-mono text-xs">
                      {p.predictedHomeScore}-{p.predictedAwayScore}
                    </span>
                  )}
                </span>
                {p.isCorrect === null ? (
                  <StatusBadge status="scheduled" />
                ) : (
                  <span className={`font-display font-black italic ${p.isCorrect ? 'text-green' : 'text-mute'}`}>
                    {p.isCorrect ? `✓ +${p.coinsEarned}` : '✗'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* leaderboard de predictores */}
        <aside className="lg:sticky lg:top-24">
          <h2 className="font-display font-black italic uppercase tracking-tight text-xl mb-4">Top predictores</h2>
          <div className="card overflow-hidden">
            {board.length === 0 ? (
              <div className="p-4 font-mono text-xs text-mute">Sin datos todavía.</div>
            ) : (
              <div className="divide-y divide-line-2">
                {board.slice(0, 10).map((p, i) => (
                  <div key={p.userId} className="flex items-center gap-3 p-3">
                    <span className={`font-display font-black italic w-6 ${i < 3 ? 'text-ignite' : 'text-mute'}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-display font-semibold text-sm">{p.username}</span>
                    <span className="font-mono text-[10px] text-mute">{p.correct}/{p.total}</span>
                    <span className="flex items-center gap-1 w-16 justify-end">
                      <Coin size={13} />
                      <span className="font-display font-black italic text-ignite tabular-nums">{p.coins}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
