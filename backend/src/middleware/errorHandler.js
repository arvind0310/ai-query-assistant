import HttpError from '../utils/HttpError.js';
import ErrorCodes from '../utils/errorCodes.js';

export function notFound(req, res) {
  res.status(404).json({ error: { code: ErrorCodes.NOT_FOUND, message: 'Route not found' } });
}

export function errorHandler(err, req, res, next) {
  // Errors thrown by express.json()
  if (err.type === 'entity.parse.failed') {
    err = new HttpError(400, ErrorCodes.INVALID_JSON, 'Request body is not valid JSON');
  } else if (err.type === 'entity.too.large') {
    err = new HttpError(413, ErrorCodes.PAYLOAD_TOO_LARGE, 'Request body is too large');
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Anything else is a bug - log it, but don't leak details to the client
  console.error(err);
  res.status(500).json({ error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Something went wrong' } });
}
