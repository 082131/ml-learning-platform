// Builders for graded SQL checks (see SqlCheck). Each returns SQL that yields 'ok' or a message saying what is
// wrong, run against the learner's result in the temp table `answer` (row position in `_row`).
import type { SqlCheck } from './types';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** The result has exactly `n` rows. */
export const rowCount = (n: number, name = `returns ${n} row${n === 1 ? '' : 's'}`): SqlCheck => ({
  name,
  tests: `SELECT CASE WHEN COUNT(*) = ${n} THEN 'ok' ELSE 'expected ${n} row${n === 1 ? '' : 's'}, got ' || COUNT(*) END FROM answer`,
});

/** The result has these columns (by name, any case, any position; extra columns allowed). */
export const hasColumns = (cols: string[], name = `has the columns ${cols.join(', ')}`): SqlCheck => ({
  name,
  tests: `SELECT CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('answer', 'temp') WHERE lower(name) IN (${cols.map((c) => q(c.toLowerCase())).join(', ')})) = ${cols.length}
  THEN 'ok' ELSE ${q(`the result needs the columns ${cols.join(', ')} (name them with AS)`)} END`,
});

/** The rows (these columns, any order) are the same as `reference` returns. Numbers are compared rounded to
 * `digits` decimals so 17.666666 and 17.67 count as the same. */
export function sameRows(cols: string[], reference: string, name = 'returns the right rows', digits = 2): SqlCheck {
  const pick = cols.map((c) => `CASE WHEN typeof(${ident(c)}) IN ('integer', 'real') THEN ROUND(${ident(c)}, ${digits}) ELSE ${ident(c)} END`).join(', ');
  const ref = `SELECT ${pick} FROM (${reference.trim().replace(/;$/, '')})`;
  const mine = `SELECT ${pick} FROM answer`;
  return {
    name,
    tests: `SELECT CASE
  WHEN (SELECT COUNT(*) FROM answer) <> (SELECT COUNT(*) FROM (${reference.trim().replace(/;$/, '')})) THEN 'expected ' || (SELECT COUNT(*) FROM (${reference.trim().replace(/;$/, '')})) || ' rows, got ' || (SELECT COUNT(*) FROM answer)
  WHEN EXISTS (${mine} EXCEPT ${ref}) THEN 'some rows are not in the expected answer'
  WHEN EXISTS (${ref} EXCEPT ${mine}) THEN 'some expected rows are missing'
  ELSE 'ok' END`,
  };
}

/** Column `col`, read top to bottom, is exactly `values` (checks ORDER BY). */
export const orderIs = (col: string, values: (string | number)[], name = 'rows are in the right order'): SqlCheck => ({
  name,
  tests: `SELECT CASE WHEN group_concat(${ident(col)}, '|' ORDER BY _row) = ${q(values.join('|'))} THEN 'ok'
  ELSE 'expected ${col} in the order ${values.join(', ').replace(/'/g, "''")}, got ' || COALESCE(group_concat(${ident(col)}, ', ' ORDER BY _row), 'no rows') END FROM answer`,
});

/** Some row's `col` matches the LIKE `pattern` (or, with `present` false, no row does). Used to grade query
 * plans: EXPLAIN QUERY PLAN rows have a `detail` column. */
export const someRowLike = (col: string, pattern: string, why: string, name: string, present = true): SqlCheck => ({
  name,
  tests: `SELECT CASE WHEN ${present ? '' : 'NOT '}EXISTS (SELECT 1 FROM answer WHERE ${ident(col)} LIKE ${q(pattern)}) THEN 'ok' ELSE ${q(why)} END`,
});
