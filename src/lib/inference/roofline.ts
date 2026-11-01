import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed, pyThousands } from './format';

/**
 * The roofline model for single GPU kernels in FP16, a stated model (not a measurement): a kernel takes
 * max(FLOPs / peak, bytes / bandwidth) plus a fixed launch cost. ROOFLINE_SOURCE is the same model in Python
 * and is checked against CPython in roofline.test.ts. Peaks are dense FP16 tensor-core numbers from the
 * datasheets (sparsity figures halved).
 */
export interface Gpu16 {
  id: string;
  label: string;
  /** Dense FP16 tensor-core FLOP/s. */
  peak: number;
  /** Memory bandwidth, bytes/s. */
  bandwidth: number;
  source: string;
}

export const GPUS16: Record<string, Gpu16> = {
  t4: {
    id: 't4',
    label: 'NVIDIA T4',
    peak: 65e12,
    bandwidth: 320e9,
    source: 'T4 datasheet: 65 TFLOPS FP16 tensor, 320 GB/s',
  },
  l4: {
    id: 'l4',
    label: 'NVIDIA L4',
    peak: 121e12,
    bandwidth: 300e9,
    source: 'L4 datasheet: 242 TFLOPS FP16 tensor with sparsity, so 121 dense; 300 GB/s',
  },
  a100: {
    id: 'a100',
    label: 'NVIDIA A100 80GB PCIe',
    peak: 312e12,
    bandwidth: 1935e9,
    source: 'A100 datasheet: 312 TFLOPS FP16 tensor (dense), 1,935 GB/s (80GB PCIe)',
  },
  h100: {
    id: 'h100',
    label: 'NVIDIA H100 SXM',
    peak: 989e12,
    bandwidth: 3350e9,
    source: 'H100 datasheet: 1,979 TFLOPS FP16 tensor with sparsity, so 989 dense; 3.35 TB/s (SXM)',
  },
};

export const LAUNCH = 5e-6;
export const D = 4096;
export const L = 4096;

export type OpId = 'linear' | 'attention' | 'softmax' | 'add';

export interface Op {
  id: OpId;
  label: string;
  flops: (b: number) => number;
  bytes: (b: number) => number;
  /** Python expressions (with comments) for flops and bytes_moved. */
  flopsPy: string;
  bytesPy: string;
}

export const OPS: Record<OpId, Op> = {
  linear: {
    id: 'linear',
    label: 'Linear layer, 4096 × 4096',
    flops: (b) => 2 * b * D * D,
    bytes: (b) => 2 * (D * D + 2 * b * D),
    flopsPy: '2 * B * d * d                        # (B, d) @ (d, d)',
    bytesPy: '2 * (d * d + 2 * B * d)        # FP16 weights, input, output',
  },
  attention: {
    id: 'attention',
    label: 'Attention while generating (KV cache)',
    flops: (b) => b * 4 * L * D,
    bytes: (b) => 2 * (2 * b * L * D),
    flopsPy: 'B * 4 * L * d                        # q·K and weights·V for each sequence',
    bytesPy: '2 * (2 * B * L * d)            # each sequence reads its own K and V cache',
  },
  softmax: {
    id: 'softmax',
    label: 'Softmax over 4096 scores per row',
    flops: (b) => 5 * b * L,
    bytes: (b) => 2 * (2 * b * L),
    flopsPy: '5 * B * L                            # max, subtract, exp, sum, divide',
    bytesPy: '2 * (2 * B * L)                # read and write each score once',
  },
  add: {
    id: 'add',
    label: 'Elementwise add (a residual)',
    flops: (b) => b * D,
    bytes: (b) => 2 * (3 * b * D),
    flopsPy: 'B * d                                # one add per element',
    bytesPy: '2 * (3 * B * d)                # read two tensors, write one',
  },
};

export interface RooflineState {
  gpu: string;
  op: OpId;
  /** log2 of the batch size, 0 to 10. */
  logBatch: number;
}

export type Bound = 'compute' | 'memory' | 'launch';

export interface RooflineResult {
  batch: number;
  flops: number;
  bytes: number;
  intensity: number;
  ridge: number;
  compute: number;
  memory: number;
  time: number;
  bound: Bound;
  /** Achieved FLOP/s as a fraction of peak. */
  ofPeak: number;
}

export function runRoofline(s: RooflineState): RooflineResult {
  const g = GPUS16[s.gpu]!;
  const op = OPS[s.op];
  const batch = 2 ** s.logBatch;
  const flops = op.flops(batch);
  const bytes = op.bytes(batch);
  const compute = flops / g.peak;
  const memory = bytes / g.bandwidth;
  const work = Math.max(compute, memory);
  const time = work + LAUNCH;
  const bound: Bound = LAUNCH > work ? 'launch' : compute >= memory ? 'compute' : 'memory';
  return {
    batch,
    flops,
    bytes,
    intensity: flops / bytes,
    ridge: g.peak / g.bandwidth,
    compute,
    memory,
    time,
    bound,
    ofPeak: flops / time / g.peak,
  };
}

/** Attainable FLOP/s at a given intensity, ignoring launch cost: the roof. */
export const roof = (g: Gpu16, intensity: number) => Math.min(g.peak, intensity * g.bandwidth);

export const ROOFLINE_SOURCE = `peak, bandwidth = {{peak}}, {{bandwidth}}      # {{gpu_label}}: FP16 FLOP/s, bytes/s
launch = 5e-6                              # fixed cost per kernel, seconds
B, d, L = {{batch}}, 4096, 4096            # batch, hidden size, context length

flops = {{flops}}
bytes_moved = {{bytes}}

intensity = flops / bytes_moved            # FLOPs per byte read or written
ridge = peak / bandwidth                   # the intensity where the two limits meet
compute, memory = flops / peak, bytes_moved / bandwidth
time = max(compute, memory) + launch
bound = "launch" if launch > max(compute, memory) else "compute" if compute >= memory else "memory"
print(f"intensity {intensity:.2f} FLOP/byte, ridge {ridge:.0f} FLOP/byte")
print(f"time {time * 1e6:.1f} us, {bound}-bound, {flops / time / peak:.1%} of peak FLOP/s")`;

const pyE = (x: number) => {
  const [m, e] = x.toExponential().split('e');
  return `${Number(m)}e${Number(e)}`;
};

export const rooflineSlots = (s: RooflineState): Record<string, string> => {
  const g = GPUS16[s.gpu]!;
  return {
    peak: pyE(g.peak),
    bandwidth: pyE(g.bandwidth),
    gpu_label: g.label,
    batch: String(2 ** s.logBatch),
    flops: OPS[s.op].flopsPy,
    bytes: OPS[s.op].bytesPy,
  };
};

/** Python's f"{x:.1%}". */
const pct1 = (x: number) => `${pyFixed(x * 100, 1)}%`;

export const rooflinePrintout = (r: RooflineResult): string[] => [
  `intensity ${pyFixed(r.intensity, 2)} FLOP/byte, ridge ${pyFixed(r.ridge, 0)} FLOP/byte`,
  `time ${pyFixed(r.time * 1e6, 1)} us, ${r.bound}-bound, ${pct1(r.ofPeak)} of peak FLOP/s`,
];

export function rooflineReadout(s: RooflineState, r: RooflineResult): ReadoutItem[] {
  const g = GPUS16[s.gpu]!;
  const busy = r.time - LAUNCH;
  return [
    { label: 'What the code prints (an estimate)', value: rooflinePrintout(r).join('\n') },
    {
      label: 'What nvidia-smi would show, kernel after kernel',
      value: `GPU-Util about 100%: a kernel is always running. Achieved ${pyFixed(r.flops / r.time / 1e12, 1)} of ${pyThousands(g.peak / 1e12)} TFLOP/s.`,
    },
    {
      label: 'What would help',
      value:
        r.bound === 'launch'
          ? `Fewer, larger kernels: the work takes ${pyFixed(busy * 1e6, 2)} µs, the launch 5 µs. Fuse it with its neighbors or capture a CUDA graph.`
          : r.bound === 'memory'
            ? `Moving fewer bytes: a larger batch (if the op reuses data), fusion, or lower precision. More FLOP/s would not help.`
            : `More FLOP/s: lower precision with faster tensor cores, or a larger GPU. Memory bandwidth is not the limit.`,
    },
  ];
}

export function rooflineExperiment(
  id: string,
  initial: RooflineState,
): ExperimentDef<RooflineState, RooflineResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'op',
        label: 'Operation',
        options: Object.values(OPS).map((o) => ({ value: o.id, label: o.label })),
        get: (s) => s.op,
        set: (s, v) => ({ ...s, op: v as OpId }),
      },
      {
        kind: 'slider',
        id: 'logBatch',
        label: 'Batch (rows or sequences)',
        min: 0,
        max: 10,
        get: (s) => s.logBatch,
        set: (s, v) => ({ ...s, logBatch: v }),
        format: (v) => pyThousands(2 ** v),
      },
      {
        kind: 'select',
        id: 'gpu',
        label: 'GPU',
        options: Object.values(GPUS16).map((g) => ({ value: g.id, label: g.label })),
        get: (s) => s.gpu,
        set: (s, v) => ({ ...s, gpu: v }),
      },
    ],
    compute: runRoofline,
    readout: rooflineReadout,
  };
}

/* ---------- A GPU waiting for the CPU ---------- */

export interface StallState {
  /** CPU time to prepare one batch, ms. */
  cpu: number;
  /** GPU time for one batch, ms. */
  gpu: number;
  overlap: 'no' | 'yes';
}

export const STALL_BATCH = 32;

export interface StallResult {
  /** Time between finished batches in steady state, ms. */
  period: number;
  /** Fraction of time the GPU is running a kernel. */
  util: number;
  /** Images per second. */
  throughput: number;
  /** Which side limits throughput. */
  limit: 'CPU' | 'GPU';
}

export function runStall(s: StallState): StallResult {
  const period = s.overlap === 'yes' ? Math.max(s.cpu, s.gpu) : s.cpu + s.gpu;
  return {
    period,
    util: s.gpu / period,
    throughput: (STALL_BATCH * 1000) / period,
    limit: s.cpu > s.gpu ? 'CPU' : 'GPU',
  };
}

export function stallReadout(s: StallState, r: StallResult): ReadoutItem[] {
  return [
    {
      label: 'Throughput',
      value: `${pyThousands(r.throughput)} images/s (one batch of ${STALL_BATCH} every ${pyFixed(r.period, 1)} ms)`,
    },
    { label: 'GPU utilization', value: `${pyFixed(r.util * 100, 1)}%` },
    {
      label: 'A GPU twice as fast would give',
      value: `${pyThousands(runStall({ ...s, gpu: s.gpu / 2 }).throughput)} images/s`,
    },
  ];
}

export function stallExperiment(id: string, initial: StallState): ExperimentDef<StallState, StallResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'cpu',
        label: 'CPU preprocessing per batch (ms)',
        min: 1,
        max: 20,
        get: (s) => s.cpu,
        set: (s, v) => ({ ...s, cpu: v }),
      },
      {
        kind: 'slider',
        id: 'gpu',
        label: 'GPU time per batch (ms)',
        min: 1,
        max: 20,
        get: (s) => s.gpu,
        set: (s, v) => ({ ...s, gpu: v }),
      },
      {
        kind: 'select',
        id: 'overlap',
        label: 'Prepare the next batch while the GPU works',
        options: [
          { value: 'no', label: 'No: one after the other' },
          { value: 'yes', label: 'Yes: a background loader' },
        ],
        get: (s) => s.overlap,
        set: (s, v) => ({ ...s, overlap: v as StallState['overlap'] }),
      },
    ],
    compute: runStall,
    readout: stallReadout,
  };
}
