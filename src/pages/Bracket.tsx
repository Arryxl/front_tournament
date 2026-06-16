import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MatchCard, Section, Spinner } from '../components/ui';
import type { Match } from '../types';

const PHASES: { key: Match['phase']; label: string }[] = [
  { key: 'quarters', label: 'Cuartos de Final' },
  { key: 'semis', label: 'Semifinales' },
  { key: 'third', label: 'Tercer Lugar' },
  { key: 'final', label: 'Gran Final' },
];

export default function Bracket() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/matches/bracket')
      .then((r) => setMatches(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <Section kicker="Eliminatoria" title="La Llave">
      <div className="grid lg:grid-cols-4 gap-6 items-start">
        {PHASES.map((p) => {
          const list = matches.filter((m) => m.phase === p.key);
          return (
            <div key={p.key} className="flex flex-col gap-4">
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute">
                {p.label}
              </div>
              {list.length === 0 ? (
                <div className="card p-4 font-mono text-xs text-mute">Por definir</div>
              ) : (
                list.map((m) => <MatchCard key={m.id} match={m} />)
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
