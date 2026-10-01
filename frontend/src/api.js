// All calls to the backend live here.
// In dev, Vite forwards /api to the backend (see vite.config.js).
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Backend can take up to ~2 min in the worst case (timeout + 1 retry),
// so give up a bit after that instead of spinning forever.
const TIMEOUT_MS = 150000;

async function callApi(path, { body, token, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const allSignals = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: allSignals,
    });
  } catch {
    if (signal?.aborted) throw apiError('CANCELLED', 'Cancelled');
    if (timeout.aborted) throw apiError('CLIENT_TIMEOUT', 'The request timed out, please try again');
    throw apiError('NETWORK_ERROR', 'Could not reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Backend always sends { error: { code, message } }
    throw apiError(data?.error?.code || 'HTTP_ERROR', data?.error?.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}

function apiError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

export function getDemoToken() {
  return callApi('/api/auth/demo-token');
}

export function askQuestion(query, token, signal) {
  return callApi('/api/query', { body: { query }, token, signal });
}
