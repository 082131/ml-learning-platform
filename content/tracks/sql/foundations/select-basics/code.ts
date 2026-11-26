// Code for "Tables, rows and your first query". Every SqlRunner example runs in SQLite 3.54 (sql.js 1.16) in the
// browser; content/tracks/sql/sql-outputs.test.ts runs them in Node with the same engine and checks the numbers
// the prose quotes. The pipeline explorer uses src/lib/sql/pipeline.ts, checked against SQLite for every setting.
import { pipelineExperiment } from '@/lib/sql/experiments';
import type { PipelineState } from '@/lib/sql/pipeline';
import type { SqlExample } from '@/lib/sql/types';
import type { CodeExample } from '@/lib/types';

export const pipeline = pipelineExperiment('sql-pipeline', false);

export const pipelineSql: CodeExample = {
  id: 'pipeline-sql',
  language: 'sql',
  source: `-- Evaluated as: 1 FROM, 2 WHERE, 3 SELECT, 4 ORDER BY, 5 LIMIT
SELECT name, price
FROM products
WHERE price >= {{min}}
ORDER BY price DESC
LIMIT {{limit}};`,
  slots: {
    min: (s) => String((s as PipelineState).minPrice),
    limit: (s) => String((s as PipelineState).limit),
  },
  annotations: [
    {
      id: 'select',
      range: { line: 2, startCol: 0, endCol: 6 },
      match: 'SELECT',
      kind: 'syntax',
      title: 'SELECT: the columns of the answer',
      what: 'Lists the columns (or calculations) the result should have, separated by commas.',
      why: 'It is written first because it describes the shape of the answer, but it is evaluated third, after the rows have been chosen.',
    },
    {
      id: 'from',
      range: { line: 3, startCol: 0, endCol: 4 },
      match: 'FROM',
      kind: 'syntax',
      title: 'FROM: where the rows come from',
      what: 'Names the table to read. Every later clause works on the rows this produces.',
      why: 'Evaluated first: nothing else can happen before there are rows to work on.',
    },
    {
      id: 'where',
      range: { line: 4, startCol: 0, endCol: 5 },
      match: 'WHERE',
      kind: 'syntax',
      title: 'WHERE: a test for each row',
      what: 'Keeps a row only if the condition is true for that row alone.',
      why: 'Throwing rows away early means every later stage has less to do.',
    },
    {
      id: 'order',
      range: { line: 5, startCol: 0, endCol: 8 },
      match: 'ORDER BY',
      kind: 'syntax',
      title: 'ORDER BY: the only guarantee of order',
      what: 'Sorts the result; DESC means largest first (ASC, the default, is smallest first).',
      why: 'Without it the database may return rows in any order, and that order can change between runs.',
    },
    {
      id: 'limit',
      range: { line: 6, startCol: 0, endCol: 5 },
      match: 'LIMIT',
      kind: 'syntax',
      title: 'LIMIT: cut the sorted list',
      what: 'Returns at most this many rows.',
      why: 'It runs last, so "LIMIT 2" after "ORDER BY price DESC" means "the two most expensive".',
    },
  ],
};

export const everything: SqlExample = {
  id: 'select-star',
  dataset: 'shop',
  source: `-- Every column (*) of every row of the customers table.
SELECT * FROM customers;`,
};

export const londoners: SqlExample = {
  id: 'londoners',
  dataset: 'shop',
  source: `SELECT name, city
FROM customers
WHERE city = 'London';`,
};

export const vatPrices: SqlExample = {
  id: 'vat-prices',
  dataset: 'shop',
  source: `SELECT name,
       price,
       ROUND(price * 1.2, 2) AS price_with_vat
FROM products
WHERE category = 'home'
ORDER BY price DESC;`,
};

export const februaryOrders: SqlExample = {
  id: 'february-orders',
  dataset: 'shop',
  source: `-- Orders placed in February that were shipped or returned.
SELECT id, order_date, status
FROM orders
WHERE order_date >= '2026-02-01'
  AND order_date <  '2026-03-01'
  AND status IN ('shipped', 'returned')
ORDER BY order_date;`,
};

export const distinctCities: SqlExample = {
  id: 'distinct-cities',
  dataset: 'shop',
  source: `SELECT DISTINCT city
FROM customers
ORDER BY city;`,
};

export const aliasInWhere: SqlExample = {
  id: 'alias-in-where',
  dataset: 'shop',
  source: `-- ORDER BY can use the alias: it runs after SELECT.
SELECT name, ROUND(price * 1.2, 2) AS vat_price
FROM products
ORDER BY vat_price DESC
LIMIT 3;

-- WHERE runs before SELECT. Standard SQL (PostgreSQL, SQL Server) rejects this;
-- SQLite happens to accept it. Repeat the expression instead to be portable.
SELECT name FROM products WHERE price * 1.2 > 30;`,
};
