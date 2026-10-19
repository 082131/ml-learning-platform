// Code for the joins and indexes lesson. Query results, plans and error messages were produced with
// Python 3.13's sqlite3 module (SQLite 3.45.1); join.test.ts and lookup.test.ts check the browser's
// results against those runs.
import type { Customer, Order } from '@/lib/data/join';
import { joinExperiment, joinSqlSlots, type JoinState } from '@/lib/data/joinExperiment';
import { LOOKUP_SOURCE } from '@/lib/data/indexLookup';
import { lookupExperiment, lookupSlots, type LookupState } from '@/lib/data/lookupExperiment';
import type { CodeExample } from '@/lib/types';

export const customers: Customer[] = [
  { id: 1, name: 'Ada', city: 'Leeds' },
  { id: 2, name: 'Grace', city: 'Austin' },
  { id: 3, name: 'Linus', city: 'Oslo' },
  { id: 4, name: 'Margaret', city: 'Boston' },
];

/** Order 105 was a guest checkout: its customer_id is NULL. Margaret (4) has no orders yet. */
export const orders: Order[] = [
  { id: 101, customerId: 1, amount: 30 },
  { id: 102, customerId: 3, amount: 45 },
  { id: 103, customerId: 1, amount: 12 },
  { id: 104, customerId: 2, amount: 8 },
  { id: 105, customerId: null, amount: 20 },
];

export const joins = joinExperiment('joins', customers, orders);

const LOOKUP_ID = 'lookup-code';
export const lookup = lookupExperiment('lookup', { n: 16, target: 3, method: 'index' }, LOOKUP_ID);

export const schemaSql: CodeExample = {
  id: 'schema-sql',
  language: 'sql',
  source: `CREATE TABLE customers (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT
);

CREATE TABLE orders (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers (id),
    amount      INTEGER NOT NULL
);

CREATE INDEX idx_orders_customer ON orders (customer_id);`,
  annotations: [
    {
      id: 'create',
      range: { line: 1 },
      kind: 'syntax',
      title: 'CREATE TABLE customers (...)',
      what: 'Declares a table: its name, and one column per line with a type and optional constraints.',
      why: 'The schema is a contract. The database rejects rows that break it, so bad data is stopped at the door.',
    },
    {
      id: 'pk',
      range: { line: 2, startCol: 17, endCol: 28 },
      match: 'PRIMARY KEY',
      kind: 'framework',
      title: 'PRIMARY KEY',
      what: 'Makes id the column that identifies each customer: unique, and the value other tables use to point here.',
      why: 'Names and cities repeat; an id never does. Joins match on keys for that reason.',
    },
    {
      id: 'not-null',
      range: { line: 3, startCol: 14, endCol: 22 },
      match: 'NOT NULL',
      kind: 'framework',
      title: 'NOT NULL',
      what: 'Every customer must have a name. Inserting a row without one fails.',
      why: 'Columns allow NULL ("unknown") unless you forbid it, and NULL behaves unlike any other value in comparisons.',
    },
    {
      id: 'fk-col',
      range: { line: 9, startCol: 4, endCol: 15 },
      match: 'customer_id',
      kind: 'variable',
      title: 'customer_id',
      what: 'The column that says which customer placed the order. It holds a customers.id value, or NULL.',
      why: 'One customer can have many orders, so the link lives on the "many" side.',
    },
    {
      id: 'fk',
      range: { line: 9, startCol: 24, endCol: 49 },
      match: 'REFERENCES customers (id)',
      kind: 'framework',
      title: 'REFERENCES customers (id)',
      what: 'A foreign key: customer_id must be NULL or an id that exists in customers.',
      why: 'It stops orders from pointing at customers who do not exist. SQLite only enforces it after PRAGMA foreign_keys = ON.',
    },
    {
      id: 'index',
      range: { line: 13 },
      kind: 'framework',
      title: 'CREATE INDEX idx_orders_customer ON orders (customer_id)',
      what: 'Builds a separate structure that keeps (customer_id, row) pairs sorted by customer_id, and keeps it updated on every insert.',
      why: 'Queries that filter or join on customer_id can then jump to the matching rows instead of reading the whole table.',
      output: 'Faster lookups by customer_id, at the cost of extra storage and slower writes',
    },
  ],
};

const st = (s: unknown) => s as JoinState;

export const joinSql: CodeExample = {
  id: 'join-sql',
  language: 'sql',
  source: `SELECT c.id, c.name, o.id, o.amount
FROM customers AS c
{{join}} orders AS o ON o.customer_id = c.id
ORDER BY c.id NULLS LAST, o.id NULLS LAST;`,
  slots: { join: (s) => joinSqlSlots(st(s)).join },
  annotations: [
    {
      id: 'select',
      range: { line: 1, startCol: 0, endCol: 6 },
      match: 'SELECT',
      kind: 'syntax',
      title: 'SELECT c.id, c.name, o.id, o.amount',
      what: 'The columns of the result. c. and o. say which table each column comes from.',
      why: 'Both tables have a column called id, so every column is qualified with its table alias.',
    },
    {
      id: 'from',
      range: { line: 2, startCol: 5, endCol: 19 },
      match: 'customers AS c',
      kind: 'variable',
      title: 'customers AS c',
      what: 'The left table, with the short alias c.',
      why: 'In a LEFT JOIN this is the side whose rows are all kept.',
    },
    {
      id: 'join',
      range: { line: 3, startCol: 0, endCol: 8 },
      match: '{{join}}',
      kind: 'parameter',
      title: 'The join type',
      what: 'INNER keeps matched pairs. LEFT also keeps unmatched left rows. FULL OUTER also keeps unmatched rows from both sides.',
      why: 'This keyword is filled from the experiment: change the join type above and it changes here.',
    },
    {
      id: 'right',
      range: { line: 3, startCol: 9, endCol: 20 },
      match: 'orders AS o',
      kind: 'variable',
      title: 'orders AS o',
      what: 'The right table, with the alias o.',
      why: 'Unmatched orders only appear in a FULL OUTER JOIN (or a RIGHT JOIN).',
    },
    {
      id: 'on',
      range: { line: 3, startCol: 21, endCol: 44 },
      match: 'ON o.customer_id = c.id',
      kind: 'math',
      title: 'ON o.customer_id = c.id',
      what: 'The join condition. A customer row and an order row are paired when this is true.',
      why: 'It follows the foreign key. A NULL customer_id makes the comparison NULL (not true), so that order matches nobody.',
    },
    {
      id: 'order-by',
      range: { line: 4, startCol: 0, endCol: 8 },
      match: 'ORDER BY',
      kind: 'syntax',
      title: 'ORDER BY',
      what: 'Sorts the result by customer id, then order id.',
      why: 'Without ORDER BY, SQL promises no row order at all. The same query can return rows in a different order after the data or the plan changes.',
    },
    {
      id: 'nulls-last',
      range: { line: 4, startCol: 14, endCol: 24 },
      match: 'NULLS LAST',
      kind: 'syntax',
      title: 'NULLS LAST',
      what: 'Puts rows with a NULL sort key after the others.',
      why: 'Databases disagree on where NULLs sort by default (SQLite puts them first, PostgreSQL last), so we say it explicitly.',
    },
  ],
};

export const planSql: CodeExample = {
  id: 'plan-sql',
  language: 'sql',
  source: `EXPLAIN QUERY PLAN
SELECT id, amount FROM orders WHERE customer_id = 3;`,
  annotations: [
    {
      id: 'eqp',
      range: { line: 1 },
      kind: 'framework',
      title: 'EXPLAIN QUERY PLAN',
      what: 'Asks SQLite how it would run the query, without running it.',
      why: 'The plan shows whether a query reads the whole table (SCAN) or uses an index (SEARCH ... USING INDEX).',
      output: 'One line per step of the plan',
    },
  ],
};

const lst = (s: unknown) => s as LookupState;

export const lookupCode: CodeExample = {
  id: LOOKUP_ID,
  language: 'python',
  source: LOOKUP_SOURCE,
  slots: Object.fromEntries(
    ['n', 'customers', 'call'].map((k) => [k, (s: unknown) => lookupSlots(lst(s))[k as 'n']]),
  ),
  annotations: [
    {
      id: 'scan-loop',
      range: { line: 4, startCol: 4, endCol: 40 },
      match: 'for order_id, customer_id in orders:',
      kind: 'syntax',
      title: 'for ... in orders',
      what: 'Reads every row of the table, in storage order.',
      why: 'Without an index, the only way to be sure you found every match is to look at every row.',
    },
    {
      id: 'touched',
      range: { line: 5, startCol: 8, endCol: 20 },
      match: 'touched += 1',
      kind: 'variable',
      title: 'touched += 1',
      what: 'Counts one entry read.',
      why: 'Reading rows is the main cost of a query on a large table. Both functions count the same way, so their totals compare fairly.',
    },
    {
      id: 'mid',
      range: { line: 15, startCol: 8, endCol: 28 },
      match: 'mid = (lo + hi) // 2',
      kind: 'math',
      title: 'mid = (lo + hi) // 2',
      what: 'The middle of the part of the index that could still hold the first match. // is integer division.',
      why: 'Each probe halves the remaining range, so a sorted index of n entries needs about log₂ n probes.',
    },
    {
      id: 'compare',
      range: { line: 17, startCol: 8, endCol: 34 },
      match: 'if index[mid][0] < target:',
      kind: 'syntax',
      title: 'if index[mid][0] < target',
      what: 'index[mid][0] is the customer_id at the probe. If it is smaller than the target, every entry to its left is smaller too.',
      why: 'This is only valid because the index is sorted. That is the whole trick.',
    },
    {
      id: 'break',
      range: { line: 26, startCol: 12, endCol: 17 },
      match: 'break',
      kind: 'syntax',
      title: 'break',
      what: 'Stops at the first entry with a different customer_id.',
      why: 'The index is sorted, so no later entry can match.',
    },
    {
      id: 'table',
      range: { line: 32, startCol: 58, endCol: 70 },
      match: 'range({{n}})',
      kind: 'parameter',
      title: 'range(n)',
      what: 'The number of rows in the generated table. Order i gets id 101 + i and customer (i·5 mod 8) + 1.',
      why: 'Filled from the "Rows in orders" slider.',
    },
    {
      id: 'sorted',
      range: { line: 33, startCol: 8, endCol: 41 },
      match: 'sorted((c, o) for o, c in orders)',
      kind: 'function',
      title: 'sorted(...)',
      what: 'Builds the index: (customer_id, order_id) pairs sorted by customer_id, then order_id.',
      why: 'A real database keeps this order in a B-tree, which stays sorted as rows are inserted.',
      output: 'A list of n (customer_id, order_id) tuples',
    },
    {
      id: 'call',
      range: { line: 34, startCol: 17, endCol: 25 },
      match: '{{call}}',
      kind: 'parameter',
      title: 'The call being traced',
      what: 'scan(orders, target) or index_lookup(index, target), with the customer from the slider.',
      why: 'Both return the same order ids. Only the number of entries read differs.',
    },
  ],
};

/** A hash join in plain Python: build a dict on one side, probe it from the other. */
export const hashJoinRunner: CodeExample = {
  id: 'hash-join-runner',
  language: 'python',
  run: 'pyodide',
  source: `customers = [(1, "Ada"), (2, "Grace"), (3, "Linus"), (4, "Margaret")]
orders = [(101, 1, 30), (102, 3, 45), (103, 1, 12), (104, 2, 8), (105, None, 20)]

# Build: a hash table (dict) from customer_id to that customer's orders
by_customer = {}
for order_id, customer_id, amount in orders:
    if customer_id is not None:  # NULL never matches anything
        by_customer.setdefault(customer_id, []).append((order_id, amount))

# Probe: one dict lookup per customer instead of a pass over all orders
for customer_id, name in customers:
    matches = by_customer.get(customer_id, [])
    if not matches:
        print(customer_id, name, None, None)  # LEFT JOIN keeps unmatched customers
    for order_id, amount in matches:
        print(customer_id, name, order_id, amount)`,
  annotations: [],
  expectedOutput: `1 Ada 101 30
1 Ada 103 12
2 Grace 104 8
3 Linus 102 45
4 Margaret None None`,
};
