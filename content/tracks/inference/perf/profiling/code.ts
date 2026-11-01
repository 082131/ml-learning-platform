// Code for the profiling lesson. The benchmark and freeze experiments are simulations with stated models
// (src/lib/inference/profiling.ts). The request breakdown below was measured with NumPy 2.5.3 on CPython 3.13
// on a 4-thread cloud VM; percentiles are checked against numpy.percentile in profiling.test.ts.
import { ann, annLine } from '@/lib/inference/annotate';
import {
  BENCH_SOURCE,
  benchExperiment,
  benchSlots,
  omissionExperiment,
  type BenchState,
} from '@/lib/inference/profiling';
import type { CodeExample } from '@/lib/types';

export const initial: BenchState = { samples: 200, warmup: 0, sync: 'yes', seed: 1 };

export const experiment = benchExperiment('bench', initial);

export const omission = omissionExperiment('omission', { client: 'closed', stall: 1000 });

const st = (s: unknown) => s as BenchState;
const B = BENCH_SOURCE;

export const benchCode: CodeExample = {
  id: 'bench-harness',
  language: 'python',
  source: B,
  slots: Object.fromEntries(
    ['warmup', 'samples', 'sync'].map((k) => [k, (s: unknown) => benchSlots(st(s))[k]!]),
  ),
  annotations: [
    ann(B, 'warmup', 'for _ in range({{warmup}})', 'range({{warmup}})', {
      kind: 'parameter',
      title: 'Warm-up calls',
      what: 'Calls that run the model but are not timed.',
      why: 'The first calls create the CUDA context, pick kernels and grow the memory pool. A server pays this once; per-request numbers should not include it.',
    }),
    ann(B, 'samples', 'for _ in range({{samples}})', 'range({{samples}})', {
      kind: 'parameter',
      title: 'Number of timed calls',
      what: 'How many measurements the percentiles are computed from.',
      why: 'p99 is the value only 1% of calls exceed. With 20 calls there is no 1%: a rare stall is either missed or dominates. Aim for hundreds to thousands.',
    }),
    ann(B, 'sync', '{{sync}}', '{{sync}}', {
      kind: 'framework',
      title: 'Synchronize before reading the clock',
      what: 'GPU work is queued asynchronously; synchronize waits until it has finished.',
      why: 'Without it the timer measures how fast Python queued the kernels, about 0.25 ms here, not the 12 ms the GPU took.',
    }),
    ann(B, 'pct', 'f"p95', 'np.percentile(times, 95)', {
      kind: 'math',
      title: 'Percentiles, not just the mean',
      what: 'p95 is the time 95% of calls beat. NumPy interpolates between the two nearest sorted values.',
      why: 'Users feel the slow tail. A mean hides a 900 ms first call or a 40 ms stall among fast calls; p99 and max show them.',
    }),
  ],
};

const R = `def handle(body):
    t0 = time.perf_counter()
    x = np.array(json.loads(body)["pixels"], dtype=np.float32) / 255     # preprocess
    t1 = time.perf_counter()
    labels = (np.maximum(x @ W1, 0) @ W2).argmax(axis=1)                 # model
    t2 = time.perf_counter()
    out = json.dumps({"labels": labels.tolist()})                        # postprocess
    t3 = time.perf_counter()
    return out, (t1 - t0, t2 - t1, t3 - t2)


for _ in range(20):
    handle(body)                                                         # warm-up
stages = np.array([handle(body)[1] for _ in range(500)]) * 1e3           # ms
total = stages.sum(axis=1)
print("p50 / p95 / p99 total:", np.percentile(total, [50, 95, 99]).round(2), "ms  mean", total.mean().round(2))
for name, col in zip(["preprocess", "model", "postprocess"], stages.T):
    print(f"{name:11s} p50 {np.percentile(col, 50):6.2f} ms  ({100 * np.median(col) / np.median(total):4.1f}%)")

tracemalloc.start()
handle(body)
current, peak = tracemalloc.get_traced_memory()
estimate = 4 * (64 * 784 + 2 * 64 * 2048)          # x, then x @ W1 and its ReLU alive together
print(f"peak traced memory {peak / 2**20:.2f} MiB, estimate {estimate / 2**20:.2f} MiB")`;

/** Timing each stage of a request, and measuring its peak memory. */
export const stageCode: CodeExample = {
  id: 'bench-stages',
  language: 'python',
  source: R,
  annotations: [
    annLine(R, 'pre', 'x = np.array(json.loads(body)', {
      kind: 'framework',
      title: 'Preprocessing',
      what: 'Parses 64 × 784 numbers from JSON text into Python lists, then into a float32 array, then scales.',
      why: 'Text parsing is slow per number. Here it is 80% of the request: optimizing the model alone could save at most a fifth.',
    }),
    annLine(R, 'model', 'labels = (np.maximum(x @ W1, 0)', {
      kind: 'math',
      title: 'The model',
      what: 'Two matrix multiplications: (64, 784) @ (784, 2048), then (64, 2048) @ (2048, 10).',
      why: 'About 1 ms of the 5 ms request.',
    }),
    ann(R, 'trace', 'tracemalloc.start()', 'tracemalloc.start()', {
      kind: 'framework',
      title: 'tracemalloc',
      what: 'Records memory allocated through Python’s allocator; NumPy reports its array buffers to it too.',
      why: 'get_traced_memory() returns (current, peak) in bytes: the peak is what the request needed at its worst moment.',
    }),
    ann(R, 'estimate', 'estimate = 4 *', '2 * 64 * 2048', {
      kind: 'math',
      title: 'Two (64, 2048) arrays at once',
      what: 'x @ W1 creates one array, and np.maximum creates another before the first is freed.',
      why: 'Counting only one gave 0.69 MiB, 42% low. The measurement found the temporary the first estimate forgot.',
    }),
  ],
};

export const stageOutput: CodeExample = {
  id: 'bench-stages-output',
  language: 'bash',
  source: `python stages.py   # NumPy 2.5.3, 4-thread cloud VM, W1 (784, 2048), W2 (2048, 10), batch of 64
# first call 10.22 ms
# p50 / p95 / p99 total: [ 5.36  9.02 11.12] ms  mean 6.23
# preprocess  p50   4.27 ms  (79.7%)
# model       p50   0.98 ms  (18.3%)
# postprocess p50   0.02 ms  ( 0.4%)
# peak traced memory 1.19 MiB, estimate 1.19 MiB`,
  annotations: [],
};

const P = `from torch.profiler import ProfilerActivity, profile

with profile(activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA], profile_memory=True) as prof:
    with torch.inference_mode():
        for _ in range(10):
            model(x)
        torch.cuda.synchronize()
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=10))
prof.export_chrome_trace("trace.json")          # open in https://ui.perfetto.dev

torch.cuda.reset_peak_memory_stats()
model(x)
print(torch.cuda.max_memory_allocated() / 2**20, "MiB peak")`;

/** Profiling a PyTorch model on a GPU. Not run here: no GPU or PyTorch in the build environment. */
export const torchProfile: CodeExample = {
  id: 'bench-torch-profile',
  language: 'python',
  source: P,
  annotations: [
    annLine(P, 'table', 'print(prof.key_averages()', {
      kind: 'framework',
      title: 'Time per operator',
      what: 'A table of operators (aten::addmm, aten::relu, …) with their CPU and GPU time, summed over the calls.',
      why: 'Shows which operations dominate, the first step before optimizing any of them.',
    }),
    annLine(P, 'trace', 'prof.export_chrome_trace', {
      kind: 'framework',
      title: 'A timeline',
      what: 'Every CPU operation and GPU kernel on a time axis.',
      why: 'Gaps on the GPU row are time the GPU waited: for Python, for data, or for a copy. Tables of totals cannot show gaps.',
    }),
    annLine(P, 'peak', 'print(torch.cuda.max_memory_allocated()', {
      kind: 'framework',
      title: 'Peak GPU memory',
      what: 'The most memory live tensors occupied since the last reset.',
      why: 'Compare it with your estimate from the memory lesson. Memory reserved by the caching allocator (memory_reserved) is higher.',
    }),
  ],
};
