import { emptyState, RECENT_LIMIT, SCHEMA_VERSION, type ProgressState, type ThemePreference } from './schema';

type Raw = Record<string, unknown>;

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isRecord(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickEntries<T>(v: unknown, keep: (value: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isRecord(v)) return out;
  for (const [key, value] of Object.entries(v)) {
    const kept = keep(value);
    if (kept !== undefined) out[key] = kept;
  }
  return out;
}

function uniqueStrings(v: unknown, limit = Infinity): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string'))].slice(0, limit);
}

/**
 * Turns stored data into a valid ProgressState.
 * Data without a schema field is read as schema 1. Invalid entries are dropped, not fatal.
 * Returns null when the data is unusable (not an object, or written by a newer schema).
 */
export function migrate(raw: unknown): ProgressState | null {
  if (!isRecord(raw)) return null;
  const version = raw.schema ?? SCHEMA_VERSION;
  if (version !== SCHEMA_VERSION) return null;

  const base = emptyState();
  return {
    ...base,
    completed: pickEntries(raw.completed, (v) => (typeof v === 'string' ? v : undefined)),
    quiz: pickEntries(raw.quiz, (v) =>
      isRecord(v) &&
      typeof v.correct === 'boolean' &&
      Number.isInteger(v.attempts) &&
      (v.attempts as number) >= 0
        ? { correct: v.correct, attempts: v.attempts as number }
        : undefined,
    ),
    exercises: pickEntries(raw.exercises, (v) => {
      if (!isRecord(v) || typeof v.revealed !== 'boolean') return undefined;
      return typeof v.passed === 'boolean'
        ? { revealed: v.revealed, passed: v.passed }
        : { revealed: v.revealed };
    }),
    projects: pickEntries(raw.projects, (v) =>
      Array.isArray(v) && v.every((x) => typeof x === 'boolean') ? (v as boolean[]) : undefined,
    ),
    bookmarks: uniqueStrings(raw.bookmarks),
    recent: uniqueStrings(raw.recent, RECENT_LIMIT),
    theme: THEMES.includes(raw.theme as ThemePreference) ? (raw.theme as ThemePreference) : base.theme,
  };
}
