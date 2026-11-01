// Code for the Inference Engineer capstone. benchmark.py (in this folder) was run on 2026-11-01 on a 4-core
// cloud VM with scikit-learn 1.9.1, onnx 1.23, ONNX Runtime 1.29.0 and NumPy 2.5.3; its output is recorded below.
import { annLine } from '@/lib/inference/annotate';
import type { CodeExample, ProjectBrief } from '@/lib/types';
import benchSource from './benchmark.py?raw';

const B = benchSource;

export const benchmarkCode: CodeExample = {
  id: 'capstone-benchmark',
  language: 'python',
  source: B,
  annotations: [
    annLine(B, 'train', 'mlp = MLPClassifier(hidden_layer_sizes=(1024, 1024)', {
      kind: 'function',
      title: 'A model worth optimizing',
      what: 'Two hidden layers of 1,024 units: about 1.1 million weights, 4.3 MiB in float32.',
      why: 'The earlier 16-unit digits model runs in microseconds, too fast for optimizations to show above noise.',
    }),
    annLine(B, 'quant', 'quantize_dynamic("digits_fp32.onnx"', {
      kind: 'framework',
      title: 'Optimization A: INT8 weights',
      what: 'Stores each weight matrix as 8-bit integers with a scale; activations are quantized on the fly at run time.',
      why: 'A quarter of the bytes to read, and integer matrix kernels. Check the accuracy: quantization changes the numbers.',
    }),
    annLine(B, 'threads', 'so.intra_op_num_threads = 1', {
      kind: 'parameter',
      title: 'Fix the conditions',
      what: 'Every variant runs on one thread.',
      why: 'Comparisons are only fair when everything except the optimization stays the same.',
    }),
    annLine(B, 'acc', 'acc = (probs.argmax(1) == y_test).mean()', {
      kind: 'math',
      title: 'Accuracy for every variant',
      what: 'The share of the 360 held-out images classified correctly.',
      why: 'An optimization that changes predictions is a different model. State a tolerance before measuring, not after.',
    }),
    annLine(B, 'b32', 'many = latency_ms(sess, 32, 300)', {
      kind: 'parameter',
      title: 'Optimization B: batching',
      what: 'The same model on 32 images per call.',
      why: 'Throughput rises because weights are read once per batch; the price is waiting to fill the batch.',
    }),
  ],
};

export const benchmarkOutput: CodeExample = {
  id: 'capstone-benchmark-output',
  language: 'bash',
  source: `python3 benchmark.py
x86_64, 4 cores; onnxruntime 1.29.0, 1 thread
variant        accuracy      size    p50 b=1    p99 b=1  images/s b=1  images/s b=32
fp32             98.06%  4.30 MiB   0.185 ms   0.447 ms         5,419         37,001
int8 weights     98.06%  1.08 MiB   0.065 ms   0.156 ms        15,487        170,518

# two more runs (last two lines of each)
fp32             98.06%  4.30 MiB   0.191 ms   0.368 ms         5,230         51,753
int8 weights     98.06%  1.08 MiB   0.032 ms   0.110 ms        31,297        252,139
fp32             98.06%  4.30 MiB   0.198 ms   0.290 ms         5,049         55,834
int8 weights     98.06%  1.08 MiB   0.077 ms   0.149 ms        13,019        218,483`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Deploy a model behind an HTTP API, measure its latency and throughput under realistic load, apply at least two optimizations one at a time, and write a report that lets someone else reproduce every number and decide which version to ship.',
  dataset:
    'Any model you can run: the 1,024-unit digits classifier from the reference benchmark, a small image model from torchvision exported to ONNX, or a small language model served with an LLM runtime. Use a held-out evaluation set of real inputs for accuracy, and a sample of realistic requests for load tests.',
  milestones: [
    'Run benchmark.py and reproduce its table on your machine; record the hardware and versions',
    'Serve the baseline model with the serving lesson’s API: validation, a timeout, health checks and the model version in each response',
    'Package it in a container with pinned dependencies and check that it becomes ready and healthy',
    'Load test the container open-loop at increasing rates; find the saturation point and the p99 at 50% and 80% of it',
    'Apply optimization A (for example quantization or another runtime) and measure accuracy, size, p50, p99 and throughput, changing nothing else',
    'Apply optimization B (for example dynamic batching, a larger batch, more replicas, or a GPU) and measure it the same way, alone and combined with A',
    'Add metrics (request count by status and version, a latency histogram, requests in flight) and an SLO with a burn-rate alert',
    'Write the report: setup, method, results table, accuracy check, trade-offs, and the version you would ship and why',
  ],
  rubric: [
    {
      criterion: 'Method',
      detail:
        'Warm-up, enough samples, percentiles not just means, open-loop load, fixed conditions, and repeated runs with their spread.',
    },
    {
      criterion: 'One change at a time',
      detail:
        'Each optimization is measured against the same baseline, alone and then combined, on the same hardware.',
    },
    {
      criterion: 'Accuracy',
      detail:
        'A tolerance stated before measuring; every variant checked on the same held-out set; differences explained (for example how many predictions changed).',
    },
    {
      criterion: 'Explanation',
      detail:
        'For each optimization: why it helped (or did not) in terms of compute, memory traffic, overhead or queueing, and when it would not help.',
    },
    {
      criterion: 'Service',
      detail:
        'Validation, timeouts, readiness, pinned image, and metrics that would let an on-call engineer see a regression.',
    },
    {
      criterion: 'Reproducibility',
      detail:
        'Hardware, driver and library versions, commands and seeds are written down; someone else gets the same table within noise.',
    },
  ],
  hints: [
    'Change one thing at a time and keep a results table from the first run on, including the runs that did not help.',
    'If an optimization helps the model but not the service, profile the request: parsing and copying may dominate (the profiling lesson).',
    'Quantization helps most where weights dominate memory traffic: large layers at small batches.',
    'Batching raises throughput and median latency together; report both and the batch timeout you chose.',
    'Run every benchmark at least three times and report the spread; on shared or laptop hardware, differences under 10% are often noise.',
  ],
};

/** The start of a report, shown as plain text. */
export const reportTemplate: CodeExample = {
  id: 'capstone-report',
  language: 'bash',
  source: `## Setup
4-core cloud VM (Xeon at 2.1 GHz), ONNX Runtime 1.29.0, 1 intra-op thread, NumPy 2.5.3, scikit-learn 1.9.1.
Model: MLP 64-1024-1024-10 on scikit-learn digits; 360 held-out images; tolerance 0.5 points.

## Method
20 warm-up calls; 2,000 timed calls at batch 1 and 300 at batch 32; 3 runs, reported as a range.

## Results
| Variant | Accuracy | Size | p50 batch 1 | p99 batch 1 | images/s batch 32 |
| ...     |          |      |             |             |                   |

## Decision
Which variant to ship, why, and what would change the decision (other hardware, larger batches, a GPU).`,
  annotations: [],
};
