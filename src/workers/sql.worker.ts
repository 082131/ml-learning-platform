/// <reference lib="webworker" />
// Runs learner SQL in SQLite (sql.js, WebAssembly) off the main thread. Bundled with the site, so it works
// offline. Every job gets a fresh in-memory database: setup, then the learner's code.
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { gradeScript, runScript } from '@/lib/sql/engine';
import type { SqlWorkerMessage, SqlWorkerRequest } from '@/lib/sql/protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (message: SqlWorkerMessage) => scope.postMessage(message);
let engine: Promise<SqlJsStatic> | undefined;
let version: string | undefined;

scope.onmessage = async ({ data }: MessageEvent<SqlWorkerRequest>) => {
  let SQL: SqlJsStatic;
  try {
    engine ??= initSqlJs({ locateFile: () => wasmUrl });
    SQL = await engine;
  } catch (e) {
    engine = undefined;
    post({ id: data.id, type: 'load-failed', error: `SQLite couldn’t load (${(e as Error).message}).` });
    return;
  }
  const db = new SQL.Database();
  try {
    version ??= String(db.exec('SELECT sqlite_version()')[0]?.values[0]?.[0]);
    post({ id: data.id, type: 'running' });
    if (data.kind === 'grade') {
      post({ id: data.id, type: 'grade', result: gradeScript(db, data.setup, data.code, data.checks) });
      return;
    }
    if (data.setup) db.exec(data.setup);
    post({ id: data.id, type: 'run', result: { ...runScript(db, data.code, data.maxRows), version } });
  } catch (e) {
    const message = (e as Error).message;
    if (data.kind === 'grade')
      post({ id: data.id, type: 'grade', result: { status: 'error', message, checks: data.checks.map((c) => ({ name: c.name, ok: false, why: message })) } });
    else post({ id: data.id, type: 'run', result: { status: 'error', statements: [], message } });
  } finally {
    db.close();
  }
};
