import { type OrderRec, type ShuffleResult, type ShuffleState } from '@/lib/data/shuffle';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SparkShuffle.module.css';

function Stage({
  title,
  parts,
  stage,
  isDropped,
  label,
}: {
  title: string;
  parts: OrderRec[][];
  stage: number;
  isDropped?: (r: OrderRec) => boolean;
  label: (r: OrderRec) => string;
}) {
  const max = Math.max(...parts.map((p) => p.length));
  const uneven = max > Math.min(...parts.map((p) => p.length));
  return (
    <div>
      <p className={s.stageHead}>{title}</p>
      <ol className={s.tasks} data-stage={stage}>
        {parts.map((p, i) => (
          <li
            key={i}
            className={cx(s.task, uneven && p.length === max && s.slowest)}
            data-task={i}
            data-records={p.length}
          >
            <span className={s.taskHead}>
              <span>task {i}</span>
              <span>
                {p.length} record{p.length === 1 ? '' : 's'}
                {uneven && p.length === max ? ' · slowest' : ''}
              </span>
            </span>
            <span className={s.chips}>
              {p.length === 0 && <span className={s.empty}>empty: no key hashed here</span>}
              {p.map((r, j) => (
                <span
                  key={j}
                  className={cx(s.chip, r.key === 'C1' && s.hot, isDropped?.(r) && s.dropped)}
                  title={label(r)}
                >
                  {label(r)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The job's stages: the three input tasks, the shuffle (if any) and the shuffle-partition tasks, with each
 * task's records. Use inside an Experiment made with shuffleExperiment.
 */
export function SparkShuffle() {
  const { state, result } = useExperimentContext<ShuffleState, ShuffleResult>('SparkShuffle');
  const order = (r: OrderRec) => `${r.key} ${r.amount}`;
  const partial = (r: OrderRec) => `${r.key} Σ${r.amount}`;
  const shuffle = result.outputs !== null;
  return (
    <VizFrame
      title="Tasks and records, stage by stage"
      table={
        <VizTable
          caption="Records read by each task, per stage"
          columns={['Stage', 'Records per task', 'Slowest task']}
          rows={result.stages.map((st, i) => [`stage ${i + 1}`, st.join(', '), Math.max(...st)])}
        />
      }
      caption={
        <>
          Each chip is a record labeled by customer; C1 is highlighted. When tasks differ, the slowest is
          outlined: the stage cannot finish before it. Total time in this model: {result.time} units.
        </>
      }
    >
      <div className={s.stages}>
        <Stage
          title={`Stage 1: ${result.inputs.length} tasks, one per input file`}
          parts={result.inputs}
          stage={1}
          label={order}
          isDropped={state.op === 'filter' ? (r) => r.amount < 20 : undefined}
        />
        <p className={s.arrow} data-shuffle={shuffle ? result.moved.length : 0}>
          {state.op === 'filter' &&
            'Narrow: each task filters its own records (crossed out: amount below 20). Nothing moves.'}
          {state.op === 'broadcast' &&
            'Broadcast join: the 6-row customers table is copied to every task, so the orders stay where they are.'}
          {state.op === 'sum' &&
            `Each task first adds up its own records per customer, then ${result.moved.length} partial sums are shuffled to ${state.partitions} partitions by hash(customer) % ${state.partitions}.`}
          {state.op === 'join' &&
            `Shuffle: all ${result.moved.length} orders are sent to partition hash(customer) % ${state.partitions}, so every order of one customer meets in one task.`}
        </p>
        {shuffle && (
          <Stage
            title={`Stage 2: ${state.partitions} tasks, one per shuffle partition`}
            parts={result.outputs!}
            stage={2}
            label={state.op === 'sum' ? partial : order}
          />
        )}
      </div>
    </VizFrame>
  );
}
