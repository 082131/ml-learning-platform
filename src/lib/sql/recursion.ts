// How SQLite evaluates WITH RECURSIVE over the employees table, iteration by iteration: the anchor rows, then
// the recursive step applied to the rows added in the previous iteration, until a step adds nothing.
// recursion.test.ts checks the rows against SQLite.

export interface Employee {
  id: number;
  name: string;
  managerId: number | null;
}

export const EMPLOYEES: Employee[] = [
  { id: 1, name: 'Rosa', managerId: null },
  { id: 2, name: 'Sam', managerId: 1 },
  { id: 3, name: 'Tara', managerId: 1 },
  { id: 4, name: 'Uma', managerId: 2 },
  { id: 5, name: 'Vic', managerId: 2 },
  { id: 6, name: 'Wen', managerId: 3 },
  { id: 7, name: 'Xia', managerId: 4 },
];

export type Direction = 'down' | 'up';

export interface RecursionResult {
  /** iterations[0] is the anchor; each later entry holds the rows that step added. */
  iterations: { name: string; level: number }[][];
  total: number;
  sql: string;
}

export function recursionSql(start: string, dir: Direction): string {
  return dir === 'down'
    ? `WITH RECURSIVE team(id, name, level) AS (\n  SELECT id, name, 0 FROM employees WHERE name = '${start}'   -- anchor\n  UNION ALL\n  SELECT e.id, e.name, t.level + 1                         -- step\n  FROM employees AS e\n  JOIN team AS t ON e.manager_id = t.id\n)\nSELECT name, level FROM team;`
    : `WITH RECURSIVE chain(id, name, manager_id, level) AS (\n  SELECT id, name, manager_id, 0 FROM employees WHERE name = '${start}'   -- anchor\n  UNION ALL\n  SELECT m.id, m.name, m.manager_id, c.level + 1                         -- step\n  FROM employees AS m\n  JOIN chain AS c ON m.id = c.manager_id\n)\nSELECT name, level FROM chain;`;
}

export function recurse(start: string, dir: Direction, people: Employee[] = EMPLOYEES): RecursionResult {
  const anchor = people.filter((p) => p.name === start);
  const iterations: { name: string; level: number }[][] = [anchor.map((p) => ({ name: p.name, level: 0 }))];
  let frontier = anchor;
  for (let level = 1; frontier.length > 0 && level < 100; level++) {
    const next =
      dir === 'down'
        ? people.filter((p) => frontier.some((f) => p.managerId === f.id))
        : people.filter((p) => frontier.some((f) => f.managerId === p.id));
    iterations.push(next.map((p) => ({ name: p.name, level })));
    frontier = next;
  }
  return { iterations, total: iterations.flat().length, sql: recursionSql(start, dir) };
}
