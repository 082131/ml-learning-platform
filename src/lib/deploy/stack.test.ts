import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { planStack, stackExperiment } from './stack';

describe('planStack', () => {
  it('8B chat model on a laptop: GGUF Q4_K_M with llama.cpp, 8.03e9 × 4.85 / 8 = 4.87 GB', () => {
    const r = planStack({ model: 'llm-8b', target: 'laptop' });
    expect(r.stages[1]!.tool).toContain('GGUF');
    expect(r.stages[2]!.tool).toContain('llama.cpp');
    expect(r.weightsGB).toBeCloseTo(4.868, 3);
    expect(r.fits).toBe(true);
  });
  it('70B does not fit a laptop even at 4 bits', () => {
    expect(planStack({ model: 'llm-70b', target: 'laptop' }).fits).toBe(false);
  });
  it('70B on one 80 GB GPU uses 4-bit weights with vLLM', () => {
    const r = planStack({ model: 'llm-70b', target: 'gpu-server' });
    expect(r.stages[1]!.tool).toContain('AWQ');
    expect(r.weightsGB).toBeCloseTo(37.48, 2);
    expect(r.fits).toBe(true);
  });
  it('a vision model on Kubernetes is ONNX behind Triton', () => {
    const r = planStack({ model: 'vision', target: 'k8s' });
    expect(r.stages[1]!.tool).toContain('ONNX');
    expect(r.stages[2]!.tool).toContain('Triton');
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(stackExperiment('s', { model: 'llm-8b', target: 'laptop' }))).toEqual([]);
  });
});
