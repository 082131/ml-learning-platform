import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/point-in-time-python.json';
import {
  JOINS,
  POINT_SOURCE,
  pointExperiment,
  pointInTime,
  pointPrintout,
  pointSlots,
  snapshot,
  WINDOWS,
} from './pointInTime';

describe('pointInTime', () => {
  it('counts orders in the window ending at a day, inclusive', () => {
    // A ordered on days 2, 5, 9, 12, 13, 20. The snapshot at the end of day 13 with a 7-day window covers days 7-13.
    expect(snapshot('A', 13, 7)).toBe(3);
    expect(snapshot('A', 13, 3)).toBe(2);
  });

  it('never leaks with the as-of join', () => {
    for (const window of WINDOWS) expect(pointInTime({ window, join: 'as-of' }).leaks).toBe(0);
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const window of WINDOWS)
      for (const join of JOINS) {
        expect(pointPrintout(pointInTime({ window, join }))).toBe(table[`${window},${join}`]);
        n++;
      }
    expect(n).toBe(6);
  });
});

describe('pointExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = pointExperiment('point');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(POINT_SOURCE, [], pointSlots(def.initial));
    expect(source).toContain('WINDOW = 7 ');
    expect(source).toContain('JOIN = "latest"');
  });

  it('embeds POINT_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/point_in_time.py?raw')).default;
    expect(script).toContain(`SOURCE = """${POINT_SOURCE}"""`);
  });
});
