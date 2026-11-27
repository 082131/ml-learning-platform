import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { Direction, RecursionResult } from '@/lib/sql/recursion';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

/** The rows each iteration of a recursive CTE adds, ending with the empty iteration that stops it. */
export function RecursionTrace() {
  const { result: r } = useExperimentContext<{ start: string; dir: Direction }, RecursionResult>('RecursionTrace');
  const rows = r.iterations.flatMap((it, i) => (it.length ? it.map((x) => [i, i === 0 ? 'anchor' : 'step', x.name, x.level]) : [[i, 'step', '(no rows: stop)', '']]));
  return (
    <VizFrame
      title="WITH RECURSIVE, iteration by iteration"
      caption={`${r.iterations.length} iterations: ${r.iterations.map((it, i) => `${i === 0 ? 'anchor' : `step ${i}`} adds ${it.length}`).join(', ')}. ${r.total} rows in total.`}
      table={<VizTable caption="Rows added per iteration" columns={['iteration', 'part', 'name', 'level']} rows={rows} />}
    >
      <div className={s.viz} data-iterations={r.iterations.length} data-total={r.total}>
        <ol className={s.iterList}>
          {r.iterations.map((it, i) => (
            <li key={i} className={s.iter} data-empty={it.length === 0 || undefined}>
              <span className={s.label}>{i === 0 ? 'Anchor' : `Step ${i}`}</span>
              <span className={s.iterRows}>
                {it.length ? (
                  it.map((x) => (
                    <span key={x.name} className={s.chip}>
                      {x.name} · level {x.level}
                    </span>
                  ))
                ) : (
                  <span className={s.muted}>no new rows, so the recursion stops</span>
                )}
              </span>
            </li>
          ))}
        </ol>
        <pre className={s.sql}>{r.sql}</pre>
      </div>
    </VizFrame>
  );
}
