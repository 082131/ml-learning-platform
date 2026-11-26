// Opens sql.js databases in Node for unit and content tests (the browser uses src/workers/sql.worker.ts).
import { createRequire } from 'node:module';
import type { Database, SqlJsStatic } from 'sql.js';
import { DATASETS } from './datasets';
import type { DatasetId } from './types';

let sql: Promise<SqlJsStatic> | undefined;

export async function openTestDb(dataset: DatasetId = 'none'): Promise<Database> {
  const require = createRequire(import.meta.url);
  sql ??= (require('sql.js') as (c?: object) => Promise<SqlJsStatic>)();
  const db = new (await sql).Database();
  if (DATASETS[dataset].sql) db.exec(DATASETS[dataset].sql);
  return db;
}

/** A SqlRunner backed by sql.js in Node, for component tests (same engine code as the worker). */
export function testSqlRunner(): import('./client').SqlRunner {
  return {
    async run(setup, code, maxRows) {
      const { runScript } = await import('./engine');
      const db = await openTestDb();
      if (setup) db.exec(setup);
      const version = String(db.exec('SELECT sqlite_version()')[0]!.values[0]![0]);
      return { ...runScript(db, code, maxRows), version };
    },
    async grade(setup, code, checks) {
      const { gradeScript } = await import('./engine');
      return gradeScript(await openTestDb(), setup, code, checks);
    },
  };
}
