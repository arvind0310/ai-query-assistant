import 'dotenv/config';

const env = process.env;

const config = {
  port: Number(env.PORT) || 3001,
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173').split(','),

  anthropicApiKey: env.ANTHROPIC_API_KEY,
  model: env.LLM_MODEL || 'claude-opus-5-5',
  maxTokens: Number(env.LLM_MAX_TOKENS) || 4096,
  effort: env.LLM_EFFORT || 'medium',
  timeoutMs: Number(env.LLM_TIMEOUT_MS) || 60000,
  maxRetries: Number(env.LLM_MAX_RETRIES ?? 1),

  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '1h',
  enableDemoLogin: env.ENABLE_DEMO_LOGIN === 'true',

  maxQueryLength: Number(env.QUERY_MAX_CHARS) || 4000,
  rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE) || 20,
};

// Fail at startup rather than on the first request
export function checkConfig() {
  const problems = [];
  if (!config.anthropicApiKey) problems.push('ANTHROPIC_API_KEY is missing');
  if (!config.jwtSecret || config.jwtSecret.length < 10) problems.push('JWT_SECRET must be at least 10 characters');

  if (problems.length) {
    console.error('Config error:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
}

export default config;
