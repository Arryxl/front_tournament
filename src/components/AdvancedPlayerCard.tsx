import type { PlayerExtraStats } from '../types';

/** Barra con etiqueta clara, valor y unidad; `pct` 0–100 controla el ancho. */
function MetricBar({
  label,
  value,
  unit,
  pct,
  tone = 'ignite',
}: {
  label: string;
  value: string;
  unit?: string;
  pct: number;
  tone?: string;
}) {
  const color = tone === 'cyan' ? 'bg-cyan' : tone === 'green' ? 'bg-green' : 'bg-ignite';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-mute leading-tight">{label}</span>
        <span className="font-display font-bold text-sm tabular-nums shrink-0">
          {value}
          {unit && <span className="text-mute text-[10px] font-mono ml-0.5">{unit}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-void overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </div>
    </div>
  );
}

/** Tarjeta de stats avanzadas (boost/movimiento/posición) de un jugador en un partido. */
export default function AdvancedPlayerCard({ name, e }: { name: string; e: PlayerExtraStats }) {
  return (
    <div className="card p-4">
      <div className="font-display font-bold uppercase tracking-tight text-sm mb-3 truncate">{name}</div>
      <div className="flex flex-col gap-3">
        <MetricBar label="Boost por minuto" value={e.boost.bpm.toFixed(0)} unit="bpm" pct={(e.boost.bpm / 500) * 100} />
        <MetricBar label="Velocidad media" value={e.movement.avgSpeed.toFixed(0)} unit="uu/s" pct={(e.movement.avgSpeed / 2300) * 100} tone="cyan" />
        <MetricBar label="Tiempo a máxima velocidad" value={e.movement.timeSupersonic.toFixed(0)} unit="s" pct={(e.movement.timeSupersonic / 90) * 100} tone="cyan" />
        <MetricBar label="Tiempo en campo rival" value={e.positioning.percentOffensiveThird.toFixed(0)} unit="%" pct={e.positioning.percentOffensiveThird} />
        <MetricBar label="Cobertura (detrás del balón)" value={e.positioning.percentBehindBall.toFixed(0)} unit="%" pct={e.positioning.percentBehindBall} tone="green" />
      </div>
      <div className="mt-3.5 pt-3 border-t border-line-2">
        <div className="font-mono text-[10px] tracking-[0.06em] uppercase text-mute mb-2">Dónde jugó (altura)</div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-void">
          <div className="bg-ignite" style={{ width: `${e.movement.percentGround}%` }} />
          <div className="bg-cyan" style={{ width: `${e.movement.percentLowAir}%` }} />
          <div className="bg-green" style={{ width: `${e.movement.percentHighAir}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          <span className="font-mono text-[9px] text-mute flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-ignite" /> Suelo {e.movement.percentGround.toFixed(0)}%
          </span>
          <span className="font-mono text-[9px] text-mute flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-cyan" /> Aire bajo {e.movement.percentLowAir.toFixed(0)}%
          </span>
          <span className="font-mono text-[9px] text-mute flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-green" /> Aire alto {e.movement.percentHighAir.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
