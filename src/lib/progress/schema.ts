export const STORAGE_KEY = 'mlp:v1';
export const BACKUP_KEY = 'mlp:backup';
export const SCHEMA_VERSION = 1;
export const RECENT_LIMIT = 10;

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ProgressState {
  schema: 1;
  completed: Record<string, string>;
  quiz: Record<string, { correct: boolean; attempts: number }>;
  exercises: Record<string, { revealed: boolean; passed?: boolean }>;
  projects: Record<string, boolean[]>;
  bookmarks: string[];
  recent: string[];
  theme: ThemePreference;
}

export function emptyState(): ProgressState {
  return {
    schema: SCHEMA_VERSION,
    completed: {},
    quiz: {},
    exercises: {},
    projects: {},
    bookmarks: [],
    recent: [],
    theme: 'system',
  };
}
