// Data for the visualization demo page (#/dev/viz). Every number is computed here from its formula.
import { dot } from '@/lib/math/vector';
import { gradientDescentExperiment } from '@/lib/ml/gradientDescent';
import type { ExperimentDef } from '@/lib/types';
import type { FlowEdge, FlowNode } from '@/lib/viz/flow';

export const gdExperiment = gradientDescentExperiment('demo-gd');

export interface VectorState {
  u: [number, number];
  v: [number, number];
  k: number;
}
export const vectorExperiment: ExperimentDef<VectorState, number> = {
  id: 'demo-vectors',
  initial: { u: [3, 1], v: [1, 2], k: 1.5 },
  controls: [
    {
      kind: 'slider',
      id: 'k',
      label: 'Scale k',
      min: -2,
      max: 2,
      step: 0.5,
      get: (s) => s.k,
      set: (s, k) => ({ ...s, k }),
    },
  ],
  compute: (s) => dot(s.u, s.v),
  readout: (s, r) => [{ label: 'u · v', value: `${s.u[0]}·${s.v[0]} + ${s.u[1]}·${s.v[1]} = ${r}` }],
};

/** Bytes per parameter: FP32 stores 4 bytes, INT8 stores 1 (scales and zero points not counted). */
const LAYER_PARAMS_M = [2.4, 9.4, 9.4, 9.4, 9.4, 9.4, 9.4, 2.4];
export const memoryBefore = LAYER_PARAMS_M.map((p) => p * 4);
export const memoryAfter = LAYER_PARAMS_M.map((p) => p * 1);

export const pipelineNodes: FlowNode[] = [
  { id: 'extract', label: 'Extract', x: 0, y: 0, detail: 'orders.csv', status: 'ok' },
  { id: 'validate', label: 'Validate', x: 220, y: 0, detail: '3 rules', status: 'warn' },
  { id: 'load', label: 'Load', x: 440, y: 0, detail: 'warehouse', status: 'unknown' },
  { id: 'quarantine', label: 'Quarantine', x: 220, y: 120, detail: '2 bad rows', status: 'error' },
];
export const pipelineEdges: FlowEdge[] = [
  { from: 'extract', to: 'validate', label: '100 rows', junction: 'square' },
  { from: 'validate', to: 'load', label: '98 rows', active: true },
  { from: 'validate', to: 'quarantine', label: 'bad rows', junction: 'round' },
];
