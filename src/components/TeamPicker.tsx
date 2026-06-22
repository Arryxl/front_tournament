import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fileUrl } from '../lib/overlay';
import type { PresetTeam } from '../types';

/**
 * Selector visual del catálogo de equipos predefinidos. Reutilizado en la
 * inscripción, el reclutamiento y —en modo solo lectura— el apartado de
 * "equipos disponibles" de la landing. Tarjetas compactas: el escudo flota
 * sobre un halo suave (no un cuadro oscuro) y se muestra centrado sin estirar
 * (`object-contain`). Grid responsive: 3 por fila en móvil → 6 en desktop.
 */
export function TeamPicker({
  value,
  onSelect,
  readOnly = false,
}: {
  value?: string | null;
  onSelect?: (preset: PresetTeam) => void;
  readOnly?: boolean;
}) {
  const [presets, setPresets] = useState<PresetTeam[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<PresetTeam[]>('/teams/presets')
      .then((r) => setPresets(r.data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="font-mono text-xs text-ignite border border-ignite/40 rounded-md px-4 py-3">
        No se pudo cargar el listado de equipos. Recarga la página.
      </div>
    );
  }

  if (!presets) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-lg border border-line bg-white/[0.02] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
      {presets.map((p) => {
        const selected = value === p.slug;
        const disabled = p.taken && !selected;
        return (
          <button
            key={p.slug}
            type="button"
            disabled={readOnly || disabled}
            onClick={() => onSelect?.(p)}
            title={p.name}
            className={[
              'group relative flex flex-col items-center gap-1.5 rounded-lg border px-2 pt-3 pb-2 text-center transition-all duration-200 overflow-hidden',
              selected
                ? 'border-ignite bg-ignite/[0.06] shadow-[0_8px_24px_-14px_rgba(236,87,30,0.7)]'
                : 'border-line bg-white/[0.015] hover:border-ignite/50 hover:bg-white/[0.035] hover:-translate-y-0.5',
              disabled ? 'opacity-35 grayscale pointer-events-none' : '',
              readOnly && !selected ? 'cursor-default' : '',
            ].join(' ')}
          >
            {/* escudo contenido en su caja (invisible) con un halo suave detrás */}
            <div className="relative h-12 sm:h-14 w-full overflow-hidden grid place-items-center">
              <div
                className={`absolute inset-0 m-auto h-9 w-9 rounded-full blur-xl transition-opacity duration-300 ${
                  selected
                    ? 'bg-ignite/30 opacity-100'
                    : 'bg-white/10 opacity-0 group-hover:opacity-100'
                }`}
              />
              {p.logo ? (
                <img
                  src={fileUrl(p.logo)}
                  alt={p.name}
                  loading="lazy"
                  className="relative h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] transition-transform duration-200 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="relative font-display font-black italic text-xl text-mute">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="w-full min-w-0">
              <div
                className={`font-display font-black italic uppercase leading-none tracking-tight truncate text-[13px] sm:text-sm ${
                  selected ? 'text-ignite' : 'text-ink'
                }`}
              >
                {p.name}
              </div>
              {p.placementLabel && (
                <div className="mt-1 font-mono text-[8px] sm:text-[9px] tracking-[0.12em] uppercase text-mute truncate">
                  {p.placementLabel}
                </div>
              )}
            </div>

            {p.taken && (
              <span className="absolute top-1 right-1 font-mono text-[7px] tracking-[0.14em] uppercase bg-void/85 border border-line rounded px-1 py-px text-mute backdrop-blur-sm">
                Tomado
              </span>
            )}
            {selected && (
              <span className="absolute top-1 left-1 grid place-items-center h-4 w-4 rounded-full bg-ignite text-void text-[10px] font-black leading-none">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
