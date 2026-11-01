import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import type { DigitsModel } from './digitsModel';
import { GRAPH_SOURCE, graphExperiment, graphPrintout, graphSlots, runGraph, type GraphState, type Prep } from './tensorGraph';
import { hasPython } from './testPython';

const DIR = resolve(__dirname, '../../../content/tracks/inference/precision/precision-quantization');
const model = JSON.parse(readFileSync(resolve(DIR, 'digits_mlp.json'), 'utf8')) as DigitsModel;

describe('runGraph', () => {
  it('follows the shapes of a correct batch', () => {
    const r = runGraph(model, { batch: 8, prep: 'flat' });
    expect(r.steps.map((s) => s.shape)).toEqual([[8, 8, 8], [8, 64], [8, 16], [8, 16], [8, 10], [8]]);
    expect(r.labels).toEqual([7, 6, 3, 7, 7, 3, 2, 8]);
    expect(r.correct).toBe(8);
  });
  it('fails at the first dense layer when the images are not flattened', () => {
    const r = runGraph(model, { batch: 4, prep: 'image' });
    expect(r.steps[2]!.error).toContain('size 64 is different from 8');
    expect(r.labels).toBeUndefined();
  });
  it('runs a single image to the last step and fails at argmax(axis=1)', () => {
    const r = runGraph(model, { batch: 4, prep: 'single' });
    expect(r.steps[4]!.shape).toEqual([10]);
    expect(r.steps[5]!.error).toContain('axis 1 is out of bounds');
  });
  it('raises no error when the scale is wrong, but gets fewer right', () => {
    expect(runGraph(model, { batch: 360, prep: 'flat' }).correct).toBe(349);
    expect(runGraph(model, { batch: 360, prep: 'scale255' }).correct).toBe(229);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(graphExperiment('g', model, { batch: 8, prep: 'flat' }))).toEqual([]);
  });
});

const hasNumpy = () => {
  if (!hasPython()) return false;
  try {
    execFileSync('python3', ['-c', 'import numpy']);
    return true;
  } catch {
    return false;
  }
};

describe.skipIf(!hasNumpy())('the printout equals what NumPy prints', () => {
  const cases: GraphState[] = (['flat', 'image', 'single', 'scale255'] as Prep[]).flatMap((prep) =>
    [1, 8, 360].map((batch) => ({ batch, prep })),
  );
  it.each(cases.map((c) => [`${c.prep} b${c.batch}`, c] as const))('%s', (_, s) => {
    const code = fillSlots(GRAPH_SOURCE, [], graphSlots(s)).source;
    let out: string;
    try {
      out = execFileSync('python3', ['-c', code], { cwd: DIR, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const err = e as { stdout: string; stderr: string };
      out = err.stdout + err.stderr.trim().split('\n').at(-1);
    }
    expect(out.replace(/\n$/, '')).toBe(graphPrintout(runGraph(model, s)).join('\n'));
  });
});
