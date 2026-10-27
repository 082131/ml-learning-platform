import { inspectedStep, hyperOf, type RaceResult, type RaceState } from '@/lib/deep/optimizerExperiment';
import { describeUpdate, OPTIMIZER_IDS, OPTIMIZER_LABEL, surfaceOf } from '@/lib/deep/optimizers';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { RACE_STYLE } from './raceStyle';
import s from './OptimizerRace.module.css';

/** The inspected step's update equations, with its numbers, for all three optimizers. */
export function OptimizerUpdate() {
  const { state, result } = useExperimentContext<RaceState, RaceResult>('OptimizerUpdate');
  const h = hyperOf(state);
  return (
    <div className={s.update} data-update-step={state.inspect}>
      {OPTIMIZER_IDS.map((id) => {
        const run = result[id];
        const step = inspectedStep(run, state.inspect);
        const lines = describeUpdate(id, step, run.steps[step.t - 2], h);
        return (
          <section
            key={id}
            className={s.card}
            aria-label={`${OPTIMIZER_LABEL[id]}, step ${step.t}`}
            data-update={id}
          >
            <h4>
              {OPTIMIZER_LABEL[id]} · step {step.t}
              {step.t < state.inspect && ' (its last step)'}
            </h4>
            <dl>
              {lines.map((l) => (
                <div key={l.symbol} className={s.eq}>
                  <dt>{l.symbol}</dt>
                  <dd>{l.numbers}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

/** Loss f(θ) after every step for the three optimizers. */
export function OptimizerLoss() {
  const { state, result } = useExperimentContext<RaceState, RaceResult>('OptimizerLoss');
  const surface = surfaceOf(state.surface);
  return (
    <LineChart
      title="Loss per step"
      xLabel="step"
      yLabel="f(θ)"
      series={OPTIMIZER_IDS.map((id) => ({
        id,
        label: OPTIMIZER_LABEL[id],
        tone: RACE_STYLE[id].tone,
        dashed: id !== 'sgd',
        points: result[id].path.map((p, k) => [k, surface.f(...p)] as const),
      }))}
      caption={`f(θ) at the start (step 0) and after each update. A diverged run's line stops at its last safe step.`}
    />
  );
}
