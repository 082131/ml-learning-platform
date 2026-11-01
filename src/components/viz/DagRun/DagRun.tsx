import { dagDiagram, type DagRun as DagRunResult, type DagState } from '@/lib/data/dag';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './DagRun.module.css';

/**
 * The pipeline DAG with each task's final state, and a timeline of every attempt and retry wait. Use inside
 * an Experiment made with dagExperiment.
 */
export function DagRun() {
  const { result } = useExperimentContext<DagState, DagRunResult>('DagRun');
  const { nodes, edges } = dagDiagram(result);
  const span = Math.max(result.finishedAt, 1);
  const pct = (m: number) => `${(m / span) * 100}%`;
  return (
    <div className={t.wrap}>
      <FlowDiagram
        title="Pipeline DAG: final state of each task"
        nodes={nodes}
        edges={edges}
        caption={
          <>
            ✓ succeeded, ✗ failed after its last retry, ! not run because a task upstream failed. The run
            finished at minute {result.finishedAt}.
          </>
        }
      />
      <div aria-label="Timeline of attempts, in minutes" role="group" data-dag-timeline>
        <ol className={s.gantt}>
          {result.tasks.map((task) => (
            <li key={task.name} className={s.row} data-task={task.name} data-state={task.state}>
              <span>{task.name}</span>
              <span className={s.track}>
                {task.state === 'upstream_failed' && (
                  <span
                    className={cx(s.seg, s.skipped)}
                    style={{ left: pct(Math.min(task.start, span * 0.75)), width: 'auto' }}
                  >
                    not run
                  </span>
                )}
                {task.attempts.map((a, i) => (
                  <span key={i}>
                    <span
                      className={cx(s.seg, a.ok ? s.ok : s.fail)}
                      style={{ left: pct(a.start), width: pct(a.end - a.start) }}
                      title={`attempt ${i + 1}: minute ${a.start} to ${a.end}, ${a.ok ? 'succeeded' : 'failed'}`}
                    >
                      {a.ok ? '✓' : '✗'}
                      <span className="visually-hidden">
                        {` attempt ${i + 1}, minute ${a.start} to ${a.end}, ${a.ok ? 'succeeded' : 'failed'}`}
                      </span>
                    </span>
                    {a.wait > 0 && (
                      <span
                        className={cx(s.seg, s.wait)}
                        style={{ left: pct(a.end), width: pct(a.wait) }}
                        title={`waits ${a.wait} min before retrying`}
                      >
                        <span className="visually-hidden">{` then waits ${a.wait} minutes`}</span>
                      </span>
                    )}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <p className={s.axis} aria-hidden="true">
          <span>minute 0</span>
          <span>minute {result.finishedAt}</span>
        </p>
        <p className={t.legend}>
          <span>■ attempt that succeeded</span>
          <span>□ attempt that failed (✗)</span>
          <span>┈ waiting before a retry</span>
        </p>
      </div>
    </div>
  );
}
