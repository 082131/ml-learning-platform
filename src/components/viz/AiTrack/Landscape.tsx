import {
  apiCostPerRequest,
  DAYS_PER_MONTH,
  VOLUME_STEPS,
  type ApproachResult,
  type ApproachState,
  type Verdict,
} from '@/lib/ai/approach';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge, cx } from '@/components/ui';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame } from '../VizFrame/VizFrame';
import { Status, type StatusTone } from './Status';
import s from './AiTrack.module.css';

const TONE: Record<Verdict, StatusTone> = { fits: 'ok', possible: 'warn', poor: 'err' };
const LABEL: Record<Verdict, string> = { fits: 'fits', possible: 'possible', poor: 'poor fit' };
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** The four ways to get a model, judged against the chosen use case. */
export function ApproachTable() {
  const { result } = useExperimentContext<ApproachState, ApproachResult>('ApproachTable');
  return (
    <VizFrame
      title="Four ways to get a model"
      badge={<Badge tone="ok">Computed from your answers</Badge>}
      caption={`Suggested start: ${result.rows.find((r) => r.id === result.recommended)!.name}. Monthly costs are estimates at example prices.`}
    >
      <table className={s.table}>
        <caption className="visually-hidden">Approaches with verdict, reasons and estimated cost</caption>
        <thead>
          <tr>
            <th scope="col">Approach</th>
            <th scope="col">Verdict</th>
            <th scope="col">Why</th>
            <th scope="col" className={s.num}>
              Running cost / month
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr key={r.id} data-approach={r.id} className={cx(r.id === result.recommended && s.highlight)}>
              <th scope="row">
                {r.name}
                {r.id === result.recommended && <span className={s.muted}> (suggested)</span>}
              </th>
              <td>
                <Status tone={TONE[r.verdict]}>{LABEL[r.verdict]}</Status>
              </td>
              <td>
                <ul className={s.reasons}>
                  {r.reasons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </td>
              <td className={s.num}>{r.monthly === undefined ? 'small (CPU)' : usd(r.monthly)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </VizFrame>
  );
}

/** API cost grows with volume; a self-hosted server costs the same at any volume it can handle. */
export function BreakEvenChart() {
  const { state, result } = useExperimentContext<ApproachState, ApproachResult>('BreakEvenChart');
  const max = VOLUME_STEPS[VOLUME_STEPS.length - 1]!;
  const perDay = DAYS_PER_MONTH * apiCostPerRequest();
  return (
    <LineChart
      title="Monthly cost against volume (estimate)"
      badge={<Badge tone="simulated">Estimate</Badge>}
      xLabel="requests per day"
      yLabel="dollars per month"
      xDomain={[0, max]}
      yDomain={[0, Math.max(max * perDay, result.selfHostMonthly) * 1.05]}
      series={[
        {
          id: 'api',
          label: 'API: requests × 30 × $0.003',
          points: VOLUME_STEPS.map((v) => [v, v * perDay] as const),
          tone: 'accent',
        },
        {
          id: 'gpu',
          label: `One GPU server: $${state.gpuHourly.toFixed(2)} × 720 h`,
          points: [
            [0, result.selfHostMonthly],
            [max, result.selfHostMonthly],
          ],
          tone: 'muted',
          dashed: true,
        },
      ]}
      overlay={(x, y) => (
        <g aria-hidden="true" data-point="current">
          <circle className={s.boxAccent} cx={x(state.requestsPerDay)} cy={y(result.apiMonthly)} r={5} />
          <line
            className={s.rule}
            x1={x(result.breakEvenPerDay)}
            x2={x(result.breakEvenPerDay)}
            y1={y(0)}
            y2={y(result.selfHostMonthly)}
          />
        </g>
      )}
      caption={`At ${state.requestsPerDay.toLocaleString('en-US')} requests a day the API costs about ${usd(result.apiMonthly)} a month; one GPU server costs ${usd(result.selfHostMonthly)}. They meet at ${Math.round(result.breakEvenPerDay).toLocaleString('en-US')} requests a day (dashed red line).`}
    />
  );
}
