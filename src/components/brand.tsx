// Componentes de identidad Gravity (brand book GRV-02 · Estadio Nocturno)
import type { CSSProperties } from 'react';

/**
 * Marca Gravity: un bracket que converge en un solo nodo.
 * Dos ramas entran por la izquierda y caen hacia un punto — el campeón.
 * (la gravedad lo atrae todo a un mismo lugar / la llave a una sola final)
 */
export function GravityMark({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" width={size} height={size} className={className}>
      <g stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 18 H26 V32" />
        <path d="M8 46 H26 V32" />
        <path d="M26 32 H44" />
      </g>
      <circle cx="47" cy="32" r="5.5" fill="var(--ignite)" />
    </svg>
  );
}

/**
 * Marca decorativa para zonas amplias: diana concéntrica con un nodo
 * cayendo hacia el centro. Estática, sin ruido.
 */
export function OrbitMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={className}>
      <circle cx="100" cy="100" r="82" stroke="rgba(242,245,247,.10)" />
      <circle cx="100" cy="100" r="54" stroke="rgba(242,245,247,.07)" />
      <circle cx="100" cy="100" r="26" stroke="rgba(242,245,247,.12)" />
      <line x1="100" y1="18" x2="100" y2="74" stroke="var(--ignite)" strokeWidth="2" strokeDasharray="3 5" />
      <circle cx="100" cy="100" r="6" fill="var(--ink)" />
      <circle cx="100" cy="22" r="7" fill="var(--ignite)" />
    </svg>
  );
}

/** Wordmark GRAVITY — la "I" lleva el acento lima eléctrico. */
export function Wordmark({
  className = '',
  animateRing = false,
  style,
}: {
  className?: string;
  animateRing?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span className={`wordmark ${animateRing ? 'lit' : ''} ${className}`} style={style}>
      GRAV
      <span className="o">I</span>
      TY
    </span>
  );
}
