// Error codes sent to the frontend in { error: { code, message } }.
// The UI uses these to decide what tip to show, so don't rename them casually.

const ErrorCodes = Object.freeze({
  // request / input
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_JSON: 'INVALID_JSON',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',

  // auth
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // LLM (Anthropic) side
  // Anthropic's own error list: https://platform.claude.com/docs/en/api/errors
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  LLM_UNREACHABLE: 'LLM_UNREACHABLE',
  LLM_RATE_LIMITED: 'LLM_RATE_LIMITED',
  LLM_MISCONFIGURED: 'LLM_MISCONFIGURED',
  LLM_BAD_REQUEST: 'LLM_BAD_REQUEST',
  LLM_UNAVAILABLE: 'LLM_UNAVAILABLE',
  LLM_REFUSED: 'LLM_REFUSED',
  LLM_EMPTY_RESPONSE: 'LLM_EMPTY_RESPONSE',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',

  // fallback
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

export default ErrorCodes;
