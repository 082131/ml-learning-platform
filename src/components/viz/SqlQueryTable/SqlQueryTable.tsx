import { SALES, type SqlResult, type SqlState } from '@/lib/data/sqlQuery';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import t from './DataTable.module.css';

/**
 * The `sales` table with each row marked kept or filtered out (and its group), next to the query's
 * result in output order. Use inside an Experiment made with sqlExperiment.
 */
export function SqlQueryTable() {
  const { state, result } = useExperimentContext<SqlState, SqlResult>('SqlQueryTable');
  const grouped = state.group !== 'none';
  const kept = new Set(result.kept);
  const resultRows: (string | number)[][] = grouped
    ? result.groups.map((g) => [g.key, g.orders, g.total])
    : result.rows.map((r) => [r.id, r.city, r.product, r.amount]);
  const resultCols = grouped ? [state.group, 'orders', 'total'] : ['id', 'city', 'product', 'amount'];
  return (
    <VizFrame
      title="sales, and what the query returns"
      table={<VizTable caption="Query result" columns={resultCols} rows={resultRows} />}
      caption={
        <>
          {result.kept.length} of {SALES.length} rows pass the filter
          {grouped ? `, and GROUP BY ${state.group} collapses them into ${result.groups.length} rows` : ''}.
          Crossed-out rows were removed by WHERE.
        </>
      }
    >
      <div className={t.wrap}>
        <pre className={t.sql} data-sql-query>
          {result.query}
        </pre>
        <div className={t.two}>
          <div className={t.scroll}>
            <table className={t.table} data-sql-source>
              <caption>Table sales (every row)</caption>
              <thead>
                <tr>
                  <th scope="col">id</th>
                  <th scope="col">city</th>
                  <th scope="col">product</th>
                  <th scope="col" className={t.num}>
                    amount
                  </th>
                  <th scope="col">WHERE</th>
                </tr>
              </thead>
              <tbody>
                {SALES.map((r) => {
                  const on = kept.has(r.id);
                  return (
                    <tr key={r.id} className={cx(!on && t.muted)} data-row={r.id} data-kept={on}>
                      <td className={t.num}>{r.id}</td>
                      <td className={cx(state.group === 'city' && on && t.strong)}>{r.city}</td>
                      <td className={cx(state.group === 'product' && on && t.strong)}>{r.product}</td>
                      <td className={t.num}>{r.amount}</td>
                      <td>{on ? 'kept' : 'filtered out'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={t.scroll}>
            <table className={t.table} data-sql-result>
              <caption>Result ({resultRows.length} rows, in output order)</caption>
              <thead>
                <tr>
                  {resultCols.map((c, i) => (
                    <th
                      key={c}
                      scope="col"
                      className={cx(i > 0 && typeof resultRows[0]?.[i] === 'number' && t.num)}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} className={cx(typeof v === 'number' && t.num)}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
                {resultRows.length === 0 && (
                  <tr>
                    <td colSpan={resultCols.length}>(no rows)</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </VizFrame>
  );
}
