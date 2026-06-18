import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { TWITCH_CHANNEL } from '../../config';
import type { Match } from '../../types';

const PHASE: Record<string, string> = {
  groups: 'Grupos', round16: 'Octavos', quarters: 'Cuartos', semis: 'Semis', third: '3.º', final: 'Final',
};

const VIEWS = [
  {
    key: 'versus',
    label: 'Versus (pre-partido)',
    desc: 'Escena completa con fondo de marca: escudos, nombres, fase y hora. Para la escena de "próximo partido".',
  },
  {
    key: 'scoreboard',
    label: 'Marcador en vivo',
    desc: 'Barra superior transparente para superponer durante la partida. El marcador se actualiza solo (2–3 s).',
  },
  {
    key: 'predictions',
    label: 'Predicciones (chat)',
    desc: 'Módulo acotado (esquina) con la votación del chat de Twitch en vivo (!1 / !2).',
  },
  {
    key: 'stats',
    label: 'Stats finales',
    desc: 'Escena completa de resultado: marcador, MVP y estadísticas por jugador.',
  },
] as const;

function CopyRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="input flex-1 text-[11px] truncate"
      />
      <button className="btn shrink-0" onClick={copy}>
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
      <a className="btn shrink-0" href={url} target="_blank" rel="noreferrer">
        Abrir ↗
      </a>
    </div>
  );
}

export default function AdminOverlays() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState('');

  useEffect(() => {
    api
      .get('/matches')
      .then((r) => {
        setMatches(r.data);
        // por defecto: el primero en vivo, si no el próximo programado, si no el primero
        const live = r.data.find((m: Match) => m.status === 'live');
        const next = r.data.find((m: Match) => m.status === 'scheduled');
        setSel((live || next || r.data[0])?.id || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const match = useMemo(() => matches.find((m) => m.id === sel), [matches, sel]);
  const label = (m: Match) =>
    `${m.matchCode} · ${m.teamHome?.name || 'TBD'} vs ${m.teamAway?.name || 'TBD'} · ${PHASE[m.phase] || m.phase} · ${m.status}`;

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Producción</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-2">
        Centro de overlays
      </h1>
      <p className="font-mono text-[11px] text-mute leading-[1.8] max-w-[74ch] mb-6">
        URLs para cargar como <b className="text-ink">Browser Source</b> en OBS (1920×1080). Cada
        overlay <b className="text-ink">lee del API por sí solo</b>: lo que cargues en el panel
        (marcador, stats, abrir/cerrar predicciones) se refleja en pantalla en 2–3 s, sin reabrir
        nada. <b className="text-ink">Versus</b> y <b className="text-ink">Stats</b> son escenas a
        pantalla completa con fondo de marca (úsalas en escenas de standby/resultado);{' '}
        <b className="text-ink">Marcador</b> y <b className="text-ink">Predicciones</b> tienen fondo
        transparente para superponerse sobre el gameplay.
      </p>

      {matches.length === 0 ? (
        <p className="font-mono text-xs text-ignite">
          No hay partidos creados todavía. Crea partidos en{' '}
          <Link to="/admin/matches" className="text-ignite underline">Partidos</Link>.
        </p>
      ) : (
        <>
          <div className="card p-5 mb-6">
            <label className="label">Partido</label>
            <select className="input" value={sel} onChange={(e) => setSel(e.target.value)}>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {label(m)}
                </option>
              ))}
            </select>
          </div>

          {match && (
            <div className="grid gap-4">
              {VIEWS.map((v) => (
                <div key={v.key} className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <div className="font-display font-black italic uppercase tracking-tight text-xl">
                      {v.label}
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                      /overlay/match/…/{v.key}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-mute mb-3">{v.desc}</p>
                  <CopyRow
                    url={`${origin}/overlay/match/${match.id}/${v.key}${
                      v.key === 'predictions' ? `?channel=${TWITCH_CHANNEL}` : ''
                    }`}
                  />
                </div>
              ))}

              {/* guía de votación */}
              <div className="card p-5 border-ignite/30">
                <div className="font-display font-black italic uppercase tracking-tight text-xl mb-2">
                  Votación por chat
                </div>
                <p className="font-mono text-[11px] text-mute leading-[1.8]">
                  El overlay de predicciones se conecta solo al chat de{' '}
                  <b className="text-ignite">twitch.tv/{TWITCH_CHANNEL}</b> (anónimo, sin login). Los
                  viewers votan escribiendo <b className="text-ink">!1</b> (local) o{' '}
                  <b className="text-ink">!2</b> (visita). Solo cuenta mientras tengas las{' '}
                  <Link to="/admin/predictions" className="text-ignite underline">predicciones abiertas</Link>{' '}
                  para ese partido; al cerrarlas, el resultado queda congelado.
                </p>
              </div>

              {/* accesos rápidos */}
              <div className="flex flex-wrap gap-2">
                <Link to="/admin/matches" className="btn">Cargar resultado / marcar en vivo →</Link>
                <Link to="/admin/predictions" className="btn">Abrir / cerrar predicciones →</Link>
                <Link to="/admin/stats" className="btn">Cargar estadísticas →</Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
