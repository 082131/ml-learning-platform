import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { fmtP, PEEK_EXPERIMENTS, PEEK_SHOWN, type AbResult, type AbState, type DesignResult, type DesignState, type PeekResult, type PeekState } from '@/lib/stats/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Curve, Legend, Plot, VLine } from './Plot';
import s from './StatsTrack.module.css';

const n = (x: number) => x.toLocaleString('en-US');

/** Visitors needed per group against the smallest lift we want to detect. */
export function SampleSizeView() {
  const { state, result: r } = useExperimentContext<DesignState, DesignResult>('SampleSizeView');
  const top = Math.min(r.curve[0]![1], r.perGroup * 6);
  return (
    <VizFrame
      title="How many visitors to detect a lift?"
      caption={`To detect a ${state.mde}% relative lift on a ${state.baseline}% baseline (${(100 * r.p1).toFixed(2)}% → ${(100 * r.p2).toFixed(2)}%) you need ${n(r.perGroup)} visitors per group: ${r.days} days at ${n(state.traffic)} visitors a day. Halving the lift roughly quadruples the visitors.`}
      table={<VizTable caption="Visitors per group by lift" columns={['relative lift (%)', 'visitors per group']} rows={r.curve.filter(([m]) => m % 4 === 2 || m === state.mde).map(([m, v]) => [m, n(v)])} />}
    >
      <div data-per-group={r.perGroup} data-days={r.days}>
        <Plot label="Visitors per group against minimum detectable lift" xDomain={[2, 50]} yDomain={[0, top]} xLabel="smallest relative lift to detect (%)" yLabel="visitors per group" format={(v) => (v >= 1000 ? `${Number((v / 1000).toPrecision(3))}k` : String(v))}>
          {(x, y) => (
            <>
              <Curve x={x} y={y} pts={r.curve.filter(([, v]) => v <= top * 1.05)} />
              <circle cx={x(state.mde)} cy={y(Math.min(top, r.perGroup))} r={5} fill="var(--err)" />
              <VLine x={x} y={y} at={state.mde} label={`${n(r.perGroup)} per group`} tone="err" anchor={state.mde > 30 ? 'end' : 'start'} />
            </>
          )}
        </Plot>
      </div>
    </VizFrame>
  );
}

/** The confidence interval for B − A on a line with zero marked. */
export function AbIntervalView() {
  const { state, result: r } = useExperimentContext<AbState, AbResult>('AbIntervalView');
  const span = Math.max(Math.abs(r.lo), Math.abs(r.hi), 0.001) * 1.4;
  const crosses = r.lo <= 0 && r.hi >= 0;
  return (
    <VizFrame
      title="The difference B − A, with its uncertainty"
      caption={`Best estimate ${(100 * r.diff).toFixed(2)} points; ${(100 * state.confidence).toFixed(0)}% interval ${(100 * r.lo).toFixed(2)} to ${(100 * r.hi).toFixed(2)} points. ${crosses ? 'It includes 0, so "no difference" is still plausible.' : 'It excludes 0.'} p = ${fmtP(r.pValue)}.`}
      table={
        <VizTable
          caption="Groups"
          columns={['group', 'visitors', 'conversions', 'rate']}
          rows={[
            ['A', state.nA, state.convA, `${(100 * r.rateA).toFixed(2)}%`],
            ['B', state.nB, state.convB, `${(100 * r.rateB).toFixed(2)}%`],
          ]}
        />
      }
    >
      <div data-crosses={crosses} data-p={r.pValue.toFixed(4)}>
        <p className={s.verdict} data-ok={!crosses}>
          {crosses ? 'The interval includes zero: not a clear win yet.' : r.diff > 0 ? 'The whole interval is above zero: B is better.' : 'The whole interval is below zero: B is worse.'}
        </p>
        <Plot label="Interval for the difference in conversion rates" xDomain={[-100 * span, 100 * span]} yDomain={[0, 2]} xLabel="B − A (percentage points)" height={130} format={(v) => String(Number(v.toPrecision(3)))}>
          {(x, y) => (
            <>
              <VLine x={x} y={y} at={0} label="no difference" anchor="start" />
              <line x1={x(100 * r.lo)} x2={x(100 * r.hi)} y1={y(1)} y2={y(1)} stroke={crosses ? 'var(--ink-2)' : 'var(--ok)'} strokeWidth={6} />
              <circle cx={x(100 * r.diff)} cy={y(1)} r={6} fill="var(--accent)" />
            </>
          )}
        </Plot>
      </div>
    </VizFrame>
  );
}

/** p-value paths of A/A tests checked every day, against the 0.05 line. */
export function PeekingView() {
  const { state, result: r } = useExperimentContext<PeekState, PeekResult>('PeekingView');
  const shown = r.runs.slice(0, PEEK_SHOWN);
  return (
    <VizFrame
      title={`${PEEK_EXPERIMENTS} A/A tests: both groups identical`}
      badge={<Badge tone="simulated">Seeded simulation</Badge>}
      caption={`Every "winner" here is a false positive. Looking once at the end: ${r.endOnly} of ${PEEK_EXPERIMENTS} (${((100 * r.endOnly) / PEEK_EXPERIMENTS).toFixed(1)}%). Peeking daily and stopping at the first p < 0.05: ${r.daily} (${((100 * r.daily) / PEEK_EXPERIMENTS).toFixed(1)}%).`}
      table={<VizTable caption="First 8 tests: p-value by day" columns={['test', ...Array.from({ length: state.days }, (_, d) => `day ${d + 1}`)]} rows={shown.map((run, k) => [k + 1, ...run.pValues.map((p) => p.toFixed(3))])} />}
    >
      <div data-false-positives={r.falsePositives}>
        <p className={s.verdict} data-ok={r.rate <= 0.07}>
          {state.rule === 'daily' ? 'Peeking daily' : 'Looking once'}: {r.falsePositives} of {PEEK_EXPERIMENTS} identical tests declared a winner ({(100 * r.rate).toFixed(1)}%, promised 5%).
        </p>
        <Plot label="p-value over days for the first eight tests" xDomain={[1, state.days]} yDomain={[0, 1]} xLabel="day" yLabel="p-value so far">
          {(x, y) => (
            <>
              <rect x={x(1)} width={x(state.days) - x(1)} y={y(0.05)} height={y(0) - y(0.05)} fill="var(--err)" opacity={0.25} />
              {shown.map((run, k) => (
                <Curve key={k} x={x} y={y} pts={run.pValues.map((p, d) => [d + 1, p] as const)} tone={run.firstSignificant !== null ? 'err' : 'muted'} />
              ))}
              <VLine x={x} y={y} at={state.days} label="planned end" anchor="end" />
            </>
          )}
        </Plot>
        <Legend
          items={[
            { tone: 'err', label: 'dipped below 0.05 at some point', kind: 'line' },
            { tone: 'muted', label: 'never below 0.05', kind: 'line' },
            { tone: 'err', label: 'the p < 0.05 zone' },
          ]}
        />
      </div>
    </VizFrame>
  );
}
