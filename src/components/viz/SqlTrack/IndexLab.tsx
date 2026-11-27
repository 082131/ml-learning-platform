import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { IndexLabResult } from '@/lib/sql/experiments';
import type { IndexLabState } from '@/lib/sql/indexlab';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

const TOTAL = 200_000;
const n = (x: number) => x.toLocaleString('en');
// A log scale, so 10 rows and 200,000 rows are both visible: 1 row = 0%, 200,000 = 100%.
const width = (x: number) => (x <= 1 ? 0 : (Math.log10(x) / Math.log10(TOTAL)) * 100);

/** How much of big_orders a plan has to read, next to the EXPLAIN QUERY PLAN line SQLite printed. */
export function IndexLab() {
  const { result: r } = useExperimentContext<IndexLabState, IndexLabResult>('IndexLab');
  const bars: [string, number][] = [
    ['entries read (index or table)', r.entries],
    ['table rows read', r.fetched],
    ['rows that match', r.matching],
  ];
  return (
    <VizFrame
      title="What the plan has to read"
      caption={`${r.plan}. Reads ${n(r.entries)} entries, reads ${n(r.fetched)} table rows, ${n(r.matching)} rows match.`}
      table={<VizTable caption="Work done by the plan" columns={['measure', 'rows']} rows={bars.map(([l, v]) => [l, v])} />}
    >
      <div className={s.viz} data-plan={r.plan} data-entries={r.entries}>
        <pre className={s.sql}>{r.sql}</pre>
        <p className={s.label}>EXPLAIN QUERY PLAN says</p>
        <p className={s.code} data-scan={r.plan.startsWith('SCAN') || undefined}>
          {r.plan}
        </p>
        <ol className={s.bars}>
          {bars.map(([label, v]) => (
            <li key={label} className={s.bar}>
              <span className={s.label}>{label}</span>
              <span className={s.barTrack}>
                <span className={s.barFill} style={{ width: `${width(v)}%` }} />
                <span className={s.barText}>
                  {n(v)} of {n(TOTAL)}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className={s.muted}>Bars use a logarithmic scale: each tenth of the width is roughly 3.4 times more rows.</p>
        <p className={s.note}>{r.why}</p>
      </div>
    </VizFrame>
  );
}
