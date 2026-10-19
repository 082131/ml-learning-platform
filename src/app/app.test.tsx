import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { StorageNotice } from '@/components/layout/StorageNotice';
import { STORAGE_KEY } from '@/lib/progress/schema';
import { createProgressStore } from '@/lib/progress/store';
import { renderWithApp } from '@/test/render';
import { tracks } from '../../content/curriculum';
import { AppRoutes } from './App';
import { useApplyTheme } from './useTheme';

function ThemedToggle() {
  useApplyTheme();
  return <ThemeToggle />;
}

describe('theme', () => {
  it('toggling persists the choice and sets data-theme', async () => {
    const { store } = renderWithApp(<ThemedToggle />);
    const button = () => screen.getByRole('button', { name: /^Theme:/ });
    expect(button()).toHaveAccessibleName('Theme: System. Switch to Light');
    await userEvent.click(button());
    expect(document.documentElement.dataset.theme).toBe('light');
    await userEvent.click(button());
    expect(document.documentElement.dataset.theme).toBe('dark');
    store.flush();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).theme).toBe('dark');
    // A new store (a reload) reads the saved preference back.
    expect(createProgressStore(localStorage).getState().theme).toBe('dark');
  });
});

describe('storage notice', () => {
  it('shows a one-line notice when storage is unavailable', () => {
    renderWithApp(<StorageNotice />, { store: createProgressStore(null) });
    expect(screen.getByRole('status')).toHaveTextContent(/progress won’t be saved/);
  });
});

describe('routes', () => {
  it('dashboard recommends the first written lesson', async () => {
    renderWithApp(<AppRoutes />, { route: '/' });
    expect(await screen.findByRole('heading', { name: 'Your learning' })).toBeInTheDocument();
    const nextUp = screen.getByRole('region', { name: 'Next up in each track' });
    expect(
      within(nextUp).getByRole('link', { name: /What AI, ML and deep learning actually mean/ }),
    ).toBeInTheDocument();
  });

  it('track page lists every chapter and lesson card', async () => {
    renderWithApp(<AppRoutes />, { route: '/learn/data' });
    expect(await screen.findByRole('heading', { level: 1, name: /Data Engineering/ })).toBeInTheDocument();
    const lessonMap = screen.getByRole('region', { name: 'Data Engineering lesson map' });
    expect(within(lessonMap).getAllByRole('link')).toHaveLength(12);
    // Content threads write lessons over time, so count the outline lessons instead of assuming all 12.
    const outlines = tracks
      .find((t) => t.id === 'data')!
      .chapters.flatMap((c) => c.lessons)
      .filter((l) => l.status === 'outline').length;
    expect(screen.getAllByText('Outline only').length).toBeGreaterThanOrEqual(outlines);
  });

  it('outline lesson shows objectives, prerequisites and the outline label, with no completion button', async () => {
    renderWithApp(<AppRoutes />, { route: '/learn/ml/math/tensors' });
    expect(await screen.findByRole('heading', { level: 1, name: /Tensors and shapes/ })).toBeInTheDocument();
    expect(screen.getByText(/Reshape and transpose a tensor/)).toBeInTheDocument();
    const prerequisites = screen.getByRole('region', { name: 'Prerequisites' });
    expect(
      within(prerequisites).getByRole('link', { name: /Matrix multiplication, row × column/ }),
    ).toHaveAttribute('href', '/learn/ml/math/matrix-multiplication');
    expect(screen.getByRole('note')).toHaveTextContent('outlined but not written yet');
    expect(screen.queryByRole('button', { name: 'Mark complete' })).toBeNull();
  });

  it('written lesson renders its MDX, glossary terms open, and completion is saved', async () => {
    const { store } = renderWithApp(<AppRoutes />, { route: '/learn/ml/foundations/what-is-ml' });
    expect(
      await screen.findByRole('heading', { name: 'Rules you write vs rules a program learns' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Machine learning' }));
    expect(screen.getByRole('dialog', { name: 'Definition: Machine learning (ML)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    expect(store.getState().completed).toHaveProperty(['ml/foundations/what-is-ml']);
    expect(store.getState().recent[0]).toBe('ml/foundations/what-is-ml');
    await userEvent.click(screen.getByRole('button', { name: 'Bookmark' }));
    expect(store.getState().bookmarks).toEqual(['ml/foundations/what-is-ml']);
    await waitFor(() =>
      expect(
        within(screen.getAllByRole('navigation', { name: 'On this page' })[0]!).getByText('Intuition'),
      ).toBeInTheDocument(),
    );
  });

  it('unknown routes and lessons show not found', async () => {
    renderWithApp(<AppRoutes />, { route: '/learn/ml/nope/nothing' });
    expect(await screen.findByRole('heading', { name: /doesn’t exist/ })).toBeInTheDocument();
  });

  it('glossary lists terms with their introducing lesson', async () => {
    renderWithApp(<AppRoutes />, { route: '/glossary?term=model' });
    expect(await screen.findByText('Model')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'What AI, ML and deep learning actually mean' }).length,
    ).toBeGreaterThan(0);
  });

  it('settings imports a file and resets with confirmation', async () => {
    const { store } = renderWithApp(<AppRoutes />, { route: '/settings' });
    const input = await screen.findByLabelText('Progress file to import');
    const file = new File(
      [JSON.stringify({ schema: 1, completed: { 'ml/foundations/what-is-ml': 'x' } })],
      'p.json',
    );
    await userEvent.upload(input, file);
    expect(await screen.findByText(/Imported progress: 1 completed lessons/)).toBeInTheDocument();
    expect(store.getState().completed).toEqual({ 'ml/foundations/what-is-ml': 'x' });
    await userEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, reset my progress' }));
    expect(store.getState().completed).toEqual({});
    const bad = new File(['nope'], 'bad.json');
    await act(() => userEvent.upload(input, bad));
    expect(await screen.findByText(/Import failed. The file is not valid JSON./)).toBeInTheDocument();
  });
});
