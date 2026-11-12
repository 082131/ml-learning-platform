import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import {
  DATA_CENTRIC_SOURCE,
  dataCentric,
  dataCentricExperiment,
  dataCentricPrintout,
  dataCentricSlots,
  KS,
  makePoints,
  NOISES,
  runCell,
  SIZES,
} from './dataCentric';
import python from './fixtures/data-centric-python.json';

describe('dataCentric', () => {
  it('labels points inside the circle of radius 0.3 as class 1', () => {
    for (const p of makePoints(50, 7)) {
      const inside = (p.x - 0.5) ** 2 + (p.y - 0.5) ** 2 < 0.09;
      expect(p.label).toBe(inside ? 1 : 0);
    }
  });

  it('flips no labels at 0% noise and scores clean data well', () => {
    const r = runCell(1600, 0, 1);
    expect(r.flipped).toBe(0);
    expect(r.accuracy).toBeGreaterThan(0.98);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const size of SIZES)
      for (const noise of NOISES)
        for (const k of KS) {
          expect(dataCentricPrintout(runCell(size, noise, k), k)).toBe(table[`${size},${noise},${k}`]);
          n++;
        }
    expect(n).toBe(50);
  });

  it('offers the neighbouring cells for the two fixes', () => {
    const r = dataCentric({ n: 200, noise: 0.3, k: 1 });
    expect(r.moreData?.n).toBe(400);
    expect(r.cleaner?.noise).toBe(0.2);
    expect(dataCentric({ n: 1600, noise: 0, k: 1 }).moreData).toBeUndefined();
  });
});

describe('dataCentricExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = dataCentricExperiment('dc');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(DATA_CENTRIC_SOURCE, [], dataCentricSlots(def.initial));
    expect(source).toContain('N_TRAIN = 200 ');
    expect(source).toContain('NOISE = 0.3 ');
  });

  it('embeds the source verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/data_centric.py?raw')).default;
    expect(script).toContain(`SOURCE = """${DATA_CENTRIC_SOURCE}"""`);
  });
});
