import { useState } from 'react';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { WindowResult } from '@/lib/sql/experiments';
import type { WindowSpec } from '@/lib/sql/window';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

const show = (v: number | null) => (v === null ? 'NULL' : String(v));

/** Every order keeps its row; select one to see which rows its window function looked at. */
export function WindowLab() {
  const { result: r } = useExperimentContext<WindowSpec, WindowResult>('WindowLab');
  const [picked, setPicked] = useState<number | null>(null);
  const sel = r.rows.find((x) => x.id === picked) ?? r.rows[0]!;
  const time = r.spec.orderKey !== 'total';
  return (
    <VizFrame
      title="A window per row"
      caption={`Selected order ${sel.id}: value ${show(sel.value)}, computed from ${sel.frame.length} row${sel.frame.length === 1 ? '' : 's'} (${sel.frame.join(', ') || 'none'}). All ${r.rows.length} rows stay in the result.`}
      table={<VizTable caption="Window function result" columns={['id', 'month', time ? 'order_date' : 'total', 'total', 'value']} rows={r.rows.map((x) => [x.id, x.month, time ? x.orderDate : x.total, x.total, show(x.value)])} />}
    >
      <div className={s.viz} data-selected={sel.id} data-value={show(sel.value)} data-frame={sel.frame.join(',')}>
        <p className={s.note}>Select a row: rows in its window are highlighted, rows outside its partition are faded.</p>
        <div className={s.tableWrap}>
          <table className={s.rows}>
            <thead>
              <tr>
                <th scope="col">id</th>
                <th scope="col">month</th>
                {time && <th scope="col">order_date</th>}
                <th scope="col">total</th>
                <th scope="col">value</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x, i) => {
                const inFrame = sel.frame.includes(x.id);
                const outside = x.partitionKey !== sel.partitionKey;
                return (
                  <tr
                    key={x.id}
                    data-hl={inFrame || undefined}
                    data-outside={outside || undefined}
                    data-group-start={i > 0 && x.partitionKey !== r.rows[i - 1]!.partitionKey ? true : undefined}
                    data-picked={x.id === sel.id || undefined}
                  >
                    <td>
                      <button type="button" className={s.rowBtn} aria-pressed={x.id === sel.id} onClick={() => setPicked(x.id)}>
                        {x.id}
                      </button>
                      {inFrame && <span className="visually-hidden"> (in the window)</span>}
                    </td>
                    <td>{x.month}</td>
                    {time && <td>{x.orderDate}</td>}
                    <td>{x.total}</td>
                    <td className={x.value === null ? s.nullCell : undefined}>{show(x.value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <pre className={s.sql}>{r.sql}</pre>
      </div>
    </VizFrame>
  );
}
