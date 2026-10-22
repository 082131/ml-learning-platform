import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { computeVersions, dataCsv, fitLine, printed, versioningExperiment, type Row } from './versioning';

const rows: Row[] = [
  [2, 15],
  [4, 21],
  [5, 26],
  [8, 32],
  [10, 38],
  [12, 95],
];

// Every expected line was printed by the lesson's Python (CPython 3.13, hashlib).
describe('versioning', () => {
  it('prints the same versions as the Python for the starting state', () => {
    expect(dataCsv(rows)).toBe('km,minutes\n2,15\n4,21\n5,26\n8,32\n10,38\n12,95\n');
    expect(printed(computeVersions({ rows, dropOverMinutes: 60 }))).toEqual([
      'data   8cef040fae78',
      'config 70c76fc9e04a',
      'run    0737369cee8c',
      'model  4e11ae29f6b4 {"w": 2.8039, "b": 10.1373}',
    ]);
  });

  it('a different config can produce the same model', () => {
    expect(printed(computeVersions({ rows, dropOverMinutes: 90 }))).toEqual([
      'data   8cef040fae78',
      'config 55266b1bb776',
      'run    b84d9b70e48d',
      'model  4e11ae29f6b4 {"w": 2.8039, "b": 10.1373}',
    ]);
    expect(printed(computeVersions({ rows, dropOverMinutes: null }))).toEqual([
      'data   8cef040fae78',
      'config de7a23b5bbc3',
      'run    a642da201058',
      'model  c658d87d4d74 {"w": 6.4371, "b": -6.1533}',
    ]);
  });

  it('editing one cell changes the data, run and model versions', () => {
    const edited = rows.map((r, i) => (i === 5 ? ([12, 44] as Row) : r));
    expect(printed(computeVersions({ rows: edited, dropOverMinutes: 60 }))).toEqual([
      'data   4222f97f30d0',
      'config 70c76fc9e04a',
      'run    51b511b74d6d',
      'model  b5a3b989ca51 {"w": 2.8192, "b": 10.0686}',
    ]);
  });

  it('fits the least-squares line by hand', () => {
    // (0,1), (1,3), (2,5): n=3, Σx=3, Σy=9, Σx²=5, Σxy=13 → w = (39−27)/(15−9) = 2, b = (9−6)/3 = 1
    expect(
      fitLine(
        [
          [0, 1],
          [1, 3],
          [2, 5],
        ],
        null,
      ),
    ).toEqual({ ok: true, w: 2, b: 1, kept: 3 });
    expect(
      fitLine(
        [
          [3, 10],
          [3, 20],
        ],
        null,
      ),
    ).toEqual({ ok: false, kept: 2 });
  });

  it('is a valid experiment, and the lineage marks what changed', () => {
    const def = versioningExperiment('v', { rows, dropOverMinutes: 60 });
    expect(validateExperiment(def)).toEqual([]);
    const r = def.compute({ rows, dropOverMinutes: 90 });
    expect(r.now.config).not.toBe(r.registered.config);
    expect(r.now.model).toBe(r.registered.model);
  });
});
