// Canal de sincronización del sorteo en vivo entre el Control Deck (admin)
// y el Escenario (ventana de stream / OBS). Misma PC → BroadcastChannel.

export interface PlayerLite {
  name: string;
  rank: string | null;
  isCaptain?: boolean;
  sub?: boolean;
}

export interface TeamLite {
  id: string;
  name: string;
  shieldUrl: string | null;
  players?: PlayerLite[];
}

// Los grupos ya no son fijos (A–D): dependen del nº de equipos (16 ⇒ A–D,
// 32 ⇒ A–H). El nombre del grupo es una letra cualquiera.
export type GroupName = string;

export type Board = Record<string, TeamLite[]>;
export const emptyBoard = (letters: readonly string[]): Board => {
  const b: Board = {};
  for (const l of letters) b[l] = [];
  return b;
};

export type Phase = 'idle' | 'intro' | 'parade' | 'draw' | 'complete';

export type DrawEvent =
  | { type: 'hello' } // el escenario saluda al montar
  | {
      type: 'sync'; // el deck responde con el estado completo
      phase: Phase;
      board: Board;
      parade: TeamLite[];
      total: number;
      revealed: number;
    }
  | { type: 'intro' }
  | { type: 'parade'; teams: TeamLite[] }
  | { type: 'reveal'; team: TeamLite; group: GroupName; index: number; total: number }
  | { type: 'complete' }
  | { type: 'reset' };

const CHANNEL = 'gravity-draw';

export function openDrawChannel(onMessage: (e: DrawEvent) => void) {
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = (ev) => onMessage(ev.data as DrawEvent);
  return {
    post: (e: DrawEvent) => ch.postMessage(e),
    close: () => ch.close(),
  };
}
