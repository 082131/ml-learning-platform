import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { joinTables, joinValues, pythonRow, type Customer, type JoinKind, type Order } from './join';
import { joinExperiment, setOrderCustomer } from './joinExperiment';

const customers: Customer[] = [
  { id: 1, name: 'Ada', city: 'Leeds' },
  { id: 2, name: 'Grace', city: 'Austin' },
  { id: 3, name: 'Linus', city: 'Oslo' },
  { id: 4, name: 'Margaret', city: 'Boston' },
];
const orders: Order[] = [
  { id: 101, customerId: 1, amount: 30 },
  { id: 102, customerId: 3, amount: 45 },
  { id: 103, customerId: 1, amount: 12 },
  { id: 104, customerId: 2, amount: 8 },
  { id: 105, customerId: null, amount: 20 },
];

const printed = (os: Order[], kind: JoinKind) =>
  joinTables(customers, os, kind).map((r) => pythonRow(joinValues(customers, os, r)));

// Expected rows were printed by Python 3.13's sqlite3 module (SQLite 3.45.1) for
// SELECT c.id, c.name, o.id, o.amount FROM customers AS c <JOIN> orders AS o ON o.customer_id = c.id
// ORDER BY c.id NULLS LAST, o.id NULLS LAST;
describe('joinTables matches SQLite', () => {
  it('on the lesson tables', () => {
    const matched = [
      "(1, 'Ada', 101, 30)",
      "(1, 'Ada', 103, 12)",
      "(2, 'Grace', 104, 8)",
      "(3, 'Linus', 102, 45)",
    ];
    expect(printed(orders, 'inner')).toEqual(matched);
    expect(printed(orders, 'left')).toEqual([...matched, "(4, 'Margaret', None, None)"]);
    expect(printed(orders, 'full')).toEqual([
      ...matched,
      "(4, 'Margaret', None, None)",
      '(None, None, 105, 20)',
    ]);
  });

  it('after moving order 102 to customer 4 and order 104 to NULL', () => {
    const edited = orders.map((o) =>
      o.id === 102 ? { ...o, customerId: 4 } : o.id === 104 ? { ...o, customerId: null } : o,
    );
    expect(printed(edited, 'inner')).toEqual([
      "(1, 'Ada', 101, 30)",
      "(1, 'Ada', 103, 12)",
      "(4, 'Margaret', 102, 45)",
    ]);
    expect(printed(edited, 'left')).toEqual([
      "(1, 'Ada', 101, 30)",
      "(1, 'Ada', 103, 12)",
      "(2, 'Grace', None, None)",
      "(3, 'Linus', None, None)",
      "(4, 'Margaret', 102, 45)",
    ]);
    expect(printed(edited, 'full')).toEqual([
      "(1, 'Ada', 101, 30)",
      "(1, 'Ada', 103, 12)",
      "(2, 'Grace', None, None)",
      "(3, 'Linus', None, None)",
      "(4, 'Margaret', 102, 45)",
      '(None, None, 104, 8)',
      '(None, None, 105, 20)',
    ]);
  });

  it('never matches NULL with NULL and keeps provenance', () => {
    const rows = joinTables(
      [{ id: 1, name: 'A', city: '' }],
      [{ id: 9, customerId: null, amount: 1 }],
      'full',
    );
    expect(rows).toEqual([
      { customer: 0, order: null },
      { customer: null, order: 0 },
    ]);
  });
});

describe('joinExperiment', () => {
  const def = joinExperiment('join', customers, orders);
  it('is valid and reads out counts and the printed rows', () => {
    expect(validateExperiment(def)).toEqual([]);
    const left = { ...def.initial, kind: 'left' as const };
    const items = def.readout!(left, def.compute(left));
    expect(items.slice(0, 4).map((i) => i.value)).toEqual(['5', '4', '1', '0']);
    expect(items[4]!.value.split('\n')).toHaveLength(5);
  });
  it('edits an order immutably', () => {
    const s = setOrderCustomer(def.initial, 4, 4);
    expect(def.initial.orders[4]!.customerId).toBeNull();
    expect(def.compute(s).rows).toHaveLength(5);
  });
});

describe('explainJoinRow and droppedRows', () => {
  it('explains matched, customer-only and order-only rows', async () => {
    const { explainJoinRow, droppedRows } = await import('./join');
    const full = joinTables(customers, orders, 'full');
    expect(explainJoinRow(customers, orders, full[0]!, 'full')).toContain('Order 101 has customer_id = 1');
    expect(explainJoinRow(customers, orders, full[4]!, 'left')).toContain('No order has customer_id = 4');
    expect(explainJoinRow(customers, orders, full[5]!, 'full')).toContain('NULL equals nothing');
    const inner = joinTables(customers, orders, 'inner');
    expect(droppedRows(customers, orders, inner)).toEqual({ customers: [3], orders: [4] });
    expect(droppedRows(customers, orders, full)).toEqual({ customers: [], orders: [] });
  });
});
