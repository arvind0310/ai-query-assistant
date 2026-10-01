import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Set env before loading the app, since config is read on import
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.JWT_SECRET = 'a-test-secret-that-is-long-enough-123';
process.env.ENABLE_DEMO_LOGIN = 'true';
process.env.QUERY_MAX_CHARS = '50';
process.env.RATE_LIMIT_PER_MINUTE = '1000';

const { createApp } = await import('../app.js');
const { createToken } = await import('../src/utils/jwt.js');
const { default: HttpError } = await import('../src/utils/HttpError.js');

const fakeAnswer = async () => ({ answer: 'Paris', model: 'test-model', truncated: false });
const token = createToken('tester');

function ask(app, body, authToken = token) {
  return request(app).post('/api/query').set('Authorization', `Bearer ${authToken}`).send(body);
}

test('health check works without a token', async () => {
  const res = await request(createApp(fakeAnswer)).get('/health');
  assert.equal(res.status, 200);
});

test('rejects requests without a token', async () => {
  const res = await request(createApp(fakeAnswer)).post('/api/query').send({ query: 'hi' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'AUTH_REQUIRED');
});

test('rejects a token signed with a different secret', async () => {
  const badToken = jwt.sign({ sub: 'x' }, 'some-other-secret-some-other-secret', { issuer: 'ai-query-assistant' });
  const res = await ask(createApp(fakeAnswer), { query: 'hi' }, badToken);
  assert.equal(res.body.error.code, 'TOKEN_INVALID');
});

test('rejects an unsigned token (alg: none)', async () => {
  const unsigned = jwt.sign({ sub: 'x' }, null, { algorithm: 'none', issuer: 'ai-query-assistant' });
  const res = await ask(createApp(fakeAnswer), { query: 'hi' }, unsigned);
  assert.equal(res.body.error.code, 'TOKEN_INVALID');
});

test('rejects an expired token', async () => {
  const expired = jwt.sign({ sub: 'x' }, process.env.JWT_SECRET, { issuer: 'ai-query-assistant', expiresIn: -10 });
  const res = await ask(createApp(fakeAnswer), { query: 'hi' }, expired);
  assert.equal(res.body.error.code, 'TOKEN_EXPIRED');
});

test('demo login gives a token that works', async () => {
  const app = createApp(fakeAnswer);
  const login = await request(app).post('/api/auth/demo-token');
  const res = await ask(app, { query: 'hi' }, login.body.token);
  assert.equal(res.status, 200);
});

test('validates the query', async () => {
  const app = createApp(fakeAnswer);
  for (const body of [{}, { query: 123 }, { query: '   ' }, { query: 'a'.repeat(51) }]) {
    const res = await ask(app, body);
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body)}`);
    assert.equal(res.body.error.code, 'INVALID_INPUT');
  }
});

test('rejects broken JSON', async () => {
  const res = await request(createApp(fakeAnswer))
    .post('/api/query')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send('{"query":');
  assert.equal(res.body.error.code, 'INVALID_JSON');
});

test('returns the answer and trims the query', async () => {
  let receivedQuery;
  const app = createApp(async (query) => {
    receivedQuery = query;
    return fakeAnswer();
  });

  const res = await ask(app, { query: '  capital of France?  ' });
  assert.equal(res.status, 200);
  assert.equal(res.body.answer, 'Paris');
  assert.equal(receivedQuery, 'capital of France?');
});

test('passes LLM errors through to the client', async () => {
  const app = createApp(async () => {
    throw new HttpError(504, 'LLM_TIMEOUT', 'too slow');
  });
  const res = await ask(app, { query: 'hi' });
  assert.equal(res.status, 504);
  assert.equal(res.body.error.code, 'LLM_TIMEOUT');
});

test('hides unexpected error details', async () => {
  const app = createApp(async () => {
    throw new Error('database password is hunter2');
  });
  const originalConsoleError = console.error;
  console.error = () => {}; // keep test output clean
  const res = await ask(app, { query: 'hi' });
  console.error = originalConsoleError;

  assert.equal(res.status, 500);
  assert.ok(!JSON.stringify(res.body).includes('hunter2'));
});
