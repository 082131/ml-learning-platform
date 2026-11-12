import { describe, expect, it } from 'vitest';
import { analyzeBalance } from './balance';
import {
  choose,
  chooseCount,
  formatClock,
  gradeAttempt,
  startAttempt,
  submit,
  taskScore,
  timeLeft,
  toggleFlag,
} from './engine';
import { emptyExamState, recordTaskRun, revealTask, createExamStore, EXAM_STORAGE_KEY } from './storage';
import { q } from './define';
import type { ExamDef } from './types';

const items = [
  q('a', 'd1', 'Pick one', ['one', 'two', 'six', 'ten'], [2], 'because'),
  q('b', 'd1', 'Pick two (Choose two.)', ['red', 'tan', 'sky', 'jet', 'fox'], [0, 3], 'because'),
  q('c', 'd2', 'Pick one', ['aaa', 'bbb', 'ccc', 'ddd'], [0], 'because'),
];
const exam: ExamDef = {
  track: 'ml',
  title: 't',
  summary: 's',
  certifications: [],
  domains: [
    { id: 'd1', title: 'D1', count: 2, maps: '' },
    { id: 'd2', title: 'D2', count: 1, maps: '' },
  ],
  minutes: 10,
  passPercent: 60,
  questions: items,
  handsOn: { minutes: 1, passPercent: 70, tasks: [] },
};

describe('exam engine', () => {
  it('shuffles question and option order deterministically per seed', () => {
    const a = startAttempt(exam, 's1', 0);
    expect(startAttempt(exam, 's1', 0)).toEqual(a);
    expect([...a.order].sort()).toEqual(['a', 'b', 'c']);
    expect([...a.optionOrder.b!].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('replaces single answers and caps multi answers at N', () => {
    let a = startAttempt(exam, 's', 0);
    a = choose(choose(a, items[0]!, 1), items[0]!, 2);
    expect(a.answers.a).toEqual([2]);
    a = choose(choose(choose(a, items[1]!, 0), items[1]!, 3), items[1]!, 4);
    expect(a.answers.b).toEqual([0, 3]);
    a = choose(a, items[1]!, 0);
    expect(a.answers.b).toEqual([3]);
  });

  it('grades all-or-nothing and by domain, and locks after submit', () => {
    let a = startAttempt(exam, 's', 0);
    a = choose(a, items[0]!, 2);
    a = choose(a, items[1]!, 0); // half of a choose-two item
    a = submit(a, 5);
    expect(choose(a, items[2]!, 0)).toBe(a);
    const r = gradeAttempt(exam, a);
    expect(r.correct).toBe(1);
    expect(r.answered).toBe(2);
    expect(r.percent).toBeCloseTo(33.3);
    expect(r.passed).toBe(false);
    expect(r.byDomain).toEqual([
      { id: 'd1', title: 'D1', correct: 1, total: 2 },
      { id: 'd2', title: 'D2', correct: 0, total: 1 },
    ]);
  });

  it('counts time down and formats the clock', () => {
    const a = startAttempt(exam, 's', 1000);
    expect(timeLeft(a, 10, 1000)).toBe(600_000);
    expect(timeLeft(a, 10, 10_000_000)).toBe(0);
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(3 * 3600_000 + 5000)).toBe('3:00:05');
  });

  it('reads "(Choose N.)" and toggles flags', () => {
    expect(chooseCount('x (Choose two.)')).toBe(2);
    expect(chooseCount('x (Choose three.)')).toBe(3);
    expect(chooseCount('plain')).toBe(1);
    const a = toggleFlag(startAttempt(exam, 's', 0), 'a');
    expect(a.flagged).toEqual(['a']);
    expect(toggleFlag(a, 'a').flagged).toEqual([]);
  });
});

describe('length balance', () => {
  it('flags a correct option that is much longer than the distractors', () => {
    const r = analyzeBalance([
      q('x', 'd', 'p', ['short', 'tiny', 'a much much longer correct answer', 'small'], [2], 'e'),
    ]);
    expect(r.issues.some((i) => i.startsWith('x:'))).toBe(true);
  });
  it('flags "all of the above"', () => {
    const r = analyzeBalance([q('y', 'd', 'p', ['alpha', 'gamma', 'delta', 'All of the above'], [0], 'e')]);
    expect(r.issues.some((i) => i.includes('avoid'))).toBe(true);
  });
});

describe('exam storage', () => {
  const task = {
    id: 't',
    title: 't',
    domain: 'd',
    brief: '',
    starter: '',
    solution: '',
    checks: [
      { name: 'a', points: 6, tests: '' },
      { name: 'b', points: 4, tests: '' },
    ],
  };
  it('keeps the best hands-on score and zeroes it after a reveal', () => {
    expect(taskScore(task, ['a', 'b'])).toBe(10);
    let st = recordTaskRun(emptyExamState(), 't', { code: 'x', passed: ['a'], score: 6 });
    st = recordTaskRun(st, 't', { code: 'y', passed: [], score: 0 });
    expect(st.tasks.t).toMatchObject({ best: 6, code: 'y', passed: ['a'] });
    st = revealTask(st, 't', 'y');
    st = recordTaskRun(st, 't', { code: 'z', passed: ['a', 'b'], score: 10 });
    expect(st.tasks.t).toMatchObject({ best: 0, revealed: true });
  });
  it('persists to storage and survives corrupt data', () => {
    const mem = new Map<string, string>([[EXAM_STORAGE_KEY, '{nope']]);
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    const store = createExamStore(storage);
    expect(store.getState()).toEqual(emptyExamState());
    store.update((s) => recordTaskRun(s, 't', { code: 'c', passed: [], score: 0 }));
    expect(createExamStore(storage).getState().tasks.t?.code).toBe('c');
  });
});
