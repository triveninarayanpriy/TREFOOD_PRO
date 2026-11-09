import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './src/client'),
      '@worker': path.resolve(__dirname, './src/worker'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
