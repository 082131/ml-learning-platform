import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/perf chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'warm-up',
    term: 'Warm-up',
    short:
      'Calls made before timing starts, so one-time costs (context creation, kernel selection, memory pool growth, caches) are not measured.',
    long: 'A server pays these costs once at startup. A benchmark that includes them overstates every request; a server that skips warm-up makes its first users pay them.',
    introducedIn: 'inference/perf/profiling',
    aliases: ['warmup', 'cold start'],
  },
  {
    id: 'coordinated-omission',
    term: 'Coordinated omission',
    short:
      'A load test that sends the next request only after the previous reply under-counts slow periods, because it stops sending while the server is slow.',
    long: 'Real users keep arriving during a stall. A closed-loop tester records a 1-second freeze as one slow request; an open-loop tester records every request that would have arrived during it.',
    introducedIn: 'inference/perf/profiling',
    aliases: ['closed-loop load', 'open-loop load'],
  },
  {
    id: 'profiler',
    term: 'Profiler',
    short:
      'A tool that records where time (and memory) goes inside a program: per function, per operator or per GPU kernel.',
    long: 'torch.profiler records operator and kernel times on CPU and GPU; NVIDIA Nsight Systems shows the whole timeline, including copies and gaps where the GPU is idle.',
    introducedIn: 'inference/perf/profiling',
    aliases: ['torch.profiler', 'Nsight Systems', 'py-spy'],
  },
  {
    id: 'gpu-utilization',
    term: 'GPU utilization (nvidia-smi)',
    short: 'The share of time during which at least one kernel was running on the GPU.',
    long: 'It says nothing about how much of the GPU each kernel used: one tiny kernel running all the time shows 100%. Use achieved FLOP/s and memory bandwidth, or a profiler, to see how busy the hardware really is.',
    introducedIn: 'inference/perf/gpu-bottlenecks',
    aliases: ['GPU-Util', 'nvidia-smi utilization'],
  },
  {
    id: 'arithmetic-intensity',
    term: 'Arithmetic intensity',
    short: 'FLOPs performed per byte moved to or from memory.',
    long: 'Compared with a GPU’s ridge point (peak FLOP/s ÷ bandwidth), it tells whether an operation is memory-bound (below) or compute-bound (above). A batch-1 matrix-vector product has about 1 FLOP per byte in FP16; large matrix multiplications have hundreds.',
    introducedIn: 'inference/perf/gpu-bottlenecks',
    aliases: ['operational intensity', 'FLOPs per byte'],
  },
] satisfies GlossaryTerm[];
