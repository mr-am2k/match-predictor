import type { LeagueScoringRules } from './scoring';

export type LeagueVisibility = 'PUBLIC' | 'PRIVATE';
export type MembershipRole = 'OWNER' | 'MEMBER';

export interface CompetitionSummary {
  id: number;
  name: string;
  logoUrl: string | null;
  countryName: string | null;
  countryFlagUrl: string | null;
  seasonYear: number;
}

export interface OwnerSummary {
  id: string;
  username: string;
}

export interface League {
  id: string;
  name: string;
  visibility: LeagueVisibility;
  joinCode: string | null;
  competition: CompetitionSummary;
  owner: OwnerSummary;
  memberCount: number;
  createdAt: string;
}

export interface LeagueSummary {
  id: string;
  name: string;
  visibility: LeagueVisibility;
  competition: CompetitionSummary;
  role: MembershipRole;
  memberCount: number;
}

export interface CreateLeagueRequest {
  name: string;
  visibility: LeagueVisibility;
  competitionId: number;
  scoringRules?: LeagueScoringRules;
}

export interface LeagueBrowseItem {
  id: string;
  name: string;
  competition: CompetitionSummary;
  owner: OwnerSummary;
  seasonYear: number;
  memberCount: number;
  createdAt: string;
  joined: boolean;
}

export interface LeagueMember {
  userId: string;
  username: string;
  role: MembershipRole;
  joinedAt: string;
}

export interface LeagueSyncResult {
  triggered: boolean;
  message: string;
  usedLast24h: number;
  dailyLimit: number;
}

export interface PageResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
