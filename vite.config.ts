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
  build: {
    rollupOptions: {
      output: {
        // Group Lucide SVG icons into one shared cached chunk and keep shared domain utils clean
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (norm.includes('/src/shared/')) {
            return 'shared';
          }
          if (
            /\/src\/client\/components\/ui\/(Badge|Button|CurfewBanner|Dialog|ErrorState|IconButton|Input|Sheet|Skeleton|Toast)\.tsx$/.test(
              norm
            )
          ) {
            return 'ui-core';
          }
        },
      },
    },
  },
});
