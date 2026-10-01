import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-123';

const { askClaude } = await import('../src/services/llmService.js');

// Minimal stand-in for the Anthropic client
function fakeClient(createFn) {
  return { beta: { messages: { create: createFn } } };
}

function fakeResponse(extra = {}) {
  return {
    model: 'claude-opus-5-5',
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world' },
    ],
    usage: { input_tokens: 10, output_tokens: 5 },
    ...extra,
  };
}

test('sends the question and returns the text answer', async () => {
  let sentParams;
  const client = fakeClient(async (params) => {
    sentParams = params;
    return fakeResponse();
  });

  const result = await askClaude('Hi?', undefined, client);

  assert.equal(result.answer, 'Hello world');
  assert.equal(result.truncated, false);
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 5 });
  assert.deepEqual(sentParams.messages, [{ role: 'user', content: 'Hi?' }]);
});

test('marks cut-off answers as truncated', async () => {
  const client = fakeClient(async () => fakeResponse({ stop_reason: 'max_tokens' }));
  const result = await askClaude('q', undefined, client);
  assert.equal(result.truncated, true);
});

test('handles a refusal', async () => {
  const client = fakeClient(async () => fakeResponse({ stop_reason: 'refusal', content: [] }));
  await assert.rejects(askClaude('q', undefined, client), { status: 422, code: 'LLM_REFUSED' });
});

test('handles an empty answer', async () => {
  const client = fakeClient(async () => fakeResponse({ content: [] }));
  await assert.rejects(askClaude('q', undefined, client), { status: 502, code: 'LLM_EMPTY_RESPONSE' });
});

test('maps SDK errors to friendly errors', async () => {
  const apiError = (status) => Anthropic.APIError.generate(status, { error: {} }, 'error', new Headers());

  const cases = [
    [new Anthropic.APIConnectionTimeoutError(), 504, 'LLM_TIMEOUT'],
    [new Anthropic.APIConnectionError({ message: 'ECONNRESET' }), 502, 'LLM_UNREACHABLE'],
    [new Anthropic.APIUserAbortError(), 499, 'REQUEST_CANCELLED'],
    [apiError(429), 503, 'LLM_RATE_LIMITED'],
    [apiError(401), 502, 'LLM_MISCONFIGURED'],
    [apiError(400), 400, 'LLM_BAD_REQUEST'],
    [apiError(529), 502, 'LLM_UNAVAILABLE'],
  ];

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    for (const [sdkError, status, code] of cases) {
      const client = fakeClient(async () => {
        throw sdkError;
      });
      await assert.rejects(askClaude('q', undefined, client), { status, code });
    }
  } finally {
    console.error = originalConsoleError;
  }
});
