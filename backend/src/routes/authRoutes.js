import { Router } from 'express';
import { getDemoToken } from '../controllers/authController.js';
import rateLimiter from '../middleware/rateLimiter.js';

const router = Router();

router.post('/demo-token', rateLimiter, getDemoToken);

export default router;
