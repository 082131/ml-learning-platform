import type { ExperimentDef } from '../types';
import {
  JOIN_SQL,
  joinCounts,
  joinTables,
  joinValues,
  pythonRow,
  type Customer,
  type JoinKind,
  type JoinRow,
  type Order,
} from './join';

/** State shared by the join visualizer, the SQL beside it and the readout. */
export interface JoinState {
  customers: Customer[];
  orders: Order[];
  kind: JoinKind;
  /** The result row being explained, by position. */
  selected: number;
}

export interface JoinResult {
  rows: JoinRow[];
}

const KIND_LABEL: Record<JoinKind, string> = {
  inner: 'INNER JOIN: matched pairs only',
  left: 'LEFT JOIN: every customer, matched or not',
  full: 'FULL OUTER JOIN: every row from both sides',
};

/** Points one order at another customer, or at NULL (a guest checkout). */
export const setOrderCustomer = (s: JoinState, order: number, customerId: number | null): JoinState => ({
  ...s,
  orders: s.orders.map((o, i) => (i === order ? { ...o, customerId } : o)),
  selected: 0,
});

export const joinSqlSlots = (s: JoinState) => ({ join: JOIN_SQL[s.kind] });

/** The join experiment: a join-type select; order → customer links are edited in JoinVisualizer. */
export function joinExperiment(
  id: string,
  customers: Customer[],
  orders: Order[],
): ExperimentDef<JoinState, JoinResult> {
  return {
    id,
    initial: { customers, orders, kind: 'inner', selected: 0 },
    controls: [
      {
        kind: 'select',
        id: 'kind',
        label: 'Join type',
        options: (Object.keys(KIND_LABEL) as JoinKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] })),
        get: (s) => s.kind,
        set: (s, v) => ({ ...s, kind: v as JoinKind, selected: 0 }),
      },
    ],
    compute: (s) => ({ rows: joinTables(s.customers, s.orders, s.kind) }),
    readout: (s, r) => {
      const n = joinCounts(r.rows);
      return [
        { label: 'Result rows', value: String(n.rows) },
        { label: 'Matched pairs', value: String(n.matched) },
        { label: 'Customers padded with NULL order columns', value: String(n.customersWithoutOrder) },
        { label: 'Orders padded with NULL customer columns', value: String(n.ordersWithoutCustomer) },
        {
          label: 'Python sqlite3: for row in rows: print(row)',
          value:
            r.rows.map((row) => pythonRow(joinValues(s.customers, s.orders, row))).join('\n') || '(no rows)',
        },
      ];
    },
  };
}
