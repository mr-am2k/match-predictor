import type {
  AdminFixtureDetail,
  AdminFixtureSummary,
  EditFixtureResultRequest,
  EditFixtureResultResponse,
} from '../types/adminFixtures';
import { apiFetch } from './http';

const API_BASE = '/api/v1/admin/fixtures';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function listFixtureRounds(competitionId: number): Promise<string[]> {
  const response = await apiFetch(`${API_BASE}/rounds?competitionId=${competitionId}`);
  return handleResponse<string[]>(response);
}

export async function listAdminFixtures(
  competitionId: number,
  round?: string
): Promise<AdminFixtureSummary[]> {
  const query = new URLSearchParams();
  query.set('competitionId', String(competitionId));
  if (round !== undefined && round !== '') {
    query.set('round', round);
  }
  const response = await apiFetch(`${API_BASE}?${query.toString()}`);
  return handleResponse<AdminFixtureSummary[]>(response);
}

export async function getAdminFixture(id: number): Promise<AdminFixtureDetail> {
  const response = await apiFetch(`${API_BASE}/${id}`);
  return handleResponse<AdminFixtureDetail>(response);
}

export async function editFixtureResult(
  id: number,
  body: EditFixtureResultRequest
): Promise<EditFixtureResultResponse> {
  const response = await apiFetch(`${API_BASE}/${id}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<EditFixtureResultResponse>(response);
}
