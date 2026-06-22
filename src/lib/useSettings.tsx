import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import {
  expectedMatchCount,
  formatLabel,
  groupCountFor,
  groupLettersFor,
  hasRound16,
} from './tournament';
import { ranksBetween, rankRangeLabel } from './ranks';
import type { TournamentSettings } from '../types';

export interface DerivedSettings {
  /** Datos crudos de /settings (o null mientras carga / si falla). */
  raw: TournamentSettings | null;
  loading: boolean;
  // --- valores derivados (con defaults razonables) ---
  registrationsOpen: boolean;
  tournamentStarted: boolean;
  teamCount: number;
  playersPerSide: number;
  substitutes: number;
  playersPerTeam: number;
  formatLabel: string; // "3v3"
  groups: number;
  groupLetters: string[];
  hasRound16: boolean;
  matchesTotal: number;
  registrationDeadline: string | null;
  /** Nombre del torneo/temporada (cae a "Gravity" si no está configurado). */
  tournamentName: string;
  /** Modo de equipos predefinidos (selector de catálogo + apartado landing). */
  predefinedTeamsMode: boolean;
  /** Etiqueta de temporada (cae a "Temporada 01"). */
  seasonLabel: string;
  /** Plataforma para la promo (cae a "Cross-play"). */
  platform: string;
  /** Lema/tagline de la landing. */
  tagline: string;
  /** Entrada gratis (true) o de pago. */
  entryFree: boolean;
  /** Rango mínimo/máximo elegible (claves) + derivados para UI. */
  minRank: string;
  maxRank: string;
  /** Texto "Mín — Máx" del rango permitido. */
  rankRangeLabel: string;
  /** Lista [clave, etiqueta] de rangos elegibles entre min y max. */
  allowedRanks: [string, string][];
  reload: () => void;
}

const DEFAULTS = {
  registrationsOpen: true,
  tournamentStarted: false,
  teamCount: 16,
  playersPerSide: 3,
  substitutes: 2,
};

function derive(
  raw: TournamentSettings | null,
  loading: boolean,
  reload: () => void,
): DerivedSettings {
  const teamCount = raw?.teamCapacity ?? DEFAULTS.teamCount;
  const playersPerSide = raw?.playersPerSide ?? DEFAULTS.playersPerSide;
  const substitutes = raw?.substitutes ?? DEFAULTS.substitutes;
  return {
    raw,
    loading,
    registrationsOpen: raw?.registrationsOpen ?? DEFAULTS.registrationsOpen,
    tournamentStarted: raw?.tournamentStarted ?? DEFAULTS.tournamentStarted,
    teamCount,
    playersPerSide,
    substitutes,
    playersPerTeam: playersPerSide + substitutes,
    formatLabel: formatLabel(playersPerSide),
    groups: groupCountFor(teamCount),
    groupLetters: groupLettersFor(teamCount),
    hasRound16: hasRound16(teamCount),
    matchesTotal: expectedMatchCount(teamCount),
    registrationDeadline: raw?.registrationDeadline ?? null,
    tournamentName: raw?.tournamentName?.trim() || 'Gravity',
    predefinedTeamsMode: raw?.predefinedTeamsMode ?? false,
    seasonLabel: raw?.seasonLabel?.trim() || 'Temporada 01',
    platform: raw?.platform?.trim() || 'Cross-play',
    tagline:
      raw?.tagline?.trim() ||
      'Todo lo que sube, vuelve a caer. Nosotros decidimos dónde.',
    entryFree: raw?.entryFree ?? true,
    minRank: raw?.minRank || 'plat3',
    maxRank: raw?.maxRank || 'gc1',
    rankRangeLabel: rankRangeLabel(raw?.minRank, raw?.maxRank),
    allowedRanks: ranksBetween(raw?.minRank, raw?.maxRank),
    reload,
  };
}

const SettingsContext = createContext<DerivedSettings | null>(null);

/**
 * Provider único de la configuración del torneo. Hace UN solo fetch a
 * /settings y lo comparte con todos los componentes; `reload()` lo refresca
 * en toda la app a la vez (p. ej. tras guardar en la página de Configuración).
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<TournamentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/settings')
      .then((r) => setRaw(r.data))
      .catch(() => setRaw(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = derive(raw, loading, load);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Lee la configuración derivada del torneo desde el contexto compartido. */
export function useSettings(): DerivedSettings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
