// Code for the batching lesson. The simulator's printout is checked against CPython 3.13 for several
// settings in src/lib/inference/batching.test.ts; runnerSource's expected output is from a CPython 3.13 run.
import { BATCHING_SOURCE, batchingSlots, type BatchingConfig } from '@/lib/inference/batching';
import { batchingExperiment } from '@/lib/inference/batchingExperiment';
import { fillSlots } from '@/lib/code/slots';
import type { CodeExample } from '@/lib/types';

const SIM_ID = 'batching-sim';

/**
 * 100 requests per second on average, batches of up to 8, a 10 ms wait limit, and an assumed
 * service time of 20 + 3 · batch ms. These are illustrative numbers, not measurements of a GPU.
 */
export const initial: BatchingConfig = {
  rate: 100,
  n: 2000,
  seed: 7,
  maxBatch: 8,
  maxWait: 10,
  t0: 20,
  perItem: 3,
};

export const experiment = batchingExperiment('batching', initial, SIM_ID);

const st = (s: unknown) => s as BatchingConfig;

export const simCode: CodeExample = {
  id: SIM_ID,
  language: 'python',
  source: BATCHING_SOURCE,
  slots: Object.fromEntries(
    ['rate', 'n', 'seed', 'max_batch', 'max_wait', 't0', 'per_item'].map((k) => [
      k,
      (s: unknown) => batchingSlots(st(s))[k]!,
    ]),
  ),
  annotations: [
    {
      id: 'rng',
      range: { line: 3 },
      kind: 'function',
      title: 'A seeded random number generator',
      what: 'mulberry32: a few integer operations that turn a seed into a stream of numbers between 0 and 1.',
      why: 'Python’s own random module would work too. This one is used because the browser runs the same generator, so the visual and this code see identical arrivals.',
    },
    {
      id: 'max-batch',
      range: { line: 14, startCol: 0, endCol: 9 },
      match: 'max_batch',
      kind: 'parameter',
      title: 'max_batch',
      what: 'The most requests the replica processes together.',
      why: 'Bigger batches share the fixed cost t0 among more requests, but only if enough requests are waiting.',
    },
    {
      id: 'max-wait',
      range: { line: 14, startCol: 11, endCol: 19 },
      match: 'max_wait',
      kind: 'parameter',
      title: 'max_wait',
      what: 'How long the oldest request may wait for others to join before its batch is sent anyway.',
      why: 'It caps the latency added by batching when traffic is light. 0 means "send whatever is waiting as soon as the replica is free".',
    },
    {
      id: 'service-model',
      range: { line: 15, startCol: 0, endCol: 2 },
      match: 't0',
      kind: 'parameter',
      title: 't0: the fixed cost of a batch',
      what: 'Time a batch takes regardless of its size, for example reading every weight from GPU memory once.',
      why: 'This is an assumption of the model, not a measurement. Measure it for your model with a profiler.',
    },
    {
      id: 'per-item',
      range: { line: 15, startCol: 4, endCol: 12 },
      match: 'per_item',
      kind: 'parameter',
      title: 'per_item: the cost of one more request',
      what: 'How much longer a batch takes for each request in it.',
      why: 'When per_item is much smaller than t0, batching is nearly free throughput.',
    },
    {
      id: 'poisson',
      range: { line: 20, startCol: 9, endCol: 44 },
      match: '-math.log(1 - rand()) / rate * 1000',
      kind: 'math',
      title: 'Exponential gaps between arrivals',
      what: 'Turns a uniform random number into a gap with mean 1 / rate seconds, converted to ms.',
      why: 'Independent users arriving at random produce exactly this pattern (a Poisson process): mostly short gaps, sometimes long ones, and bursts.',
    },
    {
      id: 'full-at',
      range: { line: 25, startCol: 14, endCol: 41 },
      match: 'arrivals[i + max_batch - 1]',
      kind: 'variable',
      title: 'When the batch would be full',
      what: 'The arrival time of the max_batch-th waiting request, or infinity if the run ends first.',
      why: 'A full batch is sent at once: waiting longer cannot make it bigger.',
    },
    {
      id: 'start',
      range: { line: 26, startCol: 12, endCol: 62 },
      match: 'max(free_at, min(full_at, arrivals[i] + max_wait))',
      kind: 'math',
      title: 'When the batch starts',
      what: 'The earlier of "full" and "oldest has waited max_wait", but never before the replica is free.',
      why: 'This one line is the whole dynamic-batching policy.',
    },
    {
      id: 'arrived',
      range: { line: 28, startCol: 42, endCol: 62 },
      match: 'arrivals[j] <= start',
      kind: 'math',
      title: 'Who gets on the batch',
      what: 'Every waiting request that has arrived by the start time, up to max_batch.',
      why: 'When the replica was busy, more requests have piled up, so batches grow on their own under load.',
    },
    {
      id: 'service',
      range: { line: 30, startCol: 14, endCol: 37 },
      match: 't0 + per_item * (j - i)',
      kind: 'math',
      title: 'Service time of this batch',
      what: 'The stated model: fixed cost plus a cost per request.',
      why: 'Every result of the simulation follows from this assumption. Change t0 and per_item to see how.',
    },
    {
      id: 'latency',
      range: { line: 34, startCol: 18, endCol: 29 },
      match: 'free_at - a',
      kind: 'math',
      title: 'Latency of each request',
      what: 'Finish time minus arrival time: waiting in the queue plus running in the batch.',
      why: 'This is what a user experiences, so it is what we summarize with percentiles.',
    },
    {
      id: 'pct',
      range: { line: 39, startCol: 13, endCol: 44 },
      match: 'math.ceil(p * len(s) / 100) - 1',
      kind: 'math',
      title: 'Nearest-rank percentile',
      what: 'The p95 is the value 95% of requests are at or below: position ceil(0.95 · n) in sorted order.',
      why: 'Averages hide the slow tail. p95 and p99 tell you what the unlucky 5% and 1% of users see.',
    },
    {
      id: 'busy',
      range: { line: 47, startCol: 32, endCol: 37 },
      match: ':7.1%',
      kind: 'syntax',
      title: ':7.1%',
      what: 'Formats a fraction as a percentage with one decimal, right-aligned in 7 characters.',
      why: 'busy / span is the fraction of time the replica was running a batch.',
    },
  ],
};

/** The same simulator with the starting settings, editable and runnable in the browser. */
export const simRunner: CodeExample = {
  id: 'batching-runner',
  language: 'python',
  run: 'pyodide',
  source: fillSlots(BATCHING_SOURCE, [], batchingSlots(initial)).source,
  annotations: [],
  expectedOutput:
    'throughput    100.6 req/s\nmean batch     3.15\np50 latency    45.7 ms\np95 latency    67.2 ms\np99 latency    77.7 ms\nGPU busy      94.1%',
};
