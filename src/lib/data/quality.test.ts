import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/quality-python.json';
import {
  INCIDENTS,
  lineageDiagram,
  median,
  QUALITY_SOURCE,
  qualityExperiment,
  qualityPrintout,
  qualitySlots,
  runChecks,
  TOLERANCES,
  type Incident,
} from './quality';

describe('runChecks', () => {
  it('works through the volume check by hand', () => {
    // Sorted history: 870, 980, 995, 1003, 1012, 1021, 1040, so the median is 1003.
    expect(median([980, 1012, 1003, 995, 1040, 870, 1021])).toBe(1003);
    // 902 / 1003 − 1 = −0.1007: outside ±10%, inside ±15%.
    expect(runChecks({ incident: 'none', tol: 1 }).checks.find((c) => c.name === 'volume')!.passed).toBe(
      false,
    );
    expect(runChecks({ incident: 'none', tol: 2 }).decision).toBe('publish');
  });

  it('a renamed column stops the pipeline; an empty-email spike only warns', () => {
    expect(runChecks({ incident: 'schema', tol: 3 }).decision).toBe('stop');
    expect(runChecks({ incident: 'nulls', tol: 3 }).decision).toBe('warn');
  });

  it('a stop leaves everything downstream stale', () => {
    const { nodes } = lineageDiagram(runChecks({ incident: 'duplicates', tol: 3 }));
    expect(nodes.find((n) => n.id === 'orders_clean')!.status).toBe('error');
    expect(nodes.find((n) => n.id === 'churn_model')!.detail).toContain('stale');
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const incident of Object.keys(INCIDENTS) as Incident[])
      TOLERANCES.forEach((t, tol) => {
        expect(qualityPrintout(runChecks({ incident, tol }))).toBe(table[`${incident},${t}`]);
        n++;
      });
    expect(n).toBe(70);
  });
});

describe('qualityExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = qualityExperiment('quality');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(QUALITY_SOURCE, [], qualitySlots(def.initial));
    expect(source).toContain('INCIDENT = "schema"');
    expect(source).toContain('TOLERANCE = 0.2 ');
  });

  it('embeds QUALITY_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/quality.py?raw')).default;
    expect(script).toContain(`SOURCE = """${QUALITY_SOURCE}"""`);
  });
});
