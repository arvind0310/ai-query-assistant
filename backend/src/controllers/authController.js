import { createToken } from '../utils/jwt.js';

// Hands out a test token so the UI works without a real login system
export function getDemoToken(req, res) {
  res.json({ token: createToken('demo-user') });
}
