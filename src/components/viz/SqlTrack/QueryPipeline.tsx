import { useState } from 'react';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Button } from '@/components/ui';
import type { PipelineState } from '@/lib/sql/pipeline';
import type { PipelineResult } from '@/lib/sql/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

const WRITTEN_PLAIN = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'LIMIT'];
const WRITTEN_GROUPED = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'];

/** The query as written versus the order SQL evaluates it, with the rows that survive each stage. */
export function QueryPipeline() {
  const { result: r } = useExperimentContext<PipelineState, PipelineResult>('QueryPipeline');
  const [picked, setPicked] = useState<number | null>(null);
  const at = Math.min(picked ?? r.stages.length - 1, r.stages.length - 1);
  const stage = r.stages[at]!;
  const written = r.grouped ? WRITTEN_GROUPED : WRITTEN_PLAIN;
  return (
    <VizFrame
      title="The order SQL runs a query in"
      caption={`Written order: ${written.join(', ')}. Run order: ${r.stages.map((st) => `${st.clause} (${st.out})`).join(' → ')}. Numbers are the rows (or groups) leaving each stage.`}
      table={<VizTable caption="Rows leaving each stage" columns={['stage', 'clause', 'rows out']} rows={r.stages.map((st, i) => [i + 1, st.sql, st.out])} />}
    >
      <div className={s.pipeline} data-stage={stage.clause} data-out={stage.out}>
        <p className={s.label}>As written</p>
        <ol className={s.written}>
          {written.map((w) => (
            <li key={w} className={s.chip}>
              {w}
            </li>
          ))}
        </ol>
        <p className={s.label}>As evaluated (select a stage)</p>
        <ol className={s.stages}>
          {r.stages.map((st, i) => (
            <li key={st.clause}>
              <Button size="sm" variant={i === at ? 'primary' : 'secondary'} aria-pressed={i === at} onClick={() => setPicked(i)}>
                {i + 1}. {st.clause} · {st.out}
              </Button>
            </li>
          ))}
        </ol>
        <p className={s.code}>{stage.sql}</p>
        <p className={s.note}>{stage.note}</p>
        <div className={s.tableWrap} tabIndex={0} role="group" aria-label={`Rows at the ${stage.clause} stage`}>
          <table className={s.rows}>
            <thead>
              <tr>
                {stage.clause === 'GROUP BY' && <th scope="col">group</th>}
                {stage.columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage.rows.map((row, i) => (
                <tr key={i} data-dropped={row.dropped || undefined} data-group-start={stage.clause === 'GROUP BY' && row.group !== stage.rows[i - 1]?.group ? true : undefined}>
                  {stage.clause === 'GROUP BY' && <td className={s.group}>{row.group}</td>}
                  {row.cells.map((c, j) => (
                    <td key={j}>
                      {c}
                      {j === row.cells.length - 1 && row.dropped && <span className={s.dropTag}> removed</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VizFrame>
  );
}
