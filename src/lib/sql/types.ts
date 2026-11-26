// Types for the SQL and Analytics track (T.10): running SQL in the browser with sql.js (SQLite compiled to
// WebAssembly) and grading SQL hands-on tasks.

export type SqlValue = number | string | null | Uint8Array;

/** One statement's outcome. `columns` is empty for statements that return no rows (CREATE, INSERT, ...). */
export interface StatementResult {
  sql: string;
  columns: string[];
  rows: SqlValue[][];
  /** Rows changed by an INSERT, UPDATE or DELETE. */
  changes?: number;
  /** More rows existed than were kept. */
  truncated?: boolean;
}

export interface SqlRunResult {
  status: 'ok' | 'error' | 'timeout' | 'load-failed';
  statements: StatementResult[];
  /** SQLite's error message, or why the run was stopped. */
  message?: string;
  /** The statement that failed, when there is one. */
  failedSql?: string;
  /** Wall-clock milliseconds measured in the browser for the learner's statements. */
  ms?: number;
  /** SQLite version that ran the code, for example "3.54.1". */
  version?: string;
}

/** A graded check: SQL run after the learner's code. It passes when its first value is 1 or 'ok'; any other
 * text it returns is shown as the reason. The learner's last result set is in the temp table `answer`, with its
 * row position in `_row` (1-based). */
export interface SqlCheck {
  name: string;
  tests: string;
}

export interface SqlCheckResult {
  name: string;
  ok: boolean;
  why?: string;
}

export interface SqlGradeResult {
  status: 'ok' | 'error' | 'timeout' | 'load-failed';
  checks: SqlCheckResult[];
  message?: string;
}

/** A runnable SQL example in a lesson. */
export interface SqlExample {
  id: string;
  /** Tables loaded before the example runs (src/lib/sql/datasets.ts). */
  dataset: DatasetId;
  source: string;
}

export type DatasetId = 'shop' | 'shop-big' | 'none';

/** A query built from named steps (common table expressions), so each step's rows can be shown on its own. */
export interface SqlCteExample {
  id: string;
  dataset: DatasetId;
  /** Each step: its name and the SELECT that defines it (may read earlier steps). */
  steps: { name: string; sql: string; note: string }[];
  /** The final SELECT that reads the steps. */
  final: string;
}

/** A lesson exercise graded in SQLite: the Exercise shape plus the tables and the SQL checks. */
export interface SqlExerciseDef {
  id: string;
  prompt: string;
  dataset: DatasetId;
  starter: string;
  hints: string[];
  solution: string;
  explanation: string;
  checks: SqlCheck[];
}
