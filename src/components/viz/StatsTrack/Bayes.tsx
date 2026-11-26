import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { betaQuantile } from '@/lib/stats/dist';
import { BAYES_DRAWS, betaCurve, fmtP, type BayesAbResult, type BayesAbState, type UpdateResult, type UpdateState } from '@/lib/stats/experiments';
import { histogram } from '@/lib/stats/sim';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Curve, Legend, Plot, Shade, VLine } from './Plot';
import s from './StatsTrack.module.css';

const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`;

/** Prior, likelihood and posterior for a click-through rate. */
export function BetaUpdateView() {
  const { state, result: r } = useExperimentContext<UpdateState, UpdateResult>('BetaUpdateView');
  const k = Math.min(state.successes, state.trials);
  const xMax = Math.min(1, Math.max(0.3, betaQuantile(0.9995, r.postA, r.postB), betaQuantile(0.999, r.a, r.b) * 1.1));
  const prior = betaCurve(r.a, r.b, xMax);
  const post = betaCurve(r.postA, r.postB, xMax);
  // The likelihood of the data, scaled to a density (Beta(k+1, n−k+1)) so it shares the axis.
  const like = state.trials ? betaCurve(k + 1, state.trials - k + 1, xMax) : [];
  const top = Math.max(...post.map((p) => p[1]), ...prior.map((p) => p[1]), ...like.map((p) => p[1])) * 1.1;
  return (
    <VizFrame
      title="Belief about the click rate: before and after the data"
      caption={`Prior mean ${pct(r.priorMean)}; the data alone say ${state.trials ? pct(r.dataRate) : 'nothing yet'}; the posterior mean ${pct(r.postMean, 2)} sits between them. 95% credible interval: ${pct(r.lo, 2)} to ${pct(r.hi, 2)}.`}
      table={
        <VizTable
          caption="Distributions"
          columns={['', 'Beta parameters', 'mean']}
          rows={[
            ['prior', `(${r.a}, ${r.b})`, pct(r.priorMean)],
            ['data', `${k} clicks of ${state.trials}`, state.trials ? pct(r.dataRate) : ''],
            ['posterior', `(${r.postA}, ${r.postB})`, pct(r.postMean, 2)],
          ]}
        />
      }
    >
      <div data-post-mean={r.postMean.toFixed(4)}>
        <Plot label="Prior, likelihood and posterior densities" xDomain={[0, xMax]} yDomain={[0, top]} xLabel="click rate" yLabel="density" format={(v) => (v <= 1 && v >= 0 && v !== Math.round(v) ? `${Math.round(v * 100)}%` : String(Number(v.toPrecision(3))))}>
          {(x, y) => (
            <>
              <Shade x={x} y={y} pts={post} from={r.lo} to={r.hi} />
              <Curve x={x} y={y} pts={prior} tone="muted" dashed />
              {like.length > 0 && <Curve x={x} y={y} pts={like} tone="warn" />}
              <Curve x={x} y={y} pts={post} />
              <VLine x={x} y={y} at={r.postMean} label="posterior mean" tone="accent" anchor={r.postMean > xMax * 0.7 ? 'end' : 'start'} />
            </>
          )}
        </Plot>
        <Legend
          items={[
            { tone: 'muted', label: 'prior: belief before', kind: 'dashed' },
            { tone: 'warn', label: 'likelihood: what the data alone say', kind: 'line' },
            { tone: 'accent', label: 'posterior: belief after (shaded: 95% interval)', kind: 'line' },
          ]}
        />
      </div>
    </VizFrame>
  );
}

/** The two posteriors, and the distribution of B's relative lift over A. */
export function BayesAbView() {
  const { state, result: r } = useExperimentContext<BayesAbState, BayesAbResult>('BayesAbView');
  const lo = Math.min(betaQuantile(0.0005, r.aA, r.bA), betaQuantile(0.0005, r.aB, r.bB));
  const hi = Math.max(betaQuantile(0.9995, r.aA, r.bA), betaQuantile(0.9995, r.aB, r.bB));
  const curve = (a: number, b: number) => betaCurve(a, b, 1, 4000).filter((p) => p[0] >= lo && p[0] <= hi);
  const pa = curve(r.aA, r.bA);
  const pb = curve(r.aB, r.bB);
  const top = Math.max(...pa.map((p) => p[1]), ...pb.map((p) => p[1])) * 1.1;
  const liftLo = Math.max(-1, r.liftLo - (r.liftHi - r.liftLo) * 0.3);
  const liftHi = r.liftHi + (r.liftHi - r.liftLo) * 0.3;
  const bins = histogram(r.lifts, liftLo, liftHi, 50);
  const binTop = Math.max(...bins.map((b) => b.count)) * 1.1;
  return (
    <VizFrame
      title="What we believe about A and B after the test"
      badge={<Badge tone="simulated">{`${BAYES_DRAWS.toLocaleString('en-US')} seeded draws`}</Badge>}
      caption={`P(B beats A) = ${pct(r.probB)}. Shipping B risks an expected ${(100 * r.lossB).toFixed(3)} points of conversion; keeping A risks ${(100 * r.lossA).toFixed(3)}. Relative lift: ${pct(r.liftLo)} to ${pct(r.liftHi)} (95%). The p-value for the same data is ${fmtP(r.pValue)}.`}
      table={
        <VizTable
          caption="Posteriors"
          columns={['group', 'visitors', 'conversions', 'posterior']}
          rows={[
            ['A', state.nA, state.convA, `Beta(${r.aA}, ${r.bA})`],
            ['B', state.nB, state.convB, `Beta(${r.aB}, ${r.bB})`],
          ]}
        />
      }
    >
      <div className={s.grid2} data-prob-b={r.probB.toFixed(3)}>
        <section className={s.panel} aria-label="Posteriors">
          <h4 className={s.panelHead}>Conversion rate: A and B</h4>
          <Plot label="Posterior densities of A and B" xDomain={[lo, hi]} yDomain={[0, top]} xLabel="conversion rate" yLabel="density" height={200} format={(v) => (v < 1 ? `${Number((v * 100).toPrecision(3))}%` : String(Math.round(v)))}>
            {(x, y) => (
              <>
                <Curve x={x} y={y} pts={pa} tone="muted" dashed />
                <Curve x={x} y={y} pts={pb} />
              </>
            )}
          </Plot>
          <Legend
            items={[
              { tone: 'muted', label: 'A', kind: 'dashed' },
              { tone: 'accent', label: 'B', kind: 'line' },
            ]}
          />
        </section>
        <section className={s.panel} aria-label="Lift">
          <h4 className={s.panelHead}>B&apos;s relative lift over A</h4>
          <Plot label="Histogram of the relative lift" xDomain={[liftLo, liftHi]} yDomain={[0, binTop]} xLabel="(B − A) / A" yLabel="draws" height={200} format={(v) => (Math.abs(v) < 5 ? `${Math.round(v * 100)}%` : String(Math.round(v)))}>
            {(x, y) => (
              <>
                {bins.map((b, i) => (
                  <rect key={i} className={s.bar} data-tone={b.hi <= 0 ? 'err' : 'accent'} x={x(b.lo)} width={Math.max(0.5, x(b.hi) - x(b.lo) - 1)} y={y(b.count)} height={y(0) - y(b.count)} />
                ))}
                <VLine x={x} y={y} at={0} label="no lift" anchor="start" />
              </>
            )}
          </Plot>
          <Legend
            items={[
              { tone: 'accent', label: `B better: ${pct(r.probB)}` },
              { tone: 'err', label: `B worse: ${pct(1 - r.probB)}` },
            ]}
          />
        </section>
      </div>
    </VizFrame>
  );
}
