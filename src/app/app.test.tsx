import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { StorageNotice } from '@/components/layout/StorageNotice';
import { STORAGE_KEY } from '@/lib/progress/schema';
import { createProgressStore } from '@/lib/progress/store';
import { renderWithApp } from '@/test/render';
import { tracks } from '../../content/curriculum';
import { metas } from '../../content/index';

const escapeRegExp = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      within(within(nextUp).getByRole('listitem', { name: 'Machine Learning Engineer' })).getByRole('link', {
        name: /What AI, ML and deep learning actually mean/,
      }),
    ).toBeInTheDocument();
  });

  it('dashboard lists every track in the registry, in next up and in progress', async () => {
    renderWithApp(<AppRoutes />, { route: '/' });
    await screen.findByRole('heading', { name: 'Your learning' });
    const nextUp = screen.getByRole('region', { name: 'Next up in each track' });
    const byTrack = screen.getByRole('region', { name: 'Progress by track' });
    for (const t of tracks) {
      expect(
        within(nextUp).getByRole('link', {
          name: new RegExp(`${t.code} ${t.title.replace(/[&]/g, '\\$&')}`),
        }),
      ).toHaveAttribute('href', `/learn/${t.id}`);
      expect(within(byTrack).getByText(t.title)).toBeInTheDocument();
    }
    // A track blocked only by another track's prerequisites must not claim it is complete.
    expect(within(nextUp).queryByText('Every written lesson is complete.')).not.toBeInTheDocument();
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
    expect(screen.queryAllByText('Outline only').length).toBeGreaterThanOrEqual(outlines);
  });

  it('outline lesson shows objectives, prerequisites and the outline label, with no completion button', async () => {
    // Content threads write lessons over time, so pick an outline lesson with a prerequisite from the data
    // instead of naming one that may get written.
    const outline = tracks
      .flatMap((t) => t.chapters.flatMap((c) => c.lessons))
      .map((l) => ({ ref: l, meta: metas[l.id]! }))
      .find(
        ({ ref, meta }) => ref.status === 'outline' && meta.kind === 'lesson' && meta.prerequisites.length,
      );
    expect(outline).toBeDefined();
    const { meta } = outline!;
    const prereq = metas[meta.prerequisites[0]!]!;
    renderWithApp(<AppRoutes />, { route: `/learn/${meta.id}` });
    expect(
      await screen.findByRole('heading', { level: 1, name: meta.title }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(meta.objectives[0]!)).toBeInTheDocument();
    const prerequisites = screen.getByRole('region', { name: 'Prerequisites' });
    expect(
      within(prerequisites).getByRole('link', { name: new RegExp(escapeRegExp(prereq.title)) }),
    ).toHaveAttribute('href', `/learn/${prereq.id}`);
    expect(screen.getByRole('note')).toHaveTextContent('outlined but not written yet');
    expect(screen.queryByRole('button', { name: 'Mark complete' })).toBeNull();
    // The first outline lesson moves to other tracks as lessons get written; its first load can be slow.
  }, 15_000);

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
