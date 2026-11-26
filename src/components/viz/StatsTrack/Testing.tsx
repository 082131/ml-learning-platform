import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { normalPdf } from '@/lib/stats/dist';
import { fmtP, type PowerResult, type PowerState, type TestResult, type TestState } from '@/lib/stats/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars, Curve, Legend, Plot, sampleCurve, Shade, VLine } from './Plot';
import s from './StatsTrack.module.css';

/** The null distribution of correct labels, with the outcomes at least as extreme as the observed one highlighted. */
export function NullView() {
  const { state, result: r } = useExperimentContext<TestState, TestResult>('NullView');
  const k = Math.min(state.k, state.n);
  const lo = Math.max(0, Math.floor(Math.min(k, r.expected - 4.5 * r.sd)));
  const hi = Math.min(state.n, Math.ceil(Math.max(k, r.expected + 4.5 * r.sd)));
  const shown = r.values.filter((v) => v >= lo && v <= hi);
  return (
    <VizFrame
      title={`If the new model were no better than ${state.p0}%: correct labels out of ${state.n}`}
      caption={`Highlighted: outcomes at least as extreme as the observed ${k} (${state.sides === 'greater' ? 'k or more' : 'no more likely than k, on both sides'}). They add up to the p-value, ${fmtP(r.pValue)}.`}
      table={<VizTable caption="Null distribution" columns={['correct', 'probability if the null is true', 'counted in p']} rows={shown.map((v) => [v, r.probs[v]!.toFixed(4), r.extreme[v] ? 'yes' : ''])} />}
    >
      <div data-p={r.pValue.toFixed(4)}>
        <Plot label="Binomial null distribution with the extreme outcomes highlighted" xDomain={[lo - 0.5, hi + 0.5]} yDomain={[0, Math.max(...r.probs) * 1.18]} xLabel="correct labels" yLabel="probability under H₀">
          {(x, y) => (
            <>
              <Bars x={x} y={y} bars={shown.map((v) => ({ at: v, h: r.probs[v]!, on: r.extreme[v] }))} tone={(on) => (on ? 'err' : 'muted')} />
              <VLine x={x} y={y} at={k} label={`observed ${k}`} tone="accent" anchor={x(k) > x(hi) - 80 ? 'end' : 'start'} />
              <VLine x={x} y={y} at={r.expected} label={`expected ${r.expected.toFixed(0)}`} anchor="end" />
            </>
          )}
        </Plot>
        <Legend
          items={[
            { tone: 'err', label: `at least as extreme: total ${fmtP(r.pValue)}` },
            { tone: 'muted', label: 'less extreme' },
          ]}
        />
        <p className={s.muted}>
          This picture assumes the null hypothesis is true. The p-value answers: in that world, how often would we see a result this far from {r.expected.toFixed(0)}?
        </p>
      </div>
    </VizFrame>
  );
}

/** The test statistic's distribution if there is no effect (H₀) and if the effect is real (H₁). */
export function PowerView() {
  const { state, result: r } = useExperimentContext<PowerState, PowerResult>('PowerView');
  const lo = -4;
  const hi = Math.max(5, r.shift + 4);
  const h0 = sampleCurve((z) => normalPdf(z), lo, hi, 300);
  const h1 = sampleCurve((z) => normalPdf(z, r.shift), lo, hi, 300);
  const two = state.sides === 'two';
  return (
    <VizFrame
      title="Two worlds: no effect (H₀) and a real effect (H₁)"
      caption={`Reject when z > ${r.crit.toFixed(2)}${two ? ` or z < −${r.crit.toFixed(2)}` : ''}. False alarm rate α = ${state.alpha}. If the effect is real, the test catches it ${(100 * r.power).toFixed(1)}% of the time (power) and misses it ${(100 * r.beta).toFixed(1)}% (β).`}
      table={
        <VizTable
          caption="Error rates"
          columns={['', 'H₀ true (no effect)', 'H₁ true (effect)']}
          rows={[
            ['reject H₀', `Type I error: α = ${state.alpha}`, `correct: power = ${r.power.toFixed(3)}`],
            ['keep H₀', `correct: ${(1 - state.alpha).toFixed(2)}`, `Type II error: β = ${r.beta.toFixed(3)}`],
          ]}
        />
      }
    >
      <div data-power={r.power.toFixed(3)}>
        <Plot label="Null and alternative distributions of the z statistic" xDomain={[lo, hi]} yDomain={[0, 0.46]} xLabel="z statistic" yLabel="density">
          {(x, y) => (
            <>
              <Shade x={x} y={y} pts={h1} from={r.crit} to={hi} tone="ok" />
              <Shade x={x} y={y} pts={h1} from={lo} to={r.crit} tone="warn" />
              <Shade x={x} y={y} pts={h0} from={r.crit} to={hi} tone="err" />
              {two && <Shade x={x} y={y} pts={h0} from={lo} to={-r.crit} tone="err" />}
              <Curve x={x} y={y} pts={h0} tone="muted" dashed />
              <Curve x={x} y={y} pts={h1} />
              <VLine x={x} y={y} at={r.crit} label="reject →" tone="err" anchor="start" />
              {two && <VLine x={x} y={y} at={-r.crit} label="← reject" tone="err" anchor="end" />}
            </>
          )}
        </Plot>
        <Legend
          items={[
            { tone: 'muted', label: 'H₀: no effect', kind: 'dashed' },
            { tone: 'accent', label: `H₁: effect, centred at d·√n = ${r.shift.toFixed(2)}`, kind: 'line' },
            { tone: 'err', label: 'α: false alarm' },
            { tone: 'warn', label: 'β: missed effect' },
            { tone: 'ok', label: 'power: caught effect' },
          ]}
        />
      </div>
    </VizFrame>
  );
}
