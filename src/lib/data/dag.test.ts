import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/dag-python.json';
import {
  DAG_SOURCE,
  dagDiagram,
  dagExperiment,
  dagPrintout,
  dagSlots,
  FAILABLE,
  RETRIES_MAX,
  runDag,
} from './dag';

describe('runDag', () => {
  it('works through a hand-checked retry: transform fails twice with 2 retries', () => {
    const r = runDag({ failing: 'transform', fails: 2, retries: 2 });
    const t = r.tasks.find((x) => x.name === 'transform')!;
    // Starts at 3. 3 + 3 = 6 fails, wait 1; 7 + 3 = 10 fails, wait 2; 12 + 3 = 15 succeeds.
    expect(t.attempts.map((a) => [a.start, a.end, a.ok, a.wait])).toEqual([
      [3, 6, false, 1],
      [7, 10, false, 2],
      [12, 15, true, 0],
    ]);
    expect(r.finishedAt).toBe(20);
  });

  it('marks everything downstream of a failure upstream_failed, but notify still runs', () => {
    const r = runDag({ failing: 'transform', fails: 2, retries: 1 });
    const state = Object.fromEntries(r.tasks.map((t) => [t.name, t.state]));
    expect(state).toMatchObject({
      transform: 'failed',
      load_warehouse: 'upstream_failed',
      report: 'upstream_failed',
      features: 'upstream_failed',
      notify: 'success',
    });
  });

  it('a failure in one branch does not stop the other branch', () => {
    const r = runDag({ failing: 'report', fails: 4, retries: 0 });
    expect(r.tasks.find((t) => t.name === 'features')!.state).toBe('success');
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const failing of ['none', ...FAILABLE])
      for (let fails = 1; fails <= 4; fails++)
        for (let retries = 0; retries <= RETRIES_MAX; retries++) {
          expect(dagPrintout(runDag({ failing, fails, retries }))).toBe(
            table[`${failing},${fails},${retries}`],
          );
          n++;
        }
    expect(n).toBe(128);
  });

  it('draws one node per task and one edge per dependency', () => {
    const { nodes, edges } = dagDiagram(runDag({ failing: 'none', fails: 1, retries: 0 }));
    expect(nodes).toHaveLength(8);
    expect(edges).toHaveLength(8);
    expect(nodes.every((n) => n.status === 'ok')).toBe(true);
  });
});

describe('dagExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = dagExperiment('dag');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(DAG_SOURCE, [], dagSlots(def.initial));
    expect(source).toContain('FAILING = "transform"');
    expect(source).toContain('RETRIES = 1\n');
  });

  it('embeds DAG_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/dag.py?raw')).default;
    expect(script).toContain(`SOURCE = """${DAG_SOURCE}"""`);
  });
});
