import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './src/config/index.js';
import authRoutes from './src/routes/authRoutes.js';
import queryRoutes from './src/routes/queryRoutes.js';
import { askClaude } from './src/services/llmService.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';

// askFn can be swapped out in tests so we don't call the real API
export function createApp(askFn = askClaude) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Keep ENABLE_DEMO_LOGIN off in production
  if (config.enableDemoLogin) {
    app.use('/api/auth', authRoutes);
  }
  app.use('/api/query', queryRoutes(askFn));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
