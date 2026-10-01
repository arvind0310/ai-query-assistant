import config from '../config/index.js';
import HttpError from '../utils/HttpError.js';
import ErrorCodes from '../utils/errorCodes.js';

// askFn is passed in so tests can use a fake instead of calling Claude
export function createQueryHandler(askFn) {
  return async (req, res) => {
    const query = req.body?.query;

    if (typeof query !== 'string' || !query.trim()) {
      throw new HttpError(400, ErrorCodes.INVALID_INPUT, 'Please enter a question');
    }
    if (query.length > config.maxQueryLength) {
      throw new HttpError(400, ErrorCodes.INVALID_INPUT, `Question is too long (max ${config.maxQueryLength} characters)`);
    }

    // Stop the Claude call if the user closes the page or hits cancel
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    const result = await askFn(query.trim(), controller.signal);
    res.json(result);
  };
}
