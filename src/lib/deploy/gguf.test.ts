import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from '../inference/testPython';
import { DEMO_FIELDS, DEMO_HEX, GGUF_SOURCE, ggufExperiment, ggufPrintout } from './gguf';

describe('parseGguf on demo.gguf', () => {
  it('matches what gguf.GGUFReader reported: version 3, 2 tensors, 3 keys, data at 256 and 288', () => {
    const v = Object.fromEntries(DEMO_FIELDS.map((f) => [f.id, f]));
    expect(DEMO_HEX.length).toBe(352 * 2);
    expect(v.version!.value).toBe('3');
    expect(v.tensor_count!.value).toBe('2');
    expect(v.kv_count!.value).toBe('3');
    expect(v['kv-0']!.value).toBe("string 'demo'");
    expect(v['kv-2']!.label).toBe('kv demo.block_count');
    expect(v['info-1']!.value).toBe('Q8_0 dims [32, 1] offset 32');
    expect(v['data-0']!.start).toBe(256);
    expect(v['data-1']).toMatchObject({ start: 288, end: 322, value: '34 bytes' });
  });
  it('fields tile the file without gaps up to the last tensor', () => {
    for (let i = 1; i < 9; i++) expect(DEMO_FIELDS[i]!.start).toBe(DEMO_FIELDS[i - 1]!.end);
  });
  it('is a valid experiment', () => {
    expect(validateExperiment(ggufExperiment('g', { part: 'magic' }))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('against CPython', () => {
  it('the printout equals what the lesson code prints', () => {
    const code = fillSlots(GGUF_SOURCE, [], { hex: DEMO_HEX }).source;
    expect(runPython(code)).toBe(ggufPrintout().join('\n'));
  });
});
