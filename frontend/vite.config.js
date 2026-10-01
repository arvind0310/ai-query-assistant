import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite server proxies API calls to the backend, so the
// browser sees a single origin and no CORS configuration is needed locally.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backendUrl,
      '/health': backendUrl,
    },
  },
});
