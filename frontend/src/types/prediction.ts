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

export interface ScoreLine {
  playerId: number;
  name: string;
  predicted: number;
  actual: number;
  correct: boolean;
  points: number;
}

export interface ScoreBreakdown {
  winnerPoints: number;
  scorePoints: number;
  scorers: ScoreLine[];
  assisters: ScoreLine[];
  categoriesHit: number;
  baseTotal: number;
  multiplier: number;
  total: number;
}

export interface MyPrediction {
  winnerTeamId: number | null;
  predictedDraw: boolean;
  homeScore: number | null;
  awayScore: number | null;
  scorers: PlayerPick[];
  assisters: PlayerPick[];
  points: number | null;
  breakdown: ScoreBreakdown | null;
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
  assistersEnabled: boolean;
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

export interface PlayerPickView {
  playerId: number;
  name: string;
  count: number;
}

export interface OtherPrediction {
  userId: string;
  username: string;
  isCurrentUser: boolean;
  winnerTeamId: number | null;
  predictedDraw: boolean;
  homeScore: number | null;
  awayScore: number | null;
  scorers: PlayerPickView[];
  assisters: PlayerPickView[];
  points: number | null;
  breakdown: ScoreBreakdown | null;
}

export interface FixturePredictions {
  fixtureId: number;
  locked: boolean;
  lockedAt: string | null;
  memberCount: number;
  predictionCount: number;
  predictions: OtherPrediction[];
}
