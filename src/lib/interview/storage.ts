// Interview prep state lives in its own localStorage key, separate from lessons and certification exams.
export const INTERVIEW_STORAGE_KEY = 'mlp:interview:v1';
/** Past screen results kept per screen. */
export const MAX_SCREEN_HISTORY = 20;

/** Self-rating after revealing a model answer: 1 missed it, 2 partly, 3 nailed it. */
export type Rating = 1 | 2 | 3;

export interface RatingRecord {
  rating: Rating;
  at: number;
  /** How many times this question has been rated. */
  times: number;
}

export interface ScreenTaskRecord {
  code: string;
  /** Names of checks that passed on the best run. */
  passed: string[];
  best: number;
}

/** One sitting of a timed coding screen. */
export interface ScreenSitting {
  startedAt: number;
  submittedAt?: number;
  tasks: Record<string, ScreenTaskRecord>;
}

export interface ScreenResult {
  at: number;
  percent: number;
  passed: boolean;
}

export interface InterviewState {
  ratings: Record<string, RatingRecord>;
  sittings: Record<string, ScreenSitting | undefined>;
  history: Record<string, ScreenResult[]>;
}

export const emptyInterviewState = (): InterviewState => ({ ratings: {}, sittings: {}, history: {} });

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function parseInterviewState(raw: string | null): InterviewState {
  if (!raw) return emptyInterviewState();
  try {
    const v = JSON.parse(raw) as Partial<InterviewState>;
    if (typeof v !== 'object' || v === null) return emptyInterviewState();
    return { ratings: v.ratings ?? {}, sittings: v.sittings ?? {}, history: v.history ?? {} };
  } catch {
    return emptyInterviewState();
  }
}

export function rateQuestion(state: InterviewState, id: string, rating: Rating, now: number): InterviewState {
  const times = (state.ratings[id]?.times ?? 0) + 1;
  return { ...state, ratings: { ...state.ratings, [id]: { rating, at: now, times } } };
}

export function clearRatings(state: InterviewState, ids: string[]): InterviewState {
  const ratings = { ...state.ratings };
  for (const id of ids) delete ratings[id];
  return { ...state, ratings };
}

export function startSitting(state: InterviewState, screen: string, now: number): InterviewState {
  return { ...state, sittings: { ...state.sittings, [screen]: { startedAt: now, tasks: {} } } };
}

export function clearSitting(state: InterviewState, screen: string): InterviewState {
  return { ...state, sittings: { ...state.sittings, [screen]: undefined } };
}

/** Saves a graded run. The best score per task counts; nothing is recorded once the sitting is submitted. */
export function recordScreenRun(
  state: InterviewState,
  screen: string,
  task: string,
  run: { code: string; passed: string[]; score: number },
): InterviewState {
  const sitting = state.sittings[screen];
  if (!sitting || sitting.submittedAt !== undefined) return state;
  const prev = sitting.tasks[task];
  const better = !prev || run.score > prev.best;
  const next: ScreenTaskRecord = {
    code: run.code,
    passed: better ? run.passed : prev.passed,
    best: better ? run.score : prev.best,
  };
  return {
    ...state,
    sittings: { ...state.sittings, [screen]: { ...sitting, tasks: { ...sitting.tasks, [task]: next } } },
  };
}

/** Ends the sitting and adds its result to the history. A second submit changes nothing. */
export function submitSitting(
  state: InterviewState,
  screen: string,
  now: number,
  score: (sitting: ScreenSitting) => { percent: number; passed: boolean },
): InterviewState {
  const sitting = state.sittings[screen];
  if (!sitting || sitting.submittedAt !== undefined) return state;
  const done = { ...sitting, submittedAt: now };
  const past = state.history[screen] ?? [];
  const { percent, passed } = score(done);
  return {
    ...state,
    sittings: { ...state.sittings, [screen]: done },
    history: {
      ...state.history,
      [screen]: [{ at: now, percent, passed }, ...past].slice(0, MAX_SCREEN_HISTORY),
    },
  };
}

export interface InterviewStore {
  getState(): InterviewState;
  subscribe(listener: () => void): () => void;
  update(fn: (s: InterviewState) => InterviewState): void;
}

export function createInterviewStore(storage: StorageLike | null): InterviewStore {
  let state = emptyInterviewState();
  try {
    state = parseInterviewState(storage?.getItem(INTERVIEW_STORAGE_KEY) ?? null);
  } catch {
    state = emptyInterviewState();
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
        storage?.setItem(INTERVIEW_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage full or blocked: practice still works for this visit.
      }
      listeners.forEach((l) => l());
    },
  };
}
