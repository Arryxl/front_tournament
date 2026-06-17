// Componentes de identidad Gravity (brand book GRV-03 · Velocidad de Escape)
import type { CSSProperties } from 'react';

/**
 * Marca Gravity: la "G" como una órbita abierta con el balón-brasa cayendo
 * por la izquierda. Lee como letra G y como pozo de gravedad / estela del coche.
 * Trazo en --ink (marfil), balón y estela en --ignite (brasa naranja).
 */
export function GravityMark({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" width={size} height={size} className={className} aria-hidden="true">
      {/* anillo abierto de la G */}
      <path
        d="M45 23 A17 17 0 1 0 49 37 H34"
        stroke="var(--ink)"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* estela */}
      <path d="M13 47 q12 6 23 0.5" stroke="var(--ignite)" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
      {/* balón brasa */}
      <circle cx="15.5" cy="45" r="5" fill="var(--ignite)" />
    </svg>
  );
}

/**
 * Logo en imagen (la "G" con el coche), PNG con fondo transparente.
 * Se recorta con object-contain y sin recuadro para integrarse sobre --void.
 */
export function BrandLogo({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/logo.png"
      alt="Gravity League"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}

/**
 * Marca decorativa para zonas amplias: anillo orbital con el nodo-brasa
 * trazando la órbita. Estática, atmósfera de transmisión.
 */
export function OrbitMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="82" stroke="rgba(241,236,223,.10)" />
      <circle cx="100" cy="100" r="54" stroke="rgba(241,236,223,.07)" />
      <circle cx="100" cy="100" r="26" stroke="rgba(241,236,223,.12)" />
      <ellipse cx="100" cy="100" rx="82" ry="34" stroke="rgba(236,87,30,.35)" transform="rotate(-22 100 100)" />
      <circle cx="100" cy="100" r="6" fill="var(--ink)" />
      <circle cx="34" cy="120" r="8" fill="var(--ignite)" />
    </svg>
  );
}

/** Wordmark GRAVITY — Saira Condensed itálica; la "I" lleva el acento brasa. */
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
