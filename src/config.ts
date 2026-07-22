// ============================================================
// GRAVITY — Configuración editable del torneo y la marca.
// Cambia aquí los datos y se reflejan en toda la promo.
// ============================================================

// Nota: el formato (3v3…), nº de equipos, grupos y total de partidos ya NO se
// fijan aquí — se derivan de /settings vía `useSettings()`. Aquí solo queda la
// info de marca/promo que no cambia con la configuración del torneo.
export const TOURNAMENT = {
  season: 'S01',
  platform: 'CROSS-PLAY',
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

// Nota: las fechas de las fases (línea de tiempo) y los premios por puesto ya NO
// se fijan aquí — se editan desde el admin (Configuración) y se guardan en
// /settings (`phaseDates`, `prizeFirst/second/third`, `prizeNote`).

// ------------------------------------------------------------
// EDITORA / PUBLISHER — requerido por Epic Games para aprobar la
// vinculación de cuentas (Epic Account Services). El dominio público
// debe mostrar el nombre de la organización/editora, el nombre del
// producto y un resumen. `name` DEBE coincidir con el "organization
// name" registrado en tu cuenta de Epic Developer.
// ------------------------------------------------------------
export const PUBLISHER = {
  // Nombre de la editora (persona/organización responsable del producto).
  name: 'Juan Reyes',
  // Correo de contacto público.
  email: 'solucionalo.co@gmail.com',
  // Nombre y resumen del producto (lo que ve el revisor de Epic).
  product: 'Gravity',
  overview:
    'Gravity es una liga de torneos de Rocket League 3v3: 16 equipos compiten ' +
    'por temporada en fase de grupos y eliminatorias, con inscripción gratuita ' +
    'y premio en efectivo. Plataforma cross-play.',
};

export const SOCIALS = {
  tiktok: 'https://www.tiktok.com/@gravity_leaguerl',
  instagram: 'https://www.instagram.com/gravityleague.1',
  discord: 'https://discord.gg/4AB4tm4zmW',
  twitch: 'https://www.twitch.tv/arryxl',
};

// Canal de Twitch por defecto para el overlay de predicciones (votación por chat).
// Se puede sobreescribir por overlay con ?channel=otro_canal en la URL.
export const TWITCH_CHANNEL = 'arryxl';
