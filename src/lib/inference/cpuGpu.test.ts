import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { CPU_GPU_SOURCE, cpuGpuExperiment, cpuGpuPrintout, cpuGpuSlots, timeCpuGpu, type CpuGpuState } from './cpuGpu';
import { hasPython, runPython } from './testPython';

const base: CpuGpuState = { width: 4096, layers: 8, batch: 1, cpu: 'laptop', gpu: 'l4', transfer: 'yes' };

describe('timeCpuGpu', () => {
  it('is memory-bound at batch 1: time ≈ weight bytes / bandwidth', () => {
    const r = timeCpuGpu(base);
    // one layer: 4 · (4096² + 2 · 4096) = 67,141,632 bytes at 0.8 · 89.6 GB/s
    expect(r.bytes).toBe(8 * 67_141_632);
    expect(r.cpu.memoryBound).toBe(true);
    expect(r.cpu.total).toBeCloseTo(8 * (67_141_632 / (0.8 * 89.6e9) + 2e-6), 12);
  });
  it('adds two copies for the GPU only when asked', () => {
    const a = timeCpuGpu(base);
    const b = timeCpuGpu({ ...base, transfer: 'no' });
    expect(b.gpu.transfer).toBe(0);
    // 2 · 4 · 1 · 4096 bytes over 0.8 · 31.5 GB/s, plus two 5 µs launches
    expect(a.gpu.transfer).toBeCloseTo((2 * 4 * 4096) / (0.8 * 31.5e9) + 10e-6, 15);
  });
  it('finds a crossover for a small layer and none when the GPU always wins', () => {
    const small = timeCpuGpu({ ...base, width: 128, layers: 2 });
    expect(small.crossover === null || small.crossover > 1).toBe(true);
    expect(timeCpuGpu({ ...base, gpu: 'h100' }).crossover).toBe(1);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(cpuGpuExperiment('c', base))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('the printout equals what CPython prints', () => {
  const cases: CpuGpuState[] = [
    base,
    { ...base, transfer: 'no', gpu: 'a100', cpu: 'server', batch: 64 },
    { width: 128, layers: 2, batch: 3, cpu: 'laptop', gpu: 't4', transfer: 'yes' },
    { width: 8192, layers: 48, batch: 256, cpu: 'server', gpu: 'h100', transfer: 'yes' },
  ];
  it.each(cases.map((c) => [`${c.width}x${c.layers} b${c.batch} ${c.cpu} ${c.gpu} ${c.transfer}`, c] as const))(
    '%s',
    (_, s) => {
      const code = fillSlots(CPU_GPU_SOURCE, [], cpuGpuSlots(s)).source;
      expect(runPython(code)).toBe(cpuGpuPrintout(timeCpuGpu(s)).join('\n'));
    },
  );
});
