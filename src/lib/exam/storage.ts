import type { Attempt } from './engine';

// Exam state lives in its own localStorage key, separate from lesson progress.
export const EXAM_STORAGE_KEY = 'mlp:exams:v1';
/** Past sittings kept per track. */
export const MAX_HISTORY = 20;

export interface SittingRecord {
  at: number;
  percent: number;
  passed: boolean;
}

export interface TaskRecord {
  code: string;
  /** Names of checks that passed on the best run. */
  passed: string[];
  best: number;
  /** Revealing the solution sets the task's score to zero for this exam. */
  revealed: boolean;
}

export interface ExamState {
  attempts: Record<string, Attempt | undefined>;
  history: Record<string, SittingRecord[]>;
  tasks: Record<string, TaskRecord>;
}

export const emptyExamState = (): ExamState => ({ attempts: {}, history: {}, tasks: {} });

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function parse(raw: string | null): ExamState {
  if (!raw) return emptyExamState();
  try {
    const v = JSON.parse(raw) as Partial<ExamState>;
    if (typeof v !== 'object' || v === null) return emptyExamState();
    return { attempts: v.attempts ?? {}, history: v.history ?? {}, tasks: v.tasks ?? {} };
  } catch {
    return emptyExamState();
  }
}

export function recordSitting(state: ExamState, track: string, rec: SittingRecord): ExamState {
  const past = state.history[track] ?? [];
  return { ...state, history: { ...state.history, [track]: [rec, ...past].slice(0, MAX_HISTORY) } };
}

export function setAttempt(state: ExamState, track: string, attempt: Attempt | undefined): ExamState {
  return { ...state, attempts: { ...state.attempts, [track]: attempt } };
}

/** Keeps the best score unless the solution was revealed, which pins the task at zero. */
export function recordTaskRun(
  state: ExamState,
  id: string,
  run: { code: string; passed: string[]; score: number },
): ExamState {
  const prev = state.tasks[id];
  const revealed = prev?.revealed ?? false;
  const better = !prev || run.score > prev.best;
  const next: TaskRecord = {
    code: run.code,
    passed: better && !revealed ? run.passed : (prev?.passed ?? []),
    best: revealed ? 0 : Math.max(prev?.best ?? 0, run.score),
    revealed,
  };
  return { ...state, tasks: { ...state.tasks, [id]: next } };
}

export function revealTask(state: ExamState, id: string, code: string): ExamState {
  return { ...state, tasks: { ...state.tasks, [id]: { code, passed: [], best: 0, revealed: true } } };
}

export function resetTasks(state: ExamState, ids: string[]): ExamState {
  const tasks = { ...state.tasks };
  for (const id of ids) delete tasks[id];
  return { ...state, tasks };
}

export interface ExamStore {
  getState(): ExamState;
  subscribe(listener: () => void): () => void;
  update(fn: (s: ExamState) => ExamState): void;
}

export function createExamStore(storage: StorageLike | null): ExamStore {
  let state = emptyExamState();
  try {
    state = parse(storage?.getItem(EXAM_STORAGE_KEY) ?? null);
  } catch {
    state = emptyExamState();
  }
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    update(fn) {
      state = fn(state);
      try {
        storage?.setItem(EXAM_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage full or blocked: the exam still works for this visit.
      }
      listeners.forEach((l) => l());
    },
  };
}
