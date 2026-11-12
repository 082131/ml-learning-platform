import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import {
  SCHED_SOURCE,
  fitError,
  schedPrintout,
  schedSlots,
  schedule,
  schedulerExperiment,
  type SchedState,
} from './scheduler';

const base: SchedState = { replicas: 3, cpu: 1500, memGi: 2, gpu: 0, taint: 'on' };

describe('schedule', () => {
  it('spreads three 1.5-CPU pods: cpu-a, cpu-b, then cpu-a is fuller so cpu-b scores higher', () => {
    const r = schedule(base);
    // cpu-a: (4000-1500)*100//4000 = 62, (16-2)*100//16 = 87 -> (62+87)//2 = 74.5 -> 74
    expect(r.placements[0]).toMatchObject({ node: 'cpu-a', score: 74 });
    expect(r.placements[1]).toMatchObject({ node: 'cpu-b', score: 74 });
    // after one pod each: (4000-3000)*100//4000 = 25, (16-4)*100//16 = 75 -> 50
    expect(r.placements[2]).toMatchObject({ node: 'cpu-a', score: 50 });
    expect(r.pending).toBe(0);
  });
  it('the tainted GPU node takes no CPU pods, so the fifth pod of 1.5 CPU is Pending', () => {
    const r = schedule({ ...base, replicas: 5 });
    expect(r.placements[4]!.message).toBe(
      '0/3 nodes are available: 1 node(s) had untolerated taint {nvidia.com/gpu: present}, 2 Insufficient cpu.',
    );
  });
  it('without the taint the GPU node absorbs CPU pods', () => {
    expect(schedule({ ...base, replicas: 5, taint: 'off' }).pending).toBe(0);
  });
  it('a second GPU pod finds no GPU, and the CPU nodes report it too', () => {
    const r = schedule({ ...base, replicas: 2, gpu: 1, cpu: 2000, memGi: 8 });
    expect(r.placements[0]!.node).toBe('gpu-a');
    expect(r.placements[1]!.message).toBe('0/3 nodes are available: 3 Insufficient nvidia.com/gpu.');
  });
  it('formats several reasons per node the way kube-scheduler does', () => {
    expect(fitError([['Insufficient cpu', 'Insufficient nvidia.com/gpu']])).toBe(
      '0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient nvidia.com/gpu.',
    );
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(schedulerExperiment('s', base))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  const cases: SchedState[] = [
    base,
    { ...base, replicas: 5 },
    { ...base, replicas: 8, taint: 'off', cpu: 1000, memGi: 6 },
    { ...base, replicas: 2, gpu: 1, cpu: 2000, memGi: 8 },
    { ...base, replicas: 4, memGi: 20, taint: 'off' },
    { replicas: 6, cpu: 250, memGi: 1, gpu: 0, taint: 'on' },
    { replicas: 3, cpu: 4000, memGi: 24, gpu: 1, taint: 'off' },
  ];
  it('the printout equals what the lesson code prints', () => {
    const code = cases
      .map((s) => `exec(${JSON.stringify(fillSlots(SCHED_SOURCE, [], schedSlots(s)).source)}, {})`)
      .join('\nprint("--")\n');
    expect(runPython(code)).toBe(cases.map((s) => schedPrintout(schedule(s)).join('\n')).join('\n--\n'));
  });
});
