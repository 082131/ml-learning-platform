import type { SqlCheck, SqlGradeResult, SqlRunResult } from './types';

/** SQL that runs longer than this is stopped and the database restarted (same limit as Python). */
export const SQL_TIMEOUT_MS = 10_000;

export type SqlJob =
  | { kind: 'run'; setup: string; code: string; maxRows?: number }
  | { kind: 'grade'; setup: string; code: string; checks: SqlCheck[] };

export type SqlWorkerRequest = SqlJob & { id: number };

export type SqlWorkerMessage =
  | { id: number; type: 'running' }
  | { id: number; type: 'load-failed'; error: string }
  | { id: number; type: 'run'; result: SqlRunResult }
  | { id: number; type: 'grade'; result: SqlGradeResult };
