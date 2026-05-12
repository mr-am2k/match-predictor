export interface OverallPrediction {
  id: string | null;
  winnerTeamId: number | null;
  topScorerPlayerId: number | null;
  topAssisterPlayerId: number | null;
  locksAt: string | null;
  locked: boolean;
}

export interface UpsertOverallPrediction {
  winnerTeamId: number | null;
  topScorerPlayerId: number | null;
  topAssisterPlayerId: number | null;
}
