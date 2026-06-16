// Componentes de identidad Gravity (brand book GRV-01)
import type { CSSProperties } from 'react';

export function GravityMark({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" width={size} height={size} className={className}>
      <circle cx="32" cy="32" r="28" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="32" cy="32" r="5" fill="var(--ink)" />
      <circle cx="60" cy="32" r="4.5" fill="var(--ignite)" />
    </svg>
  );
}

export function OrbitMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={className}>
      <circle cx="100" cy="100" r="78" stroke="rgba(243,240,233,.18)" />
      <circle cx="100" cy="100" r="48" stroke="rgba(243,240,233,.10)" />
      <g className="spin">
        <circle cx="178" cy="100" r="7" fill="#FF4D17" />
      </g>
      <circle cx="100" cy="100" r="5" fill="#F3F0E9" />
    </svg>
  );
}

/** Wordmark GRAVITY con el anillo orbital sobre la I. */
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
    <span className={`wordmark ${className}`} style={style}>
      GRAV
      <span className="o">
        I{animateRing && <span className="ring" />}
      </span>
      TY
    </span>
  );
}
