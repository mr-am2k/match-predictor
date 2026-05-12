import type {
  AdminCompetition,
  AdminLeague,
  ApiCallLogEntry,
  BootstrapResult,
  SyncStatus,
} from '../types/admin';
import type { PageResponse } from '../types/league';

const API_BASE = '/api/v1/admin';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function listAdminCompetitions(): Promise<AdminCompetition[]> {
  const response = await fetch(`${API_BASE}/competitions`, {
    credentials: 'include',
  });
  return handleResponse<AdminCompetition[]>(response);
}

export async function patchCompetition(
  id: number,
  body: { active?: boolean }
): Promise<AdminCompetition> {
  const response = await fetch(`${API_BASE}/competitions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse<AdminCompetition>(response);
}

export async function listAdminLeagues(params: {
  search?: string;
  archived?: boolean;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminLeague>> {
  const query = new URLSearchParams();
  if (params.search !== undefined && params.search !== '') {
    query.set('search', params.search);
  }
  if (params.archived !== undefined) {
    query.set('archived', String(params.archived));
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.size !== undefined) {
    query.set('size', String(params.size));
  }
  const qs = query.toString();
  const url = qs ? `${API_BASE}/leagues?${qs}` : `${API_BASE}/leagues`;
  const response = await fetch(url, {
    credentials: 'include',
  });
  return handleResponse<PageResponse<AdminLeague>>(response);
}

export async function patchLeague(
  id: string,
  body: { archived?: boolean }
): Promise<AdminLeague> {
  const response = await fetch(`${API_BASE}/leagues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse<AdminLeague>(response);
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const response = await fetch(`${API_BASE}/sync/status`, {
    credentials: 'include',
  });
  return handleResponse<SyncStatus>(response);
}

export async function bootstrapCompetition(id: number): Promise<BootstrapResult> {
  const response = await fetch(`${API_BASE}/sync/competitions/${id}/bootstrap`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<BootstrapResult>(response);
}

export async function getApiCallLog(limit: number = 100): Promise<ApiCallLogEntry[]> {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  const response = await fetch(`${API_BASE}/budget/log?${query.toString()}`, {
    credentials: 'include',
  });
  return handleResponse<ApiCallLogEntry[]>(response);
}
