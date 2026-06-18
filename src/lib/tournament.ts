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
