import { describe, expect, it } from 'vitest';
import { composeCte } from './cte';
import { runScript } from './engine';
import { openTestDb } from './testdb';

const ex = {
  id: 'x',
  dataset: 'shop' as const,
  steps: [
    { name: 'paid', sql: "SELECT * FROM orders\nWHERE status = 'shipped'", note: '' },
    { name: 'per_customer', sql: 'SELECT customer_id, COUNT(*) AS n FROM paid GROUP BY customer_id', note: '' },
  ],
  final: 'SELECT MAX(n) AS most FROM per_customer',
};

describe('composeCte', () => {
  it('writes the full query', () => {
    expect(composeCte(ex)).toBe(
      "WITH paid AS (\n  SELECT * FROM orders\n  WHERE status = 'shipped'\n),\nper_customer AS (\n  SELECT customer_id, COUNT(*) AS n FROM paid GROUP BY customer_id\n)\nSELECT MAX(n) AS most FROM per_customer;",
    );
  });
  it('stops after a step and shows its rows', async () => {
    const db = await openTestDb('shop');
    expect(runScript(db, composeCte(ex, 0)).statements[0]!.rows).toHaveLength(9);
    expect(runScript(db, composeCte(ex)).statements[0]!.rows).toEqual([[3]]);
  });
});
