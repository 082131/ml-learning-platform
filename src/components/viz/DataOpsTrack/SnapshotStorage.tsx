import { N_ROWS, type SnapshotResult, type SnapshotState } from '@/lib/dataops/snapshots';
import { pyFixed } from '@/lib/practice/pyFormat';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './DataOps.module.css';

const MAX_RATIO = 11;

/**
 * The data files of version 1, with the ones copy-on-write must rewrite marked, and the storage each strategy needs
 * for all 11 versions. Use inside a snapshotExperiment.
 */
export function SnapshotStorage() {
  const { state, result: r } = useExperimentContext<SnapshotState, SnapshotResult>('SnapshotStorage');
  const nFiles = N_ROWS / state.fileRows;
  const rows: [string, number][] = [
    ['full copy', r.fullCopy],
    ['copy-on-write', r.copyOnWrite],
    ['merge-on-read', r.mergeOnRead],
  ];
  return (
    <VizFrame
      title="What each new version costs"
      table={
        <VizTable
          caption="Rows stored for 11 versions"
          columns={['Strategy', 'Rows stored', '× the table']}
          rows={rows.map(([n, v]) => [n, v.toLocaleString('en-US'), pyFixed(v / N_ROWS, 2)])}
        />
      }
      caption={
        <>
          Version 1 changes {r.changedRows.toLocaleString('en-US')} rows spread over {r.firstTouched.size} of{' '}
          {nFiles} files, so copy-on-write rewrites {r.firstTouched.size} files of{' '}
          {state.fileRows.toLocaleString('en-US')} rows. After 10 versions it stores{' '}
          {pyFixed(r.copyOnWrite / N_ROWS, 2)}× the table; merge-on-read stores {pyFixed(r.mergeOnRead / N_ROWS, 2)}×.
        </>
      }
    >
      <div className={t.wrap}>
        <p className={s.note}>
          Version 1: the table’s {nFiles} data files (dashed = rewritten by copy-on-write)
        </p>
        <ul className={s.cells} data-files-touched={r.firstTouched.size} aria-label="Data files of version 1">
          {Array.from({ length: nFiles }, (_, i) => (
            <li
              key={i}
              className={s.fileCell}
              data-tone={r.firstTouched.has(i) ? 'err' : 'muted'}
              aria-label={`file ${i}${r.firstTouched.has(i) ? ', rewritten' : ''}`}
            />
          ))}
        </ul>
        <ul className={s.bars} aria-label="Rows stored for 11 versions">
          {rows.map(([name, v]) => (
            <li key={name} className={s.barRow} data-strategy={name} data-ratio={pyFixed(v / N_ROWS, 2)}>
              <span>{name}</span>
              <span className={t.barTrack}>
                <span className={s.barB} style={{ width: `${(v / N_ROWS / MAX_RATIO) * 100}%` }} />
              </span>
              <span className={t.num}>{pyFixed(v / N_ROWS, 2)}×</span>
            </li>
          ))}
        </ul>
      </div>
    </VizFrame>
  );
}
