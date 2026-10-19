import { droppedRows, explainJoinRow, JOIN_SQL, joinValues } from '@/lib/data/join';
import { setOrderCustomer, type JoinResult, type JoinState } from '@/lib/data/joinExperiment';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './JoinVisualizer.module.css';

const NULL = 'NULL';
const show = (v: string | number | null) => (v === null ? NULL : String(v));

/**
 * customers ⋈ orders. Each order's customer_id can be changed; each result row can be selected to
 * highlight the input rows it came from. Use inside an Experiment made with joinExperiment.
 */
export function JoinVisualizer() {
  const { state, result, update } = useExperimentContext<JoinState, JoinResult>('JoinVisualizer');
  const { customers, orders, kind } = state;
  const rows = result.rows;
  const sel = rows[Math.min(state.selected, rows.length - 1)];
  const dropped = droppedRows(customers, orders, rows);
  const values = rows.map((r) => joinValues(customers, orders, r));
  const mark = (used: boolean, isSource: boolean) =>
    isSource ? (
      <span className={s.tag}>← source</span>
    ) : !used ? (
      <span className={s.drop}>not in result</span>
    ) : null;

  return (
    <VizFrame
      title={`customers ${JOIN_SQL[kind]} orders`}
      table={
        <VizTable
          caption="Result rows"
          columns={['Row', 'c.id', 'c.name', 'o.id', 'o.amount']}
          rows={values.map((v, i) => [i, ...v.map(show)])}
        />
      }
      caption={`${rows.length} result rows. Change an order's customer_id, or select a result row to see where it came from.`}
    >
      <div className={s.layout}>
        <table className={s.table} data-table="customers">
          <caption>customers</caption>
          <thead>
            <tr>
              <th scope="col">id (PK)</th>
              <th scope="col">name</th>
              <th scope="col">city</th>
              <th scope="col" className="visually-hidden">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={c.id} className={cx(sel?.customer === i && s.source)}>
                <th scope="row">{c.id}</th>
                <td>{c.name}</td>
                <td>{c.city}</td>
                <td>{mark(!dropped.customers.includes(i), sel?.customer === i)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className={s.table} data-table="orders">
          <caption>orders</caption>
          <thead>
            <tr>
              <th scope="col">id (PK)</th>
              <th scope="col">customer_id (FK)</th>
              <th scope="col">amount</th>
              <th scope="col" className="visually-hidden">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} className={cx(sel?.order === i && s.source)}>
                <th scope="row">{o.id}</th>
                <td>
                  <select
                    className={s.select}
                    aria-label={`customer_id of order ${o.id}`}
                    value={show(o.customerId)}
                    onChange={(e) =>
                      update((st) =>
                        setOrderCustomer(st, i, e.target.value === NULL ? null : Number(e.target.value)),
                      )
                    }
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                    <option value={NULL}>{NULL}</option>
                  </select>
                </td>
                <td>{o.amount}</td>
                <td>{mark(!dropped.orders.includes(i), sel?.order === i)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className={cx(s.table, s.result)} data-table="result">
          <caption>result</caption>
          <thead>
            <tr>
              <th scope="col">c.id</th>
              <th scope="col">c.name</th>
              <th scope="col">o.id</th>
              <th scope="col">o.amount</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v, i) => (
              <tr key={i} className={cx(rows[i] === sel && s.selected)}>
                <th scope="row">
                  <button
                    type="button"
                    className={s.rowButton}
                    aria-pressed={rows[i] === sel}
                    aria-label={`Result row ${i}: ${v.map(show).join(', ')}`}
                    onClick={() => update((st) => ({ ...st, selected: i }))}
                  >
                    {show(v[0])}
                  </button>
                </th>
                {v.slice(1).map((x, j) => (
                  <td key={j} className={cx(x === null && s.null)}>
                    {show(x)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.explain} aria-live="polite" data-join-explain>
        {sel ? explainJoinRow(customers, orders, sel, kind) : 'No rows: no order matches any customer.'}
      </p>
    </VizFrame>
  );
}
