import { migrate } from './migrate';
import type { ProgressState } from './schema';

export function exportProgress(s: ProgressState): string {
  return JSON.stringify(s, null, 2);
}

export type ImportResult = { ok: true; state: ProgressState } | { ok: false; error: string };

export function importProgress(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  const state = migrate(raw);
  if (!state) return { ok: false, error: 'The file is not a progress export from this site.' };
  return { ok: true, state };
}
