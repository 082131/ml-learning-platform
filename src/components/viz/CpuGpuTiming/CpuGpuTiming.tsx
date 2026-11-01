import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { CPUS, GPUS, MAX_BATCH, ms, sweep, type CpuGpuResult, type CpuGpuState } from '@/lib/inference/cpuGpu';
import { LineChart, type XY } from '../LineChart/LineChart';
import { StackedBars } from '../StackedBars/StackedBars';
import svg from '../svg/svg.module.css';

/** Estimated time per batch on the CPU and the GPU, and where the time goes. Use with cpuGpuExperiment. */
export function CpuGpuTiming() {
  const { state: s, result: r } = useExperimentContext<CpuGpuState, CpuGpuResult>('CpuGpuTiming');
  const cpu = CPUS[s.cpu]!;
  const gpu = GPUS[s.gpu]!;
  const points = sweep(s);
  const cpuLine: XY[] = points.map((p) => [p.batch, p.cpu * 1e3]);
  const gpuLine: XY[] = points.map((p) => [p.batch, p.gpu * 1e3]);
  const work = (t: CpuGpuResult['cpu']) => Math.max(t.compute, t.memory);
  const fmt = (t: number) => `${ms(t)} ms`;
  return (
    <div data-cpu-ms={ms(r.cpu.total)} data-gpu-ms={ms(r.gpu.total)} data-crossover={r.crossover ?? 'none'}>
      <LineChart
        title="Time per batch"
        xLabel="batch size"
        yLabel="ms"
        badge={<Badge tone="warn">Estimate</Badge>}
        series={[
          { id: 'cpu', label: cpu.label, points: cpuLine, tone: 'muted', inTable: false },
          { id: 'gpu', label: `${gpu.label}${s.transfer === 'yes' ? ', with copies' : ''}`, points: gpuLine, inTable: false },
        ]}
        xDomain={[1, MAX_BATCH]}
        yDomain={[0, Math.max(cpuLine.at(-1)![1], gpuLine.at(-1)![1]) * 1.05]}
        overlay={(x, y) => (
          <g aria-hidden="true">
            <circle className={svg.muted} cx={x(s.batch)} cy={y(r.cpu.total * 1e3)} r={5} fill="none" strokeWidth={2} />
            <circle className={svg.accent} cx={x(s.batch)} cy={y(r.gpu.total * 1e3)} r={5} fill="none" strokeWidth={2} />
          </g>
        )}
        caption={`${s.layers} float32 layers of ${s.width} × ${s.width}. ${r.crossover === null ? `The CPU is faster at every batch size up to ${MAX_BATCH}.` : r.crossover === 1 ? 'The GPU is faster from batch 1.' : `The CPU is faster below batch ${r.crossover}; the GPU from there on.`} The circles mark batch ${s.batch}.`}
      />
      <StackedBars
        title={`Where the time goes at batch ${s.batch}`}
        badge={<Badge tone="warn">Estimate</Badge>}
        parts={[
          { key: 'work', label: 'Arithmetic or memory, whichever is slower', fill: 'accent' },
          { key: 'overhead', label: 'Per-operation overhead', fill: 'warn' },
          { key: 'copy', label: 'PCIe copies', fill: 'stripe' },
        ]}
        rows={[
          {
            label: cpu.label,
            values: { work: work(r.cpu), overhead: r.cpu.overhead },
            note: r.cpu.memoryBound ? 'memory-bound' : 'compute-bound',
          },
          {
            label: gpu.label,
            values: { work: work(r.gpu), overhead: r.gpu.overhead, copy: r.gpu.transfer },
            note: r.gpu.memoryBound ? 'memory-bound' : 'compute-bound',
          },
        ]}
        format={fmt}
        caption={`CPU: ${cpu.source}. GPU: ${gpu.source}. Assumed: 70% of peak arithmetic, 80% of peak bandwidth, 80% of the PCIe link rate, 2 µs per CPU operation and 5 µs per GPU kernel launch.`}
      />
    </div>
  );
}
