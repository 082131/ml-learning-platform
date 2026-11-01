// Code for the GPU bottleneck lesson. The roofline experiment is a stated model (src/lib/inference/roofline.ts),
// its Python printout checked against CPython in roofline.test.ts. The CPU measurement was run with
// roofline_cpu.py (in this folder) using NumPy 2.5.3 and OpenBLAS 0.3.34 on a 4-core Xeon VM at 2.1 GHz.
import { ann, annLine } from '@/lib/inference/annotate';
import {
  ROOFLINE_SOURCE,
  rooflineExperiment,
  rooflineSlots,
  stallExperiment,
  type RooflineState,
} from '@/lib/inference/roofline';
import type { CodeExample } from '@/lib/types';
import cpuSource from './roofline_cpu.py?raw';

export const experiment = rooflineExperiment('roofline', { gpu: 'a100', op: 'linear', logBatch: 0 });

export const stall = stallExperiment('stall', { cpu: 8, gpu: 5, overlap: 'no' });

const st = (s: unknown) => s as RooflineState;
const S = ROOFLINE_SOURCE;

export const rooflineCode: CodeExample = {
  id: 'roofline-model',
  language: 'python',
  source: S,
  slots: Object.fromEntries(
    ['peak', 'bandwidth', 'gpu_label', 'batch', 'flops', 'bytes'].map((k) => [
      k,
      (s: unknown) => rooflineSlots(st(s))[k]!,
    ]),
  ),
  annotations: [
    ann(S, 'intensity', 'intensity = flops / bytes_moved', 'flops / bytes_moved', {
      kind: 'math',
      title: 'Arithmetic intensity',
      what: 'How many FLOPs the kernel does for each byte it reads from or writes to GPU memory.',
      why: 'It is a property of the operation and its shapes, not of the GPU. A batch-1 linear layer reads each 2-byte weight for one multiply and one add: 1 FLOP per byte.',
    }),
    ann(S, 'ridge', 'ridge = peak / bandwidth', 'peak / bandwidth', {
      kind: 'math',
      title: 'The ridge point',
      what: 'The intensity at which compute time and memory time are equal: 161 FLOPs per byte on an A100.',
      why: 'Below it the GPU waits for memory however many FLOP/s it has. Newer GPUs grow FLOP/s faster than bandwidth, so the ridge moves right.',
    }),
    annLine(S, 'time', 'time = max(compute, memory) + launch', {
      kind: 'math',
      title: 'The larger limit wins',
      what: 'The kernel overlaps arithmetic with memory traffic, so its time is the slower of the two, plus the fixed cost of launching it.',
      why: 'A real kernel reaches neither peak exactly; this is the best case. If a measurement is far below it, the kernel itself is the problem.',
    }),
    ann(S, 'bound', 'bound = "launch"', '"launch" if launch > max(compute, memory)', {
      kind: 'math',
      title: 'Three kinds of bottleneck',
      what: 'Launch-bound: the work is shorter than the 5 µs launch. Memory-bound: bytes limit. Compute-bound: FLOPs limit.',
      why: 'Each has a different cure: fuse kernels or capture a CUDA graph, move fewer bytes, or get more FLOP/s.',
    }),
  ],
};

export const cpuCode: CodeExample = {
  id: 'roofline-cpu',
  language: 'python',
  source: cpuSource,
  annotations: [
    annLine(cpuSource, 'best', 'return min(ts)', {
      kind: 'function',
      title: 'Best of seven runs',
      what: 'Each operation is timed 5 times per run, 7 runs, keeping the fastest run.',
      why: 'For a ceiling measurement the minimum is the right statistic: noise from other processes only ever adds time.',
    }),
    ann(cpuSource, 'nbytes', 'nbytes = 4 *', 'd * d', {
      kind: 'math',
      title: 'The weights dominate the bytes',
      what: 'W is 8,192 × 8,192 float32: 256 MiB, read once per multiplication.',
      why: 'The input and output are tiny at small batch, so intensity grows almost linearly with batch: 0.5, 1, 4, 16, 62, 228.',
    }),
    annLine(cpuSource, 'add', 't = best(lambda: np.add(a, b, out=out))', {
      kind: 'framework',
      title: 'An elementwise add',
      what: 'Reads 2 × 64 MiB and writes 64 MiB for 16.8 million additions: 1/12 FLOP per byte.',
      why: 'No amount of compute helps an operation like this. NumPy runs it on one core, so it also shows one core’s bandwidth.',
    }),
  ],
};

export const cpuOutput: CodeExample = {
  id: 'roofline-cpu-output',
  language: 'bash',
  source: `python roofline_cpu.py   # NumPy 2.5.3 + OpenBLAS 0.3.34, 4 Xeon cores at 2.1 GHz with AVX-512
W is 8192 x 8192 float32 = 256 MiB
operation              FLOP/byte      time  GFLOP/s   GB/s
matmul, batch 1             0.50    4.76 ms     28.2   56.4
matmul, batch 2             1.00   15.16 ms     17.7   17.7
matmul, batch 8             3.99   12.60 ms     85.2   21.3
matmul, batch 32           15.88   25.48 ms    168.6   10.6
matmul, batch 128          62.06   42.30 ms    406.2    6.5
matmul, batch 512         227.56  134.39 ms    511.3    2.2
add, 16M elements           0.08   23.58 ms      0.7    8.5`,
  annotations: [],
};

const N = `# 1. Is a kernel running at all? (sampled every second)
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,memory.used,power.draw --format=csv -l 1

# 2. How busy are the SMs and the memory, per kernel? (DCGM, as Prometheus metrics)
#    DCGM_FI_PROF_SM_ACTIVE, DCGM_FI_PROF_PIPE_TENSOR_ACTIVE, DCGM_FI_PROF_DRAM_ACTIVE

# 3. Where are the gaps? A timeline of CPU work, copies and kernels
nsys profile -o serve --trace=cuda,nvtx,osrt python serve_benchmark.py

# 4. Why is one kernel slow? Achieved FLOP/s and bandwidth against the roofline
ncu --set roofline -k regex:gemm -o gemm python serve_benchmark.py`;

/** GPU monitoring and profiling commands. Not run here: no GPU in the build environment. */
export const gpuTools: CodeExample = {
  id: 'roofline-gpu-tools',
  language: 'bash',
  source: N,
  annotations: [
    ann(N, 'util', 'utilization.gpu', 'utilization.gpu', {
      kind: 'framework',
      title: 'utilization.gpu',
      what: 'The percentage of the sample period during which one or more kernels was running.',
      why: 'A memory-bound kernel using 0.5% of the tensor cores still counts as 100%. It finds idle GPUs, not inefficient ones.',
    }),
    annLine(N, 'dcgm', '#    DCGM_FI_PROF_SM_ACTIVE', {
      kind: 'framework',
      title: 'Hardware counters',
      what: 'The share of streaming multiprocessors active, of tensor-core pipes busy, and of time DRAM is transferring.',
      why: 'These separate "busy" from "well used" and can run in production, unlike a full profiler.',
    }),
    annLine(N, 'nsys', 'nsys profile', {
      kind: 'framework',
      title: 'Nsight Systems',
      what: 'A timeline of the whole process: Python threads, CUDA API calls, copies and kernels.',
      why: 'Gaps between kernels mean the GPU waited for the CPU, for data or for a copy. Look here first.',
    }),
    annLine(N, 'ncu', 'ncu --set roofline', {
      kind: 'framework',
      title: 'Nsight Compute',
      what: 'Replays chosen kernels many times to collect detailed counters, including a roofline chart.',
      why: 'Tells you if a kernel is near its roof (choose another optimization) or far below it (a poor kernel or a bad shape).',
    }),
  ],
};

const P = `loader = torch.utils.data.DataLoader(
    dataset, batch_size=32,
    num_workers=4,          # decode and resize in 4 worker processes, in parallel with the GPU
    pin_memory=True,        # page-locked host memory: faster, asynchronous copies
    prefetch_factor=2,      # each worker keeps 2 batches ready
)
with torch.inference_mode():
    for images in loader:
        images = images.to("cuda", non_blocking=True)   # the copy overlaps with work already queued
        logits = model(images)`;

/** Overlapping CPU preprocessing with GPU work. Not run here: no PyTorch in the build environment. */
export const prefetchCode: CodeExample = {
  id: 'roofline-prefetch',
  language: 'python',
  source: P,
  annotations: [
    annLine(P, 'workers', 'num_workers=4', {
      kind: 'parameter',
      title: 'Worker processes',
      what: 'Each worker prepares whole batches in its own process.',
      why: 'If one batch takes 8 ms on the CPU and 5 ms on the GPU, one worker can feed at most 125 batches/s; two keep the GPU busy.',
    }),
    annLine(P, 'pin', 'pin_memory=True', {
      kind: 'framework',
      title: 'Pinned memory',
      what: 'Batches are placed in page-locked memory that the GPU can copy from directly.',
      why: 'Copies from ordinary memory go through a staging buffer and cannot overlap with compute.',
    }),
    ann(P, 'nb', 'non_blocking=True', 'non_blocking=True', {
      kind: 'framework',
      title: 'Asynchronous copy',
      what: 'The copy is queued like a kernel and the Python loop continues.',
      why: 'Together with pinned memory, the next batch crosses PCIe while the current one computes.',
    }),
  ],
};
