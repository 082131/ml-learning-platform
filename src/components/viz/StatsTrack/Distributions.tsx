import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { normalPdf } from '@/lib/stats/dist';
import type { DiscreteResult, DiscreteState, NormalResult, NormalState } from '@/lib/stats/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars, Curve, Legend, Plot, sampleCurve, Shade, VLine } from './Plot';
import s from './StatsTrack.module.css';

/** The probability of each count, with the bars at or below the threshold k highlighted. */
export function DiscreteView() {
  const { state, result: r } = useExperimentContext<DiscreteState, DiscreteResult>('DiscreteView');
  const binom = state.family === 'binomial';
  const top = Math.max(...r.probs) * 1.15;
  const shown = r.values.filter((v, i) => v <= Math.max(state.k, r.mean + 5 * r.sd) || r.probs[i]! > 1e-4);
  const xMax = Math.max(shown.at(-1) ?? 1, state.k) + 0.5;
  return (
    <VizFrame
      title={binom ? `Successes in ${state.n} tries, each with chance ${state.p.toFixed(2)}` : `Events in one window when λ = ${state.lambda} happen on average`}
      caption={`P(X ≤ ${state.k}) = ${r.pAtMost.toFixed(4)} (highlighted bars added up). P(X > ${state.k}) = ${r.pMore.toFixed(4)}. Mean ${r.mean.toFixed(2)}, SD ${r.sd.toFixed(2)}.`}
      table={<VizTable caption="Probability of each count" columns={['k', 'P(X = k)', 'P(X ≤ k)']} rows={shown.map((v) => [v, r.probs[v]!.toFixed(4), r.probs.slice(0, v + 1).reduce((a, b) => a + b, 0).toFixed(4)])} />}
    >
      <div data-at-most={r.pAtMost.toFixed(4)}>
        <Plot label={`Probability of each count, ${binom ? 'binomial' : 'Poisson'}`} xDomain={[-0.5, xMax]} yDomain={[0, top]} xLabel="count k" yLabel="P(X = k)">
          {(x, y) => (
            <>
              <Bars x={x} y={y} bars={shown.map((v) => ({ at: v, h: r.probs[v]!, on: v <= state.k }))} />
              <VLine x={x} y={y} at={r.mean} label={`mean ${r.mean.toFixed(1)}`} tone="err" anchor="start" />
            </>
          )}
        </Plot>
        <Legend
          items={[
            { tone: 'accent', label: `k ≤ ${state.k}: counted in P(X ≤ ${state.k})` },
            { tone: 'muted', label: `k > ${state.k}` },
            { tone: 'err', label: 'mean', kind: 'dashed' },
          ]}
        />
      </div>
    </VizFrame>
  );
}

/** The bell curve with the area between a and b shaded: that area is the probability. */
export function NormalView() {
  const { state, result: r } = useExperimentContext<NormalState, NormalResult>('NormalView');
  const lo = state.mu - 4 * state.sigma;
  const hi = state.mu + 4 * state.sigma;
  const pts = sampleCurve((x) => normalPdf(x, state.mu, state.sigma), Math.min(lo, 300), Math.max(hi, 700), 400);
  const a = Math.min(state.a, state.b);
  const b = Math.max(state.a, state.b);
  return (
    <VizFrame
      title="Area under the curve = probability"
      caption={`Shaded: P(${a} < X < ${b}) = ${r.prob.toFixed(4)}. In z-scores that is from ${r.zA.toFixed(2)} to ${r.zB.toFixed(2)} standard deviations from the mean.`}
      table={
        <VizTable
          caption="Key values"
          columns={['', 'value', 'z', 'P(X ≤ value)']}
          rows={[
            ['a', a, r.zA.toFixed(2), r.cdfA.toFixed(4)],
            ['b', b, r.zB.toFixed(2), r.cdfB.toFixed(4)],
            ['mean', state.mu, '0.00', '0.5000'],
          ]}
        />
      }
    >
      <div data-prob={r.prob.toFixed(4)}>
        <Plot label="Normal density with the area between a and b shaded" xDomain={[300, 700]} yDomain={[0, normalPdf(state.mu, state.mu, state.sigma) * 1.15]} xLabel="orders in a day" yLabel="density" format={(v) => String(Number(v.toPrecision(3)))}>
          {(x, y) => (
            <>
              <Shade x={x} y={y} pts={pts} from={a} to={b} />
              <Curve x={x} y={y} pts={pts} />
              {[-2, -1, 1, 2].map((k) => (
                <VLine key={k} x={x} y={y} at={state.mu + k * state.sigma} label={`${k > 0 ? '+' : ''}${k}σ`} />
              ))}
              <VLine x={x} y={y} at={state.mu} label="μ" tone="err" />
            </>
          )}
        </Plot>
        <p className={s.muted}>
          The curve&apos;s height is a density, not a probability: a single exact value has probability 0. Only areas, the probability of landing in a range, are probabilities.
        </p>
      </div>
    </VizFrame>
  );
}
