import { rateLimit } from 'express-rate-limit';
import config from '../config/index.js';
import ErrorCodes from '../utils/errorCodes.js';

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimitPerMinute,
  handler: (req, res) =>
    res.status(429).json({ error: { code: ErrorCodes.RATE_LIMITED, message: 'Too many requests, please slow down' } }),
});

export default rateLimiter;
