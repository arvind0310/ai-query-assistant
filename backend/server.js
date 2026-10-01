import config, { checkConfig } from './src/config/index.js';
import { createApp } from './app.js';

checkConfig();

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port} (model: ${config.model})`);
  if (config.enableDemoLogin) {
    console.warn('Warning: demo login is enabled - do not use this in production');
  }
});

// Docker sends SIGTERM on stop, let open requests finish first
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
