export interface StandingsRow {
  userId: string;
  username: string;
  totalPoints: number;
  gameweeksPlayed: number;
  rank: number;
}

export interface GameweekStandingsRow {
  userId: string;
  username: string;
  gameweekPoints: number;
  predictionsCount: number;
  rank: number;
}
