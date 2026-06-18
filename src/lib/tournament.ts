// ============================================================
// Matemática del torneo en el front (espejo de api/common/tournament.ts).
// Deriva grupos, estructura de llave y etiquetas a partir de la config.
// ============================================================

export function groupCountFor(teamCount: number): number {
  return Math.max(1, Math.floor(teamCount / 4));
}

export function groupLettersFor(teamCount: number): string[] {
  const n = groupCountFor(teamCount);
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

/** ¿La llave arranca en octavos? (32 equipos ⇒ 8 grupos ⇒ 16 clasifican). */
export function hasRound16(teamCount: number): boolean {
  return groupCountFor(teamCount) * 2 >= 16;
}

/** Total de partidos: grupos (6 por grupo) + llave. 16⇒32, 32⇒64. */
export function expectedMatchCount(teamCount: number): number {
  const groups = groupCountFor(teamCount);
  const groupMatches = groups * 6;
  const knockout = hasRound16(teamCount) ? 16 : 8;
  return groupMatches + knockout;
}

/** Etiqueta de formato a partir de jugadores por lado: 3 ⇒ "3v3". */
export function formatLabel(playersPerSide: number): string {
  return `${playersPerSide}v${playersPerSide}`;
}

/**
 * Nombre legible de un partido según su fase, en vez del código interno
 * (GA-1, R01, SF1, GF…). Para grupos incluye la jornada si está disponible.
 */
export function matchLabel(m: {
  phase: string;
  roundNumber?: number | null;
  group?: { name: string } | null;
}): string {
  switch (m.phase) {
    case 'groups':
      return m.group?.name
        ? `Grupo ${m.group.name}${m.roundNumber ? ` · Jornada ${m.roundNumber}` : ''}`
        : 'Fase de grupos';
    case 'round16':
      return 'Octavos de final';
    case 'quarters':
      return 'Cuartos de final';
    case 'semis':
      return 'Semifinal';
    case 'third':
      return 'Tercer puesto';
    case 'final':
      return 'Gran final';
    default:
      return '';
  }
}

/** Formato de serie legible: bo3 → "Al mejor de 3". */
export function seriesLabel(format: string): string {
  const n = format === 'bo7' ? 7 : format === 'bo5' ? 5 : 3;
  return `Al mejor de ${n}`;
}

/**
 * Formato legible según la fase: la fase de grupos es a partido único, las
 * eliminatorias son series al mejor de N.
 */
export function matchFormatLabel(m: { phase: string; format: string }): string {
  return m.phase === 'groups' ? 'Partido único' : seriesLabel(m.format);
}
