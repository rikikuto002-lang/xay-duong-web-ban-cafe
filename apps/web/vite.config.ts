import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const API_BACKEND = process.env.PUBLIC_API_URL || 'https://ban-cafe-api.rikikuto002.workers.dev';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': {
        target: API_BACKEND,
        changeOrigin: true,
        secure: true
      },
      '/uploads': {
        target: API_BACKEND,
        changeOrigin: true,
        secure: true
      }
    }
  }
});
