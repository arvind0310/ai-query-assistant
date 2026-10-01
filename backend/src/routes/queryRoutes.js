import { Router } from 'express';
import { createQueryHandler } from '../controllers/queryController.js';
import requireAuth from '../middleware/authMiddleware.js';
import rateLimiter from '../middleware/rateLimiter.js';

export default function queryRoutes(askFn) {
  const router = Router();
  router.post('/', rateLimiter, requireAuth, createQueryHandler(askFn));
  return router;
}
