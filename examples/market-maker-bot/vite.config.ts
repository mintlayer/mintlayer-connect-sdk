import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mintlayer/wasm-lib'],
  },
  server: {
    port: 5173,
  },
});
