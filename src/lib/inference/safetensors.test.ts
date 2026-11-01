import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import {
  checkCheckpoint,
  checkpointExperiment,
  INSPECT_SOURCE,
  inspectPrintout,
  layout,
  SAVE_SOURCE,
  saveSlots,
  type CheckpointState,
  type NpDtype,
  type Scenario,
} from './safetensors';

describe('layout', () => {
  it('orders tensors by dtype, then name, and pads the header to 8 bytes', () => {
    const l = layout([
      { name: 'w', dtype: 'F32', shape: [3] },
      { name: 'a', dtype: 'F16', shape: [2] },
      { name: 'b', dtype: 'I64', shape: [1] },
    ]);
    expect(l.entries.map((e) => [e.name, e.start, e.end])).toEqual([
      ['b', 0, 8],
      ['w', 8, 20],
      ['a', 20, 24],
    ]);
    expect(l.headerLen % 8).toBe(0);
    expect(l.fileBytes).toBe(8 + l.headerLen + 24);
  });
  it('matches a one-tensor header written by the library', () => {
    // safetensors 0.8: {"w":{"dtype":"F32","shape":[3],"data_offsets":[0,12]}} plus one space = 56 bytes
    const l = layout([{ name: 'w', dtype: 'F32', shape: [3] }]);
    expect(l.headerJson).toBe('{"w":{"dtype":"F32","shape":[3],"data_offsets":[0,12]}}');
    expect(l.headerLen).toBe(56);
  });
});

describe('checkCheckpoint', () => {
  it('finds prefixes, missing keys and shape mismatches', () => {
    expect(checkCheckpoint({ dtype: 'float32', scenario: 'match' }).ok).toBe(true);
    const p = checkCheckpoint({ dtype: 'float32', scenario: 'prefix' });
    expect(p.missing).toHaveLength(4);
    expect(p.unexpected).toContain('module.fc1.weight');
    expect(checkCheckpoint({ dtype: 'float32', scenario: 'resized' }).wrongShape).toEqual(['fc1.weight', 'fc1.bias', 'fc2.weight']);
    expect(checkCheckpoint({ dtype: 'float16', scenario: 'missing' }).missing).toEqual(['fc2.bias']);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(checkpointExperiment('c', { dtype: 'float32', scenario: 'match' }))).toEqual([]);
  });
});

const hasSafetensors = () => {
  try {
    execFileSync('python3', ['-c', 'import safetensors.numpy']);
    return true;
  } catch {
    return false;
  }
};

describe.skipIf(!hasSafetensors())('the layout and printout equal what safetensors writes', () => {
  const cases: CheckpointState[] = (['match', 'prefix', 'resized', 'missing'] as Scenario[]).flatMap((scenario) =>
    (['float32', 'float16', 'float64'] as NpDtype[]).map((dtype) => ({ scenario, dtype })),
  );
  it.each(cases.map((c) => [`${c.scenario} ${c.dtype}`, c] as const))('%s', (_, s) => {
    const dir = mkdtempSync(join(tmpdir(), 'st-'));
    execFileSync('python3', ['-c', fillSlots(SAVE_SOURCE, [], saveSlots(s)).source], { cwd: dir });
    const out = execFileSync('python3', ['-c', INSPECT_SOURCE], { cwd: dir, encoding: 'utf8' });
    const r = checkCheckpoint(s);
    expect(out.replace(/\n$/, '')).toBe(inspectPrintout(r).join('\n'));
    const header = execFileSync(
      'python3',
      ['-c', 'import struct;b=open("model.safetensors","rb").read();n=struct.unpack("<Q",b[:8])[0];print(len(b));print(b[8:8+n].decode().rstrip())'],
      { cwd: dir, encoding: 'utf8' },
    ).split('\n');
    expect(Number(header[0])).toBe(r.layout.fileBytes);
    expect(header[1]).toBe(r.layout.headerJson);
  });
});
