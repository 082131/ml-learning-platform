import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from './format';

/**
 * A stated timing model (not a measurement) for a stack of float32 dense layers on a CPU and on a GPU.
 * Each layer takes max(compute time, memory time) plus a fixed per-operation overhead; the GPU also pays
 * for copying the input over PCIe and the output back. CPU_GPU_SOURCE is the same model in Python and is
 * checked against CPython in cpuGpu.test.ts.
 */
export interface DeviceSpec {
  id: string;
  label: string;
  /** Peak float32 FLOP/s, from the datasheet or cores × FLOPs per cycle × clock. */
  peak: number;
  /** Peak memory bandwidth, bytes/s. */
  bandwidth: number;
  /** Fixed cost per operation (framework dispatch, kernel launch), seconds. */
  overhead: number;
  /** Host-to-device bandwidth, bytes/s (GPUs only). */
  pcie?: number;
  source: string;
}

/** Fractions of peak a well-implemented matrix multiplication is assumed to reach. */
export const COMPUTE_EFF = 0.7;
export const MEMORY_EFF = 0.8;

export const CPUS: Record<string, DeviceSpec> = {
  laptop: {
    id: 'laptop',
    label: '8-core laptop CPU',
    peak: 8 * 32 * 3.0e9,
    bandwidth: 2 * 8 * 5600e6,
    overhead: 2e-6,
    source: '8 cores × 32 FP32 FLOPs per cycle (two 256-bit FMA units) × 3.0 GHz; 2 channels × 8 bytes × 5,600 MT/s (DDR5-5600)',
  },
  server: {
    id: 'server',
    label: '32-core server CPU',
    peak: 32 * 32 * 2.5e9,
    bandwidth: 8 * 8 * 4800e6,
    overhead: 2e-6,
    source: '32 cores × 32 FP32 FLOPs per cycle × 2.5 GHz; 8 channels × 8 bytes × 4,800 MT/s (DDR5-4800)',
  },
};

export const GPUS: Record<string, DeviceSpec> = {
  t4: {
    id: 't4',
    label: 'NVIDIA T4',
    peak: 8.1e12,
    bandwidth: 320e9,
    overhead: 5e-6,
    pcie: 0.8 * 15.75e9,
    source: 'T4 datasheet: 8.1 TFLOPS FP32, 320 GB/s; PCIe Gen3 x16 (15.75 GB/s)',
  },
  l4: {
    id: 'l4',
    label: 'NVIDIA L4',
    peak: 30.3e12,
    bandwidth: 300e9,
    overhead: 5e-6,
    pcie: 0.8 * 31.5e9,
    source: 'L4 datasheet: 30.3 TFLOPS FP32, 300 GB/s; PCIe Gen4 x16 (31.5 GB/s)',
  },
  a100: {
    id: 'a100',
    label: 'NVIDIA A100 80GB PCIe',
    peak: 19.5e12,
    bandwidth: 1935e9,
    overhead: 5e-6,
    pcie: 0.8 * 31.5e9,
    source: 'A100 datasheet: 19.5 TFLOPS FP32, 1,935 GB/s (80GB PCIe); PCIe Gen4 x16 (31.5 GB/s)',
  },
  h100: {
    id: 'h100',
    label: 'NVIDIA H100 SXM',
    peak: 67e12,
    bandwidth: 3350e9,
    overhead: 5e-6,
    pcie: 0.8 * 63e9,
    source: 'H100 datasheet: 67 TFLOPS FP32, 3.35 TB/s (SXM); PCIe Gen5 x16 (63 GB/s)',
  },
};

export interface CpuGpuState {
  width: number;
  layers: number;
  batch: number;
  cpu: string;
  gpu: string;
  transfer: 'yes' | 'no';
}

export interface DeviceTime {
  compute: number;
  memory: number;
  overhead: number;
  transfer: number;
  total: number;
  /** True when memory time exceeds compute time in each layer. */
  memoryBound: boolean;
}

export interface CpuGpuResult {
  flops: number;
  bytes: number;
  cpu: DeviceTime;
  gpu: DeviceTime;
  /** Smallest batch (1 to MAX_BATCH) at which the GPU is faster, or null. */
  crossover: number | null;
}

export const MAX_BATCH = 256;

function layerTimes(d: DeviceSpec, width: number, batch: number) {
  const flops = 2 * batch * width * width;
  const bytes = 4 * (width * width + 2 * batch * width);
  return { flops, bytes, compute: flops / (COMPUTE_EFF * d.peak), memory: bytes / (MEMORY_EFF * d.bandwidth) };
}

function deviceTime(d: DeviceSpec, s: CpuGpuState, copies: boolean): DeviceTime {
  const l = layerTimes(d, s.width, s.batch);
  const perLayer = Math.max(l.compute, l.memory);
  const transfer = copies && d.pcie ? (2 * 4 * s.batch * s.width) / d.pcie + 2 * d.overhead : 0;
  return {
    compute: s.layers * l.compute,
    memory: s.layers * l.memory,
    overhead: s.layers * d.overhead,
    transfer,
    total: s.layers * (perLayer + d.overhead) + transfer,
    memoryBound: l.memory > l.compute,
  };
}

export function timeCpuGpu(s: CpuGpuState): CpuGpuResult {
  const cpu = CPUS[s.cpu]!;
  const gpu = GPUS[s.gpu]!;
  const copies = s.transfer === 'yes';
  const l = layerTimes(cpu, s.width, s.batch);
  let crossover: number | null = null;
  for (let b = 1; b <= MAX_BATCH; b++) {
    const t = { ...s, batch: b };
    if (deviceTime(gpu, t, copies).total < deviceTime(cpu, t, false).total) {
      crossover = b;
      break;
    }
  }
  return {
    flops: s.layers * l.flops,
    bytes: s.layers * l.bytes,
    cpu: deviceTime(cpu, s, false),
    gpu: deviceTime(gpu, s, copies),
    crossover,
  };
}

/** Total time for every batch size, for the chart. */
export const sweep = (s: CpuGpuState) =>
  Array.from({ length: MAX_BATCH }, (_, i) => {
    const r = timeCpuGpu({ ...s, batch: i + 1 });
    return { batch: i + 1, cpu: r.cpu.total, gpu: r.gpu.total };
  });

export const CPU_GPU_SOURCE = `width, layers, batch = {{width}}, {{layers}}, {{batch}}
cpu = dict(peak={{cpu_peak}}, bandwidth={{cpu_bw}}, overhead=2e-6)       # {{cpu_label}}
gpu = dict(peak={{gpu_peak}}, bandwidth={{gpu_bw}}, overhead=5e-6, pcie={{pcie}})   # {{gpu_label}}


def layer_time(dev):
    flops = 2 * batch * width * width                  # (batch, width) @ (width, width)
    bytes_moved = 4 * (width * width + 2 * batch * width)   # weights, input, output in float32
    compute = flops / (0.7 * dev["peak"])              # assume 70% of peak arithmetic
    memory = bytes_moved / (0.8 * dev["bandwidth"])    # and 80% of peak bandwidth
    return max(compute, memory) + dev["overhead"]


cpu_time = layers * layer_time(cpu)
copy = {{copy}}
gpu_time = layers * layer_time(gpu) + copy
print(f"CPU {cpu_time * 1e3:9.3f} ms")
print(f"GPU {gpu_time * 1e3:9.3f} ms   (of which copies {copy * 1e3:.3f} ms)")`;

const pyE = (x: number) => {
  // Python literal in scientific notation, e.g. 7.68e11
  const [m, e] = x.toExponential().split('e');
  return `${Number(m)}e${Number(e)}`;
};

export function cpuGpuSlots(s: CpuGpuState): Record<string, string> {
  const c = CPUS[s.cpu]!;
  const g = GPUS[s.gpu]!;
  return {
    width: String(s.width),
    layers: String(s.layers),
    batch: String(s.batch),
    cpu_peak: pyE(c.peak),
    cpu_bw: pyE(c.bandwidth),
    cpu_label: c.label,
    gpu_peak: pyE(g.peak),
    gpu_bw: pyE(g.bandwidth),
    pcie: pyE(g.pcie!),
    gpu_label: g.label,
    copy: s.transfer === 'yes' ? '2 * 4 * batch * width / gpu["pcie"] + 2 * gpu["overhead"]   # input in, output out' : '0   # data already on the GPU',
  };
}

export const ms = (t: number) => pyFixed(t * 1e3, 3);

export function cpuGpuPrintout(r: CpuGpuResult): string[] {
  return [`CPU ${ms(r.cpu.total).padStart(9, ' ')} ms`, `GPU ${ms(r.gpu.total).padStart(9, ' ')} ms   (of which copies ${ms(r.gpu.transfer)} ms)`];
}

export function cpuGpuReadout(_s: CpuGpuState, r: CpuGpuResult): ReadoutItem[] {
  const faster = r.gpu.total < r.cpu.total ? 'GPU' : 'CPU';
  const ratio = faster === 'GPU' ? r.cpu.total / r.gpu.total : r.gpu.total / r.cpu.total;
  const bound = (t: DeviceTime) => (t.memoryBound ? 'memory-bound' : 'compute-bound');
  return [
    { label: 'What the code prints (an estimate)', value: cpuGpuPrintout(r).join('\n') },
    { label: 'Faster here', value: `${faster}, by ${pyFixed(ratio, 1)}×` },
    {
      label: 'What limits each layer',
      value: `CPU: ${bound(r.cpu)}. GPU: ${bound(r.gpu)}.`,
    },
    {
      label: 'GPU wins from batch',
      value: r.crossover === null ? `never, up to ${MAX_BATCH}` : String(r.crossover),
    },
  ];
}

export function cpuGpuExperiment(id: string, initial: CpuGpuState): ExperimentDef<CpuGpuState, CpuGpuResult> {
  const slider = (key: 'width' | 'layers' | 'batch', label: string, min: number, max: number, step = 1) =>
    ({
      kind: 'slider',
      id: key,
      label,
      min,
      max,
      step,
      get: (s: CpuGpuState) => s[key],
      set: (s: CpuGpuState, v: number) => ({ ...s, [key]: v }),
    }) as const;
  const select = (key: 'cpu' | 'gpu' | 'transfer', label: string, options: { value: string; label: string }[]) =>
    ({
      kind: 'select',
      id: key,
      label,
      options,
      get: (s: CpuGpuState) => s[key],
      set: (s: CpuGpuState, v: string) => ({ ...s, [key]: v }),
    }) as const;
  return {
    id,
    initial,
    controls: [
      slider('width', 'Layer width', 128, 8192, 128),
      slider('layers', 'Layers', 1, 48),
      slider('batch', 'Batch size', 1, MAX_BATCH),
      select('cpu', 'CPU', Object.values(CPUS).map((d) => ({ value: d.id, label: d.label }))),
      select('gpu', 'GPU', Object.values(GPUS).map((d) => ({ value: d.id, label: d.label }))),
      select('transfer', 'Copy input and output over PCIe', [
        { value: 'yes', label: 'Yes: data starts and ends on the CPU' },
        { value: 'no', label: 'No: data is already on the GPU' },
      ]),
    ],
    compute: timeCpuGpu,
    readout: cpuGpuReadout,
  };
}
