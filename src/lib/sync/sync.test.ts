import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyExamState, type ExamState } from '@/lib/exam/storage';
import { migrate } from '@/lib/progress/migrate';
import { emptyState, type ProgressState } from '@/lib/progress/schema';
import { createSync, type RemoteDoc, type RemoteSnapshot, type SyncedStore } from './engine';
import { emptyInterviewState, type InterviewState } from '@/lib/interview/storage';
import { canonical, mergeExams, mergeInterview, mergeProgress } from './merge';

const state = (patch: Partial<ProgressState>): ProgressState => ({ ...emptyState(), ...patch });

describe('mergeProgress', () => {
  it('keeps both devices’ progress on a first sync', () => {
    const local = state({ completed: { a: '2026-01-02T00:00:00.000Z' }, bookmarks: ['a'], theme: 'dark' });
    const remote = state({
      completed: { a: '2026-01-01T00:00:00.000Z', b: '2026-01-03T00:00:00.000Z' },
      bookmarks: ['b'],
      quiz: { 'a#q1': { correct: true, attempts: 2 } },
    });
    const merged = mergeProgress(null, local, remote);
    expect(merged.completed).toEqual({ a: '2026-01-01T00:00:00.000Z', b: '2026-01-03T00:00:00.000Z' });
    expect(merged.bookmarks).toEqual(['a', 'b']);
    expect(merged.quiz['a#q1']).toEqual({ correct: true, attempts: 2 });
    expect(merged.theme).toBe('dark');
  });

  it('takes the other device’s changes, deletions included, when this one changed nothing', () => {
    const base = state({ completed: { a: 't', b: 't' }, bookmarks: ['a'] });
    const remote = state({ completed: { b: 't', c: 't' }, bookmarks: [], theme: 'light' });
    expect(mergeProgress(base, base, remote)).toEqual(remote);
  });

  it('combines changes made on both devices since the last sync', () => {
    const base = state({ completed: { a: 't' }, projects: { p: [true, false, false] } });
    const local = state({ completed: { a: 't', b: 't' }, projects: { p: [true, true, false] } });
    const remote = state({ completed: {}, projects: { p: [true, false, true] } });
    const merged = mergeProgress(base, local, remote);
    expect(merged.completed).toEqual({ b: 't' });
    expect(merged.projects.p).toEqual([true, true, true]);
  });

  it('a reset on another device clears this one', () => {
    const base = state({ completed: { a: 't' }, quiz: { 'a#1': { correct: true, attempts: 1 } } });
    expect(mergeProgress(base, base, emptyState())).toEqual(emptyState());
  });
});

describe('mergeExams', () => {
  const exams = (patch: Partial<ExamState>): ExamState => ({ ...emptyExamState(), ...patch });

  it('joins sitting history and keeps the better task result', () => {
    const local = exams({
      history: { ml: [{ at: 2, percent: 80, passed: true }] },
      tasks: { t1: { code: 'x', passed: ['a'], best: 40, revealed: false } },
    });
    const remote = exams({
      history: { ml: [{ at: 1, percent: 50, passed: false }] },
      tasks: { t1: { code: 'y', passed: ['a', 'b'], best: 70, revealed: false } },
    });
    const merged = mergeExams(null, local, remote);
    expect(merged.history.ml!.map((r) => r.at)).toEqual([2, 1]);
    expect(merged.tasks.t1!.best).toBe(70);
  });

  it('keeps a revealed solution pinned at zero', () => {
    const local = exams({ tasks: { t1: { code: 's', passed: [], best: 0, revealed: true } } });
    const remote = exams({ tasks: { t1: { code: 'y', passed: ['a'], best: 70, revealed: false } } });
    expect(mergeExams(null, local, remote).tasks.t1!.revealed).toBe(true);
  });

  it('keeps the newer sitting when two devices started different ones', () => {
    const attempt = (seed: string, startedAt: number) => ({
      seed,
      startedAt,
      order: [],
      optionOrder: {},
      answers: {},
      flagged: [],
    });
    const merged = mergeExams(
      null,
      exams({ attempts: { ml: attempt('a', 1) } }),
      exams({ attempts: { ml: attempt('b', 2) } }),
    );
    expect(merged.attempts.ml!.seed).toBe('b');
  });
});

/** A fake cloud document shared by several fake devices. */
function cloud() {
  let body: Record<string, unknown> | undefined;
  const subs = new Set<(s: RemoteSnapshot) => void>();
  const snap = (): RemoteSnapshot => ({
    exists: body !== undefined,
    data: () => body,
    metadata: { fromCache: false, hasPendingWrites: false },
  });
  let failWith: { code: string } | undefined;
  const doc: RemoteDoc = {
    get: async () => snap(),
    async set(data) {
      if (failWith) throw failWith;
      body = data;
      subs.forEach((s) => s(snap()));
    },
    onSnapshot(next) {
      subs.add(next);
      queueMicrotask(() => subs.has(next) && next(snap()));
      return () => subs.delete(next);
    },
  };
  return {
    doc,
    writes: () => body,
    state: () => (body ? (JSON.parse(body.json as string) as ProgressState) : undefined),
    fail(e?: { code: string }) {
      failWith = e;
    },
  };
}

function localStore(initial: ProgressState): SyncedStore<ProgressState> {
  let s = initial;
  const ls = new Set<() => void>();
  return {
    getState: () => s,
    subscribe(l) {
      ls.add(l);
      return () => ls.delete(l);
    },
    update(fn) {
      s = fn(s);
      ls.forEach((l) => l());
    },
  };
}

function device(doc: RemoteDoc, initial: ProgressState = emptyState()) {
  const store = localStore(initial);
  const saved = new Map<string, string>();
  const sync = createSync(
    [{ name: 'progress', store, doc, parse: (j) => migrate(JSON.parse(j)), merge: mergeProgress }],
    {
      bases: { load: (n) => saved.get(n) ?? null, save: (n, j) => void saved.set(n, j) },
      debounceMs: 10,
      retryMs: 100,
    },
  );
  return { store, sync, saved };
}

describe('createSync', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());
  const settle = () => vi.advanceTimersByTimeAsync(50);

  it('uploads existing progress, and a second device downloads it', async () => {
    const c = cloud();
    const a = device(c.doc, state({ completed: { a: 't' } }));
    await settle();
    expect(c.state()!.completed).toEqual({ a: 't' });
    expect(a.sync.getStatus().phase).toBe('synced');

    const b = device(c.doc);
    await settle();
    expect(b.store.getState().completed).toEqual({ a: 't' });
    expect(b.sync.getStatus().phase).toBe('synced');
  });

  it('merges two devices that each had progress before sync existed', async () => {
    const c = cloud();
    const a = device(c.doc, state({ completed: { a: 't' } }));
    await settle();
    const b = device(c.doc, state({ completed: { b: 't' } }));
    await settle();
    for (const d of [a, b]) expect(d.store.getState().completed).toEqual({ a: 't', b: 't' });
    expect(c.state()!.completed).toEqual({ a: 't', b: 't' });
  });

  it('sends live changes to the other device, deletions included', async () => {
    const c = cloud();
    const a = device(c.doc);
    const b = device(c.doc);
    await settle();
    a.store.update((s) => ({ ...s, completed: { x: 't' }, theme: 'dark' }));
    await settle();
    expect(b.store.getState()).toEqual(a.store.getState());
    b.store.update((s) => ({ ...s, completed: {} }));
    await settle();
    expect(a.store.getState().completed).toEqual({});
    expect(a.store.getState().theme).toBe('dark');
  });

  it('does not write when nothing differs', async () => {
    const c = cloud();
    device(c.doc, state({ completed: { a: 't' } }));
    await settle();
    const first = c.writes();
    device(c.doc, state({ completed: { a: 't' } }));
    await settle();
    expect(c.writes()).toBe(first);
  });

  it('ignores cached snapshots and never writes before the cloud copy was read', async () => {
    const set = vi.fn(async () => {});
    let deliver: (s: RemoteSnapshot) => void = () => {};
    const doc: RemoteDoc = {
      get: async () => ({
        exists: false,
        data: () => undefined,
        metadata: { fromCache: false, hasPendingWrites: false },
      }),
      set,
      onSnapshot(next) {
        deliver = next;
        return () => {};
      },
    };
    const d = device(doc, state({ completed: { a: 't' } }));
    deliver({
      exists: true,
      data: () => ({ json: canonical(emptyState()) }),
      metadata: { fromCache: true, hasPendingWrites: false },
    });
    d.store.update((s) => ({ ...s, completed: { ...s.completed, b: 't' } }));
    await settle();
    expect(set).not.toHaveBeenCalled();
    expect(d.store.getState().completed).toEqual({ a: 't', b: 't' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(d.sync.getStatus().phase).toBe('unreachable');
  });

  it('retries after a failed write and stops for good when writing is not allowed', async () => {
    const c = cloud();
    c.fail({ code: 'unavailable' });
    const a = device(c.doc, state({ completed: { a: 't' } }));
    await settle();
    expect(a.sync.getStatus().phase).toBe('error');
    c.fail(undefined);
    await vi.advanceTimersByTimeAsync(200);
    expect(c.state()!.completed).toEqual({ a: 't' });
    expect(a.sync.getStatus().phase).toBe('synced');

    const c2 = cloud();
    c2.fail({ code: 'invalid_argument' });
    const b = device(c2.doc, state({ completed: { a: 't' } }));
    await settle();
    expect(b.sync.getStatus().phase).toBe('read-only');
  });
});

describe('mergeInterview', () => {
  const iv = (patch: Partial<InterviewState>): InterviewState => ({ ...emptyInterviewState(), ...patch });

  it('keeps the latest self-rating and ratings made on either device', () => {
    const local = iv({ ratings: { a: { rating: 1, at: 10, times: 1 }, b: { rating: 3, at: 5, times: 1 } } });
    const remote = iv({ ratings: { a: { rating: 3, at: 20, times: 2 }, c: { rating: 2, at: 7, times: 1 } } });
    const merged = mergeInterview(null, local, remote);
    expect(merged.ratings.a).toEqual({ rating: 3, at: 20, times: 2 });
    expect(Object.keys(merged.ratings).sort()).toEqual(['a', 'b', 'c']);
  });

  it('prefers the newer sitting, then the submitted one, and joins screen history', () => {
    const older = { startedAt: 1, submittedAt: 9, tasks: {} };
    const newer = { startedAt: 50, tasks: { t: { code: 'x', passed: ['a'], best: 30 } } };
    const merged = mergeInterview(
      null,
      iv({ sittings: { ml: older }, history: { ml: [{ at: 9, percent: 40, passed: false }] } }),
      iv({ sittings: { ml: newer }, history: { ml: [{ at: 3, percent: 90, passed: true }] } }),
    );
    expect(merged.sittings.ml).toEqual(newer);
    expect(merged.history.ml!.map((r) => r.at)).toEqual([9, 3]);
    const submitted = { ...newer, submittedAt: 99 };
    expect(
      mergeInterview(null, iv({ sittings: { ml: newer } }), iv({ sittings: { ml: submitted } })).sittings.ml,
    ).toEqual(submitted);
  });
});
