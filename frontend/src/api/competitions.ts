import type { Competition } from '../types/competition';

const API_BASE = '/api/v1/competitions';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function listCompetitions(): Promise<Competition[]> {
  const response = await fetch(API_BASE, {
    credentials: 'include',
  });
  return handleResponse<Competition[]>(response);
}
