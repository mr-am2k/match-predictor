import type { PlayerSummary, TeamSummary } from './prediction';

export interface AdminFixtureSummary {
  id: number;
  round: string;
  kickoffAt: string;
  status: string | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  homeScore: number | null;
  awayScore: number | null;
  manuallyOverridden: boolean;
}

export interface AdminEventLine {
  playerId: number;
  playerName: string | null;
  teamId: number;
  count: number;
  ownGoal: boolean;
}

export interface AdminFixtureDetail {
  id: number;
  competitionId: number;
  seasonYear: number;
  round: string;
  kickoffAt: string;
  status: string | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  homeScore: number | null;
  awayScore: number | null;
  manuallyOverridden: boolean;
  homeRoster: PlayerSummary[];
  awayRoster: PlayerSummary[];
  scorers: AdminEventLine[];
  assisters: AdminEventLine[];
}

export interface ScorerInput {
  playerId: number;
  teamId: number;
  goals: number;
  ownGoal: boolean;
}

export interface AssisterInput {
  playerId: number;
  teamId: number;
  assists: number;
}

export interface EditFixtureResultRequest {
  homeScore: number;
  awayScore: number;
  status?: string;
  scorers: ScorerInput[];
  assisters: AssisterInput[];
}

export interface EditFixtureResultResponse {
  fixtureId: number;
  predictionsRescored: number;
  overallRescored: boolean;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}
