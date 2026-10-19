import { emptyState, RECENT_LIMIT, type ProgressState, type ThemePreference } from './schema';

// Pure state transitions. Each returns the same object when nothing changes.

export function setComplete(s: ProgressState, lessonId: string, done: boolean, now: Date): ProgressState {
  const isDone = lessonId in s.completed;
  if (done === isDone) return s;
  const completed = { ...s.completed };
  if (done) completed[lessonId] = now.toISOString();
  else delete completed[lessonId];
  return { ...s, completed };
}

export function toggleBookmark(s: ProgressState, lessonId: string): ProgressState {
  const bookmarks = s.bookmarks.includes(lessonId)
    ? s.bookmarks.filter((id) => id !== lessonId)
    : [...s.bookmarks, lessonId];
  return { ...s, bookmarks };
}

export function recordView(s: ProgressState, lessonId: string): ProgressState {
  if (s.recent[0] === lessonId) return s;
  const recent = [lessonId, ...s.recent.filter((id) => id !== lessonId)].slice(0, RECENT_LIMIT);
  return { ...s, recent };
}

export function recordQuiz(
  s: ProgressState,
  lessonId: string,
  questionId: string,
  correct: boolean,
): ProgressState {
  const key = `${lessonId}#${questionId}`;
  const prev = s.quiz[key];
  return { ...s, quiz: { ...s.quiz, [key]: { correct, attempts: (prev?.attempts ?? 0) + 1 } } };
}

export function recordExercise(
  s: ProgressState,
  key: string,
  patch: { revealed?: boolean; passed?: boolean },
): ProgressState {
  const prev = s.exercises[key] ?? { revealed: false };
  return { ...s, exercises: { ...s.exercises, [key]: { ...prev, ...patch } } };
}

export function setProjectItem(
  s: ProgressState,
  lessonId: string,
  index: number,
  checked: boolean,
  length: number,
): ProgressState {
  const items = Array.from({ length }, (_, i) => s.projects[lessonId]?.[i] ?? false);
  if (index < 0 || index >= length) return s;
  items[index] = checked;
  return { ...s, projects: { ...s.projects, [lessonId]: items } };
}

export function setTheme(s: ProgressState, theme: ThemePreference): ProgressState {
  return s.theme === theme ? s : { ...s, theme };
}

/** Clears learning progress. The theme is a preference, not progress, so it is kept. */
export function resetProgress(s: ProgressState): ProgressState {
  return { ...emptyState(), theme: s.theme };
}
