import { pipelineGraph, type TestingResult, type TestingState } from '@/lib/practice/modelTesting';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import s from './EvalPipeline.module.css';

/**
 * The model-testing lesson's visual: the evaluation pipeline as a FlowDiagram (each stage marked
 * passed, failed or not run) and every check's result with the detail the lesson's Python prints.
 * Use inside an Experiment made with testingExperiment.
 */
export function EvalPipeline() {
  const { result } = useExperimentContext<TestingState, TestingResult>('EvalPipeline');
  const { nodes, edges } = pipelineGraph(result);
  const dataFailed = result.checks.some((c) => c.stage === 'data' && !c.passed);
  return (
    <div>
      <FlowDiagram
        title="Evaluation pipeline"
        nodes={nodes}
        edges={edges}
        caption={
          dataFailed
            ? 'A data check failed, so the pipeline stopped before training: nothing after it ran.'
            : result.failed.length === 0
              ? 'Every check passed, so the model can ship.'
              : `The model trained, but ${result.failed.length} check${result.failed.length > 1 ? 's' : ''} failed, so the release is blocked.`
        }
      />
      <ol className={s.list} aria-label="Check results">
        {result.checks.map((c) => (
          <li key={`${c.stage} ${c.name}`} className={s.item} data-check={c.name}>
            <span className={c.passed ? s.pass : s.fail}>{c.passed ? '✓ PASS' : '✗ FAIL'}</span>
            <span className={s.name}>
              {c.stage} · {c.name}
            </span>
            <span className={s.detail}>{c.detail}</span>
          </li>
        ))}
        {result.skipped.map((c) => (
          <li key={`${c.stage} ${c.name}`} className={s.item} data-check={c.name}>
            <span className={s.skip}>– not run</span>
            <span className={s.name}>
              {c.stage} · {c.name}
            </span>
            <span className={s.detail}>skipped: a data check failed</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
