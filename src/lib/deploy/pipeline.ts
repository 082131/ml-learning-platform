import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from '../inference/format';

/**
 * A six-step ML pipeline with content-based caching: each step's cache key is a hash of its own settings and
 * its upstream step's key, so a change re-runs that step and everything downstream. The previous run (what
 * produced the production model) used data v1, features f1 and C = 1. Accuracies are real: METRICS comes from
 * generate_metrics.py in the pipelines lesson (scikit-learn 1.9.1). FNV-1a stands in for the SHA-256 real
 * orchestrators use. PIPELINE_SOURCE is the same logic in Python, checked against CPython in pipeline.test.ts.
 */
export const METRICS: Record<string, number> = {
  'v1/f1/0.01': 0.9, 'v1/f1/0.1': 0.9389, 'v1/f1/1': 0.9639, 'v1/f1/10': 0.9611,
  'v1/f2/0.01': 0.9028, 'v1/f2/0.1': 0.9389, 'v1/f2/1': 0.9639, 'v1/f2/10': 0.9611,
  'v2/f1/0.01': 0.9056, 'v2/f1/0.1': 0.9472, 'v2/f1/1': 0.9667, 'v2/f1/10': 0.9694,
  'v2/f2/0.01': 0.9083, 'v2/f2/0.1': 0.9472, 'v2/f2/1': 0.9694, 'v2/f2/10': 0.9611,
};
export const STEPS = ['ingest', 'validate', 'features', 'train', 'evaluate'] as const;

export interface PipelineState {
  data: 'v1' | 'v2';
  features: 'f1' | 'f2';
  C: '0.01' | '0.1' | '1' | '10';
  threshold: number;
}
export interface StepRun {
  step: string;
  key: string;
  ran: boolean;
}
export interface PipelineResult {
  steps: StepRun[];
  accuracy: number;
  production: number;
  promoted: boolean;
  reason: string;
}
export const PREVIOUS: PipelineState = { data: 'v1', features: 'f1', C: '1', threshold: 0.95 };

/** FNV-1a, 32 bits, as 8 hex digits. */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function stepKeys(s: PipelineState): string[] {
  const k: string[] = [];
  k.push(fnv1a(`ingest|${s.data}`));
  k.push(fnv1a(`validate|${k[0]}`));
  k.push(fnv1a(`features|${s.features}|${k[1]}`));
  k.push(fnv1a(`train|${s.C}|${k[2]}`));
  k.push(fnv1a(`evaluate|${k[3]}`));
  return k;
}

export function runPipeline(s: PipelineState): PipelineResult {
  const cache = new Set(stepKeys(PREVIOUS));
  const keys = stepKeys(s);
  const accuracy = METRICS[`${s.data}/${s.features}/${s.C}`]!;
  const production = METRICS['v1/f1/1']!;
  const promoted = accuracy >= s.threshold && accuracy > production;
  const reason =
    accuracy < s.threshold
      ? `${pyFixed(accuracy, 4)} is below the threshold ${pyFixed(s.threshold, 2)}`
      : accuracy <= production
        ? `${pyFixed(accuracy, 4)} does not beat production ${pyFixed(production, 4)}`
        : `${pyFixed(accuracy, 4)} beats production ${pyFixed(production, 4)}`;
  return {
    steps: STEPS.map((step, i) => ({ step, key: keys[i]!, ran: !cache.has(keys[i]!) })),
    accuracy,
    production,
    promoted,
    reason,
  };
}

export const PIPELINE_SOURCE = `METRICS = {{metrics}}          # test accuracy for each data/features/C (real runs)


def fnv1a(text):                                   # a small stand-in for SHA-256
    h = 0x811C9DC5
    for b in text.encode():
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def keys(data, features, C):                       # each key covers the step's inputs and its parent
    k = [fnv1a(f"ingest|{data}")]
    k.append(fnv1a(f"validate|{k[0]}"))
    k.append(fnv1a(f"features|{features}|{k[1]}"))
    k.append(fnv1a(f"train|{C}|{k[2]}"))
    k.append(fnv1a(f"evaluate|{k[3]}"))
    return k


cache = set(keys("v1", "f1", "1"))                 # outputs stored by the previous run
run = keys("{{data}}", "{{features}}", "{{C}}")
for step, key in zip(["ingest", "validate", "features", "train", "evaluate"], run):
    print(f"{step:9s} {'cached' if key in cache else 'ran   '} {key}")

acc, prod, threshold = METRICS["{{data}}/{{features}}/{{C}}"], METRICS["v1/f1/1"], {{threshold}}
if acc < threshold:
    print(f"register: blocked, {acc:.4f} is below the threshold {threshold:.2f}")
elif acc <= prod:
    print(f"register: blocked, {acc:.4f} does not beat production {prod:.4f}")
else:
    print(f"register: promoted, {acc:.4f} beats production {prod:.4f}")`;

export const pipelineSlots = (s: PipelineState): Record<string, string> => ({
  metrics: `{${Object.entries(METRICS)
    .map(([k, v]) => `"${k}": ${v}`)
    .join(', ')}}`,
  data: s.data,
  features: s.features,
  C: s.C,
  threshold: pyFixed(s.threshold, 2),
});

export const pipelinePrintout = (r: PipelineResult): string[] => [
  ...r.steps.map((x) => `${x.step.padEnd(9, ' ')} ${x.ran ? 'ran   ' : 'cached'} ${x.key}`),
  `register: ${r.promoted ? 'promoted' : 'blocked'}, ${r.reason}`,
];

export function pipelineReadout(_s: PipelineState, r: PipelineResult): ReadoutItem[] {
  const ran = r.steps.filter((x) => x.ran).length;
  return [
    { label: 'What the code prints', value: pipelinePrintout(r).join('\n') },
    { label: 'Work done', value: `${ran} of ${r.steps.length} steps ran, ${r.steps.length - ran} reused from the cache` },
  ];
}

export function pipelineExperiment(id: string, initial: PipelineState): ExperimentDef<PipelineState, PipelineResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'data',
        label: 'Data version',
        options: [
          { value: 'v1', label: 'v1 (900 images)' },
          { value: 'v2', label: 'v2 (1,437 images)' },
        ],
        get: (s) => s.data,
        set: (s, v) => ({ ...s, data: v as PipelineState['data'] }),
      },
      {
        kind: 'select',
        id: 'features',
        label: 'Feature code',
        options: [
          { value: 'f1', label: 'f1: pixels' },
          { value: 'f2', label: 'f2: pixels + sums' },
        ],
        get: (s) => s.features,
        set: (s, v) => ({ ...s, features: v as PipelineState['features'] }),
      },
      {
        kind: 'select',
        id: 'C',
        label: 'Regularization C',
        options: ['0.01', '0.1', '1', '10'].map((v) => ({ value: v, label: v })),
        get: (s) => s.C,
        set: (s, v) => ({ ...s, C: v as PipelineState['C'] }),
      },
      {
        kind: 'slider',
        id: 'threshold',
        label: 'Minimum accuracy to register',
        min: 0.9,
        max: 0.99,
        step: 0.01,
        format: (v) => v.toFixed(2),
        get: (s) => s.threshold,
        set: (s, v) => ({ ...s, threshold: Number(v.toFixed(2)) }),
      },
    ],
    compute: runPipeline,
    readout: pipelineReadout,
  };
}
