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
