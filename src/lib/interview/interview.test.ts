import { describe, expect, it } from 'vitest';
import { bankStats, buildDrill, filterQuestions, scoreSitting, statusOf } from './practice';
import {
  INTERVIEW_STORAGE_KEY,
  clearRatings,
  clearSitting,
  createInterviewStore,
  emptyInterviewState,
  parseInterviewState,
  rateQuestion,
  recordScreenRun,
  startSitting,
  submitSitting,
} from './storage';
import type { InterviewQuestion, ScreenDef } from './types';

const q = (
  id: string,
  role: InterviewQuestion['role'],
  kind: InterviewQuestion['kind'],
): InterviewQuestion => ({
  id,
  role,
  kind,
  level: 'core',
  topic: 't',
  prompt: 'p',
  answer: 'a',
  covers: [],
  redFlags: [],
  followUps: [],
});
const bank = [
  q('a', 'ml', 'technical'),
  q('b', 'ml', 'system-design'),
  q('c', 'data', 'technical'),
  q('d', 'behavioral', 'behavioral'),
];

const screen: ScreenDef = {
  id: 's',
  role: 'ml',
  title: 'S',
  summary: '',
  minutes: 10,
  passPercent: 70,
  tasks: [
    {
      id: 't1',
      title: '',
      domain: '',
      brief: '',
      starter: '',
      solution: '',
      checks: [{ name: 'x', points: 60, tests: '' }],
    },
    {
      id: 't2',
      title: '',
      domain: '',
      brief: '',
      starter: '',
      solution: '',
      checks: [{ name: 'y', points: 40, tests: '' }],
    },
  ],
};

describe('ratings and filters', () => {
  it('rates a question, counts repeats and derives its status', () => {
    let st = rateQuestion(emptyInterviewState(), 'a', 1, 100);
    st = rateQuestion(st, 'a', 3, 200);
    expect(st.ratings.a).toEqual({ rating: 3, at: 200, times: 2 });
    expect(statusOf('a', st.ratings)).toBe('solid');
    expect(statusOf('b', st.ratings)).toBe('new');
    expect(statusOf('a', rateQuestion(st, 'a', 2, 300).ratings)).toBe('review');
    expect(clearRatings(st, ['a']).ratings).toEqual({});
  });

  it('filters by role, kind and status', () => {
    const ratings = rateQuestion(emptyInterviewState(), 'a', 2, 1).ratings;
    const ids = (f: Parameters<typeof filterQuestions>[1]) =>
      filterQuestions(bank, f, ratings).map((x) => x.id);
    expect(ids({ role: 'ml', kind: 'all', status: 'all' })).toEqual(['a', 'b']);
    expect(ids({ role: 'all', kind: 'technical', status: 'all' })).toEqual(['a', 'c']);
    expect(ids({ role: 'all', kind: 'all', status: 'review' })).toEqual(['a']);
    expect(ids({ role: 'ml', kind: 'all', status: 'new' })).toEqual(['b']);
    expect(bankStats(bank, ratings)).toEqual({ total: 4, practiced: 1, solid: 0, review: 1 });
  });

  it('builds a drill weakest first and is stable for a seed', () => {
    let st = emptyInterviewState();
    st = rateQuestion(st, 'a', 3, 10);
    st = rateQuestion(st, 'b', 2, 20);
    st = rateQuestion(st, 'c', 1, 30);
    expect(buildDrill(bank, st.ratings, 4, 'seed')).toEqual(['c', 'b', 'd', 'a']);
    expect(buildDrill(bank, st.ratings, 2, 'seed')).toEqual(['c', 'b']);
    expect(buildDrill(bank, {}, 4, 'x')).toEqual(buildDrill(bank, {}, 4, 'x'));
    expect(new Set(buildDrill(bank, {}, 4, 'x'))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });
});

describe('screen sittings', () => {
  it('keeps the best run per task and scores the sitting', () => {
    let st = startSitting(emptyInterviewState(), 's', 1000);
    st = recordScreenRun(st, 's', 't1', { code: 'v1', passed: ['x'], score: 60 });
    st = recordScreenRun(st, 's', 't1', { code: 'v2', passed: [], score: 0 });
    expect(st.sittings.s!.tasks.t1).toEqual({ code: 'v2', passed: ['x'], best: 60 });
    expect(scoreSitting(screen, st.sittings.s)).toEqual({
      earned: 60,
      total: 100,
      percent: 60,
      passed: false,
    });
    st = recordScreenRun(st, 's', 't2', { code: 'w', passed: ['y'], score: 40 });
    expect(scoreSitting(screen, st.sittings.s).passed).toBe(true);
    expect(scoreSitting(screen, undefined).earned).toBe(0);
  });

  it('locks the sitting on submit and records history once', () => {
    const score = (s: Parameters<typeof scoreSitting>[1]) => scoreSitting(screen, s);
    let st = startSitting(emptyInterviewState(), 's', 1000);
    st = recordScreenRun(st, 's', 't1', { code: 'v1', passed: ['x'], score: 60 });
    st = submitSitting(st, 's', 5000, score);
    expect(st.sittings.s!.submittedAt).toBe(5000);
    expect(st.history.s).toEqual([{ at: 5000, percent: 60, passed: false }]);
    expect(submitSitting(st, 's', 6000, score)).toBe(st);
    expect(recordScreenRun(st, 's', 't2', { code: 'late', passed: ['y'], score: 40 })).toBe(st);
    expect(
      recordScreenRun(emptyInterviewState(), 's', 't1', { code: '', passed: [], score: 0 }).sittings,
    ).toEqual({});
    st = clearSitting(st, 's');
    expect(st.sittings.s).toBeUndefined();
    expect(st.history.s).toHaveLength(1);
  });
});

describe('interview store', () => {
  it('persists to storage and survives bad data', () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    const store = createInterviewStore(storage);
    let calls = 0;
    store.subscribe(() => calls++);
    store.update((s) => rateQuestion(s, 'a', 3, 1));
    expect(calls).toBe(1);
    expect(createInterviewStore(storage).getState().ratings.a?.rating).toBe(3);
    mem.set(INTERVIEW_STORAGE_KEY, '{broken');
    expect(createInterviewStore(storage).getState()).toEqual(emptyInterviewState());
    expect(parseInterviewState('null')).toEqual(emptyInterviewState());
    expect(createInterviewStore(null).getState()).toEqual(emptyInterviewState());
  });
});
