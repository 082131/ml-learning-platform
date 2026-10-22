import { fateOf, FIELDS, type PipelineRun } from '@/lib/data/etl';
import { pipelineDiagram, recordRows, type EtlState } from '@/lib/data/etlExperiment';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import s from './EtlPipeline.module.css';

const FATE_WORD = {
  clean: 'ok',
  quarantined: 'caught',
  failed: 'batch failed',
  'loaded-wrong': 'loaded wrong data',
};

/**
 * The ETL or ELT pipeline for the current batch: each step's status and row count, and below it every
 * record with where it ended up. Use inside an Experiment made with etlExperiment.
 */
export function EtlPipeline() {
  const { state, result } = useExperimentContext<EtlState, PipelineRun>('EtlPipeline');
  const { nodes, edges } = pipelineDiagram(result, state.bad);
  const fate = fateOf(result, state.bad);
  const injected = 5;
  return (
    <div className={s.wrap}>
      <FlowDiagram
        title={state.mode === 'etl' ? 'ETL: extract, transform, load' : 'ELT: extract, load, transform'}
        nodes={nodes}
        edges={edges}
        caption={
          <span data-etl-fate={fate.fate}>
            <strong className={cx(s.fate, s[fate.fate])}>{FATE_WORD[fate.fate]}:</strong> {fate.text}
          </span>
        }
      />
      <div className={s.scroll} tabIndex={0} role="region" aria-label="Records in this batch">
        <table className={s.table} data-etl-records>
          <caption>Records in this batch (record {injected + 1} carries the injected value)</caption>
          <thead>
            <tr>
              {FIELDS.map((f) => (
                <th key={f} scope="col">
                  {f}
                </th>
              ))}
              <th scope="col">Ended up in</th>
            </tr>
          </thead>
          <tbody>
            {recordRows(result, state.bad).map((r) => (
              <tr key={r.i} className={cx(r.i === injected && s.injected)}>
                {FIELDS.map((f) => (
                  <td key={f}>{r[f] === '' ? <em>(empty)</em> : r[f]}</td>
                ))}
                <td>{r.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
