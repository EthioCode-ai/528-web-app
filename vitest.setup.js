// Vitest setup: extends expect with jest-dom matchers and guards
// against unmocked network calls escaping into the test process.

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Safety net: every test that uses fetch MUST mock it explicitly.
// Any test that reaches for the real network fails loud. This is
// the Gate 2 guarantee that no external provider call occurs.
beforeEach(() => {
  globalThis.fetch = vi.fn(() => {
    throw new Error(
      'Unmocked fetch() call in Admissions test. Set up vi.fn() ' +
      'mocks per test. Gate 2 permits ONLY /api/admissions/health probes.'
    );
  });
});

afterEach(() => {
  cleanup();
});
