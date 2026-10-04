import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the panel calls /api/... and Vite forwards it to the API.
// Change the target with: API_URL=http://192.168.2.93 npm run dev
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_URL || 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 1500 },
});
