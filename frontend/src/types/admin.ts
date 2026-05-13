export interface AdminCompetition {
  id: number;
  name: string;
  type: string | null;
  logoUrl: string | null;
  countryName: string | null;
  seasonYear: number;
  active: boolean;
  lastSyncedAt: string | null;
  leagueCount: number;
  activeLeagueCount: number;
  fixtureCount: number;
}

export interface AdminLeague {
  id: string;
  name: string;
  visibility: string;
  competitionName: string;
  seasonYear: number;
  ownerUsername: string;
  memberCount: number;
  archived: boolean;
  createdAt: string;
}

export interface ApiCallLogEntry {
  id: string;
  calledAt: string;
  endpoint: string;
  competitionId: number | null;
  statusCode: number | null;
  note: string | null;
}

export interface SyncStatusActiveCompetition {
  competitionId: number;
  name: string;
  seasonYear: number;
  lastSyncedAt: string | null;
  leagueCount: number;
  teamCount: number;
  fixtureCount: number;
  activeSquadLinkCount: number;
}

export interface SyncStatus {
  apiCallsUsedLast24h: number;
  dailyLimit: number;
  activeCompetitions: SyncStatusActiveCompetition[];
}

export interface BootstrapResult {
  competitionId: number;
  name: string;
  seasonYear: number;
  teamCount: number;
  fixtureCount: number;
  activeSquadLinkCount: number;
  apiCallsUsedLast24h: number;
  dailyLimit: number;
  durationMs: number;
}
