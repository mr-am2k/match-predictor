import type { PlayerSummary, TeamSummary } from '../types/prediction';
import type {
  OverallPrediction,
  UpsertOverallPrediction,
} from '../types/overall';

const API_BASE = '/api/v1/leagues';

export const OVERALL_LOCKED_MESSAGE =
  'Season has started — overall prediction locked.';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function getOverallPrediction(
  leagueId: string
): Promise<OverallPrediction> {
  const response = await fetch(`${API_BASE}/${leagueId}/overall-prediction`, {
    credentials: 'include',
  });
  return handleResponse<OverallPrediction>(response);
}

export async function upsertOverallPrediction(
  leagueId: string,
  body: UpsertOverallPrediction
): Promise<OverallPrediction> {
  const response = await fetch(`${API_BASE}/${leagueId}/overall-prediction`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (response.status === 423) {
    throw new Error(OVERALL_LOCKED_MESSAGE);
  }
  return handleResponse<OverallPrediction>(response);
}

export async function listTeams(leagueId: string): Promise<TeamSummary[]> {
  const response = await fetch(`${API_BASE}/${leagueId}/teams`, {
    credentials: 'include',
  });
  return handleResponse<TeamSummary[]>(response);
}

export async function listPlayers(leagueId: string): Promise<PlayerSummary[]> {
  const response = await fetch(`${API_BASE}/${leagueId}/players`, {
    credentials: 'include',
  });
  return handleResponse<PlayerSummary[]>(response);
}
