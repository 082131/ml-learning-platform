import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { capacity, type BatchingConfig } from '@/lib/inference/batching';
import type { BatchingResult } from '@/lib/inference/batchingExperiment';
import { pyFixed } from '@/lib/inference/format';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { LineChart, type XY } from '../LineChart/LineChart';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './BatchingSim.module.css';

const SHOWN = 30;
const ROW = 7;
const FALLBACK_WIDTH = 640;
const ms = (x: number) => pyFixed(x, 1);

/** The first requests as a waterfall: waiting (dashed) from arrival to batch start, then the batch run. */
function Waterfall({ r }: { r: BatchingResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const m = DEFAULT_MARGIN;
  const { run } = r;
  const shownBatches = run.batches.filter((b) => b.from < SHOWN);
  const reqs = Array.from({ length: Math.min(SHOWN, run.arrivals.length) }, (_, k) => {
    const b = shownBatches.find((x) => k >= x.from && k < x.to)!;
    return { k, arrival: run.arrivals[k]!, start: b.start, finish: b.finish, size: b.to - b.from };
  });
  const height = m.top + m.bottom + reqs.length * ROW;
  const x = scaleLinear()
    .domain([0, Math.max(...reqs.map((q) => q.finish))])
    .range([m.left, width - m.right])
    .nice();
  const y = scaleLinear()
    .domain([reqs.length, 0])
    .range([height - m.bottom, m.top]);
  return (
    <VizFrame
      title={`The first ${reqs.length} requests`}
      badge={<Badge tone="warn">Simulation (model)</Badge>}
      caption={`Each row is one request: dashed while it waits in the queue, solid while its batch runs. Requests that end together were in the same batch. Here ${shownBatches.length} batches served them.`}
      table={
        <VizTable
          caption="First requests"
          columns={['Request', 'Arrives (ms)', 'Batch starts', 'Finishes', 'Latency (ms)', 'Batch size']}
          rows={reqs.map((q) => [q.k, ms(q.arrival), ms(q.start), ms(q.finish), ms(q.finish - q.arrival), q.size])}
        />
      }
    >
      <div ref={ref}>
        <svg width={width} height={height} role="img" aria-label="Waterfall of request waiting and service times">
          <Axes x={x} y={y} xLabel="time (ms)" yLabel="request" ticks={6} />
          {reqs.map((q) => (
            <g key={q.k}>
              <line className={`${svg.muted} ${svg.line} ${svg.dashed}`} x1={x(q.arrival)} x2={x(q.start)} y1={y(q.k + 0.5)} y2={y(q.k + 0.5)} />
              <line className={`${svg.accent} ${s.service}`} x1={x(q.start)} x2={x(q.finish)} y1={y(q.k + 0.5)} y2={y(q.k + 0.5)} />
            </g>
          ))}
        </svg>
      </div>
    </VizFrame>
  );
}

/** Simulated dynamic batching: a request waterfall plus latency and throughput for every max batch size. */
export function BatchingSim() {
  const { state, result } = useExperimentContext<BatchingConfig, BatchingResult>('BatchingSim');
  const p50: XY[] = result.sweep.map((p) => [p.maxBatch, p.p50]);
  const p95: XY[] = result.sweep.map((p) => [p.maxBatch, p.p95]);
  const sortedP95 = [...result.sweep.map((p) => p.p95)].sort((a, b) => a - b);
  const yMax = Math.min(sortedP95.at(-1)!, 4 * sortedP95[Math.floor(sortedP95.length / 2)]!);
  const cap: XY[] = result.sweep.map((p) => [p.maxBatch, capacity(state, p.maxBatch)]);
  const tput: XY[] = result.sweep.map((p) => [p.maxBatch, p.throughput]);
  const marker = (v: number) => (x: (n: number) => number, y: (n: number) => number) => (
    <circle className={svg.err} cx={x(state.maxBatch)} cy={y(v)} r={6} fill="none" strokeWidth={2} aria-hidden="true" />
  );
  return (
    <div className={s.layout} data-p95={ms(result.run.p95)}>
      <Waterfall r={result} />
      <LineChart
        title="Latency by max batch size"
        xLabel="max batch size"
        yLabel="latency (ms)"
        badge={<Badge tone="warn">Simulation (model)</Badge>}
        yDomain={[0, yMax * 1.05]}
        series={[
          { id: 'p50', label: 'p50 (median)', points: p50, dots: true },
          { id: 'p95', label: 'p95', points: p95, tone: 'err', dashed: true, dots: true },
        ]}
        overlay={marker(result.run.p95)}
        caption={`Same arrivals for every point. The circle is max batch ${state.maxBatch}: p95 ${ms(result.run.p95)} ms. Points above the plotted range (overloaded settings) are in the table.`}
      />
      <LineChart
        title="Throughput by max batch size"
        xLabel="max batch size"
        yLabel="requests per second"
        series={[
          { id: 'throughput', label: 'Simulated throughput', points: tput, dots: true },
          { id: 'capacity', label: 'Capacity if every batch is full (model)', points: cap, tone: 'muted', dashed: true },
        ]}
        overlay={marker(result.run.throughput)}
        caption={`Throughput can never exceed the arrival rate (${state.rate} req/s) or the capacity B / (t0 + per_item · B). Where capacity is below the arrival rate, the replica is overloaded.`}
      />
    </div>
  );
}
