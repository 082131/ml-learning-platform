import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { TrainingLabResult } from '@/lib/sql/experiments';
import type { TrainingSpec } from '@/lib/sql/mlfeatures';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

const show = (v: number | null) => (v === null ? 'NULL' : String(v));

/** One training row per customer at the cutoff; cells computed from orders after the cutoff are marked. */
export function TrainingLab() {
  const { result: r, state } = useExperimentContext<TrainingSpec, TrainingLabResult>('TrainingLab');
  const leakedCells = r.rows.reduce((a, x) => a + Number(x.leaked.orders) + Number(x.leaked.spend) + Number(x.leaked.days), 0);
  const mark = (on: boolean) => (on ? <span className={s.dropTag}>future</span> : null);
  return (
    <VizFrame
      title={`Training rows at cutoff ${state.cutoff}`}
      caption={`${r.rows.length} customers had signed up before ${state.cutoff}. ${leakedCells} feature value${leakedCells === 1 ? '' : 's'} used orders from after the cutoff.`}
      table={<VizTable caption="Training table" columns={['customer', 'orders_before', 'spend_before', 'days_since_last', 'label']} rows={r.rows.map((x) => [x.name, x.ordersBefore, x.spendBefore, show(x.daysSinceLast), x.label])} />}
    >
      <div className={s.viz} data-leaked={leakedCells} data-rows={r.rows.length}>
        <p className={s.note}>Features describe the past up to the cutoff; the label is whether the customer ordered in the 30 days from it.</p>
        <div className={s.tableWrap}>
          <table className={s.rows}>
            <thead>
              <tr>
                <th scope="col">customer</th>
                <th scope="col">orders_before</th>
                <th scope="col">spend_before</th>
                <th scope="col">days_since_last</th>
                <th scope="col">label</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.customerId}>
                  <td>{x.name}</td>
                  <td data-hl={x.leaked.orders || undefined}>{x.ordersBefore}{mark(x.leaked.orders)}</td>
                  <td data-hl={x.leaked.spend || undefined}>{x.spendBefore}{mark(x.leaked.spend)}</td>
                  <td data-hl={x.leaked.days || undefined} className={x.daysSinceLast === null ? s.nullCell : undefined}>{show(x.daysSinceLast)}{mark(x.leaked.days)}</td>
                  <td>{x.label}</td>
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
