import { useRef } from 'react';
import { scaleLog } from 'd3-scale';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyFixed, pyThousands } from '@/lib/inference/format';
import {
  GPUS16,
  OPS,
  roof,
  runRoofline,
  runStall,
  STALL_BATCH,
  type OpId,
  type RooflineResult,
  type RooflineState,
  type StallResult,
  type StallState,
} from '@/lib/inference/roofline';
import svg from '../svg/svg.module.css';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './RooflineViz.module.css';

/** Label offsets, so that operations at the same intensity do not overlap. */
const LABEL_DY: Record<OpId, number> = { linear: 18, attention: -9, softmax: 4, add: -9 };
const X_DOMAIN: [number, number] = [0.1, 3000];
const Y_DOMAIN: [number, number] = [0.0005, 3000]; // TFLOP/s
const M = { top: 14, right: 16, bottom: 40, left: 56 };
const HEIGHT = 300;
const tflops = (r: RooflineResult) => r.flops / r.time / 1e12;
const pow10 = (lo: number, hi: number) => {
  const out: number[] = [];
  for (let e = Math.ceil(Math.log10(lo)); 10 ** e <= hi; e++) out.push(10 ** e);
  return out;
};
const tick = (n: number) => (n >= 1 ? pyThousands(n) : String(Number(n.toPrecision(1))));

/** A log-log roofline for one GPU with every operation at the current batch. Use with rooflineExperiment. */
export function RooflineChart() {
  const { state: st, result: r } = useExperimentContext<RooflineState, RooflineResult>('RooflineChart');
  const g = GPUS16[st.gpu]!;
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const x = scaleLog()
    .domain(X_DOMAIN)
    .range([M.left, width - M.right]);
  const y = scaleLog()
    .domain(Y_DOMAIN)
    .range([HEIGHT - M.bottom, M.top]);
  const ridge = g.peak / g.bandwidth;
  const roofPts = [X_DOMAIN[0], ridge, X_DOMAIN[1]].map((i) => `${x(i)},${y(roof(g, i) / 1e12)}`).join(' ');
  const all = (Object.keys(OPS) as OpId[]).map((op) => ({
    op,
    r: op === st.op ? r : runRoofline({ ...st, op }),
  }));
  const clampY = (v: number) => Math.max(Y_DOMAIN[0], v);
  return (
    <VizFrame
      title={`Roofline of the ${g.label} (FP16)`}
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`Below ${pyFixed(ridge, 0)} FLOPs per byte the slanted memory roof limits a kernel; above it, the flat compute roof. At batch ${pyThousands(r.batch)} the ${OPS[st.op].label.toLowerCase()} does ${pyFixed(r.intensity, 2)} FLOPs per byte and reaches ${pyFixed(tflops(r), 1)} of ${pyThousands(g.peak / 1e12)} TFLOP/s (${r.bound}-bound). Dots sit below the roof when launch cost dominates.`}
      table={
        <VizTable
          caption="Each operation at the current batch"
          columns={['Operation', 'FLOP/byte', 'TFLOP/s reached', 'Limited by']}
          rows={all.map(({ op, r: o }) => [
            OPS[op].label,
            pyFixed(o.intensity, 2),
            pyFixed(tflops(o), 2),
            o.bound,
          ])}
        />
      }
    >
      <div
        ref={ref}
        className={s.chart}
        data-roofline-bound={r.bound}
        data-intensity={pyFixed(r.intensity, 2)}
      >
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Roofline: TFLOP/s against FLOPs per byte for the ${g.label}`}
        >
          <g aria-hidden="true">
            {pow10(...X_DOMAIN).map((t) => (
              <g key={`x${t}`}>
                <line className={svg.grid} x1={x(t)} x2={x(t)} y1={M.top} y2={HEIGHT - M.bottom} />
                <text className={svg.tick} x={x(t)} y={HEIGHT - M.bottom + 16} textAnchor="middle">
                  {tick(t)}
                </text>
              </g>
            ))}
            {pow10(...Y_DOMAIN).map((t) => (
              <g key={`y${t}`}>
                <line className={svg.grid} x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
                <text className={svg.tick} x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                  {tick(t)}
                </text>
              </g>
            ))}
            <text
              className={svg.axisLabel}
              x={(M.left + width - M.right) / 2}
              y={HEIGHT - 6}
              textAnchor="middle"
            >
              FLOPs per byte moved (log)
            </text>
            <text
              className={svg.axisLabel}
              transform={`translate(14,${(M.top + HEIGHT - M.bottom) / 2}) rotate(-90)`}
              textAnchor="middle"
            >
              TFLOP/s (log)
            </text>
            <line
              className={svg.muted}
              x1={x(ridge)}
              x2={x(ridge)}
              y1={y(g.peak / 1e12)}
              y2={HEIGHT - M.bottom}
              strokeDasharray="4 4"
            />
            <polyline className={`${svg.ink} ${svg.line}`} points={roofPts} />
            <text className={svg.label} x={width - M.right} y={y(g.peak / 1e12) - 8} textAnchor="end">
              compute roof {pyThousands(g.peak / 1e12)} TFLOP/s
            </text>
            <text className={svg.label} x={x(ridge) + 6} y={HEIGHT - M.bottom - 6}>
              ridge {pyFixed(ridge, 0)}
            </text>
            {all.map(({ op, r: o }) => {
              const sel = op === st.op;
              const cx = x(o.intensity);
              const cy = y(clampY(tflops(o)));
              return (
                <g key={op} className={sel ? svg.accent : svg.muted}>
                  <circle cx={cx} cy={cy} r={sel ? 7 : 5} fillOpacity={sel ? 1 : 0.35} strokeWidth={2} />
                  <text className={svg.label} x={cx + 9} y={cy + LABEL_DY[op]}>
                    {op}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </VizFrame>
  );
}

const WINDOW = 60; // ms shown

interface Block {
  start: number;
  end: number;
  k: number;
}

/** CPU and GPU activity over time with one batch of prefetch, or none. Steady-state numbers come from runStall. */
export function stallTimeline(st: StallState): { cpu: Block[]; gpu: Block[] } {
  const cpu: Block[] = [];
  const gpu: Block[] = [];
  for (let k = 0; ; k++) {
    const prevCpuEnd = cpu[k - 1]?.end ?? 0;
    const prevGpu = gpu[k - 1];
    const cStart = st.overlap === 'yes' ? Math.max(prevCpuEnd, prevGpu?.start ?? 0) : (prevGpu?.end ?? 0);
    const c = { start: cStart, end: cStart + st.cpu, k };
    const gStart = Math.max(c.end, prevGpu?.end ?? 0);
    if (cStart >= WINDOW) break;
    cpu.push(c);
    gpu.push({ start: gStart, end: gStart + st.gpu, k });
  }
  return { cpu, gpu };
}

/** Two timelines, CPU and GPU, showing the GPU's idle gaps. Use with stallExperiment. */
export function StallTimeline() {
  const { state: st, result: r } = useExperimentContext<StallState, StallResult>('StallTimeline');
  const { cpu, gpu } = stallTimeline(st);
  const faster = runStall({ ...st, gpu: st.gpu / 2 });
  const row = (blocks: Block[], cls: string) =>
    blocks
      .filter((b) => b.start < WINDOW)
      .map((b) => (
        <span
          key={b.k}
          className={cls}
          style={{
            left: `${(100 * b.start) / WINDOW}%`,
            width: `${(100 * (Math.min(b.end, WINDOW) - b.start)) / WINDOW}%`,
          }}
        >
          {b.end - b.start >= 3 ? b.k + 1 : ''}
        </span>
      ));
  return (
    <VizFrame
      title="Who is waiting for whom"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`Each block is one batch of ${STALL_BATCH} images (numbered). The GPU runs ${pyFixed(r.util * 100, 1)}% of the time${r.util < 1 ? `; the rest it waits for the CPU${st.overlap === 'no' ? ', which only starts the next batch after the GPU finishes' : ''}` : ' and sets the pace'}. ${pyThousands(r.throughput)} images/s; a GPU twice as fast would give ${pyThousands(faster.throughput)}.`}
      table={
        <VizTable
          caption="Batches in the first 60 ms"
          columns={['Batch', 'CPU from (ms)', 'CPU to', 'GPU from', 'GPU to']}
          rows={cpu.map((c, i) => [
            c.k + 1,
            pyFixed(c.start, 1),
            pyFixed(c.end, 1),
            pyFixed(gpu[i]!.start, 1),
            pyFixed(gpu[i]!.end, 1),
          ])}
        />
      }
    >
      <div className={s.timeline} data-stall-util={pyFixed(r.util * 100, 1)} aria-hidden="true">
        <span className={s.rowLabel}>CPU</span>
        <div className={s.track}>{row(cpu, s.cpuBlock!)}</div>
        <span className={s.rowLabel}>GPU</span>
        <div className={s.track}>{row(gpu, s.gpuBlock!)}</div>
        <span />
        <div className={s.scale}>
          <span>0 ms</span>
          <span>{WINDOW / 2} ms</span>
          <span>{WINDOW} ms</span>
        </div>
      </div>
    </VizFrame>
  );
}
