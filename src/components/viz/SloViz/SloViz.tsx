import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyFixed } from '@/lib/inference/format';
import { PER_MINUTE, RULES, START, type SloResult, type SloState } from '@/lib/inference/slo';
import { LineChart, type XY } from '../LineChart/LineChart';
import svg from '../svg/svg.module.css';

const hour = (t: number) => t / 60;
const SHORT = { naive: '1% threshold', fast: 'fast burn', slow: 'slow burn' } as const;

/** The error rate over a simulated day and when each alert rule fires. Use with sloExperiment. */
export function SloChart() {
  const { state: s, result: r } = useExperimentContext<SloState, SloResult>('SloChart');
  const pct: XY[] = r.errors.map((e, t) => [hour(t), (100 * e) / PER_MINUTE]);
  const top = Math.max(1.2, (100 * Math.max(...r.errors)) / PER_MINUTE) * 1.15;
  const fired = RULES.map((rule) => ({ ...rule, at: r.fired[rule.id] }));
  const when = (at: number | null) => (at === null ? 'never' : `after ${at} min`);
  return (
    <div
      data-slo-naive={r.fired.naive ?? 'never'}
      data-slo-fast={r.fired.fast ?? 'never'}
      data-slo-slow={r.fired.slow ?? 'never'}
    >
      <LineChart
        title="Error rate over one day, and when each alert fires"
        xLabel="hour of the day"
        yLabel="% of requests failing"
        badge={<Badge tone="simulated">Simulated</Badge>}
        series={[
          { id: 'errors', label: 'Error rate', points: pct, inTable: false },
          {
            id: 'budget',
            label: `Budget rate (${pyFixed(r.budget * 100, 1)}%)`,
            points: [
              [0, r.budget * 100],
              [24, r.budget * 100],
            ],
            tone: 'muted',
            dashed: true,
            inTable: false,
          },
        ]}
        xDomain={[0, 24]}
        yDomain={[0, top]}
        overlay={(x, y) => (
          <g aria-hidden="true">
            {fired
              .filter((f) => f.at !== null)
              .map((f, i) => {
                const cx = x(hour(START + f.at! - 1));
                return (
                  <g key={f.id} className={svg.err}>
                    <line x1={cx} x2={cx} y1={y(top)} y2={y(0)} strokeDasharray="3 3" strokeWidth={1.5} />
                    <text className={svg.label} x={cx + 4} y={y(top) + 14 + 14 * i}>
                      {SHORT[f.id]}
                    </text>
                  </g>
                );
              })}
          </g>
        )}
        caption={`${s.error}% of requests fail for ${s.duration} minutes from 06:00, against a ${s.target}% SLO: burn rate ${pyFixed(r.burn, 1)}, ${pyFixed(r.consumed * 100, 1)}% of a 30-day error budget. ${fired.map((f) => `${f.label}: ${when(f.at)}`).join('. ')}.`}
      />
    </div>
  );
}
