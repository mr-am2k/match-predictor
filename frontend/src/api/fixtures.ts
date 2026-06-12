import type { GameweekFixtures, GameweekSummary } from '../types/prediction';
import { apiFetch } from './http';

const API_BASE = '/api/v1/leagues';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function listGameweeks(leagueId: string): Promise<GameweekSummary[]> {
  const response = await apiFetch(`${API_BASE}/${leagueId}/gameweeks`);
  return handleResponse<GameweekSummary[]>(response);
}

export async function getGameweekFixtures(
  leagueId: string,
  round: string
): Promise<GameweekFixtures> {
  const encodedRound = encodeURIComponent(round);
  const response = await apiFetch(
    `${API_BASE}/${leagueId}/gameweeks/${encodedRound}/fixtures`
  );
  return handleResponse<GameweekFixtures>(response);
}
