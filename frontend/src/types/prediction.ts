export type GameweekStatus = 'OPEN' | 'LOCKED' | 'SETTLED';

export interface GameweekSummary {
  round: string;
  firstKickoffAt: string;
  locksAt: string | null;
  fixtureCount: number;
  userPredictionCount: number;
  status: GameweekStatus;
}

export interface TeamSummary {
  id: number;
  name: string;
  logoUrl: string | null;
}

export interface PlayerSummary {
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: string | null;
}

export interface PlayerPick {
  playerId: number;
  count: number;
}

export interface MyPrediction {
  winnerTeamId: number | null;
  predictedDraw: boolean;
  homeScore: number | null;
  awayScore: number | null;
  scorers: PlayerPick[];
  assisters: PlayerPick[];
}

export interface FixtureWithPrediction {
  id: number;
  kickoffAt: string;
  status: string;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  homeScore: number | null;
  awayScore: number | null;
  homeSquad: PlayerSummary[];
  awaySquad: PlayerSummary[];
  userPrediction: MyPrediction | null;
  lockedAt: string;
  locked: boolean;
}

export interface GameweekFixtures {
  round: string;
  locksAt: string | null;
  locked: boolean;
  fixtures: FixtureWithPrediction[];
}

export interface UpsertPredictionRequest {
  winnerTeamId: number | null;
  predictedDraw: boolean;
  homeScore: number | null;
  awayScore: number | null;
  scorers: PlayerPick[];
  assisters: PlayerPick[];
}
