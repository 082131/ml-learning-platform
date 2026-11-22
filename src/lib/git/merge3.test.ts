import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diffLines, merge3 } from './merge3';
import { MERGE_BASE, MERGE_PRESETS } from './mergeLab';
import { hasGit } from './realGit';

const L = (...xs: string[]) => xs.map((x) => `${x}\n`).join('');
const CASES: [string, string, string][] = [
  [L('a', 'b', 'c', 'd'), L('A', 'b', 'c', 'd'), L('a', 'b', 'C', 'd')],
  [L('a', 'b', 'c', 'd'), L('A', 'b', 'c', 'd'), L('a', 'B', 'c', 'd')],
  [L('a', 'b', 'c', 'd'), L('a', 'X', 'b', 'c', 'd'), L('a', 'b', 'Y', 'c', 'd')],
  [L('a', 'b', 'c', 'd'), L('a', 'b', 'c', 'd', 'E'), L('a', 'b', 'c', 'd', 'F')],
  [L('a', 'b', 'c', 'd'), L('a', 'b1', 'c1', 'd'), L('a', 'b1', 'c2', 'd')],
  [L('model: logistic', 'lr: 0.01', 'epochs: 10'), L('model: logistic', 'lr: 0.02', 'epochs: 10'), L('model: logistic', 'lr: 0.003', 'epochs: 10')],
  [L('x'), L('x', 'y'), L('x', 'y')],
  ['', L('new'), L('other')],
  ...Object.values(MERGE_PRESETS).map((p): [string, string, string] => [p.base ?? MERGE_BASE, p.ours, p.theirs]),
];

describe('merge3', () => {
  it('diffLines finds the changed region', () => {
    expect(diffLines(['a', 'b', 'c'], ['a', 'B', 'c'])).toEqual([{ bStart: 1, bEnd: 2, sStart: 1, sEnd: 2 }]);
  });
  it('merges separate changes and conflicts on the same line', () => {
    expect(merge3(CASES[0]![0], CASES[0]![1], CASES[0]![2])).toEqual({ text: L('A', 'b', 'C', 'd'), conflicts: 0 });
    expect(merge3(CASES[5]![0], CASES[5]![1], CASES[5]![2], 'HEAD', 'tune-lr').text).toBe(
      L('model: logistic', '<<<<<<< HEAD', 'lr: 0.02', '=======', 'lr: 0.003', '>>>>>>> tune-lr', 'epochs: 10'),
    );
  });
});

describe.skipIf(!hasGit())('merge3 against git merge-file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merge3-'));
  CASES.forEach(([b, o, t], i) =>
    it(`case ${i + 1}`, () => {
      writeFileSync(join(dir, 'o'), o);
      writeFileSync(join(dir, 'b'), b);
      writeFileSync(join(dir, 't'), t);
      const r = spawnSync('git', ['merge-file', '-p', '-L', 'HEAD', '-L', 'base', '-L', 'theirs', 'o', 'b', 't'], { cwd: dir, encoding: 'utf8' });
      const m = merge3(b, o, t, 'HEAD', 'theirs');
      expect(m.text).toBe(r.stdout);
      expect(m.conflicts).toBe(r.status);
    }),
  );
});
