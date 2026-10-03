import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // vite-plugin-pwa injects a virtual module that only exists inside a Vite
    // build. Tests replace it with a stub so importing src/pwa.ts works.
    alias: {
      'virtual:pwa-register': new URL('./tests/stubs/pwa-register.ts', import.meta.url)
        .pathname,
    },
  },
});