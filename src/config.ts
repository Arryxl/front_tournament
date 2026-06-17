// ============================================================
// GRAVITY — Configuración editable del torneo y la marca.
// Cambia aquí los datos y se reflejan en toda la promo.
// ============================================================

export const TOURNAMENT = {
  season: 'S01',
  format: '3V3 · ELIMINACIÓN',
  platform: 'CROSS-PLAY',
  teams: 16,
  matches: 32,
  groups: 4,
  rankRange: 'Platino 3 — Champion 3',
  tagline: 'Todo lo que sube, vuelve a caer. Nosotros decidimos dónde.',

  // Inscripciones ABIERTAS — el countdown apunta al cierre.
  registrationOpen: true,
  registrationClose: '2026-07-20T23:59:00',
  free: true,

  // Premio: bolsa en efectivo. Cambia `amount` por el monto oficial.
  prize: {
    type: 'cash' as const,
    amount: 'POR ANUNCIAR', // ej: '$ 300 USD'
    label: 'Premio en efectivo',
  },
};

export const SCHEDULE = [
  { date: '20 JUN', label: 'Apertura de inscripciones', tag: 'INSCRIPCIÓN' },
  { date: '20 JUL', label: 'Cierre de inscripciones', tag: 'INSCRIPCIÓN' },
  { date: '22 JUL', label: 'Sorteo de grupos', tag: 'SORTEO' },
  { date: '25 JUL', label: 'Arranca la fase de grupos', tag: 'GRUPOS' },
  { date: '05 AGO', label: 'Cuartos de final', tag: 'PLAYOFFS' },
  { date: '12 AGO', label: 'Semifinales · BO5', tag: 'PLAYOFFS' },
  { date: '23 AGO', label: 'Gran final · BO7', tag: 'FINAL' },
];

export const SOCIALS = {
  tiktok: 'https://www.tiktok.com/@gravity_leaguerl',
  instagram: 'https://www.instagram.com/gravityleague.1',
  discord: 'https://discord.gg/4AB4tm4zmW',
  twitch: 'https://www.twitch.tv/arryxl',
};

// Canal de Twitch por defecto para el overlay de predicciones (votación por chat).
// Se puede sobreescribir por overlay con ?channel=otro_canal en la URL.
export const TWITCH_CHANNEL = 'arryxl';
