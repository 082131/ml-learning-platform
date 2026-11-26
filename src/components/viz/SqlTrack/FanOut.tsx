import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { FanoutResult, FanoutState } from '@/lib/sql/fanout';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

/** The rows a join of items and payments produces for one order, and what SUM makes of them. */
export function FanOut() {
  const { result: r } = useExperimentContext<FanoutState, FanoutResult & { sql: string }>('FanOut');
  const pre = r.pairs.length === 1 && r.pairs[0]!.item === -1;
  const rows = pre
    ? [['(all items)', r.trueItems, '(all payments)', r.truePaid]]
    : r.pairs.map((p) => [`item ${p.item + 1}`, r.itemValues[p.item]!, `payment ${p.payment + 1}`, r.paymentValues[p.payment]!]);
  return (
    <VizFrame
      title="One order, joined to its items and its payments"
      caption={`${r.pairs.length} row${r.pairs.length === 1 ? '' : 's'} after the joins. SUM reports items ${r.reportedItems} (true ${r.trueItems}) and paid ${r.reportedPaid} (true ${r.truePaid}).`}
      table={<VizTable caption="Joined rows" columns={['item', 'value', 'payment', 'amount']} rows={rows} />}
    >
      <div className={s.viz} data-rows={r.pairs.length} data-inflated={r.reportedPaid !== r.truePaid || undefined}>
        <div className={s.grid2}>
          <div>
            <p className={s.label}>order_items ({r.itemValues.length})</p>
            <p className={s.code}>{r.itemValues.join(' + ')} = {r.trueItems}</p>
          </div>
          <div>
            <p className={s.label}>payments ({r.paymentValues.length})</p>
            <p className={s.code}>{r.paymentValues.join(' + ')} = {r.truePaid}</p>
          </div>
        </div>
        <p className={s.label}>Rows after the join{pre ? ' (each side summed first)' : ` (${r.itemValues.length} × ${r.paymentValues.length})`}</p>
        <div className={s.tableWrap}>
          <table className={s.rows}>
            <thead>
              <tr>
                <th scope="col">item</th>
                <th scope="col">value</th>
                <th scope="col">payment</th>
                <th scope="col">amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <pre className={s.sql}>{r.sql}</pre>
      </div>
    </VizFrame>
  );
}
