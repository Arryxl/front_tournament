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

/** Una fase de la línea de tiempo del torneo (clave + etiquetas para la UI). */
export interface PhaseDef {
  key: string;
  label: string;
  tag: string;
}

/**
 * Fases de la línea de tiempo en orden, adaptadas a la estructura: clasifican 2
 * por grupo, así que las eliminatorias de entrada (dieciseisavos / octavos) solo
 * aparecen si clasifican suficientes equipos. Esta lista define qué campos de
 * fecha se editan en el admin y qué hitos se muestran en la landing.
 */
export function timelinePhases(teamCount: number): PhaseDef[] {
  const qualified = groupCountFor(teamCount) * 2;
  const phases: PhaseDef[] = [
    { key: 'registrationOpen', label: 'Apertura de inscripciones', tag: 'INSCRIPCIÓN' },
    { key: 'registrationClose', label: 'Cierre de inscripciones', tag: 'INSCRIPCIÓN' },
    { key: 'groupDraw', label: 'Sorteo de grupos', tag: 'SORTEO' },
    { key: 'groupStage', label: 'Arranca la fase de grupos', tag: 'GRUPOS' },
  ];
  if (qualified >= 32) phases.push({ key: 'round32', label: 'Dieciseisavos de final', tag: 'PLAYOFFS' });
  if (qualified >= 16) phases.push({ key: 'round16', label: 'Octavos de final', tag: 'PLAYOFFS' });
  phases.push({ key: 'quarters', label: 'Cuartos de final', tag: 'PLAYOFFS' });
  phases.push({ key: 'semis', label: 'Semifinales', tag: 'PLAYOFFS' });
  phases.push({ key: 'third', label: 'Tercer puesto', tag: 'FINAL' });
  phases.push({ key: 'final', label: 'Gran final', tag: 'FINAL' });
  return phases;
}

/** Fecha de fase (`YYYY-MM-DD`) → "20 JUL". Devuelve null si no es válida. */
export function formatPhaseDate(d?: string | null): string | null {
  if (!d) return null;
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt
    .toLocaleDateString('es', { day: '2-digit', month: 'short' })
    .replace('.', '')
    .toUpperCase();
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
