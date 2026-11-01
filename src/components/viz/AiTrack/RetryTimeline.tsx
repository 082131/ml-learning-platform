import { SCENARIOS, type RetryResult, type RetryState } from '@/lib/ai/retry';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { useRef } from 'react';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AiTrack.module.css';

const ROW = 26;
const PAD = 8;
const LABEL_W = 84;
const s2 = (x: number) => `${Number(x.toFixed(2))} s`;

/** Every request on one time axis: colored boxes are requests (with their status), dashed boxes are waits. */
export function RetryTimeline() {
  const { state, result } = useExperimentContext<RetryState, RetryResult>('RetryTimeline');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const end = Math.max(result.total, 1);
  const x = (t: number) => LABEL_W + (t / end) * (width - LABEL_W - PAD * 2);
  const height = result.attempts.length * ROW + 24;
  const scenario = SCENARIOS.find((c) => c.id === state.scenario)!;
  return (
    <VizFrame
      title="Requests and waits over time"
      badge={<Badge tone="simulated">Simulated time</Badge>}
      caption={`${scenario.describe} ${result.stopReason} after ${result.attempts.length} request${result.attempts.length === 1 ? '' : 's'} and ${s2(result.total)}.`}
      table={
        <VizTable
          caption="Attempts"
          columns={['request', 'sent at', 'status', 'then waits', 'because']}
          rows={result.attempts.map((a) => [
            a.n + 1,
            s2(a.start),
            a.status + (a.retryAfter !== undefined ? ` (Retry-After: ${a.retryAfter})` : ''),
            a.wait === undefined ? '—' : s2(a.wait),
            a.waitReason ?? (a.status < 400 ? 'done' : 'stop'),
          ])}
        />
      }
    >
      <div ref={ref}>
        <svg className={s.svg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Retry timeline">
          {result.attempts.map((a, i) => {
            const y = i * ROW + 4;
            const ok = a.status < 400;
            return (
              <g key={i} data-attempt={i + 1} data-status={a.status}>
                <text className={s.svgText} x={0} y={y + 14}>
                  #{i + 1} {a.status}
                </text>
                <rect
                  className={ok ? s.boxOk : s.boxErr}
                  x={x(a.start)}
                  y={y}
                  width={Math.max(3, x(a.end) - x(a.start))}
                  height={ROW - 8}
                />
                {a.wait !== undefined && (
                  <>
                    <rect
                      className={s.boxWait}
                      x={x(a.end)}
                      y={y + 3}
                      width={Math.max(1, x(a.end + a.wait) - x(a.end))}
                      height={ROW - 14}
                    />
                    <text className={s.svgMuted} x={x(a.end) + 4} y={y + 13}>
                      {x(a.end + a.wait) - x(a.end) > 60 ? `wait ${s2(a.wait)}` : ''}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          <text className={s.svgMuted} x={LABEL_W} y={height - 4}>
            0 s
          </text>
          <text className={s.svgMuted} x={width - PAD} y={height - 4} textAnchor="end">
            {s2(end)}
          </text>
        </svg>
      </div>
    </VizFrame>
  );
}
