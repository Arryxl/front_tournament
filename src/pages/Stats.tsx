import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';
import type { TopStat } from '../types';

type Row = { id: string; name: string; team?: string; value: number; sub?: string };

const TABS = [
  { key: 'goleadores', label: 'Goleadores', unit: 'goles' },
  { key: 'asistencias', label: 'Asistencias', unit: 'asist.' },
  { key: 'salvadas', label: 'Salvadas', unit: 'salv.' },
  { key: 'tiros', label: 'Tiros', unit: 'tiros' },
  { key: 'demos', label: 'Demoliciones', unit: 'demos' },
  { key: 'score', label: 'Score', unit: 'pts' },
  { key: 'mvp', label: 'MVP', unit: 'mvp' },
  { key: 'predictores', label: 'Predictores', unit: 'grats' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function Podium({ rows, unit }: { rows: Row[]; unit: string }) {
  const order = [rows[1], rows[0], rows[2]]; // 2 · 1 · 3
  const heights = ['h-28', 'h-40', 'h-20'];
  const accents = ['text-ink border-line', 'text-ignite border-ignite/50', 'text-mute border-line'];
  const place = [2, 1, 3];
  return (
    <div className="grid grid-cols-3 gap-3 items-end mb-5">
      {order.map((r, i) =>
        r ? (
          <div key={r.id} className="flex flex-col items-center">
            <div className="text-center mb-3">
              <div className="font-display font-black italic uppercase tracking-tight text-lg leading-none truncate max-w-[16ch]">
                {r.name}
              </div>
              {r.team && <div className="font-mono text-[10px] text-mute mt-1 truncate">{r.team}</div>}
              <div className={`font-display font-black italic text-3xl mt-1 ${i === 1 ? 'text-ignite' : ''}`}>
                {r.value}
                <span className="text-mute text-xs font-mono ml-1">{unit}</span>
              </div>
            </div>
            <div
              className={`w-full ${heights[i]} rounded-t-md border-t-2 ${accents[i]} bg-void-2 grid place-items-start justify-center pt-3`}
            >
              <span className={`font-display font-black italic text-3xl ${i === 1 ? 'text-ignite' : 'text-mute'}`}>
                {place[i]}
              </span>
            </div>
          </div>
        ) : (
          <div key={i} />
        ),
      )}
    </div>
  );
}

export default function Stats() {
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [tab, setTab] = useState<TabKey>('goleadores');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toRows = (arr: TopStat[]): Row[] =>
      (arr || []).map((s) => ({
        id: s.userId,
        name: s.username,
        team: s.teamName || undefined,
        value: Number(s.total),
        sub: `${s.matchesPlayed} PJ`,
      }));
    Promise.all([
      api.get('/stats/top-scorers'),
      api.get('/stats/top-assists'),
      api.get('/stats/top-saves'),
      api.get('/stats/top-shots'),
      api.get('/stats/top-demos'),
      api.get('/stats/top-score'),
      api.get('/stats/top-mvp'),
      api.get('/predictions/leaderboard').catch(() => ({ data: [] })),
    ])
      .then(([g, a, s, sh, d, sc, mvp, p]) =>
        setData({
          goleadores: toRows(g.data),
          asistencias: toRows(a.data),
          salvadas: toRows(s.data),
          tiros: toRows(sh.data),
          demos: toRows(d.data),
          score: toRows(sc.data),
          mvp: toRows(mvp.data),
          predictores: (p.data || []).map((r: any) => ({
            id: r.userId,
            name: r.username,
            value: Number(r.coins),
            sub: `${r.correct}/${r.total} aciertos`,
          })),
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  const active = TABS.find((t) => t.key === tab)!;
  const rows = useMemo(() => data[tab] || [], [data, tab]);

  if (loading)
    return (
      <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-20">
        <Spinner />
      </div>
    );

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 5);

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <span className="kicker">Temporada 01 · en vivo</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(40px,9vw,120px)] tracking-tight leading-[0.82] mt-3 mb-8">
        Quién<br />manda
      </h1>

      {/* tabs */}
      <div className="flex gap-2 flex-wrap mb-10 border-b border-line-2 pb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`font-mono text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 rounded-md border transition-colors ${
              tab === t.key
                ? 'bg-ignite text-void border-ignite font-bold'
                : 'border-line text-mute hover:text-ink hover:border-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="font-mono text-xs text-mute">Aún no hay datos en esta categoría.</p>
      ) : (
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          {/* podio */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute mb-5">
              Podio · {active.label}
            </div>
            <Podium rows={top3} unit={active.unit} />
          </div>

          {/* resto del mejor de 5 */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute mb-5">
              Posiciones 4 – 5
            </div>
            <div className="card overflow-hidden">
              {rest.length === 0 ? (
                <div className="p-4 font-mono text-xs text-mute">Solo hay top 3 por ahora.</div>
              ) : (
                <div className="divide-y divide-line-2">
                  {rest.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 p-3.5 hover:bg-void-2 transition-colors">
                      <span className="font-display font-black italic text-mute w-6 tabular-nums">{i + 4}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold truncate">{r.name}</div>
                        {(r.team || r.sub) && (
                          <div className="font-mono text-[10px] text-mute truncate">
                            {r.team ? `${r.team} · ` : ''}
                            {r.sub}
                          </div>
                        )}
                      </div>
                      <span className="font-display font-black italic text-ignite text-xl tabular-nums">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
