import type { PlayerPosition } from '../types';

/**
 * Escalera ordenada COMPLETA de Rocket League (de menor a mayor). El rango
 * permitido en el torneo es un tramo de esta escalera (min..max), configurable
 * desde el admin. Supersonic Legend (ssl) no tiene divisiones.
 */
export const RANK_LADDER = [
  'bronze1', 'bronze2', 'bronze3',
  'silver1', 'silver2', 'silver3',
  'gold1', 'gold2', 'gold3',
  'plat1', 'plat2', 'plat3',
  'dia1', 'dia2', 'dia3',
  'champ1', 'champ2', 'champ3',
  'gc1', 'gc2', 'gc3',
  'ssl',
];

const RANK_LABEL: Record<string, string> = {
  bronze1: 'Bronce 1', bronze2: 'Bronce 2', bronze3: 'Bronce 3',
  silver1: 'Plata 1', silver2: 'Plata 2', silver3: 'Plata 3',
  gold1: 'Oro 1', gold2: 'Oro 2', gold3: 'Oro 3',
  plat1: 'Platino 1', plat2: 'Platino 2', plat3: 'Platino 3',
  dia1: 'Diamante 1', dia2: 'Diamante 2', dia3: 'Diamante 3',
  champ1: 'Champion 1', champ2: 'Champion 2', champ3: 'Champion 3',
  gc1: 'Grand Champion 1', gc2: 'Grand Champion 2', gc3: 'Grand Champion 3',
  ssl: 'Supersonic Legend',
};

/** Lista [clave, etiqueta] de toda la escalera (para selectores de rango libre). */
export const RANKS: [string, string][] = RANK_LADDER.map((k) => [k, RANK_LABEL[k]]);

/** El rango "Grand Champion 1": regla de 1 por equipo cuando es el tope. */
export const GC1 = 'gc1';
export const isGc1 = (r?: string | null) => r === GC1;

export const rankLabel = (v?: string | null) => (v ? RANK_LABEL[v] || v : '—');

/** Lista [clave, etiqueta] de los rangos elegibles entre min y max (inclusive). */
export function ranksBetween(min?: string | null, max?: string | null): [string, string][] {
  let lo = RANK_LADDER.indexOf(min || 'plat3');
  let hi = RANK_LADDER.indexOf(max || 'gc1');
  if (lo < 0) lo = 0;
  if (hi < 0) hi = RANK_LADDER.length - 1;
  if (lo > hi) [lo, hi] = [hi, lo];
  return RANK_LADDER.slice(lo, hi + 1).map((k) => [k, RANK_LABEL[k] || k]);
}

/** Texto "Mín — Máx" del rango permitido (ej. "Platino 3 — Grand Champion 1"). */
export function rankRangeLabel(min?: string | null, max?: string | null): string {
  return `${rankLabel(min || 'plat3')} — ${rankLabel(max || 'gc1')}`;
}

export const POSITIONS: [PlayerPosition, string][] = [
  ['striker', 'Ofensivo'],
  ['goalie', 'Defensivo'],
  ['flex', 'Flexible'],
];

export const positionLabel = (v?: string | null) =>
  POSITIONS.find(([k]) => k === v)?.[1] || '—';
