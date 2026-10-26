import { describe, expect, it } from 'vitest';
import { pipelineGraph, printedLines, runPipeline, type TestingState } from './modelTesting';

// Printed by the lesson's Python (CPython 3.13.16) with DATA_FAULT, SERVING_FAULT, MAX_MAE and
// MAX_SLICE_MAE set to each state.
const CASES: { state: TestingState; lines: string[] }[] = [
  {
    state: {
      dataFault: 'none',
      servingFault: 'none',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     PASS  max |corr| 0.869 (km)',
      'data   split overlap  PASS  0 orders in both train and val',
      'train  smoke          PASS  50/50 finite predictions',
      'behav  +1 km          PASS  +2.60 min (expect 1 to 5)',
      'behav  +1 stop        PASS  +3.06 min (expect > 0)',
      'behav  rain           PASS  +7.19 min (expect > 0)',
      'behav  rural vs city  PASS  +7.81 min (expect > 0)',
      'gate   val MAE        PASS  2.11, 95% CI 1.77 to 2.46 (max 2.5)',
      'gate   slice city     PASS  2.32 on 14 (max 3.0)',
      'gate   slice suburb   PASS  2.07 on 17 (max 3.0)',
      'gate   slice rural    PASS  1.98 on 19 (max 3.0)',
      'RELEASE: ship',
    ],
  },
  {
    state: {
      dataFault: 'missing_km',
      servingFault: 'none',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         FAIL  5 bad rows, first order 10: km=None',
      'RELEASE: blocked by data schema',
    ],
  },
  {
    state: {
      dataFault: 'km_in_meters',
      servingFault: 'none',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         FAIL  50 bad rows, first order 150: km=5429.665121249855',
      'RELEASE: blocked by data schema',
    ],
  },
  {
    state: {
      dataFault: 'leaked_label',
      servingFault: 'none',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     FAIL  max |corr| 1.000 (logged_minutes)',
      'RELEASE: blocked by data label leak',
    ],
  },
  {
    state: {
      dataFault: 'train_on_all',
      servingFault: 'none',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     PASS  max |corr| 0.869 (km)',
      'data   split overlap  FAIL  50 orders in both train and val',
      'RELEASE: blocked by data split overlap',
    ],
  },
  {
    state: {
      dataFault: 'none',
      servingFault: 'stops_dropped',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     PASS  max |corr| 0.869 (km)',
      'data   split overlap  PASS  0 orders in both train and val',
      'train  smoke          PASS  50/50 finite predictions',
      'behav  +1 km          PASS  +2.60 min (expect 1 to 5)',
      'behav  +1 stop        FAIL  +0.00 min (expect > 0)',
      'behav  rain           PASS  +7.19 min (expect > 0)',
      'behav  rural vs city  PASS  +7.81 min (expect > 0)',
      'gate   val MAE        FAIL  4.49, 95% CI 3.47 to 5.58 (max 2.5)',
      'gate   slice city     FAIL  5.00 on 14 (max 3.0)',
      'gate   slice suburb   FAIL  3.53 on 17 (max 3.0)',
      'gate   slice rural    FAIL  4.98 on 19 (max 3.0)',
      'RELEASE: blocked by behav +1 stop, gate val MAE, gate slice city, gate slice suburb, gate slice rural',
    ],
  },
  {
    state: {
      dataFault: 'none',
      servingFault: 'region_ignored',
      maxMae: 2.5,
      maxSliceMae: 3.0,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     PASS  max |corr| 0.869 (km)',
      'data   split overlap  PASS  0 orders in both train and val',
      'train  smoke          PASS  50/50 finite predictions',
      'behav  +1 km          PASS  +2.60 min (expect 1 to 5)',
      'behav  +1 stop        PASS  +3.06 min (expect > 0)',
      'behav  rain           PASS  +7.19 min (expect > 0)',
      'behav  rural vs city  FAIL  +0.00 min (expect > 0)',
      'gate   val MAE        FAIL  4.36, 95% CI 3.50 to 5.31 (max 2.5)',
      'gate   slice city     PASS  2.32 on 14 (max 3.0)',
      'gate   slice suburb   PASS  2.12 on 17 (max 3.0)',
      'gate   slice rural    FAIL  7.87 on 19 (max 3.0)',
      'RELEASE: blocked by behav rural vs city, gate val MAE, gate slice rural',
    ],
  },
  {
    state: {
      dataFault: 'none',
      servingFault: 'none',
      maxMae: 2.0,
      maxSliceMae: 2.5,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     PASS  max |corr| 0.869 (km)',
      'data   split overlap  PASS  0 orders in both train and val',
      'train  smoke          PASS  50/50 finite predictions',
      'behav  +1 km          PASS  +2.60 min (expect 1 to 5)',
      'behav  +1 stop        PASS  +3.06 min (expect > 0)',
      'behav  rain           PASS  +7.19 min (expect > 0)',
      'behav  rural vs city  PASS  +7.81 min (expect > 0)',
      'gate   val MAE        FAIL  2.11, 95% CI 1.77 to 2.46 (max 2.0)',
      'gate   slice city     PASS  2.32 on 14 (max 2.5)',
      'gate   slice suburb   PASS  2.07 on 17 (max 2.5)',
      'gate   slice rural    PASS  1.98 on 19 (max 2.5)',
      'RELEASE: blocked by gate val MAE',
    ],
  },
  {
    state: {
      dataFault: 'none',
      servingFault: 'region_ignored',
      maxMae: 5.0,
      maxSliceMae: 8.0,
    },
    lines: [
      'data   schema         PASS  0 bad rows',
      'data   label leak     PASS  max |corr| 0.869 (km)',
      'data   split overlap  PASS  0 orders in both train and val',
      'train  smoke          PASS  50/50 finite predictions',
      'behav  +1 km          PASS  +2.60 min (expect 1 to 5)',
      'behav  +1 stop        PASS  +3.06 min (expect > 0)',
      'behav  rain           PASS  +7.19 min (expect > 0)',
      'behav  rural vs city  FAIL  +0.00 min (expect > 0)',
      'gate   val MAE        PASS  4.36, 95% CI 3.50 to 5.31 (max 5.0)',
      'gate   slice city     PASS  2.32 on 14 (max 8.0)',
      'gate   slice suburb   PASS  2.12 on 17 (max 8.0)',
      'gate   slice rural    PASS  7.87 on 19 (max 8.0)',
      'RELEASE: blocked by behav rural vs city',
    ],
  },
];

describe('runPipeline', () => {
  for (const c of CASES) {
    it(`prints what Python prints for ${JSON.stringify(c.state)}`, () => {
      expect(printedLines(runPipeline(c.state))).toEqual(c.lines);
    });
  }

  it('marks stages that never ran as idle and the release as blocked', () => {
    const r = runPipeline({ dataFault: 'leaked_label', servingFault: 'none', maxMae: 2.5, maxSliceMae: 3 });
    const { nodes } = pipelineGraph(r);
    const status = Object.fromEntries(nodes.map((n) => [n.id, `${n.status} ${n.detail}`]));
    expect(status).toEqual({
      data: 'error 1 of 3 failed',
      train: 'idle not run',
      behav: 'idle not run',
      metric: 'idle not run',
      slices: 'idle not run',
      release: 'error blocked',
    });
    expect(r.skipped).toHaveLength(10);
  });
});
