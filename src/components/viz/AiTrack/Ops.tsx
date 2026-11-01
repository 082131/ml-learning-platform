import { CACHE_READ_FACTOR, formatUsd, type CostResult, type CostState } from '@/lib/ai/costModel';
import {
  AGENT_TOOLS,
  INJECTED_NOTE,
  USER_REQUEST,
  type PolicyResult,
  type PolicyState,
} from '@/lib/ai/toolPolicy';
import {
  BASE_BAD_RATE,
  HOURS,
  MIN_SAMPLES,
  NEW_BAD_RATE,
  type CanaryResult,
  type CanaryState,
} from '@/lib/ai/canary';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { LineChart } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Status } from './Status';
import s from './AiTrack.module.css';

/** Where the money of one request goes: uncached input, cached input and output. */
export function CostBreakdown() {
  const { state, result } = useExperimentContext<CostState, CostResult>('CostBreakdown');
  const p = result.perRequest;
  const parts = [
    { id: 'uncached', label: 'Input, full price', value: p.uncachedInput },
    { id: 'cached', label: `Input, cache read (${CACHE_READ_FACTOR}×)`, value: p.cachedInput },
    { id: 'output', label: 'Output', value: p.output },
  ];
  const share = (v: number) => `${p.total ? ((v / p.total) * 100).toFixed(1) : '0'}%`;
  return (
    <VizFrame
      title="Cost of one model request (estimate)"
      badge={<Badge tone="simulated">Example prices</Badge>}
      caption={`${formatUsd(p.total)} per request × ${state.requestsPerDay.toLocaleString('en-US')} a day × 30 days × ${Math.round((1 - state.responseCacheRate) * 100)}% that reach the model = ${formatUsd(result.monthly)} a month.`}
      table={
        <VizTable
          caption="Cost parts per request"
          columns={['part', 'dollars', 'share']}
          rows={parts.map((x) => [x.label, formatUsd(x.value), share(x.value)])}
        />
      }
    >
      <div className={s.bars}>
        {parts.map((x) => (
          <div key={x.id} style={{ display: 'contents' }} data-part={x.id}>
            <span>{x.label}</span>
            <span className={s.track} aria-hidden="true">
              <span className={s.fill} style={{ width: share(x.value) }} />
            </span>
            <span>{formatUsd(x.value)}</span>
          </div>
        ))}
      </div>
    </VizFrame>
  );
}

const DECISION_TONE = { runs: 'err', blocked: 'ok', 'waits for approval': 'warn' } as const;

/** The injected note, the tool calls a model following it would make, and what the policy does. */
export function PolicyTable() {
  const { result } = useExperimentContext<PolicyState, PolicyResult>('PolicyTable');
  return (
    <VizFrame
      title="Tool calls after reading an injected note"
      badge={<Badge tone="simulated">Scripted model, real policy</Badge>}
      caption={`${result.harmfulRuns} harmful call${result.harmfulRuns === 1 ? '' : 's'} would run without anyone seeing ${result.harmfulRuns === 1 ? 'it' : 'them'}.`}
    >
      <section className={s.panel} aria-label="Conversation">
        <h4 className={s.panelTitle}>User</h4>
        <p>{USER_REQUEST}</p>
        <h4 className={s.panelTitle}>search_notes result (untrusted text)</h4>
        <pre className={s.pre} tabIndex={0}>
          {INJECTED_NOTE}
        </pre>
      </section>
      <table className={s.table}>
        <caption className="visually-hidden">Proposed tool calls and policy decisions</caption>
        <thead>
          <tr>
            <th scope="col">Proposed call</th>
            <th scope="col">Side effect</th>
            <th scope="col">Decision</th>
            <th scope="col">Why</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr key={r.call.tool} data-tool={r.call.tool} data-decision={r.decision}>
              <th scope="row" className={s.mono}>
                {r.call.tool}({JSON.stringify(r.call.args)})
              </th>
              <td>{AGENT_TOOLS.find((t) => t.name === r.call.tool)?.sideEffect ? 'yes' : 'no'}</td>
              <td>
                <Status
                  tone={
                    r.call.tool === 'search_notes' && r.decision === 'runs' ? 'ok' : DECISION_TONE[r.decision]
                  }
                >
                  {r.decision}
                </Status>
              </td>
              <td className={s.muted}>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </VizFrame>
  );
}

/** Cumulative bad-answer rate of each version, hour by hour, with the alert. */
export function CanaryChart() {
  const { state, result } = useExperimentContext<CanaryState, CanaryResult>('CanaryChart');
  const top = Math.max(0.2, ...result.hours.map((h) => h.newRate));
  return (
    <LineChart
      title="Observed bad-answer rate, cumulative"
      badge={<Badge tone="simulated">Simulated, seed {state.seed}</Badge>}
      xLabel="hour"
      yLabel="bad answers / answers"
      xDomain={[1, HOURS]}
      yDomain={[0, Math.min(1, top * 1.1)]}
      series={[
        {
          id: 'current',
          label: `current version (true rate ${BASE_BAD_RATE * 100}%)`,
          points: result.hours.map((h) => [h.hour, h.baseRate] as const),
          tone: 'muted',
          dashed: true,
        },
        {
          id: 'new',
          label: `new version (true rate ${NEW_BAD_RATE[state.scenario] * 100}%)`,
          points: result.hours
            .filter((h) => h.newN > 0 || h.hour === 1)
            .map((h) => [h.hour, h.newRate] as const),
          tone: 'accent',
        },
      ]}
      overlay={(x, y) =>
        result.alertHour ? (
          <g aria-hidden="true" data-alert-hour={result.alertHour}>
            <line
              className={s.rule}
              x1={x(result.alertHour)}
              x2={x(result.alertHour)}
              y1={y(0)}
              y2={y(top)}
            />
          </g>
        ) : null
      }
      caption={
        result.alertHour
          ? `The alert fired in hour ${result.alertHour} (red line)${state.autoRollback ? ' and traffic went back to the current version' : ''}. ${result.newRequests.toLocaleString('en-US')} requests reached the new version.`
          : `No alert in ${HOURS} hours. The rule needs ${MIN_SAMPLES} answers from the new version and a z statistic above 2.33.`
      }
    />
  );
}
