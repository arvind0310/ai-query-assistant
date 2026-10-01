import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import HttpError from '../utils/HttpError.js';
import ErrorCodes from '../utils/errorCodes.js';

const SYSTEM_PROMPT =
  'You are a helpful assistant. Answer clearly and concisely, using Markdown when it helps. ' +
  'If you are not sure about something, say so instead of guessing.';

let client;

function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: config.timeoutMs,
      maxRetries: config.maxRetries, // SDK retries 429s, 5xx and network errors
    });
  }
  return client;
}

export async function askClaude(query, signal, anthropic = getClient()) {
  let response;
  try {
    response = await anthropic.beta.messages.create(
      {
        model: config.model,
        max_tokens: config.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: query }],
        output_config: { effort: config.effort },
        // If the model refuses, let Anthropic retry on a fallback model
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal },
    );
  } catch (err) {
    throw convertError(err);
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, ErrorCodes.LLM_REFUSED, 'The assistant declined to answer this question');
  }

  const answer = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!answer) {
    throw new HttpError(502, ErrorCodes.LLM_EMPTY_RESPONSE, 'The assistant returned an empty answer');
  }

  return {
    answer,
    model: response.model,
    truncated: response.stop_reason === 'max_tokens',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// Turn SDK errors into messages we're happy to show users.
// Anthropic error codes: https://platform.claude.com/docs/en/api/errors
// SDK error classes:     https://github.com/anthropics/anthropic-sdk-typescript#handling-errors
// Timeout has to be checked before APIConnectionError since it extends it.
function convertError(err) {
  if (err instanceof Anthropic.APIUserAbortError) {
    return new HttpError(499, ErrorCodes.REQUEST_CANCELLED, 'Request was cancelled');
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new HttpError(504, ErrorCodes.LLM_TIMEOUT, 'The assistant took too long to respond, please try again');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new HttpError(502, ErrorCodes.LLM_UNREACHABLE, 'Could not reach the assistant service');
  }
  if (!(err instanceof Anthropic.APIError)) {
    return err;
  }

  console.error('Anthropic API error:', err.status, err.message);

  if (err.status === 429) {
    return new HttpError(503, ErrorCodes.LLM_RATE_LIMITED, 'The assistant is busy right now, please try again shortly');
  }
  if (err.status === 401 || err.status === 402 || err.status === 403) {
    // Bad API key or billing problem - our side, not the user's fault
    return new HttpError(502, ErrorCodes.LLM_MISCONFIGURED, 'The assistant service is not configured correctly');
  }
  if (err.status === 400) {
    return new HttpError(400, ErrorCodes.LLM_BAD_REQUEST, 'The assistant could not process this question');
  }
  return new HttpError(502, ErrorCodes.LLM_UNAVAILABLE, 'The assistant service is unavailable right now');
}
