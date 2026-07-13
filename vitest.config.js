// Vitest config for the 528 AI portal.
//
// Scope: only Admissions Copilot UX-skeleton tests today. Other
// portal areas may adopt this test infra later. Keep the config
// small and predictable.
//
// jsdom is required for React component tests; happy-dom would also
// work but jsdom matches what Next.js and React Testing Library
// document as their default.

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The portal uses .js (not .jsx) for React components — Next.js's
// SWC handles this transparently at runtime, but Vitest's underlying
// Vite oxc parser refuses JSX inside .js by default. Pass the react
// plugin an explicit include pattern so admissions .js pages compile.
export default defineConfig({
  plugins: [react({ include: [/\.[jt]sx?$/] })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // Fail on unhandled rejections — surfaces async fetch calls that
    // slip past the mocks used in the admissions gate test.
    dangerouslyIgnoreUnhandledErrors: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
