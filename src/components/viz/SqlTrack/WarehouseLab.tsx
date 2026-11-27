import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { NEEDED, WH_COLUMNS, WH_DAYS, formatBytes, type WarehouseResult, type WarehouseSpec, type WhColumn } from '@/lib/sql/warehouse';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

/** Which column files and which daily partitions a query has to read, in a simulated columnar table. */
export function WarehouseLab() {
  const { result: r, state } = useExperimentContext<WarehouseSpec, WarehouseResult>('WarehouseLab');
  const cols = Object.keys(WH_COLUMNS) as WhColumn[];
  const read = (c: WhColumn) => state.source === 'raw' && (state.columns === 'all' || NEEDED.includes(c));
  return (
    <VizFrame
      title="What the warehouse reads (simulation)"
      caption={`Reads ${r.partitionsRead} of ${WH_DAYS} daily partitions and ${formatBytes(r.bytesRead)}.`}
      table={<VizTable caption="Columns read" columns={['column', 'bytes per value (assumed)', 'read']} rows={cols.map((c) => [c, WH_COLUMNS[c], read(c) ? 'yes' : 'no'])} />}
    >
      <div className={s.viz} data-bytes={r.bytesRead} data-partitions={r.partitionsRead}>
        <pre className={s.sql}>{r.sql}</pre>
        {state.source === 'raw' ? (
          <>
            <p className={s.label}>Columns: each is stored separately, so columns the query does not read cost nothing</p>
            <div className={s.stages}>
              {cols.map((c) => (
                <span key={c} className={s.colChip} data-read={read(c) || undefined}>
                  {c} · {WH_COLUMNS[c]} B{read(c) ? '' : ' · skipped'}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className={s.note}>The summary table was built once from orders_wh: one row per day and country, 3,650 rows in all.</p>
        )}
        <p className={s.label}>
          Daily partitions read: {r.partitionsRead} of {WH_DAYS}
        </p>
        <span className={s.barTrack}>
          <span className={s.barFill} style={{ width: `${(100 * r.partitionsRead) / WH_DAYS}%` }} />
          <span className={s.barText}>{state.filter === 'month-fn' ? 'every partition: the filter hides order_date inside a function' : `${r.partitionsRead} days`}</span>
        </span>
      </div>
    </VizFrame>
  );
}
