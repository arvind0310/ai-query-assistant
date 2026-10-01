import { verifyToken } from '../utils/jwt.js';
import HttpError from '../utils/HttpError.js';
import ErrorCodes from '../utils/errorCodes.js';

export default function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new HttpError(401, ErrorCodes.AUTH_REQUIRED, 'Missing Authorization header'));
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new HttpError(401, ErrorCodes.TOKEN_EXPIRED, 'Your session has expired, please sign in again'));
    }
    next(new HttpError(401, ErrorCodes.TOKEN_INVALID, 'Invalid token'));
  }
}
