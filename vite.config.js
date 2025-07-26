import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        decks: resolve(__dirname, 'decks.html'),
        cards: resolve(__dirname, 'cards.html'),
      },
    },
  },
  server: {
    open: true,
  },
});
