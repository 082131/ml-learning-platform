import { createContext, useContext } from 'react';
import { createSqlRunner, type SqlRunner, type SqlWorkerLike } from '@/lib/sql/client';

/** One shared SQLite worker for the app, created on the first query. */
const appRunner = createSqlRunner(
  () => new Worker(new URL('../../../workers/sql.worker.ts', import.meta.url), { type: 'module' }) as unknown as SqlWorkerLike,
);

/** Tests provide a runner backed by sql.js in Node. */
export const SqlRunnerContext = createContext<SqlRunner>(appRunner);

export const useSqlRunner = (): SqlRunner => useContext(SqlRunnerContext);
