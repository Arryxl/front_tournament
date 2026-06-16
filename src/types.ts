export type Role = 'admin' | 'candidate' | 'public';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  coins: number;
}

export interface Team {
  id: string;
  name: string;
  shieldUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  groupId: string | null;
  members?: TeamMember[];
  group?: Group | null;
}

export interface TeamMember {
  id: string;
  epicUsername: string | null;
  steamUsername: string | null;
  rank: string | null;
  isCaptain: boolean;
  playerNumber: number;
  user?: AuthUser | null;
}

export interface Group {
  id: string;
  name: string;
  teams?: Team[];
}

export interface Standing {
  id: string;
  groupId: string;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  position: number | null;
  team?: Team;
  group?: Group;
}

export interface Match {
  id: string;
  matchCode: string;
  phase: 'groups' | 'quarters' | 'semis' | 'third' | 'final';
  teamHomeId: string | null;
  teamAwayId: string | null;
  teamHome: Team | null;
  teamAway: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  scheduledAt: string | null;
  status: 'scheduled' | 'live' | 'finished';
  format: 'bo3' | 'bo5' | 'bo7';
  groupId: string | null;
  predictionsOpen: boolean;
}

export interface TopStat {
  userId: string;
  username: string;
  teamId: string | null;
  teamName: string | null;
  total: string;
  matchesPlayed: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  costCoins: number;
  stock: number | null;
  isActive: boolean;
}

export interface Registration {
  id: string;
  teamName: string;
  shieldUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  [key: string]: unknown;
}
