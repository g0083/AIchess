import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png', 'app-config.json'],
      manifest: {
        id: '/',
        name: '将棋盤チェス',
        short_name: '将棋盤チェス',
        description:
          'オフライン2人対戦・AI対戦・P2P対戦・段階式学習モードを備えたチェス。インストールしてオフラインでも遊べます。',
        lang: 'ja',
        dir: 'ltr',
        start_url: './index.html?source=pwa',
        scope: './',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#f4efe6',
        theme_color: '#f4efe6',
        categories: ['games', 'education', 'strategy'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'AIと対戦', short_name: 'AI対戦', url: './index.html#/play/ai' },
          { name: 'P2P対戦', short_name: 'P2P', url: './index.html#/play/online' },
          { name: '学習モード', short_name: '学習', url: './index.html#/learn' },
          { name: '戦術パズル', short_name: 'パズル', url: './index.html#/learn/tactics' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,wasm}'],
        // The 99 MB optional "full strength" engine must never be precached.
        globIgnores: ['**/stockfish-19-single.*', '**/stockfish-19.wasm', '**/stats.html'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // The lite engine: cache first so the second visit works offline instantly.
            urlPattern: /\/engine\/.*\.(wasm|js)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'chess-engines',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the heavy, rarely-changing libraries in their own long-lived
        // chunks so a content update does not invalidate the whole bundle.
        manualChunks: (id: string) => {
          if (id.includes('node_modules/chess.js')) return 'chess';
          if (id.includes('node_modules/@lichess-org/chessground')) return 'board';
          if (id.includes('node_modules/trystero')) return 'p2p';
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    // Required for SharedArrayBuffer / multi-threaded engine (optional feature).
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
