// Code for "Recursive CTEs: hierarchies and date spines". SqlRunner examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts checks the quoted values. The iteration explorer (src/lib/sql/recursion.ts) is checked
// against SQLite for every anchor and direction.
import { recursionExperiment } from '@/lib/sql/experiments';
import type { SqlExample } from '@/lib/sql/types';

export const recursionLab = recursionExperiment('sql-recursion');

export const countToFive: SqlExample = {
  id: 'count-to-five',
  dataset: 'none',
  source: `WITH RECURSIVE n(i) AS (
  SELECT 1                 -- anchor: the starting row
  UNION ALL
  SELECT i + 1 FROM n      -- step: a new row from the last one
  WHERE i < 5              -- stop condition
)
SELECT i FROM n;`,
};

export const orgChart: SqlExample = {
  id: 'org-chart',
  dataset: 'shop',
  source: `WITH RECURSIVE chart(id, name, level, path) AS (
  SELECT id, name, 0, name
  FROM employees
  WHERE manager_id IS NULL                    -- anchor: the top of the tree
  UNION ALL
  SELECT e.id, e.name, c.level + 1, c.path || ' > ' || e.name
  FROM employees AS e
  JOIN chart AS c ON e.manager_id = c.id      -- step: everyone who reports to the last rows
)
SELECT name, level, path
FROM chart
ORDER BY path;`,
};

export const chainUp: SqlExample = {
  id: 'chain-up',
  dataset: 'shop',
  source: `-- Walk upwards: Xia's manager, their manager, and so on.
WITH RECURSIVE up(id, name, manager_id, steps) AS (
  SELECT id, name, manager_id, 0 FROM employees WHERE name = 'Xia'
  UNION ALL
  SELECT m.id, m.name, m.manager_id, up.steps + 1
  FROM employees AS m
  JOIN up ON m.id = up.manager_id
)
SELECT name, steps FROM up;`,
};

export const teamSize: SqlExample = {
  id: 'team-size',
  dataset: 'shop',
  source: `-- Everyone under Sam, at any depth, and what the whole team costs.
WITH RECURSIVE team(id) AS (
  SELECT id FROM employees WHERE name = 'Sam'
  UNION ALL
  SELECT e.id FROM employees AS e JOIN team AS t ON e.manager_id = t.id
)
SELECT COUNT(*) - 1 AS reports,
       SUM(e.salary) AS team_salary
FROM team AS t
JOIN employees AS e ON e.id = t.id;`,
};

export const dateSpine: SqlExample = {
  id: 'date-spine',
  dataset: 'shop',
  source: `-- Orders per day in February, INCLUDING days with no orders.
WITH RECURSIVE days(day) AS (
  SELECT '2026-02-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM days
  WHERE day < '2026-02-28'
)
SELECT d.day, COUNT(o.id) AS orders
FROM days AS d
LEFT JOIN orders AS o ON o.order_date = d.day
GROUP BY d.day
ORDER BY d.day;`,
};

export const runaway: SqlExample = {
  id: 'runaway-guard',
  dataset: 'none',
  source: `-- Without "WHERE i < 5" this would never stop. A depth limit is a cheap safety net:
-- even if the data had a cycle (A manages B, B manages A), the walk ends.
WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM n
  WHERE i < 1000          -- hard limit
)
SELECT COUNT(*) AS rows_generated, MAX(i) AS last FROM n;`,
};
