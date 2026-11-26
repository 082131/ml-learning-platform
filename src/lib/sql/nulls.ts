// SQL's three-valued logic, evaluated in TypeScript for the NULL explorer. nulls.test.ts checks every condition
// against SQLite. A truth value is 1 (TRUE), 0 (FALSE) or null (UNKNOWN), exactly as SQLite returns them.

export type Tv = 1 | 0 | null;

export const tvEq = (a: string | null, b: string | null): Tv => (a === null || b === null ? null : a === b ? 1 : 0);
export const tvNot = (a: Tv): Tv => (a === null ? null : a === 1 ? 0 : 1);
export const tvAnd = (a: Tv, b: Tv): Tv => (a === 0 || b === 0 ? 0 : a === null || b === null ? null : 1);
export const tvOr = (a: Tv, b: Tv): Tv => (a === 1 || b === 1 ? 1 : a === null || b === null ? null : 0);

export const tvLabel = (v: Tv) => (v === 1 ? 'TRUE' : v === 0 ? 'FALSE' : 'UNKNOWN');

/** The customers of the shop dataset with their cities (Fay has none). */
export const CUSTOMER_CITIES: { name: string; city: string | null }[] = [
  { name: 'Ada', city: 'London' },
  { name: 'Ben', city: 'Paris' },
  { name: 'Chen', city: 'London' },
  { name: 'Dana', city: 'Berlin' },
  { name: 'Eli', city: 'Paris' },
  { name: 'Fay', city: null },
  { name: 'Gus', city: 'Berlin' },
  { name: 'Hana', city: 'London' },
];

export interface NullCondition {
  id: string;
  sql: string;
  evaluate: (city: string | null) => Tv;
}

const L = 'London';
export const NULL_CONDITIONS: NullCondition[] = [
  { id: 'eq', sql: "city = 'London'", evaluate: (c) => tvEq(c, L) },
  { id: 'ne', sql: "city <> 'London'", evaluate: (c) => tvNot(tvEq(c, L)) },
  { id: 'not-eq', sql: "NOT (city = 'London')", evaluate: (c) => tvNot(tvEq(c, L)) },
  { id: 'or-null', sql: "city <> 'London' OR city IS NULL", evaluate: (c) => tvOr(tvNot(tvEq(c, L)), c === null ? 1 : 0) },
  { id: 'distinct', sql: "city IS DISTINCT FROM 'London'", evaluate: (c) => (c === L ? 0 : 1) },
  { id: 'coalesce', sql: "COALESCE(city, 'unknown') <> 'London'", evaluate: (c) => tvNot(tvEq(c ?? 'unknown', L)) },
  { id: 'eq-null', sql: 'city = NULL', evaluate: (c) => tvEq(c, null) },
  { id: 'is-null', sql: 'city IS NULL', evaluate: (c) => (c === null ? 1 : 0) },
  { id: 'not-in', sql: "city NOT IN ('London', NULL)", evaluate: (c) => tvAnd(tvNot(tvEq(c, L)), tvNot(tvEq(c, null))) },
];

export interface NullFilterResult {
  sql: string;
  rows: { name: string; city: string | null; value: Tv; kept: boolean }[];
  kept: number;
  unknown: number;
}

/** WHERE keeps a row only when its condition is TRUE; FALSE and UNKNOWN both drop it. */
export function nullFilter(conditionId: string): NullFilterResult {
  const cond = NULL_CONDITIONS.find((c) => c.id === conditionId) ?? NULL_CONDITIONS[0]!;
  const rows = CUSTOMER_CITIES.map((r) => {
    const value = cond.evaluate(r.city);
    return { ...r, value, kept: value === 1 };
  });
  return { sql: cond.sql, rows, kept: rows.filter((r) => r.kept).length, unknown: rows.filter((r) => r.value === null).length };
}
