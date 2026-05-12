import type {
  LeagueScoringRules,
  LeagueScoringRulesResponse,
} from '../types/scoring';
import { SCORING_LOCKED_MESSAGE } from '../types/scoring';

const API_BASE = '/api/v1/leagues';

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 423) {
    throw new Error(SCORING_LOCKED_MESSAGE);
  }
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.detail || error.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

function normalizeResponse(raw: LeagueScoringRulesResponse): LeagueScoringRulesResponse {
  // The backend returns multipliers as JSON numbers or strings (BigDecimal).
  // Normalize everything to `number` so downstream code doesn't need to care.
  return {
    matchWinnerPoints: Number(raw.matchWinnerPoints),
    matchExactScorePoints: Number(raw.matchExactScorePoints),
    matchScorerPoints: Number(raw.matchScorerPoints),
    matchAssisterPoints: Number(raw.matchAssisterPoints),
    leagueWinnerPoints: Number(raw.leagueWinnerPoints),
    leagueTopScorerPoints: Number(raw.leagueTopScorerPoints),
    leagueTopAssisterPoints: Number(raw.leagueTopAssisterPoints),
    matchBonus2x: Number(raw.matchBonus2x),
    matchBonus3x: Number(raw.matchBonus3x),
    matchBonus4x: Number(raw.matchBonus4x),
    leagueBonus2of3: Number(raw.leagueBonus2of3),
    leagueBonus3of3: Number(raw.leagueBonus3of3),
    editable: Boolean(raw.editable),
  };
}

export async function getScoringRules(
  leagueId: string
): Promise<LeagueScoringRulesResponse> {
  const response = await fetch(`${API_BASE}/${leagueId}/scoring-rules`, {
    credentials: 'include',
  });
  const data = await handleResponse<LeagueScoringRulesResponse>(response);
  return normalizeResponse(data);
}

export async function updateScoringRules(
  leagueId: string,
  body: LeagueScoringRules
): Promise<LeagueScoringRulesResponse> {
  const response = await fetch(`${API_BASE}/${leagueId}/scoring-rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await handleResponse<LeagueScoringRulesResponse>(response);
  return normalizeResponse(data);
}
