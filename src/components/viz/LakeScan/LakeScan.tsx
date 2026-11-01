import {
  DAY_KEYS,
  DAYS_MAX,
  formatBytes,
  LAYOUT_LABEL,
  type LakeResult,
  type LakeState,
} from '@/lib/data/lakeScan';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './LakeScan.module.css';

/**
 * Bytes one query reads from the same month of events in three layouts, and which day partitions it
 * touches. Use inside an Experiment made with lakeExperiment.
 */
export function LakeScan() {
  const { state, result } = useExperimentContext<LakeState, LakeResult>('LakeScan');
  const max = Math.max(...result.scans.map((sc) => sc.bytes));
  const kept = new Set(DAY_KEYS.slice(DAYS_MAX - state.days));
  const part = result.scans[2]!;
  return (
    <VizFrame
      title="Bytes read by one query, three layouts"
      table={
        <VizTable
          caption="Bytes read per layout"
          columns={['Layout', 'Bytes', 'Files', 'Rows scanned', 'Columns read']}
          rows={result.scans.map((sc) => [
            LAYOUT_LABEL[sc.layout],
            sc.bytes,
            sc.files,
            sc.rowsScanned,
            sc.columns.join(', '),
          ])}
        />
      }
      caption={
        <>
          Real file sizes from Parquet metadata (pyarrow 26.0.0). The partitioned layout reads{' '}
          {formatBytes(part.bytes)} from {part.files} file{part.files === 1 ? '' : 's'}, which is{' '}
          {((part.bytes / result.scans[0]!.bytes) * 100).toFixed(1)}% of the CSV.
        </>
      }
    >
      <div className={t.wrap}>
        <div className={s.bars} data-lake-bars>
          {result.scans.map((sc) => (
            <div key={sc.layout} className={s.row} data-layout={sc.layout} data-bytes={sc.bytes}>
              <div className={s.head}>
                <span>{LAYOUT_LABEL[sc.layout]}</span>
                <span className={s.value}>{formatBytes(sc.bytes)}</span>
              </div>
              <span className={t.barTrack}>
                <span className={t.bar} style={{ width: `${(sc.bytes / max) * 100}%` }} />
              </span>
              <p className={s.detail}>
                {sc.files} file{sc.files === 1 ? '' : 's'}, {sc.rowsScanned.toLocaleString('en-US')} rows
                scanned, columns: {sc.columns.join(', ')}
              </p>
            </div>
          ))}
        </div>
        <div>
          <p className={s.detail}>
            Day partitions (October): {kept.size} read, {DAYS_MAX - kept.size} skipped without opening
          </p>
          <ul className={s.days} aria-label="Day partitions read by the partitioned layout">
            {DAY_KEYS.map((d) => (
              <li key={d} className={cx(s.day, kept.has(d) && s.read)} data-day={d} data-read={kept.has(d)}>
                {Number(d.slice(8))}
                <span className="visually-hidden">{kept.has(d) ? ' read' : ' skipped'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </VizFrame>
  );
}
