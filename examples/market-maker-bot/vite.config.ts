import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Legacy VITE_WALLET_SEED/API_KEY must never be exposed by the client build.
  envPrefix: 'PUBLIC_',
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3001', '/health': 'http://127.0.0.1:3001' },
  },
});
