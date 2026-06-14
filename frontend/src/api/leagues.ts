import type {
  CreateLeagueRequest,
  League,
  LeagueBrowseItem,
  LeagueMember,
  LeagueSummary,
  LeagueSyncResult,
  PageResponse,
} from '../types/league';
import type { GameweekStandingsRow, StandingsRow } from '../types/standings';

const API_BASE = '/api/v1/leagues';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.clone().text().catch(() => '');
    console.error(
      `[leagues api] ${response.status} ${response.statusText} ${response.url} body=${text}`
    );
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function createLeague(data: CreateLeagueRequest): Promise<League> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse<League>(response);
}

export async function getMyLeagues(): Promise<LeagueSummary[]> {
  const response = await fetch(`${API_BASE}/me`, {
    credentials: 'include',
  });
  return handleResponse<LeagueSummary[]>(response);
}

export async function getLeague(id: string): Promise<League> {
  const response = await fetch(`${API_BASE}/${id}`, {
    credentials: 'include',
  });
  return handleResponse<League>(response);
}

export async function triggerLeagueSync(id: string): Promise<LeagueSyncResult> {
  const response = await fetch(`${API_BASE}/${id}/sync`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<LeagueSyncResult>(response);
}

export function buildJoinUrl(joinCode: string): string {
  return `${window.location.origin}/leagues/join/${joinCode}`;
}

export async function joinLeagueByCode(code: string): Promise<League> {
  const response = await fetch(`${API_BASE}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  return handleResponse<League>(response);
}

export async function joinPublicLeague(id: string): Promise<League> {
  const response = await fetch(`${API_BASE}/${id}/members`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<League>(response);
}

export async function browsePublicLeagues(params: {
  competitionId?: number;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<LeagueBrowseItem>> {
  const query = new URLSearchParams();
  if (params.competitionId !== undefined) {
    query.set('competitionId', String(params.competitionId));
  }
  if (params.search !== undefined && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.size !== undefined) {
    query.set('size', String(params.size));
  }
  const qs = query.toString();
  const url = qs ? `${API_BASE}/public?${qs}` : `${API_BASE}/public`;
  const response = await fetch(url, {
    credentials: 'include',
  });
  return handleResponse<PageResponse<LeagueBrowseItem>>(response);
}

export async function getLeagueMembers(id: string): Promise<LeagueMember[]> {
  const response = await fetch(`${API_BASE}/${id}/members`, {
    credentials: 'include',
  });
  return handleResponse<LeagueMember[]>(response);
}

export async function getStandings(
  leagueId: string,
  page: number = 0,
  size: number = 50
): Promise<PageResponse<StandingsRow>> {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await fetch(`${API_BASE}/${leagueId}/standings?${query.toString()}`, {
    credentials: 'include',
  });
  return handleResponse<PageResponse<StandingsRow>>(response);
}

export async function getGameweekStandings(
  leagueId: string,
  round: string
): Promise<GameweekStandingsRow[]> {
  const response = await fetch(
    `${API_BASE}/${leagueId}/standings/gameweeks/${encodeURIComponent(round)}`,
    {
      credentials: 'include',
    }
  );
  return handleResponse<GameweekStandingsRow[]>(response);
}

