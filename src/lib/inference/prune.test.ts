import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import type { DigitsModel } from './digitsModel';
import {
  PRUNE_SOURCE,
  pruneExperiment,
  prunePrintout,
  pruneSlots,
  runPrune,
  runTemperature,
  softmaxT,
  temperatureExperiment,
  type PruneState,
} from './prune';
import { hasPython } from './testPython';

const DIR = resolve(__dirname, '../../../content/tracks/inference/precision/precision-quantization');
const model = JSON.parse(readFileSync(resolve(DIR, 'digits_mlp.json'), 'utf8')) as DigitsModel;

describe('runPrune', () => {
  it('keeps every weight at 0% and matches the float model', () => {
    const r = runPrune(model, { sparsity: 0, scope: 'layer' });
    expect(r.correct).toBe(model.floatCorrect);
    expect(r.denseBytes).toBe(4 * (1024 + 160));
  });
  it('zeroes at least the requested share of each matrix', () => {
    const r = runPrune(model, { sparsity: 50, scope: 'layer' });
    expect(r.kept[0]).toBeLessThanOrEqual(512);
    expect(r.kept[1]).toBeLessThanOrEqual(80);
  });
  it('global pruning prunes the large first layer harder than the small second layer', () => {
    const r = runPrune(model, { sparsity: 80, scope: 'global' });
    expect(r.kept[0] / r.total[0]).toBeLessThan(r.kept[1] / r.total[1]);
  });
  it('is a valid experiment, and so is the temperature one', () => {
    expect(validateExperiment(pruneExperiment('p', model, { sparsity: 50, scope: 'layer' }))).toEqual([]);
    expect(validateExperiment(temperatureExperiment('t', model, { image: 0, temperature: 4 }))).toEqual([]);
  });
});

describe('temperature', () => {
  it('softens without changing the order', () => {
    expect(softmaxT([2, 0], 1)[0]).toBeCloseTo(Math.exp(2) / (Math.exp(2) + 1), 12);
    expect(softmaxT([2, 0], 2)[0]).toBeCloseTo(Math.exp(1) / (Math.exp(1) + 1), 12);
    const r = runTemperature(model, { image: 0, temperature: 4 });
    expect(r.probs.indexOf(Math.max(...r.probs))).toBe(r.predicted);
    expect(Math.max(...r.probs)).toBeLessThan(Math.max(...r.hardProbs));
  });
});

describe.skipIf(!hasPython())('the printout equals what NumPy prints', () => {
  const cases: PruneState[] = [0, 30, 50, 75, 90, 95].flatMap((sparsity) =>
    (['layer', 'global'] as const).map((scope) => ({ sparsity, scope })),
  );
  it.each(cases.map((c) => [`${c.scope} ${c.sparsity}%`, c] as const))('%s', (_, s) => {
    const code = fillSlots(PRUNE_SOURCE, [], pruneSlots(s)).source;
    const out = execFileSync('python3', ['-c', code], { cwd: DIR, encoding: 'utf8' });
    expect(out.replace(/\n$/, '')).toBe(prunePrintout(runPrune(model, s)).join('\n'));
  });
});
