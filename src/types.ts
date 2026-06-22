export type Role = 'admin' | 'candidate' | 'public';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  coins: number;
  isActive?: boolean;
}

export interface TeamCount {
  approved: number;
  pending: number;
  capacity: number;
}

export interface Team {
  id: string;
  name: string;
  shieldUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  captainId?: string | null;
  groupId: string | null;
  contactMethod: 'discord' | 'email' | null;
  contactValue: string | null;
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

export type LinkedPlatform = 'steam' | 'epic';

export interface LinkedAccountInfo {
  platform: LinkedPlatform;
  platformId: string;
  displayName: string | null;
  verifiedAt: string;
}

export interface LinkStatus {
  accounts: LinkedAccountInfo[];
  expected: LinkedPlatform[];
  isPlayer: boolean;
  complete: boolean;
}

export interface TeamReadinessPlayer {
  memberId: string;
  playerNumber: number;
  username: string | null;
  expected: LinkedPlatform[];
  linked: LinkedPlatform[];
  missing: LinkedPlatform[];
  ready: boolean;
}

export interface TeamReadiness {
  teamId: string;
  players: TeamReadinessPlayer[];
  ready: boolean;
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
  phase: 'groups' | 'round16' | 'quarters' | 'semis' | 'third' | 'final';
  teamHomeId: string | null;
  teamAwayId: string | null;
  teamHome: Team | null;
  teamAway: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  scheduledAt: string | null;
  playedAt: string | null;
  status: 'scheduled' | 'live' | 'finished';
  format: 'single' | 'bo3' | 'bo5' | 'bo7';
  groupId: string | null;
  group?: Group | null;
  roundNumber?: number | null;
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

export interface PlayerExtraStats {
  boost: {
    bpm: number;
    avgAmount: number;
    amountCollected: number;
    amountStolen: number;
    timeZeroBoost: number;
    timeFullBoost: number;
  };
  movement: {
    avgSpeed: number;
    totalDistance: number;
    timeSupersonic: number;
    timeGround: number;
    timeLowAir: number;
    timeHighAir: number;
    percentGround: number;
    percentLowAir: number;
    percentHighAir: number;
  };
  positioning: {
    avgDistanceToBall: number;
    timeDefensiveThird: number;
    timeNeutralThird: number;
    timeOffensiveThird: number;
    timeBehindBall: number;
    timeInfrontBall: number;
    percentDefensiveThird: number;
    percentOffensiveThird: number;
    percentBehindBall: number;
    percentInfrontBall: number;
  };
}

export type ReplayStatus = 'processing' | 'imported' | 'needs_review' | 'failed';

export interface ReplayPlayer {
  name: string;
  platform: string;
  platformId: string;
  color: 'blue' | 'orange';
  userId: string | null;
  teamId: string | null;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  score: number;
  demos: number;
  mvp: boolean;
}

export interface ReplayRaw {
  blueGoals: number;
  orangeGoals: number;
  players: ReplayPlayer[];
  resolution?: {
    blueTeam: string | null;
    orangeTeam: string | null;
    unresolved: string[];
  };
}

export interface Replay {
  id: string;
  matchId: string | null;
  ballchasingId: string | null;
  status: ReplayStatus;
  homeScore: number | null;
  awayScore: number | null;
  reviewReason: string | null;
  originalName: string | null;
  rawStats: ReplayRaw | null;
  createdAt: string;
  processedAt: string | null;
  match?: Match | null;
  uploadedBy?: AuthUser | null;
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

export interface PresetTeam {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  placementLabel: string | null;
  logo: string | null;
  sortOrder: number;
  taken: boolean;
}

export interface TournamentSettings {
  id: string;
  registrationsOpen: boolean;
  tournamentStarted: boolean;
  tournamentName: string | null;
  predefinedTeamsMode: boolean;
  seasonLabel: string | null;
  platform: string | null;
  tagline: string | null;
  entryFree: boolean;
  minRank: string;
  maxRank: string;
  teamCapacity: number;
  playersPerSide: number;
  substitutes: number;
  registrationDeadline: string | null;
  formatRound16: string;
  formatQuarters: string;
  formatSemis: string;
  formatThird: string;
  formatFinal: string;
  phaseDates: Record<string, string> | null;
  prizeFirst: string | null;
  prizeSecond: string | null;
  prizeThird: string | null;
  prizeNote: string | null;
  updatedAt: string;
}

export interface Registration {
  id: string;
  teamName: string;
  shieldUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  [key: string]: unknown;
}

// ===== Reclutamiento =====

export type RecruitmentType = 'player_lft' | 'team_lfp';
export type RecruitmentPostStatus = 'open' | 'closed' | 'hidden';
export type PlayerPosition = 'striker' | 'goalie' | 'flex';
export type JoinDirection = 'player_to_team' | 'team_to_player';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface RecruitmentPost {
  id: string;
  type: RecruitmentType;
  authorId: string;
  author?: AuthUser;
  status: RecruitmentPostStatus;
  message: string | null;
  region: string | null;
  availability: string | null;
  // PLAYER_LFT
  epicUsername: string | null;
  steamUsername: string | null;
  rank: string | null;
  screenshotUrl: string | null;
  position: PlayerPosition | null;
  // TEAM_LFP
  teamId: string | null;
  team?: Team | null;
  teamName: string | null;
  lookingForRank: string | null;
  lookingForPosition: PlayerPosition | null;
  slotsNeeded: number;
  createdAt: string;
  updatedAt: string;
}

export interface JoinRequest {
  id: string;
  direction: JoinDirection;
  status: RequestStatus;
  teamId: string;
  team?: Team;
  applicantId: string;
  applicant?: AuthUser;
  epicUsername: string | null;
  steamUsername: string | null;
  rank: string | null;
  screenshotUrl: string | null;
  sourcePostId: string | null;
  message: string | null;
  createdAt: string;
}

export interface TeamLeaveRequest {
  id: string;
  memberId: string;
  teamId: string;
  userId: string;
  user?: AuthUser;
  status: RequestStatus;
  reason: string | null;
  createdAt: string;
}

/** Prefill que el tablón pasa al formulario de inscripción vía router state. */
export interface RegisterPrefillPlayer {
  epic: string;
  steam: string;
  rank: string;
  screenshot: string;
}

export interface PlayerProfile {
  userId: string;
  epicUsername: string | null;
  steamUsername: string | null;
  rank: string | null;
  screenshotUrl: string | null;
  position: PlayerPosition | null;
  region: string | null;
  availability: string | null;
  complete?: boolean;
}

export type TeamDraftStatus = 'pending' | 'completed' | 'cancelled';

export interface TeamDraftInvite {
  id: string;
  draftId: string;
  userId: string;
  user?: AuthUser;
  status: RequestStatus;
  acceptedAt: string | null;
  createdAt: string;
  draft?: TeamDraft;
}

export interface TeamDraft {
  id: string;
  captainId: string;
  captain?: AuthUser;
  teamName: string;
  shieldUrl: string | null;
  requiredStarters: number;
  maxRoster: number;
  status: TeamDraftStatus;
  teamId: string | null;
  registrationId: string | null;
  invites?: TeamDraftInvite[];
  createdAt: string;
  completedAt: string | null;
}

export type NotificationType =
  | 'team_invite'
  | 'draft_invite'
  | 'application'
  | 'request_accepted'
  | 'request_rejected'
  | 'team_created'
  | 'leave_request'
  | 'member_left';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}
