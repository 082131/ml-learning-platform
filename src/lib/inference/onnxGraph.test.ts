import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { intermediateBytes, LEVELS, onnxExperiment, runOnnx } from './onnxGraph';

describe('runOnnx', () => {
  it('counts intermediate traffic by hand', () => {
    // disabled: per row 64 + 16 + 16 + 16 + 10 + 10 = 132 values, plus the two transposed weights (1,184 values)
    expect(intermediateBytes(LEVELS.disabled.nodes, 1)).toBe(8 * (132 + 1184));
    // extended: x (64), h (16), logits (10) per row
    expect(intermediateBytes(LEVELS.extended.nodes, 10)).toBe(8 * 90 * 10);
    expect(runOnnx({ level: 'basic', batch: 1 }).kernels).toBe(5);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(onnxExperiment('o', { level: 'disabled', batch: 1 }))).toEqual([]);
  });
});

const hasOrt = () => {
  try {
    execFileSync('python3', ['-c', 'import onnx, onnxruntime, numpy']);
    return true;
  } catch {
    return false;
  }
};

describe.skipIf(!hasOrt())('the node lists are what ONNX Runtime produces', () => {
  it('matches optimize.py', () => {
    const script = resolve(__dirname, '../../../content/tracks/inference/runtimes/onnx-serving/optimize.py');
    const out = execFileSync('python3', [script], { cwd: mkdtempSync(join(tmpdir(), 'ort-')), encoding: 'utf8' });
    for (const [name, level] of Object.entries(LEVELS)) {
      const line = out.split('\n').find((l) => l.startsWith(name))!;
      expect(line).toContain(`${level.nodes.length} nodes: ${level.nodes.map((nd) => nd.op).join(' -> ')}`);
    }
    expect(out).toContain('same predictions: True');
  }, 60_000);
});
