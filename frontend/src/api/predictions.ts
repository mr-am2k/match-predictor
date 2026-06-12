import type {
  FixturePredictions,
  MyPrediction,
  UpsertPredictionRequest,
} from '../types/prediction';
import { apiFetch } from './http';

const API_BASE = '/api/v1/leagues';

export const FIXTURE_LOCKED_MESSAGE =
  'This match is now locked. Refresh to see the latest.';

export const SESSION_EXPIRED_MESSAGE =
  'Your session expired. Please sign in again.';

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 423) {
    throw new Error(FIXTURE_LOCKED_MESSAGE);
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function upsertPrediction(
  leagueId: string,
  fixtureId: number,
  body: UpsertPredictionRequest
): Promise<MyPrediction> {
  const response = await apiFetch(
    `${API_BASE}/${leagueId}/fixtures/${fixtureId}/prediction`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return handleResponse<MyPrediction>(response);
}

export async function getFixturePredictions(
  leagueId: string,
  fixtureId: number
): Promise<FixturePredictions> {
  const response = await apiFetch(
    `${API_BASE}/${leagueId}/fixtures/${fixtureId}/predictions`
  );
  return handleResponse<FixturePredictions>(response);
}
