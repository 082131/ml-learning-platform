import { DECISION_LINE, lineageDiagram, type QualityResult, type QualityState } from '@/lib/data/quality';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import t from '../SqlQueryTable/DataTable.module.css';

/**
 * Today's checks on orders_clean, with severities, and the lineage graph showing what the outcome does to
 * every downstream table. Use inside an Experiment made with qualityExperiment.
 */
export function QualityChecks() {
  const { result } = useExperimentContext<QualityState, QualityResult>('QualityChecks');
  const { nodes, edges } = lineageDiagram(result);
  return (
    <div className={t.wrap}>
      <div className={t.scroll} tabIndex={0} role="region" aria-label="Checks on today's load">
        <table className={t.table} data-quality-checks>
          <caption>Checks on today’s load of orders_clean</caption>
          <thead>
            <tr>
              <th scope="col">Check</th>
              <th scope="col">Severity</th>
              <th scope="col">Result</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {result.checks.map((c) => (
              <tr key={c.name} data-check={c.name} data-passed={c.passed}>
                <th scope="row">{c.name}</th>
                <td>{c.severity === 'block' ? 'blocks' : 'warns'}</td>
                <td className={cx(c.passed ? t.ok : c.severity === 'block' ? t.err : t.warn)}>
                  {c.passed ? '✓ pass' : '✗ fail'}
                </td>
                <td>{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FlowDiagram
        title="Lineage: what today's outcome does downstream"
        nodes={nodes}
        edges={edges}
        caption={
          <span data-decision={result.decision}>
            <strong
              className={cx(result.decision === 'stop' ? t.err : result.decision === 'warn' ? t.warn : t.ok)}
            >
              {DECISION_LINE[result.decision]}
            </strong>
          </span>
        }
      />
    </div>
  );
}
