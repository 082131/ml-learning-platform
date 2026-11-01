import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { runCanary, type CanaryResult, type CanaryState } from '@/lib/inference/canary';
import { pyFixed } from '@/lib/inference/format';
import { LineChart, type XY } from '../LineChart/LineChart';
import { StackedBars } from '../StackedBars/StackedBars';
import svg from '../svg/svg.module.css';

const SHARES = Array.from({ length: 50 }, (_, i) => i + 1);

/** Extra failed requests against the canary share, and the time to roll back. Use with canaryExperiment. */
export function CanaryCost() {
  const { state: s, result: r } = useExperimentContext<CanaryState, CanaryResult>('CanaryCost');
  if (r.n === null) {
    return (
      <div data-canary-n="none">
        <p>
          The new version’s error rate is not higher than the current one, so there is no regression to
          detect.
        </p>
      </div>
    );
  }
  const runs = SHARES.map((share) => [share, runCanary({ ...s, share })] as const);
  const total: XY[] = runs.map(([x, o]) => [x, o.extraDetect + o.extraRollback]);
  const detect: XY[] = runs.map(([x, o]) => [x, o.extraDetect]);
  const extra = r.extraDetect + r.extraRollback;
  return (
    <div data-canary-n={r.n} data-canary-extra={pyFixed(extra, 0)}>
      <LineChart
        title="Extra failed requests before the rollback"
        xLabel="traffic to the new version (%)"
        yLabel="requests"
        badge={<Badge tone="warn">Estimate</Badge>}
        series={[
          { id: 'total', label: 'Total', points: total, inTable: false },
          {
            id: 'detect',
            label: 'While the test collects evidence',
            points: detect,
            tone: 'muted',
            dashed: true,
            inTable: false,
          },
        ]}
        xDomain={[1, 50]}
        yDomain={[0, Math.max(...total.map((p) => p[1])) * 1.05]}
        overlay={(x, y) => (
          <circle
            className={svg.accent}
            cx={x(s.share)}
            cy={y(extra)}
            r={5}
            fill="none"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        caption={`The test needs ${r.n.toLocaleString('en-US')} canary requests whatever the share, so the failures while it collects them stay at ${pyFixed(r.extraDetect, 1)}. The failures during the ${s.rollback}-minute rollback grow with the share. At ${s.share}%: ${pyFixed(extra, 0)} extra failures.`}
      />
      <StackedBars
        title={`Time until traffic is back on the old version, at ${s.share}%`}
        badge={<Badge tone="warn">Estimate</Badge>}
        parts={[
          { key: 'detect', label: 'Collecting evidence', fill: 'accent' },
          { key: 'rollback', label: 'Rolling back', fill: 'stripe' },
        ]}
        rows={[{ label: 'Canary', values: { detect: r.detect / 60, rollback: s.rollback } }]}
        format={(m) => `${pyFixed(m, 1)} min`}
        caption={`${pyFixed(r.detect / 60, 1)} minutes to collect ${r.n.toLocaleString('en-US')} canary requests at ${pyFixed((s.rate * s.share) / 100, 1)} per second, then ${s.rollback} minutes to roll back.`}
      />
    </div>
  );
}
