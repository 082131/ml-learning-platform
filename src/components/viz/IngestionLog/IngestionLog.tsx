import { eventLine, idCounts, RECORD_COUNT, type IngestRun, type IngestState } from '@/lib/data/ingest';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './IngestionLog.module.css';

const GLYPH = { retry: '↻', write: '✓', crash: '✗', failed: '✗' } as const;
const TONE = { retry: t.warn, write: t.ok, crash: t.err, failed: t.err } as const;

/**
 * The ingestion job's request log, and every record id with how many copies the destination table holds.
 * Use inside an Experiment made with ingestExperiment.
 */
export function IngestionLog() {
  const { state, result } = useExperimentContext<IngestState, IngestRun>('IngestionLog');
  const counts = idCounts(result);
  const dupes = counts.filter((c) => c > 1).length;
  const missing = counts.filter((c) => c === 0).length;
  return (
    <VizFrame
      title="Ingestion job: requests and the destination table"
      table={
        <VizTable
          caption="Copies of each record id in the destination table"
          columns={['id', 'copies']}
          rows={counts.map((c, i) => [i + 1, c])}
        />
      }
      caption={
        <>
          {result.table.length} rows for {RECORD_COUNT} records: {dupes} ids stored more than once, {missing}{' '}
          missing. Waited {result.waited} s in total before retries.
        </>
      }
    >
      <div className={t.wrap}>
        <ol className={s.log} aria-label="Request log" data-ingest-log>
          {result.events.map((e, i) => (
            <li key={i} data-kind={e.kind}>
              <span className={cx(s.glyph, TONE[e.kind])} aria-hidden="true">
                {GLYPH[e.kind]}
              </span>
              <span>
                {state.fault === 'crash' ? `run ${e.run} · ` : ''}
                {eventLine(e, state.retries)}
              </span>
            </li>
          ))}
        </ol>
        <ul className={s.ids} aria-label="Record ids in the destination table" data-ingest-ids>
          {counts.map((c, i) => (
            <li
              key={i}
              className={cx(s.id, c === 0 && s.missing, c > 1 && s.dup)}
              data-id={i + 1}
              data-copies={c}
            >
              <span>{i + 1}</span>
              <span className={s.count}>{c === 0 ? 'missing' : `×${c}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </VizFrame>
  );
}
