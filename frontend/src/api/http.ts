/**
 * Shared fetch wrapper that transparently recovers from access-token expiry.
 *
 * The access-token JWT is short-lived (~15 min). When it expires mid-session the
 * backend returns 401/403 (it uses the default Http403ForbiddenEntryPoint, so an
 * unauthenticated request is a 403, not a 401). On that signal we hit
 * /api/v1/auth/refresh once — which mints a fresh access-token cookie from the
 * 7-day refresh cookie — and replay the original request. Concurrent calls share
 * a single in-flight refresh so we never stampede the refresh endpoint.
 */

const REFRESH_URL = '/api/v1/auth/refresh';

let refreshInFlight: Promise<boolean> | null = null;

function isAuthPath(url: string): boolean {
  return url.includes('/api/v1/auth/');
}

async function attemptRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(REFRESH_URL, {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Like `fetch`, but always sends credentials and retries once after refreshing
 * the session if the first response is an auth failure (401/403).
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const options: RequestInit = { credentials: 'include', ...init };

  const response = await fetch(url, options);

  if (
    (response.status === 401 || response.status === 403) &&
    !isAuthPath(url)
  ) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return fetch(url, options);
    }
  }

  return response;
}
