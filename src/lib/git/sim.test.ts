import { describe, expect, it } from 'vitest';
import { hashBlob } from './sha1';
import { hasGit, replayInGit } from './realGit';
import { SCENARIOS, scenarioScript } from './scenarios';
import { headId, runScript, type Repo } from './sim';

function simRefs(r: Repo): Record<string, string> {
  const refs: Record<string, string> = {};
  for (const [b, id] of Object.entries(r.branches)) refs[`refs/heads/${b}`] = id;
  for (const [b, id] of Object.entries(r.tracking)) refs[`refs/remotes/origin/${b}`] = id;
  for (const [t, tag] of Object.entries(r.tags)) refs[`refs/tags/${t}`] = tag.object ?? tag.target;
  if (r.stash[0]) refs['refs/stash'] = r.stash[0];
  return refs;
}

const compared = (cmd: string) => /^(git log|git reflog|cat |git rev-parse|git cat-file|git hash-object|git branch$|git tag$|git stash list)/.test(cmd);

function check(lines: string[]) {
  const sim = runScript(lines);
  const real = replayInGit(lines);
  expect(simRefs(sim.repo)).toEqual(real.refs);
  expect(headId(sim.repo) ?? '').toBe(real.head);
  expect(sim.repo.work).toEqual(real.work);
  expect(Object.fromEntries(Object.entries(sim.repo.index).map(([p, c]) => [p, hashBlob(c)]))).toEqual(real.index);
  lines.forEach((line, i) => {
    expect({ line, ok: sim.outputs[i]!.ok }).toEqual({ line, ok: real.outputs[i]!.ok });
    if (compared(line)) expect({ line, out: sim.outputs[i]!.output }).toEqual({ line, out: real.outputs[i]!.output });
  });
}

describe('sandbox basics', () => {
  it('hashes the first commit and refuses empty commits', () => {
    const r = runScript(['echo "hi" > a.txt', 'git commit -m "x"', 'git add a.txt', 'git commit -m "First"']);
    expect(r.outputs.map((o) => o.ok)).toEqual([true, false, true, true]);
    expect(r.outputs[3]!.output).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] First$/);
  });
  it('failed commands leave the repository unchanged', () => {
    const r = runScript(['git switch nope']);
    expect(r.outputs[0]!.ok).toBe(false);
    expect(r.repo.branches).toEqual({});
  });
});

describe.skipIf(!hasGit())('the sandbox matches real Git', () => {
  for (const s of Object.values(SCENARIOS)) {
    it(`${s.id}: setup and guided path`, () => check(scenarioScript(s)));
    (s.extra ?? []).forEach((extra, i) => it(`${s.id}: extra script ${i + 1}`, () => check([...s.setup, ...extra])));
  }
});
