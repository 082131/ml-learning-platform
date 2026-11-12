import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import { METRICS, PIPELINE_SOURCE, PREVIOUS, fnv1a, pipelineExperiment, pipelinePrintout, pipelineSlots, runPipeline, type PipelineState } from './pipeline';

describe('pipeline', () => {
  it('FNV-1a matches the published test vectors', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
  });
  it('the metrics are the ones generate_metrics.py wrote', () => {
    const file = JSON.parse(
      readFileSync('content/tracks/deploy/pipelines/data-model-pipelines/metrics.json', 'utf8'),
    );
    expect(METRICS).toEqual(file);
  });
  it('re-running the previous settings reuses every step and does not promote', () => {
    const r = runPipeline(PREVIOUS);
    expect(r.steps.every((x) => !x.ran)).toBe(true);
    expect(r.promoted).toBe(false);
  });
  it('changing C re-runs train and evaluate only', () => {
    const r = runPipeline({ ...PREVIOUS, C: '10' });
    expect(r.steps.map((x) => x.ran)).toEqual([false, false, false, true, true]);
  });
  it('new data re-runs everything; v2 with f2 and C = 1 is promoted at 0.9694', () => {
    const r = runPipeline({ ...PREVIOUS, data: 'v2', features: 'f2' });
    expect(r.steps.every((x) => x.ran)).toBe(true);
    expect(r.promoted).toBe(true);
    expect(runPipeline({ ...PREVIOUS, data: 'v2', features: 'f2', threshold: 0.97 }).promoted).toBe(false);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(pipelineExperiment('p', PREVIOUS))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: PipelineState[] = [];
  for (const data of ['v1', 'v2'] as const)
    for (const features of ['f1', 'f2'] as const)
      for (const C of ['0.01', '1', '10'] as const) for (const threshold of [0.9, 0.97]) cases.push({ data, features, C, threshold });
  it('the printout equals what the lesson code prints', () => {
    const code = cases.map((s) => `exec(${JSON.stringify(fillSlots(PIPELINE_SOURCE, [], pipelineSlots(s)).source)}, {})`).join('\n');
    expect(runPython(code)).toBe(cases.flatMap((s) => pipelinePrintout(runPipeline(s))).join('\n'));
  });
});
