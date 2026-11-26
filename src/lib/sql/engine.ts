// Runs SQL scripts against a sql.js database and grades hands-on tasks. Pure apart from the database it is
// given, so the browser worker and the unit tests (sql.js in Node) share every line.
import type { Database } from 'sql.js';
import type { SqlCheck, SqlCheckResult, SqlGradeResult, SqlRunResult, SqlValue, StatementResult } from './types';

/** Result sets longer than this are cut in the UI; the statement still runs to the end. */
export const MAX_ROWS = 200;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Runs every statement in `source` in order and keeps each result set. Stops at the first error. */
export function runScript(db: Database, source: string, maxRows = MAX_ROWS): SqlRunResult {
  const statements: StatementResult[] = [];
  const start = now();
  const it = db.iterateStatements(source);
  let current: string | undefined;
  try {
    for (const stmt of it) {
      current = stmt.getSQL();
      const columns = stmt.getColumnNames();
      const rows: SqlValue[][] = [];
      let truncated = false;
      while (stmt.step()) {
        if (rows.length < maxRows) rows.push(stmt.get());
        else truncated = true;
      }
      stmt.free();
      statements.push(
        columns.length > 0
          ? { sql: current, columns, rows, ...(truncated ? { truncated } : {}) }
          : { sql: current, columns, rows, changes: db.getRowsModified() },
      );
      current = undefined;
    }
  } catch (e) {
    const failed = current ?? firstStatement(it.getRemainingSQL());
    return { status: 'error', statements, message: (e as Error).message, failedSql: failed, ms: now() - start };
  }
  return { status: 'ok', statements, ms: now() - start };
}

/** The first statement of the SQL that failed to compile, for the error message. */
function firstStatement(sql: string): string {
  const trimmed = sql.trim();
  const semi = trimmed.indexOf(';');
  return semi === -1 ? trimmed : trimmed.slice(0, semi + 1);
}

/** The result sets a script produced (statements that return columns). */
export const resultSets = (r: SqlRunResult) => r.statements.filter((s) => s.columns.length > 0);

/** Column names made unique (`id`, `id_2`) so a result with repeated names can be stored as a table. */
export function uniqueColumns(columns: string[]): string[] {
  const seen = new Map<string, number>();
  return columns.map((c) => {
    const key = c.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? c : `${c}_${n}`;
  });
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Stores the learner's last result set as the temp table `answer` (with `_row` = 1-based position). */
export function storeAnswer(db: Database, last: StatementResult | undefined) {
  db.run('DROP TABLE IF EXISTS temp.answer');
  const cols = uniqueColumns(last?.columns ?? []).filter((c) => c.toLowerCase() !== '_row');
  db.run(`CREATE TEMP TABLE answer (_row INTEGER${cols.map((c) => `, ${quoteIdent(c)}`).join('')})`);
  if (!last) return;
  const keep = uniqueColumns(last.columns).map((c) => c.toLowerCase() !== '_row');
  const marks = ['?', ...cols.map(() => '?')].join(', ');
  last.rows.forEach((row, i) => db.run(`INSERT INTO temp.answer VALUES (${marks})`, [i + 1, ...row.filter((_, j) => keep[j])]));
}

/** Passes on 1 or 'ok'. Any other value (or no row) fails; text is shown to the learner as the reason. */
export function checkVerdict(value: SqlValue | undefined): { ok: boolean; why?: string } {
  if (value === 1 || value === 'ok') return { ok: true };
  if (typeof value === 'string') return { ok: false, why: value };
  return { ok: false };
}

/** Runs `setup`, then the learner's `code`, then every check against the database and `answer`. */
export function gradeScript(db: Database, setup: string, code: string, checks: SqlCheck[]): SqlGradeResult {
  if (setup) db.exec(setup);
  const run = runScript(db, code, Number.MAX_SAFE_INTEGER);
  if (run.status !== 'ok') {
    const why = `Your SQL failed: ${run.message}`;
    return { status: 'error', message: run.message, checks: checks.map((c) => ({ name: c.name, ok: false, why })) };
  }
  storeAnswer(db, resultSets(run).at(-1));
  const results: SqlCheckResult[] = checks.map((c) => {
    try {
      const out = db.exec(c.tests);
      return { name: c.name, ...checkVerdict(out[0]?.values[0]?.[0] as SqlValue | undefined) };
    } catch (e) {
      return { name: c.name, ok: false, why: (e as Error).message };
    }
  });
  return { status: 'ok', checks: results };
}

/** How a value is shown in a result table: NULL spelled out, floats without binary noise. */
export function formatValue(v: SqlValue): string {
  if (v === null) return 'NULL';
  if (v instanceof Uint8Array) return `<blob ${v.length} bytes>`;
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Number(v.toPrecision(12)));
  return String(v);
}
