import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const ISSUER = 'ai-query-assistant';

export function createToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    algorithm: 'HS256',
    issuer: ISSUER,
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  // Only accept HS256, otherwise a token could pick its own algorithm (e.g. "none")
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER });
}
