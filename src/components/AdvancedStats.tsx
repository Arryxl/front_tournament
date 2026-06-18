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

/**
 * Stats avanzadas (promedio por partido) leídas de los replays, explicadas en
 * lenguaje claro: gestión de boost, movimiento y posición en cancha.
 */
export default function AdvancedStats({ extra }: { extra: PlayerExtraStats }) {
  const { boost, movement, positioning } = extra;
  return (
    <section className="mb-12">
      <h2 className="font-display font-black italic uppercase tracking-tight text-2xl mb-1">
        Estadísticas avanzadas
      </h2>
      <p className="font-mono text-[10px] text-mute mb-5 leading-relaxed max-w-[70ch]">
        Promedio por partido, leído de los replays. <span className="text-ink">uu/s</span> es la
        unidad de velocidad de Rocket League (máximo ~2300, la velocidad supersónica).
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Boost */}
        <div className="card p-5">
          <div className="font-display font-bold uppercase tracking-tight text-sm text-ignite mb-1">Boost</div>
          <p className="font-mono text-[10px] text-mute mb-4 leading-snug">Cómo gestiona el combustible.</p>
          <div className="flex flex-col gap-3.5">
            <MetricBar label="Boost por minuto" value={boost.bpm.toFixed(0)} unit="bpm" pct={(boost.bpm / 500) * 100} />
            <MetricBar label="Boost disponible (media)" value={boost.avgAmount.toFixed(0)} unit="/100" pct={boost.avgAmount} />
            <MetricBar label="Boost recogido" value={boost.amountCollected.toFixed(0)} pct={(boost.amountCollected / 3000) * 100} tone="cyan" />
            <MetricBar label="Robado al rival" value={boost.amountStolen.toFixed(0)} pct={(boost.amountStolen / 1500) * 100} tone="cyan" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="font-mono text-[9px] uppercase text-mute leading-tight">Sin boost</div>
                <div className="font-display font-bold tabular-nums">{boost.timeZeroBoost.toFixed(1)}<span className="text-mute text-[10px] font-mono ml-0.5">s</span></div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase text-mute leading-tight">Boost lleno</div>
                <div className="font-display font-bold tabular-nums">{boost.timeFullBoost.toFixed(1)}<span className="text-mute text-[10px] font-mono ml-0.5">s</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Movimiento */}
        <div className="card p-5">
          <div className="font-display font-bold uppercase tracking-tight text-sm text-ignite mb-1">Movimiento</div>
          <p className="font-mono text-[10px] text-mute mb-4 leading-snug">Velocidad y a qué altura juega.</p>
          <div className="flex flex-col gap-3.5">
            <MetricBar label="Velocidad media" value={movement.avgSpeed.toFixed(0)} unit="uu/s" pct={(movement.avgSpeed / 2300) * 100} />
            <MetricBar label="Tiempo a máxima velocidad" value={movement.timeSupersonic.toFixed(0)} unit="s" pct={(movement.timeSupersonic / 90) * 100} tone="cyan" />
            <div className="pt-1">
              <div className="font-mono text-[10px] tracking-[0.06em] uppercase text-mute mb-2">Dónde jugó (altura)</div>
              <div className="flex h-3 rounded-full overflow-hidden bg-void">
                <div className="bg-ignite" style={{ width: `${movement.percentGround}%` }} />
                <div className="bg-cyan" style={{ width: `${movement.percentLowAir}%` }} />
                <div className="bg-green" style={{ width: `${movement.percentHighAir}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                <span className="font-mono text-[9px] text-mute flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-ignite" /> Suelo {movement.percentGround.toFixed(0)}%
                </span>
                <span className="font-mono text-[9px] text-mute flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-cyan" /> Aire bajo {movement.percentLowAir.toFixed(0)}%
                </span>
                <span className="font-mono text-[9px] text-mute flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-green" /> Aire alto {movement.percentHighAir.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Posicionamiento */}
        <div className="card p-5">
          <div className="font-display font-bold uppercase tracking-tight text-sm text-ignite mb-1">Posición</div>
          <p className="font-mono text-[10px] text-mute mb-4 leading-snug">Dónde se ubica respecto al balón y la cancha.</p>
          <div className="flex flex-col gap-3.5">
            <MetricBar label="Tiempo en campo rival" value={positioning.percentOffensiveThird.toFixed(0)} unit="%" pct={positioning.percentOffensiveThird} />
            <MetricBar label="Tiempo en campo propio" value={positioning.percentDefensiveThird.toFixed(0)} unit="%" pct={positioning.percentDefensiveThird} tone="cyan" />
            <MetricBar label="Cobertura (detrás del balón)" value={positioning.percentBehindBall.toFixed(0)} unit="%" pct={positioning.percentBehindBall} tone="green" />
            <div className="pt-1">
              <div className="font-mono text-[9px] uppercase text-mute leading-tight">Distancia media al balón</div>
              <div className="font-display font-bold tabular-nums text-lg">
                {positioning.avgDistanceToBall.toFixed(0)}
                <span className="text-mute text-[10px] font-mono ml-1">uu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
