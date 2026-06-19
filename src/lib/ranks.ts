import type { PlayerPosition } from '../types';

/** Rango elegible: Platino 3 → Champion 3 (sin Platino 4), igual que la inscripción. */
export const RANKS: [string, string][] = [
  ['plat3', 'Platino 3'],
  ['dia1', 'Diamante 1'],
  ['dia2', 'Diamante 2'],
  ['dia3', 'Diamante 3'],
  ['champ1', 'Champion 1'],
  ['champ2', 'Champion 2'],
  ['champ3', 'Champion 3'],
];

const RANK_LABEL: Record<string, string> = {
  plat3: 'Platino 3',
  plat4: 'Platino 4',
  dia1: 'Diamante 1',
  dia2: 'Diamante 2',
  dia3: 'Diamante 3',
  champ1: 'Champion 1',
  champ2: 'Champion 2',
  champ3: 'Champion 3',
};

export const rankLabel = (v?: string | null) => (v ? RANK_LABEL[v] || v : '—');

export const POSITIONS: [PlayerPosition, string][] = [
  ['striker', 'Ofensivo'],
  ['goalie', 'Defensivo'],
  ['flex', 'Flexible'],
];

export const positionLabel = (v?: string | null) =>
  POSITIONS.find(([k]) => k === v)?.[1] || '—';
