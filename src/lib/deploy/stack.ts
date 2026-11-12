import type { ExperimentDef, ReadoutItem } from '../types';

/**
 * A rule-of-thumb deployment planner: for a model and a target, the format, runtime, packaging, scaling and
 * monitoring commonly chosen, with the reason, and whether the weights fit the target's memory. Sizes are
 * parameters × bits per weight / 8; memory sizes and bits per weight are stated assumptions (estimates).
 */
export const MODELS = {
  'llm-8b': { label: 'Chat LLM, 8B parameters', params: 8.03e9, llm: true },
  'llm-70b': { label: 'Chat LLM, 70B parameters', params: 70.55e9, llm: true },
  vision: { label: 'Image classifier (ResNet-50, 25.6M)', params: 25.6e6, llm: false },
} as const;
export const TARGETS = {
  laptop: { label: 'Laptop, 16 GB RAM, no GPU', memGB: 16 },
  phone: { label: 'Phone app, about 3 GB for the model', memGB: 3 },
  'gpu-server': { label: 'One server, one 80 GB GPU', memGB: 80 },
  k8s: { label: 'Kubernetes cluster, 80 GB GPU nodes', memGB: 80 },
} as const;
export type ModelId = keyof typeof MODELS;
export type TargetId = keyof typeof TARGETS;
export interface StackState {
  model: ModelId;
  target: TargetId;
}
export interface Stage {
  stage: string;
  tool: string;
  why: string;
}
export interface StackResult {
  stages: Stage[];
  bitsPerWeight: number;
  weightsGB: number;
  fits: boolean;
}

function format(s: StackState): { tool: string; why: string; bpw: number } {
  const m = MODELS[s.model];
  if (!m.llm)
    return s.target === 'phone'
      ? { tool: 'ONNX, INT8-quantized', why: 'ONNX Runtime Mobile runs it on the phone; INT8 cuts size by 4×.', bpw: 8 }
      : { tool: 'ONNX (FP32 or FP16)', why: 'One graph file that ONNX Runtime or Triton runs on CPU or GPU without Python.', bpw: 32 };
  if (s.target === 'laptop' || s.target === 'phone')
    return { tool: 'GGUF, Q4_K_M', why: 'llama.cpp’s single-file format; 4-bit blocks make it 3.3× smaller than BF16.', bpw: 4.85 };
  return s.model === 'llm-70b'
    ? { tool: 'safetensors, AWQ 4-bit', why: 'BF16 (141 GB) would need two GPUs; 4-bit weights fit one 80 GB GPU.', bpw: 4.25 }
    : { tool: 'safetensors, BF16', why: 'Full quality and fits easily; vLLM loads it directly.', bpw: 16 };
}

export function planStack(s: StackState): StackResult {
  const m = MODELS[s.model];
  const t = s.target;
  const f = format(s);
  const runtime = !m.llm
    ? t === 'k8s' || t === 'gpu-server'
      ? { tool: 'Triton or ONNX Runtime', why: 'Server-side dynamic batching groups single-image requests.' }
      : { tool: 'ONNX Runtime', why: 'Runs the ONNX graph in-process, no server needed.' }
    : t === 'laptop' || t === 'phone'
      ? { tool: 'llama.cpp (or Ollama)', why: 'Runs GGUF on CPUs and small GPUs; one user at a time.' }
      : { tool: 'vLLM', why: 'Paged KV cache and continuous batching serve many users per GPU.' };
  const pack =
    t === 'phone'
      ? { tool: 'Bundled in the app', why: 'Downloaded once with the app or on first use.' }
      : t === 'laptop'
        ? { tool: 'A file plus a binary', why: 'Ollama or llama-server; no container needed.' }
        : { tool: 'Container image', why: 'Pins the runtime and its libraries; the weights are loaded from storage at start.' };
  const scale =
    t === 'k8s'
      ? { tool: 'Deployment + HPA, or KServe', why: 'Replicas on GPU nodes, scaled on queue length.' }
      : t === 'gpu-server'
        ? { tool: 'One process, batching', why: 'Concurrency comes from batching on the one GPU.' }
        : { tool: 'Each device runs its own', why: 'Scales with the number of users’ devices.' };
  const weightsGB = (m.params * f.bpw) / 8 / 1e9;
  return {
    stages: [
      { stage: 'Pipeline', tool: 'Train, evaluate, register', why: 'A versioned model with its metrics and lineage.' },
      { stage: 'Format', tool: f.tool, why: f.why },
      { stage: 'Runtime', tool: runtime.tool, why: runtime.why },
      { stage: 'Package', tool: pack.tool, why: pack.why },
      { stage: 'Scale', tool: scale.tool, why: scale.why },
      { stage: 'Operate', tool: 'Metrics, logs, rollouts', why: 'Latency, errors and quality, and a way back to the last version.' },
    ],
    bitsPerWeight: f.bpw,
    weightsGB,
    fits: weightsGB <= TARGETS[t].memGB,
  };
}

export function stackReadout(s: StackState, r: StackResult): ReadoutItem[] {
  const mem = TARGETS[s.target].memGB;
  return [
    {
      label: 'Weights (estimate)',
      value: `${MODELS[s.model].params.toExponential(3)} parameters × ${r.bitsPerWeight} bits / 8 = ${r.weightsGB.toFixed(2)} GB`,
    },
    {
      label: 'Fits the target?',
      value: r.fits
        ? `Yes: ${r.weightsGB.toFixed(2)} GB of ${mem} GB, before the KV cache and runtime overhead`
        : `No: ${r.weightsGB.toFixed(2)} GB is more than ${mem} GB. Pick a smaller model or a bigger target.`,
    },
  ];
}

export function stackExperiment(id: string, initial: StackState): ExperimentDef<StackState, StackResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'model',
        label: 'Model',
        options: Object.entries(MODELS).map(([value, m]) => ({ value, label: m.label })),
        get: (s) => s.model,
        set: (s, v) => ({ ...s, model: v as ModelId }),
      },
      {
        kind: 'select',
        id: 'target',
        label: 'Where it runs',
        options: Object.entries(TARGETS).map(([value, t]) => ({ value, label: t.label })),
        get: (s) => s.target,
        set: (s, v) => ({ ...s, target: v as TargetId }),
      },
    ],
    compute: planStack,
    readout: stackReadout,
  };
}
