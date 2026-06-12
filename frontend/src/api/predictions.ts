import type {
  FixturePredictions,
  MyPrediction,
  UpsertPredictionRequest,
} from '../types/prediction';

const API_BASE = '/api/v1/leagues';

export const FIXTURE_LOCKED_MESSAGE =
  'This match is now locked. Refresh to see the latest.';

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 423) {
    throw new Error(FIXTURE_LOCKED_MESSAGE);
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
  const response = await fetch(
    `${API_BASE}/${leagueId}/fixtures/${fixtureId}/prediction`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }
  );
  return handleResponse<MyPrediction>(response);
}

export async function getFixturePredictions(
  leagueId: string,
  fixtureId: number
): Promise<FixturePredictions> {
  const response = await fetch(
    `${API_BASE}/${leagueId}/fixtures/${fixtureId}/predictions`,
    {
      credentials: 'include',
    }
  );
  return handleResponse<FixturePredictions>(response);
}
