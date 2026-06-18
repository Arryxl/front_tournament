import type { ReactNode } from 'react';

/** Barra contenedora de filtros — responsive, envuelve en varias filas. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="card p-3 sm:p-4 mb-6 flex flex-wrap items-end gap-x-4 gap-y-3">{children}</div>
  );
}

/** Caja de búsqueda con icono y botón para limpiar. */
export function SearchBox({
  value,
  onChange,
  placeholder = 'Buscar…',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative flex-1 min-w-[160px] ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none text-sm">
        ⌕
      </span>
      <input
        className="input pl-8 pr-8"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ignite text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
}

interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Grupo de chips (filtro segmentado) compacto, ideal para muchos filtros. */
export function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: ChipOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <span className="label mb-0">{label}</span>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={`font-mono text-[10px] tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-md border transition-colors ${
                active
                  ? 'bg-ignite text-void border-ignite font-bold'
                  : 'border-line text-mute hover:text-ink hover:border-ink/40'
              }`}
            >
              {o.label}
              {o.count != null && (
                <span className={`ml-1.5 ${active ? 'opacity-80' : 'opacity-60'}`}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Contador de resultados + botón opcional para limpiar todos los filtros. */
export function ResultCount({
  shown,
  total,
  noun = 'resultados',
  onReset,
}: {
  shown: number;
  total: number;
  noun?: string;
  onReset?: () => void;
}) {
  const filtered = shown !== total;
  return (
    <div className="flex items-center gap-3 ml-auto">
      <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute whitespace-nowrap">
        <b className="text-ink">{shown}</b>
        {filtered && <span className="text-mute"> / {total}</span>} {noun}
      </span>
      {filtered && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute hover:text-ignite"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
