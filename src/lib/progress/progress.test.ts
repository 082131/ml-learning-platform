import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LessonMeta, Track } from '../types';
import {
  recordExercise,
  recordQuiz,
  recordView,
  resetProgress,
  setComplete,
  setProjectItem,
  setTheme,
  toggleBookmark,
} from './actions';
import { exportProgress, importProgress } from './io';
import { migrate } from './migrate';
import { lessonProgress, nextUp, trackLessons, trackStats } from './recommend';
import { BACKUP_KEY, emptyState, RECENT_LIMIT, STORAGE_KEY } from './schema';
import { createProgressStore } from './store';

const NOW = new Date('2026-10-19T12:00:00.000Z');

class MemoryStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

describe('migrate', () => {
  it('accepts a valid state unchanged', () => {
    const s = {
      ...emptyState(),
      completed: { a: NOW.toISOString() },
      bookmarks: ['a'],
      theme: 'dark' as const,
    };
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('reads data without a schema field as schema 1', () => {
    expect(migrate({ bookmarks: ['x'] })?.bookmarks).toEqual(['x']);
  });
  it('drops invalid entries instead of failing', () => {
    const out = migrate({
      schema: 1,
      completed: { a: 'date', b: 5 },
      quiz: {
        'a#q': { correct: true, attempts: 2 },
        bad: { correct: 'yes', attempts: 1 },
        neg: { correct: true, attempts: -1 },
      },
      exercises: {
        e: { revealed: true, passed: false },
        f: { revealed: 'no' },
        g: { revealed: false, passed: 'x' },
      },
      projects: { p: [true, false], q: [1, 2] },
      bookmarks: ['a', 'a', 3, 'b'],
      recent: Array.from({ length: 15 }, (_, i) => `l${i}`),
      theme: 'purple',
    });
    expect(out).toEqual({
      schema: 1,
      completed: { a: 'date' },
      quiz: { 'a#q': { correct: true, attempts: 2 } },
      exercises: { e: { revealed: true, passed: false }, g: { revealed: false } },
      projects: { p: [true, false] },
      bookmarks: ['a', 'b'],
      recent: Array.from({ length: RECENT_LIMIT }, (_, i) => `l${i}`),
      theme: 'system',
    });
  });
  it('rejects non-objects and newer schemas', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('text')).toBeNull();
    expect(migrate([1])).toBeNull();
    expect(migrate({ schema: 2 })).toBeNull();
  });
});

describe('actions', () => {
  it('setComplete adds and removes, and is a no-op when unchanged', () => {
    const s0 = emptyState();
    const s1 = setComplete(s0, 'a', true, NOW);
    expect(s1.completed).toEqual({ a: NOW.toISOString() });
    expect(setComplete(s1, 'a', true, NOW)).toBe(s1);
    expect(setComplete(s1, 'a', false, NOW).completed).toEqual({});
    expect(setComplete(s0, 'a', false, NOW)).toBe(s0);
  });
  it('toggleBookmark adds then removes', () => {
    const s1 = toggleBookmark(emptyState(), 'a');
    expect(s1.bookmarks).toEqual(['a']);
    expect(toggleBookmark(s1, 'a').bookmarks).toEqual([]);
  });
  it('recordView keeps the most recent first, unique and capped', () => {
    let s = emptyState();
    for (let i = 0; i < 12; i++) s = recordView(s, `l${i}`);
    s = recordView(s, 'l5');
    expect(s.recent[0]).toBe('l5');
    expect(s.recent).toHaveLength(RECENT_LIMIT);
    expect(new Set(s.recent).size).toBe(RECENT_LIMIT);
    expect(recordView(s, 'l5')).toBe(s);
  });
  it('recordQuiz counts attempts and keeps the latest result', () => {
    const s = recordQuiz(recordQuiz(emptyState(), 'a', 'q1', false), 'a', 'q1', true);
    expect(s.quiz['a#q1']).toEqual({ correct: true, attempts: 2 });
  });
  it('recordExercise merges patches', () => {
    const s = recordExercise(recordExercise(emptyState(), 'e', { passed: false }), 'e', { revealed: true });
    expect(s.exercises.e).toEqual({ revealed: true, passed: false });
  });
  it('setProjectItem pads to length and ignores out-of-range indexes', () => {
    const s = setProjectItem(emptyState(), 'p', 1, true, 3);
    expect(s.projects.p).toEqual([false, true, false]);
    expect(setProjectItem(s, 'p', 5, true, 3)).toBe(s);
  });
  it('setTheme and resetProgress keep the theme', () => {
    const s = setTheme(toggleBookmark(emptyState(), 'a'), 'dark');
    expect(setTheme(s, 'dark')).toBe(s);
    expect(resetProgress(s)).toEqual({ ...emptyState(), theme: 'dark' });
  });
});

describe('import and export', () => {
  it('round-trips', () => {
    const s = setComplete(toggleBookmark(emptyState(), 'a'), 'b', true, NOW);
    expect(importProgress(exportProgress(s))).toEqual({ ok: true, state: s });
  });
  it('explains invalid files', () => {
    expect(importProgress('{oops')).toEqual({ ok: false, error: 'The file is not valid JSON.' });
    expect(importProgress('[1,2]')).toMatchObject({ ok: false });
  });
});

describe('store', () => {
  afterEach(() => vi.useRealTimers());

  it('loads saved state', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyState(), bookmarks: ['a'] }));
    const store = createProgressStore(storage);
    expect(store.getState().bookmarks).toEqual(['a']);
    expect(store.getNotice()).toBeNull();
  });

  it('debounces writes and notifies subscribers immediately', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const store = createProgressStore(storage, 300);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => toggleBookmark(s, 'a'));
    store.update((s) => toggleBookmark(s, 'b'));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(300);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).bookmarks).toEqual(['a', 'b']);
  });

  it('flush writes immediately, and unchanged updates do not notify', () => {
    const storage = new MemoryStorage();
    const store = createProgressStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
    store.update((s) => setTheme(s, 'dark'));
    store.flush();
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).theme).toBe('dark');
  });

  it('backs up corrupt data, resets and shows a dismissible notice', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const store = createProgressStore(storage);
    expect(store.getState()).toEqual(emptyState());
    expect(store.getNotice()).toBe('reset');
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
    store.dismissNotice();
    expect(store.getNotice()).toBeNull();
  });

  it('treats a newer schema as unreadable', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schema: 9 }));
    expect(createProgressStore(storage).getNotice()).toBe('reset');
  });

  it('works in memory when storage is unavailable', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => undefined,
    };
    for (const storage of [null, throwing]) {
      const store = createProgressStore(storage);
      expect(store.getNotice()).toBe('unavailable');
      store.update((s) => toggleBookmark(s, 'a'));
      store.flush();
      expect(store.getState().bookmarks).toEqual(['a']);
    }
  });

  it('reports a failed write, such as a full quota', () => {
    const storage = new MemoryStorage();
    const store = createProgressStore(storage);
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    store.update((s) => toggleBookmark(s, 'a'));
    store.flush();
    expect(store.getNotice()).toBe('write-failed');
  });
});

describe('recommendations', () => {
  const meta = (id: string, prerequisites: string[] = []): LessonMeta => ({
    id,
    title: id,
    level: 'beginner',
    minutes: 10,
    objectives: ['x'],
    prerequisites,
    concepts: [],
    kind: 'lesson',
  });
  const track: Track = {
    id: 'ml',
    title: 'ML',
    code: 'T.01',
    summary: '',
    chapters: [
      {
        id: 'c',
        title: 'C',
        level: 'beginner',
        lessons: [
          { id: 'ml/c/a', status: 'written' },
          { id: 'ml/c/o', status: 'outline' },
          { id: 'ml/c/b', status: 'written' },
          { id: 'ml/c/c', status: 'written' },
        ],
      },
    ],
  };
  const metas = {
    'ml/c/a': meta('ml/c/a'),
    'ml/c/o': meta('ml/c/o'),
    'ml/c/b': meta('ml/c/b', ['ml/c/a', 'ml/c/o']),
    'ml/c/c': meta('ml/c/c', ['ml/c/a']),
  };
  const status = Object.fromEntries(trackLessons(track).map((l) => [l.id, l.status]));

  it('recommends the first written lesson with all prerequisites complete', () => {
    expect(nextUp(track, status, metas, emptyState())?.id).toBe('ml/c/a');
    // An outline prerequisite cannot be completed, so it does not block 'b'.
    const s = setComplete(emptyState(), 'ml/c/a', true, NOW);
    expect(nextUp(track, status, metas, s)?.id).toBe('ml/c/b');
  });
  it('skips lessons whose prerequisites are incomplete', () => {
    const blocked = { ...metas, 'ml/c/a': meta('ml/c/a', ['ml/c/c']) };
    const s = setComplete(emptyState(), 'ml/c/x', true, NOW);
    expect(nextUp(track, status, blocked, s)).toBeUndefined();
  });
  it('returns undefined when every written lesson is complete', () => {
    let s = emptyState();
    for (const id of ['ml/c/a', 'ml/c/b', 'ml/c/c']) s = setComplete(s, id, true, NOW);
    expect(nextUp(track, status, metas, s)).toBeUndefined();
  });
  it('computes track stats and per-lesson progress', () => {
    const s = recordView(setComplete(emptyState(), 'ml/c/a', true, NOW), 'ml/c/b');
    expect(trackStats(track, s)).toEqual({ total: 4, written: 3, completedWritten: 1 });
    expect(lessonProgress('ml/c/a', s)).toBe('complete');
    expect(lessonProgress('ml/c/b', s)).toBe('in-progress');
    expect(lessonProgress('ml/c/c', s)).toBe('not-started');
  });
});
