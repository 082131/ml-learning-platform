import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProgressContext } from '@/app/progress';
import { createProgressStore, type ProgressStore } from '@/lib/progress/store';

/** Renders inside a router and a fresh in-memory progress store. */
export function renderWithApp(
  ui: ReactElement,
  { route = '/', store }: { route?: string; store?: ProgressStore } = {},
) {
  const progress = store ?? createProgressStore(localStorage, 0);
  return {
    store: progress,
    ...render(
      <ProgressContext.Provider value={progress}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ProgressContext.Provider>,
    ),
  };
}
