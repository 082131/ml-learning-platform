import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import python from './fixtures/shuffle-python.json';
import {
  crc32,
  makeOrders,
  PARTITIONS_MAX,
  PARTITIONS_MIN,
  runShuffle,
  SHUFFLE_SOURCE,
  shuffleExperiment,
  shufflePrintout,
  shuffleSlots,
  type SparkOp,
} from './shuffle';

describe('crc32', () => {
  it('matches zlib.crc32', () => {
    // python3 -c "import zlib; print(zlib.crc32(b'C1'), zlib.crc32(b'hello'))"
    expect(crc32('hello')).toBe(907060870);
    expect(crc32('C1') % 4).toBe(3);
  });
});

describe('runShuffle', () => {
  it('a skewed join puts the hot key’s 14 orders in one task', () => {
    const r = runShuffle({ op: 'join', partitions: 4, skew: true });
    expect(makeOrders(true).filter((o) => o.key === 'C1')).toHaveLength(14);
    // C1 hashes to partition 3, which also gets C2's 2 orders: 14 + 2 = 16.
    expect(r.stages[1]).toEqual([4, 2, 2, 16]);
    expect(r.time).toBe(8 + 16);
  });

  it('partial sums shrink the shuffle: one record per key per input partition', () => {
    const r = runShuffle({ op: 'sum', partitions: 4, skew: false });
    // Each 8-record input partition holds all 6 customers: 3 × 6 = 18 partial sums.
    expect(r.moved).toHaveLength(18);
  });

  it('narrow operations and broadcast joins move nothing', () => {
    for (const op of ['filter', 'broadcast'] as SparkOp[]) {
      const r = runShuffle({ op, partitions: 4, skew: true });
      expect(r.moved).toHaveLength(0);
      expect(r.time).toBe(8);
    }
  });

  it('prints exactly what the lesson’s Python prints, for every setting', () => {
    const table = python as Record<string, string>;
    let n = 0;
    for (const op of ['filter', 'sum', 'join', 'broadcast'] as SparkOp[])
      for (let partitions = PARTITIONS_MIN; partitions <= PARTITIONS_MAX; partitions++)
        for (const skew of [false, true]) {
          const s = { op, partitions, skew };
          expect(shufflePrintout(s, runShuffle(s))).toBe(
            table[`${op},${partitions},${skew ? 'True' : 'False'}`],
          );
          n++;
        }
    expect(n).toBe(40);
  });
});

describe('shuffleExperiment', () => {
  it('is valid, and the slots fill the Python source', () => {
    const def = shuffleExperiment('shuffle');
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(SHUFFLE_SOURCE, [], shuffleSlots(def.initial));
    expect(source).toContain('OP = "join"');
    expect(source).toContain('SKEW = False ');
  });

  it('embeds SHUFFLE_SOURCE verbatim in the fixture script', async () => {
    const script = (await import('./fixtures/shuffle.py?raw')).default;
    expect(script).toContain(`SOURCE = """${SHUFFLE_SOURCE}"""`);
  });
});
