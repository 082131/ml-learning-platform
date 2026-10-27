import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import {
  blockParams,
  configError,
  EDGES,
  modelParams,
  stagePosition,
  transformerStages,
  type TransformerConfig,
} from './transformer';
import {
  PARAMS_SOURCE,
  paramSlots,
  paramsOutput,
  computeTransformer,
  transformerExperiment,
  type TransformerState,
} from './transformerExperiment';

const GPT2_SMALL: TransformerConfig = {
  batch: 1,
  seq: 1024,
  dModel: 768,
  heads: 12,
  dFf: 3072,
  vocab: 50257,
  layers: 12,
  kind: 'decoder',
};
const TINY: TransformerConfig = {
  batch: 2,
  seq: 3,
  dModel: 4,
  heads: 2,
  dFf: 16,
  vocab: 10,
  layers: 1,
  kind: 'encoder',
};
const DEFAULT: TransformerConfig = {
  ...TINY,
  dModel: 64,
  heads: 4,
  dFf: 256,
  vocab: 1000,
  seq: 8,
  layers: 2,
  kind: 'decoder',
};
const state = (c: TransformerConfig): TransformerState => ({ ...c, selected: 'scores' });

/** What PARAMS_SOURCE printed in CPython 3.13.16 for these configurations. */
const PYTHON_RUNS = [
  { c: GPT2_SMALL, output: '7087872\n124,439,808' },
  { c: DEFAULT, output: '49984\n164,608' },
  { c: TINY, output: '244\n304' },
];

describe('parameter counts', () => {
  it('counts a tiny block by hand', () => {
    // d = 4, d_ff = 16. Attention: W_q, W_k, W_v, W_o are 4×4 with 4 biases each: 4 · 20 = 80.
    // FFN: 4·16 + 16 + 16·4 + 4 = 148. Two LayerNorms: 2 · (4 + 4) = 16. Total 244.
    expect(blockParams(4, 16)).toEqual({ attention: 80, ffn: 148, norms: 16, total: 244 });
    // Embeddings 10·4 + 3·4 = 52, one block 244, final LayerNorm 8: 304.
    expect(modelParams(TINY).total).toBe(304);
  });

  it('matches the published GPT-2 small size: 7,087,872 per block and 124,439,808 in total', () => {
    expect(blockParams(768, 3072).total).toBe(4 * 768 ** 2 + 2 * 768 * 3072 + 9 * 768 + 3072);
    expect(blockParams(768, 3072).total).toBe(7_087_872);
    expect(modelParams(GPT2_SMALL).total).toBe(124_439_808);
  });

  it.each(PYTHON_RUNS)('prints what Python printed ($output)', ({ c, output }) => {
    expect(paramsOutput(computeTransformer(state(c)))).toBe(output);
  });
});

describe('stages', () => {
  it('gives the multi-head split and merge shapes', () => {
    const byId = Object.fromEntries(transformerStages(GPT2_SMALL).map((s) => [s.id, s.shape]));
    expect(byId.split).toEqual([1, 12, 1024, 64]);
    expect(byId.scores).toEqual([1, 12, 1024, 1024]);
    expect(byId.merge).toEqual([1, 1024, 768]);
    expect(byId.up).toEqual([1, 1024, 3072]);
    expect(byId.logits).toEqual([1, 1024, 50257]);
  });

  it('sums the block stages to the block formula', () => {
    const stages = transformerStages(TINY).filter((s) => s.inBlock);
    expect(stages.reduce((a, s) => a + s.params, 0)).toBe(244);
  });

  it('explains a head count that does not divide d_model', () => {
    expect(configError({ ...TINY, dModel: 64, heads: 12 })).toContain('not divisible by 12 heads');
    expect(configError(GPT2_SMALL)).toBeUndefined();
  });
});

describe('transformerExperiment', () => {
  const def = transformerExperiment('tf', state(DEFAULT), 'tf-params');
  it('is valid, with a trace that fits the filled source', () => {
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(PARAMS_SOURCE, [], paramSlots(def.initial));
    expect(source.split('\n')[0]).toBe('d_model, n_heads, d_ff = 64, 4, 256');
    expect(validateTrace(def.trace!(def.initial), source)).toEqual([]);
  });
  it('reads out the head split and the counts, and flags an invalid split', () => {
    const items = def.readout!(def.initial, def.compute(def.initial));
    expect(items[0]!.value).toBe('(2, 8, 64) → (2, 4, 8, 16) → (2, 8, 64)');
    expect(items[1]!.value).toBe('4·64² + 2·64·256 + 9·64 + 256 = 49,984');
    const bad = { ...def.initial, dModel: 64, heads: 12 };
    expect(def.readout!(bad, def.compute(bad))[0]!.status).toBe('error');
  });
});

describe('diagram layout', () => {
  it('places every stage, and every edge names existing stages', () => {
    const ids = new Set(transformerStages(TINY).map((s) => s.id));
    expect(EDGES.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
    const pos = Object.fromEntries(transformerStages(TINY).map((s) => [s.id, stagePosition(s)]));
    // The output projection and the first residual add sit on one row, so that edge is straight.
    expect(pos.wo!.y).toBe(pos.add1!.y);
    expect(pos.add1!.x).toBe(pos.pos!.x);
  });
});
