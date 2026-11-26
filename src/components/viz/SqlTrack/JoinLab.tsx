import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { JoinLabState } from '@/lib/sql/experiments';
import type { JoinResult, JoinRow } from '@/lib/sql/joins';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

const why = (r: JoinRow) => (r.padded === 'order' ? 'customer kept, no matching order' : r.padded === 'customer' ? 'order kept, no matching customer' : 'matched pair');
const show = (v: string | number | null) => (v === null ? 'NULL' : String(v));

/** The joined rows, each labelled with why it is there. */
export function JoinLab() {
  const { result: r } = useExperimentContext<JoinLabState, JoinResult>('JoinLab');
  return (
    <VizFrame
      title="customers joined to orders"
      caption={`${r.rows.length} rows: ${r.matchedPairs} matched pairs${r.keptCustomersWithoutMatch ? `, ${r.keptCustomersWithoutMatch} customers kept without an order` : ''}${r.keptOrdersWithoutMatch ? `, ${r.keptOrdersWithoutMatch} order kept without a customer` : ''}${r.removedByWhere ? `, then WHERE removed ${r.removedByWhere}` : ''}.`}
      table={<VizTable caption="Joined rows" columns={['name', 'order_id', 'status', 'why']} rows={r.rows.map((x) => [show(x.name), show(x.orderId), show(x.status), why(x)])} />}
    >
      <div className={s.viz} data-rows={r.rows.length}>
        <pre className={s.sql}>{r.sql}</pre>
        <div className={s.tableWrap}>
          <table className={s.rows}>
            <thead>
              <tr>
                <th scope="col">name</th>
                <th scope="col">order_id</th>
                <th scope="col">status</th>
                <th scope="col">why this row exists</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x, i) => (
                <tr key={i} data-padded={x.padded}>
                  <td className={x.name === null ? s.nullCell : undefined}>{show(x.name)}</td>
                  <td className={x.orderId === null ? s.nullCell : undefined}>{show(x.orderId)}</td>
                  <td className={x.status === null ? s.nullCell : undefined}>{show(x.status)}</td>
                  <td className={s.why}>{why(x)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VizFrame>
  );
}
