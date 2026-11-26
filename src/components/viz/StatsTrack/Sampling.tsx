import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { normalPdf } from '@/lib/stats/dist';
import { CI_REPS, CI_SHOWN, coverageOk, SAMPLE_REPS, type CiResult, type CiState, type SamplingResult, type SamplingState } from '@/lib/stats/experiments';
import { getPopulation, histogram } from '@/lib/stats/sim';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars, Curve, Legend, Plot, sampleCurve, VLine } from './Plot';
import s from './StatsTrack.module.css';

const BINS = 40;

/**
 * Top: the population's shape and one sample from it. Bottom: the means of 1,000 samples. `scale="population"` keeps
 * both on the population's axis, so you see the means bunch up; `scale="zoom"` zooms in on the means and draws the
 * normal curve the central limit theorem predicts.
 */
export function SamplingView({ scale = 'population' }: { scale?: 'population' | 'zoom' }) {
  const { state, result: r } = useExperimentContext<SamplingState, SamplingResult>('SamplingView');
  const pop = getPopulation(state.pop);
  const binary = !pop.pdf;
  const meanLo = scale === 'zoom' ? Math.max(pop.lo, pop.mean - 4.5 * r.seFormula) : pop.lo;
  const meanHi = scale === 'zoom' ? Math.min(pop.hi, pop.mean + 4.5 * r.seFormula) : pop.hi;
  const bins = histogram(r.means, meanLo, meanHi, BINS);
  const w = (meanHi - meanLo) / BINS;
  const dens = bins.map((b) => b.count / (SAMPLE_REPS * w));
  const clt = sampleCurve((x) => normalPdf(x, pop.mean, r.seFormula), meanLo, meanHi);
  const popCurve = pop.pdf ? sampleCurve(pop.pdf, pop.lo, pop.hi) : [];
  const popTop = binary ? 1 : Math.max(...popCurve.map((p) => p[1])) * 1.15;
  const meansTop = Math.max(...dens, scale === 'zoom' ? normalPdf(pop.mean, pop.mean, r.seFormula) : 0) * 1.15 || 1;
  return (
    <VizFrame
      title={`${SAMPLE_REPS.toLocaleString('en-US')} samples of size ${state.n}`}
      badge={<Badge tone="simulated">Seeded simulation</Badge>}
      caption={`The sample means spread with SD ${r.seMeasured.toFixed(3)}; σ/√n predicts ${r.seFormula.toFixed(3)}. Their skewness is ${r.skewMeans.toFixed(2)} (0 means symmetric). ${(100 * r.within).toFixed(1)}% fall within μ ± 1.96·σ/√n.`}
      table={<VizTable caption="Histogram of the sample means" columns={['from', 'to', 'count']} rows={bins.filter((b) => b.count > 0).map((b) => [b.lo.toFixed(2), b.hi.toFixed(2), b.count])} />}
    >
      <div className={s.grid2} data-se={r.seMeasured.toFixed(3)} data-skew={r.skewMeans.toFixed(2)}>
        <section className={s.panel} aria-label="Population">
          <h4 className={s.panelHead}>The population, and sample 1 (ticks)</h4>
          <Plot label="Population shape with one sample" xDomain={[pop.lo, pop.hi]} yDomain={[0, popTop]} xLabel={pop.unit ? `value (${pop.unit})` : 'value'} yLabel={binary ? 'share' : 'density'} height={190}>
            {(x, y) => (
              <>
                {binary ? (
                  <Bars x={x} y={y} width={0.25} bars={[{ at: 0, h: 1 - pop.mean }, { at: 1, h: pop.mean, on: true }]} />
                ) : (
                  <Curve x={x} y={y} pts={popCurve} tone="muted" />
                )}
                {r.first.slice(0, 200).map((v, i) => (
                  <line key={i} x1={x(v)} x2={x(v)} y1={y(0)} y2={y(0) - 10} stroke="var(--accent)" strokeWidth={1.5} opacity={binary ? 0.4 : 0.8} />
                ))}
                <VLine x={x} y={y} at={pop.mean} label="μ" tone="err" />
              </>
            )}
          </Plot>
        </section>
        <section className={s.panel} aria-label="Sample means">
          <h4 className={s.panelHead}>The {SAMPLE_REPS.toLocaleString('en-US')} sample means</h4>
          <Plot label="Histogram of sample means" xDomain={[meanLo, meanHi]} yDomain={[0, meansTop]} xLabel="sample mean" yLabel="density" height={190}>
            {(x, y) => (
              <>
                {bins.map((b, i) => (
                  <rect key={i} className={s.bar} data-tone="accent" x={x(b.lo)} width={Math.max(0.5, x(b.hi) - x(b.lo) - 1)} y={y(dens[i]!)} height={y(0) - y(dens[i]!)} />
                ))}
                {scale === 'zoom' && <Curve x={x} y={y} pts={clt} tone="err" dashed />}
                <VLine x={x} y={y} at={pop.mean} label="μ" tone="err" />
              </>
            )}
          </Plot>
          {scale === 'zoom' && (
            <Legend
              items={[
                { tone: 'accent', label: 'sample means' },
                { tone: 'err', label: 'normal curve, mean μ, SD σ/√n', kind: 'dashed' },
              ]}
            />
          )}
        </section>
      </div>
    </VizFrame>
  );
}

/** 50 of the 1,000 confidence intervals, each drawn from a fresh sample, against the true mean. */
export function IntervalsView() {
  const { state, result: r } = useExperimentContext<CiState, CiResult>('IntervalsView');
  const pop = getPopulation(state.pop);
  const lo = Math.min(...r.shown.map((i) => i.lo), r.trueMean - pop.sd);
  const hi = Math.max(...r.shown.map((i) => i.hi), r.trueMean + pop.sd);
  const rowH = 5;
  const height = CI_SHOWN * rowH + 60;
  return (
    <VizFrame
      title={`${CI_SHOWN} of ${CI_REPS.toLocaleString('en-US')} intervals, each from a new sample of ${state.n}`}
      badge={<Badge tone="simulated">Seeded simulation</Badge>}
      caption={`${r.covered} of ${CI_REPS.toLocaleString('en-US')} intervals (${(100 * r.coverage).toFixed(1)}%) contain the true mean ${r.trueMean}; ${(100 * state.confidence).toFixed(0)}% was promised. Of the ${CI_SHOWN} drawn, ${r.shownMisses} miss (thick, red).`}
      table={<VizTable caption="The drawn intervals" columns={['#', 'sample mean', 'low', 'high', 'contains μ']} rows={r.shown.map((iv, k) => [k + 1, iv.mean.toFixed(2), iv.lo.toFixed(2), iv.hi.toFixed(2), iv.covers ? 'yes' : 'no'])} />}
    >
      <div data-coverage={r.coverage.toFixed(3)} data-misses={r.shownMisses}>
        <p className={s.verdict} data-ok={coverageOk(r.coverage, state.confidence)}>
          Coverage {(100 * r.coverage).toFixed(1)}% vs the promised {(100 * state.confidence).toFixed(0)}%
          {coverageOk(r.coverage, state.confidence) ? ': the promise holds (within simulation noise).' : ': the promise is broken.'}
        </p>
        <Plot label="Confidence intervals against the true mean" xDomain={[lo, hi]} yDomain={[0, CI_SHOWN + 1]} xLabel="value" yLabel="interval #" height={height} format={(v) => String(Number(v.toPrecision(4)))}>
          {(x, y) => (
            <>
              {r.shown.map((iv, k) => (
                <g key={k} data-covers={iv.covers}>
                  <line className={iv.covers ? s.ivHit : s.ivMiss} x1={x(iv.lo)} x2={x(iv.hi)} y1={y(k + 1)} y2={y(k + 1)} />
                  <circle className={s.ivDot} cx={x(iv.mean)} cy={y(k + 1)} r={1.8} />
                </g>
              ))}
              <VLine x={x} y={y} at={r.trueMean} label={`true μ = ${r.trueMean}`} tone="accent" />
            </>
          )}
        </Plot>
        <Legend
          items={[
            { tone: 'muted', label: 'contains μ', kind: 'line' },
            { tone: 'err', label: 'misses μ (thick)', kind: 'line' },
          ]}
        />
      </div>
    </VizFrame>
  );
}
