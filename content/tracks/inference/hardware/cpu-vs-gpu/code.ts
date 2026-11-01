// Code for the CPU vs GPU lesson. The estimator's printout is checked against CPython 3.13 in
// src/lib/inference/cpuGpu.test.ts. The NumPy timings were measured with NumPy 2.5.3 (OpenBLAS 0.3.34) on a
// 4-thread Intel Xeon cloud VM at 2.10 GHz; yours will differ.
import { ann } from '@/lib/inference/annotate';
import { CPU_GPU_SOURCE, cpuGpuExperiment, cpuGpuSlots, type CpuGpuState } from '@/lib/inference/cpuGpu';
import type { CodeExample } from '@/lib/types';

/** Eight 4096-wide float32 layers (about 512 MiB of weights), one request at a time. */
export const initial: CpuGpuState = { width: 4096, layers: 8, batch: 1, cpu: 'laptop', gpu: 'l4', transfer: 'yes' };

export const experiment = cpuGpuExperiment('cpu-gpu', initial);

const st = (s: unknown) => s as CpuGpuState;
const S = CPU_GPU_SOURCE;
const keys = ['width', 'layers', 'batch', 'cpu_peak', 'cpu_bw', 'cpu_label', 'gpu_peak', 'gpu_bw', 'pcie', 'gpu_label', 'copy'];

export const estimateCode: CodeExample = {
  id: 'cpu-gpu-estimate',
  language: 'python',
  source: S,
  slots: Object.fromEntries(keys.map((k) => [k, (s: unknown) => cpuGpuSlots(st(s))[k]!])),
  annotations: [
    ann(S, 'peak', 'cpu = dict(', 'peak={{cpu_peak}}', {
      kind: 'parameter',
      title: 'Peak arithmetic (FLOP/s)',
      what: 'For a CPU: cores × FLOPs per cycle per core × clock. For a GPU: the datasheet’s FP32 figure.',
      why: 'A GPU has thousands of simple lanes; a CPU has a few wide cores. The peak is the ceiling for large matrix multiplications.',
    }),
    ann(S, 'bw', 'cpu = dict(', 'bandwidth={{cpu_bw}}', {
      kind: 'parameter',
      title: 'Memory bandwidth (bytes/s)',
      what: 'For DDR5: channels × 8 bytes × transfers per second. For a GPU: the datasheet figure for its own memory.',
      why: 'Every weight must be read once per forward pass. When there is little arithmetic per byte, this, not the peak, sets the time.',
    }),
    ann(S, 'overhead', 'gpu = dict(', 'overhead=5e-6', {
      kind: 'parameter',
      title: 'Fixed cost per operation',
      what: 'An assumed 5 µs to launch a kernel on the GPU and 2 µs of framework dispatch on the CPU.',
      why: 'Paid once per layer whatever its size, so it dominates for small layers.',
    }),
    ann(S, 'flops', 'flops = 2', '2 * batch * width * width', {
      kind: 'math',
      title: 'Arithmetic of one layer',
      what: 'Each of the width × width weights is used once per row of the batch, as one multiply-add (2 FLOPs).',
      why: 'Grows with the batch.',
    }),
    ann(S, 'bytes', 'bytes_moved =', 'width * width + 2 * batch * width', {
      kind: 'math',
      title: 'Bytes of one layer',
      what: 'All the weights, plus the input and output rows, at 4 bytes each.',
      why: 'The weights are read once however large the batch is, so bytes grow much more slowly than FLOPs.',
    }),
    ann(S, 'max', 'return max(', 'max(compute, memory)', {
      kind: 'math',
      title: 'max(compute, memory)',
      what: 'Arithmetic and memory traffic overlap, so the slower of the two sets the time.',
      why: 'Whichever is larger tells you what to optimize: fewer bytes (smaller dtype) or more FLOP/s (better kernels, bigger GPU).',
    }),
    ann(S, 'copy', 'copy = {{copy}}', '{{copy}}', {
      kind: 'math',
      title: 'Copies over PCIe',
      what: 'The input goes to the GPU and the output comes back, at 80% of the PCIe link rate, plus a launch for each copy.',
      why: 'The weights were copied once at startup and stay on the GPU; only the request data crosses per call.',
    }),
  ],
};

const M = `import time
import numpy as np

d = 4096
W = np.random.default_rng(0).standard_normal((d, d), dtype=np.float32)   # 64 MiB

for batch in [1, 8, 64, 512]:
    x = np.ones((batch, d), dtype=np.float32)
    x @ W                                         # warm-up: the first call pays one-time costs
    times = []
    for _ in range(20):
        t0 = time.perf_counter()
        x @ W
        times.append(time.perf_counter() - t0)
    t = sorted(times)[len(times) // 2]            # median of 20 runs
    gflops = 2 * batch * d * d / t / 1e9
    print(f"batch {batch:4d}: {t * 1e3:7.3f} ms  {gflops:7.1f} GFLOP/s  {t * 1e6 / batch:8.1f} us per row")`;

/** Measuring matmul throughput on a CPU. Runs in the browser too (single-threaded WebAssembly, slower). */
export const measureCpu: CodeExample = {
  id: 'cpu-gpu-measure',
  language: 'python',
  run: 'pyodide',
  source: M,
  annotations: [
    ann(M, 'warmup', 'x @ W     ', 'x @ W', {
      kind: 'framework',
      title: 'Warm-up call',
      what: 'Runs once without timing it.',
      why: 'The first call may allocate buffers, start threads or load code. Timing it would measure setup, not the steady state a server sees.',
    }),
    ann(M, 'median', 't = sorted', 'sorted(times)[len(times) // 2]', {
      kind: 'math',
      title: 'Median of 20 runs',
      what: 'The middle value of the sorted times.',
      why: 'A single run can be slowed by anything else on the machine. The median ignores the occasional outlier.',
    }),
    ann(M, 'gflops', 'gflops =', '2 * batch * d * d / t / 1e9', {
      kind: 'math',
      title: 'Achieved GFLOP/s',
      what: 'The arithmetic done divided by the time taken.',
      why: 'Comparing it with the hardware’s peak tells you how far from the ceiling you are, and the trend with batch size tells you what limits you.',
    }),
  ],
};

export const measureOutput: CodeExample = {
  id: 'cpu-gpu-measure-output',
  language: 'bash',
  source: `python measure_cpu.py   # 4-thread Xeon VM, NumPy 2.5.3 with OpenBLAS
# batch    1:   0.774 ms     43.4 GFLOP/s     773.8 us per row
# batch    8:   2.893 ms     92.8 GFLOP/s     361.6 us per row
# batch   64:   8.308 ms    258.5 GFLOP/s     129.8 us per row
# batch  512:  43.878 ms    391.5 GFLOP/s      85.7 us per row`,
  annotations: [],
};

const T = `import torch

model = model.to("cuda").eval()                   # weights cross PCIe once, at startup
x_cpu = torch.randn(64, 4096)

with torch.inference_mode():
    for _ in range(10):                           # warm-up: CUDA context, kernel selection, allocator
        model(x_cpu.to("cuda"))
    torch.cuda.synchronize()

    start = torch.cuda.Event(enable_timing=True)
    end = torch.cuda.Event(enable_timing=True)
    start.record()
    for _ in range(100):
        y = model(x_cpu.to("cuda")).cpu()         # include the copies a real request pays
    end.record()
    torch.cuda.synchronize()                      # wait until the GPU has really finished
    print(f"{start.elapsed_time(end) / 100:.3f} ms per batch")`;

/** Timing on a GPU: launches are asynchronous, so time with events and synchronize. */
export const timeGpu: CodeExample = {
  id: 'cpu-gpu-torch',
  language: 'python',
  source: T,
  annotations: [
    ann(T, 'to-cuda', 'model = model.to', 'model.to("cuda")', {
      kind: 'framework',
      title: '.to("cuda")',
      what: 'Copies every weight into GPU memory.',
      why: 'Done once at startup. Copying weights per request would make every call pay for the whole model over PCIe.',
    }),
    ann(T, 'sync', 'torch.cuda.synchronize()                      #', 'torch.cuda.synchronize()', {
      kind: 'framework',
      title: 'torch.cuda.synchronize()',
      what: 'Blocks the CPU until every queued GPU operation has finished.',
      why: 'Kernel launches return immediately. Without it a timer measures how fast the CPU queued the work, not how long the GPU took.',
    }),
    ann(T, 'event', 'start = torch.cuda.Event', 'torch.cuda.Event(enable_timing=True)', {
      kind: 'framework',
      title: 'CUDA events',
      what: 'Markers recorded into the GPU’s own queue; elapsed_time gives the GPU time between them in milliseconds.',
      why: 'They time what the GPU did, without the CPU’s view getting in the way.',
    }),
  ],
};
