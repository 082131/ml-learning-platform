import type { ExperimentDef, ReadoutItem } from '../types';
import { pyThousands as n } from './format';

/**
 * The digits classifier as an ONNX graph at each ONNX Runtime optimization level. The node lists are what
 * onnxruntime 1.29.0 produced (content/tracks/inference/runtimes/onnx-serving/optimize.py, checked in
 * onnxGraph.test.ts). The memory traffic between nodes is computed here from the tensor shapes.
 */
export type OptLevel = 'disabled' | 'basic' | 'extended';

export interface GraphNode {
  op: string;
  /** What the node computes, in the lesson's terms. */
  does: string;
  /** The tensor this node writes for the next node: values per row of the batch, plus a fixed size per call. */
  out: { name: string; perRow: number; fixed: number };
  /** The node was produced by an optimization. */
  changed?: string;
}

const MUL: GraphNode = { op: 'Mul', does: 'pixels × 1/16', out: { name: 'x', perRow: 64, fixed: 0 } };
const SOFTMAX: GraphNode = { op: 'Softmax', does: 'scores → probabilities', out: { name: 'probs', perRow: 10, fixed: 0 } };

export const LEVELS: Record<OptLevel, { label: string; ort: string; nodes: GraphNode[] }> = {
  disabled: {
    label: 'Disabled',
    ort: 'ORT_DISABLE_ALL',
    nodes: [
      MUL,
      { op: 'Transpose', does: 'fc1.weight (16, 64) → (64, 16), every call', out: { name: 'W1', perRow: 0, fixed: 1024 } },
      { op: 'MatMul', does: 'x @ W1', out: { name: 'xw', perRow: 16, fixed: 0 } },
      { op: 'Add', does: '+ fc1.bias', out: { name: 'z', perRow: 16, fixed: 0 } },
      { op: 'Relu', does: 'max(z, 0)', out: { name: 'h', perRow: 16, fixed: 0 } },
      { op: 'Transpose', does: 'fc2.weight (10, 16) → (16, 10), every call', out: { name: 'W2', perRow: 0, fixed: 160 } },
      { op: 'MatMul', does: 'h @ W2', out: { name: 'hw', perRow: 10, fixed: 0 } },
      { op: 'Add', does: '+ fc2.bias', out: { name: 'logits', perRow: 10, fixed: 0 } },
      SOFTMAX,
    ],
  },
  basic: {
    label: 'Basic',
    ort: 'ORT_ENABLE_BASIC',
    nodes: [
      MUL,
      {
        op: 'Gemm',
        does: 'x @ W1 + fc1.bias',
        out: { name: 'z', perRow: 16, fixed: 0 },
        changed: 'Transpose folded into a constant; MatMul + Add fused',
      },
      { op: 'Relu', does: 'max(z, 0)', out: { name: 'h', perRow: 16, fixed: 0 } },
      {
        op: 'Gemm',
        does: 'h @ W2 + fc2.bias',
        out: { name: 'logits', perRow: 10, fixed: 0 },
        changed: 'Transpose folded into a constant; MatMul + Add fused',
      },
      SOFTMAX,
    ],
  },
  extended: {
    label: 'Extended',
    ort: 'ORT_ENABLE_EXTENDED',
    nodes: [
      MUL,
      {
        op: 'FusedGemm',
        does: 'relu(x @ W1 + fc1.bias)',
        out: { name: 'h', perRow: 16, fixed: 0 },
        changed: 'Gemm + Relu fused (a Microsoft-domain operator)',
      },
      { op: 'Gemm', does: 'h @ W2 + fc2.bias', out: { name: 'logits', perRow: 10, fixed: 0 } },
      SOFTMAX,
    ],
  },
};

export interface OnnxState {
  level: OptLevel;
  batch: number;
}

export interface OnnxResult {
  nodes: GraphNode[];
  kernels: number;
  /** Bytes of intermediate tensors written by one node and read by the next (float32), per call. */
  intermediateBytes: number;
  /** The same for the unoptimized graph, for comparison. */
  baselineBytes: number;
}

/** Each intermediate is written once and read once: 2 × 4 bytes per value. The final output is only written. */
export function intermediateBytes(nodes: GraphNode[], batch: number): number {
  return nodes.slice(0, -1).reduce((t, nd) => t + 2 * 4 * (nd.out.perRow * batch + nd.out.fixed), 0);
}

export function runOnnx(s: OnnxState): OnnxResult {
  const nodes = LEVELS[s.level].nodes;
  return {
    nodes,
    kernels: nodes.length,
    intermediateBytes: intermediateBytes(nodes, s.batch),
    baselineBytes: intermediateBytes(LEVELS.disabled.nodes, s.batch),
  };
}

export function onnxReadout(s: OnnxState, r: OnnxResult): ReadoutItem[] {
  const saved = r.baselineBytes - r.intermediateBytes;
  return [
    { label: 'Kernels launched per call', value: `${r.kernels} (${LEVELS.disabled.nodes.length} without optimization)` },
    {
      label: `Bytes passed between nodes, batch ${s.batch}`,
      value: `${n(r.intermediateBytes)}${saved > 0 ? `, ${n(saved)} fewer than unoptimized (${((100 * saved) / r.baselineBytes).toFixed(0)}%)` : ''}`,
    },
    { label: 'Outputs', value: 'identical at every level in our run: max difference 0.0e+00 over 360 images' },
  ];
}

export function onnxExperiment(id: string, initial: OnnxState): ExperimentDef<OnnxState, OnnxResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'level',
        label: 'Graph optimization level',
        options: (Object.keys(LEVELS) as OptLevel[]).map((k) => ({ value: k, label: `${LEVELS[k].label} (${LEVELS[k].ort})` })),
        get: (s) => s.level,
        set: (s, v) => ({ ...s, level: v as OptLevel }),
      },
      {
        kind: 'slider',
        id: 'batch',
        label: 'Batch size',
        min: 1,
        max: 512,
        get: (s) => s.batch,
        set: (s, v) => ({ ...s, batch: v }),
      },
    ],
    compute: runOnnx,
    readout: onnxReadout,
  };
}
