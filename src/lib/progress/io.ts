import { parseExamState, type ExamState } from '@/lib/exam/storage';
import { parseInterviewState, type InterviewState } from '@/lib/interview/storage';
import { migrate } from './migrate';
import type { ProgressState } from './schema';

// A backup file holds everything this site saves in the browser: lesson progress (with quiz
// results, bookmarks and theme), certification exam results and interview practice. It is the way
// to carry progress between devices when the site is not opened inside Claude.

export const BACKUP_KIND = 'ml-learning-platform-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  progress: ProgressState;
  exams?: ExamState;
  interview?: InterviewState;
}

export function exportBackup(b: Backup, now = new Date()): string {
  return JSON.stringify(
    {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      progress: b.progress,
      exams: b.exams,
      interview: b.interview,
    },
    null,
    2,
  );
}

/** Lesson progress only. Kept so older tests and callers still work. */
export function exportProgress(s: ProgressState): string {
  return JSON.stringify(s, null, 2);
}

export type ImportResult = { ok: true; backup: Backup } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Reads a backup file. Accepts the full backup format and the older progress-only export.
 * Exam and interview data are only returned when the file has them, so an old file never wipes them.
 */
export function importBackup(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  const notOurs = { ok: false, error: 'The file is not a progress export from this site.' } as const;
  if (isObject(raw) && raw.kind === BACKUP_KIND) {
    if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
      return { ok: false, error: 'The file was made by a newer version of this site. Reload the page and try again.' };
    }
    const progress = migrate(raw.progress);
    if (!progress) return notOurs;
    const backup: Backup = { progress };
    if (isObject(raw.exams)) backup.exams = parseExamState(JSON.stringify(raw.exams));
    if (isObject(raw.interview)) backup.interview = parseInterviewState(JSON.stringify(raw.interview));
    return { ok: true, backup };
  }
  const progress = migrate(raw);
  if (!progress) return notOurs;
  return { ok: true, backup: { progress } };
}

/** Lesson progress only, from either file format. */
export function importProgress(text: string): { ok: true; state: ProgressState } | { ok: false; error: string } {
  const r = importBackup(text);
  return r.ok ? { ok: true, state: r.backup.progress } : r;
}
