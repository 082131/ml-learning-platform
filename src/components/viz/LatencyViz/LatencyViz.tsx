import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyFixed } from '@/lib/inference/format';
import {
  RUN_MS,
  SERVICE_MS,
  STALL_AT,
  type BenchResult,
  type BenchState,
  type OmissionResult,
  type OmissionState,
} from '@/lib/inference/profiling';
import { LineChart, type XY } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './LatencyViz.module.css';

const BINS = 24;

/** Histogram of the timed calls with the percentiles marked. Use with benchExperiment. */
export function LatencyHistogram() {
  const { state, result: r } = useExperimentContext<BenchState, BenchResult>('LatencyHistogram');
  // Bins cover 0 to a little past p95; slower calls go in the last, "overflow" bin.
  const hi = Math.max(r.p95 * 1.6, 0.5);
  const width = hi / BINS;
  const counts = Array<number>(BINS + 1).fill(0);
  for (const t of r.times) counts[Math.min(BINS, Math.floor(t / width))]!++;
  const top = Math.max(...counts);
  const marks = [
    ['p50', r.p50],
    ['p95', r.p95],
    ['p99', r.p99],
  ] as const;
  return (
    <VizFrame
      title="Measured call times"
      badge={<Badge tone="simulated">Simulated calls</Badge>}
      caption={`${r.times.length} timed calls after ${state.warmup} warm-up call${state.warmup === 1 ? '' : 's'}${state.sync === 'no' ? ', without synchronization' : ''}. p50 ${pyFixed(r.p50, 2)} ms, p95 ${pyFixed(r.p95, 2)} ms, p99 ${pyFixed(r.p99, 2)} ms, max ${pyFixed(r.max, 2)} ms. The last bar collects every call slower than ${pyFixed(hi, 1)} ms.`}
      table={
        <VizTable
          caption="Calls per time bin"
          columns={['From (ms)', 'To (ms)', 'Calls']}
          rows={counts.map((c, i) => [
            pyFixed(i * width, 2),
            i === BINS ? 'slower' : pyFixed((i + 1) * width, 2),
            c,
          ])}
        />
      }
    >
      <div className={s.hist} data-p99={pyFixed(r.p99, 2)} data-mean={pyFixed(r.mean, 2)} aria-hidden="true">
        {counts.map((c, i) => (
          <span
            key={i}
            className={i === BINS ? s.overflow : s.bar}
            style={{ height: `${(100 * c) / top}%` }}
            title={`${c}`}
          />
        ))}
        {marks.map(([name, v]) =>
          v < hi ? (
            <span
              key={name}
              className={s.mark}
              style={{ left: `${(100 * v) / ((hi * (BINS + 1)) / BINS)}%` }}
            >
              <span className={s.markLabel}>{name}</span>
            </span>
          ) : null,
        )}
      </div>
      <div className={s.axis} aria-hidden="true">
        <span>0 ms</span>
        <span>{pyFixed(hi, 1)} ms</span>
        <span>slower</span>
      </div>
    </VizFrame>
  );
}

/** Latency of each request by when it was sent, for both load generators. Use with omissionExperiment. */
export function OmissionChart() {
  const { state, result: r } = useExperimentContext<OmissionState, OmissionResult>('OmissionChart');
  // A gap in sending (the closed-loop client waiting) breaks the line instead of drawing a slope across it.
  const pts = (run: OmissionResult['open']): XY[] =>
    run.reqs.flatMap((q, i): XY[] => {
      const prev = run.reqs[i - 1];
      const gap = prev !== undefined && q.sent - prev.sent > 4 * SERVICE_MS;
      return gap
        ? [
            [(prev.sent + q.sent) / 2000, NaN],
            [q.sent / 1000, q.latency],
          ]
        : [[q.sent / 1000, q.latency]];
    });
  const sel = state.client === 'closed' ? r.closed : r.open;
  return (
    <div data-omission-p99={pyFixed(sel.p99, 1)}>
      <LineChart
        title="Latency of each request, by the time it was sent"
        xLabel="time (s)"
        yLabel="latency (ms)"
        badge={<Badge tone="neutral">Computed in your browser</Badge>}
        series={[
          {
            id: 'open',
            label: `Open loop (${r.open.reqs.length} requests)`,
            points: pts(r.open),
            inTable: false,
          },
          {
            id: 'closed',
            label: `Closed loop (${r.closed.reqs.length} requests)`,
            points: pts(r.closed),
            tone: 'muted',
            dashed: true,
            inTable: false,
          },
        ]}
        xDomain={[0, RUN_MS / 1000]}
        yDomain={[0, Math.max(50, state.stall + 50)]}
        caption={`The server freezes for ${state.stall} ms at t = ${STALL_AT / 1000} s. Closed loop: p99 ${pyFixed(r.closed.p99, 1)} ms, max ${pyFixed(r.closed.max, 1)} ms. Open loop: p99 ${pyFixed(r.open.p99, 1)} ms, max ${pyFixed(r.open.max, 1)} ms. The closed-loop client sent nothing while it waited, so it recorded the freeze as one slow request.`}
      />
    </div>
  );
}
