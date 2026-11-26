import type { SqlCteExample, SqlExample } from './types';

const indent = (sql: string) =>
  sql
    .trim()
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');

/** The full query: WITH step AS (...), ... final. With `upto`, it stops after that step and selects its rows. */
export function composeCte(ex: SqlCteExample, upto?: number): string {
  const last = upto ?? ex.steps.length - 1;
  const steps = ex.steps.slice(0, last + 1).map((st) => `${st.name} AS (\n${indent(st.sql)}\n)`);
  const tail = upto === undefined ? ex.final.trim() : `SELECT * FROM ${ex.steps[last]!.name}`;
  return `WITH ${steps.join(',\n')}\n${tail};`;
}

/** The composed query as a runnable example (for SqlRunner). */
export const cteAsExample = (ex: SqlCteExample): SqlExample => ({ id: ex.id, dataset: ex.dataset, source: composeCte(ex) });
