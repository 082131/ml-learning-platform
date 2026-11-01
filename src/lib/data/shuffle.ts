/**
 * The Spark lesson's model of one job: 24 orders read as 3 input partitions, then a narrow filter, a group-by
 * sum (with partial sums before the shuffle), a shuffle join, or a broadcast join. Keys are assigned to
 * shuffle partitions with CRC-32 modulo N (Spark uses Murmur3; any stable hash behaves the same way). Time
 * is a model: each record costs one unit and each stage waits for its slowest task. shuffle.test.ts checks
 * every setting against SHUFFLE_SOURCE run with CPython 3.13.
 */
import type { ExperimentDef } from '../types';

export type SparkOp = 'filter' | 'sum' | 'join' | 'broadcast';

export interface ShuffleState {
  op: SparkOp;
  partitions: number;
  skew: boolean;
}

export const PARTITIONS_MIN = 2;
export const PARTITIONS_MAX = 6;
export const INPUTS = 3;
export const ORDER_COUNT = 24;

export interface OrderRec {
  key: string;
  amount: number;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** CRC-32 of an ASCII string, as Python's zlib.crc32(s.encode()). */
export function crc32(text: string): number {
  let c = 0xffffffff;
  for (let i = 0; i < text.length; i++) c = CRC_TABLE[(c ^ text.charCodeAt(i)) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export const customer = (i: number, skew: boolean) =>
  skew ? (i % 12 < 7 ? 'C1' : `C${(i % 12) - 5}`) : `C${(i % 6) + 1}`;

export function makeOrders(skew: boolean): OrderRec[] {
  return Array.from({ length: ORDER_COUNT }, (_, i) => ({
    key: customer(i, skew),
    amount: ((i * 7) % 50) + 5,
  }));
}

export interface ShuffleResult {
  inputs: OrderRec[][];
  /** Records kept per input task (filter only). */
  kept: number[] | null;
  /** What crosses the shuffle: orders (join) or partial sums (sum); empty for narrow operations. */
  moved: OrderRec[];
  /** Records in each shuffle partition, or null when there is no shuffle. */
  outputs: OrderRec[][] | null;
  /** Records each task reads, per stage. */
  stages: number[][];
  time: number;
}

export function runShuffle({ op, partitions: n, skew }: ShuffleState): ShuffleResult {
  const orders = makeOrders(skew);
  const inputs = Array.from({ length: INPUTS }, (_, p) => orders.slice(p * 8, (p + 1) * 8));
  const stage1 = inputs.map((p) => p.length);
  if (op === 'filter' || op === 'broadcast') {
    const kept = op === 'filter' ? inputs.map((p) => p.filter((r) => r.amount >= 20).length) : null;
    return { inputs, kept, moved: [], outputs: null, stages: [stage1], time: Math.max(...stage1) };
  }
  const moved: OrderRec[] = [];
  for (const part of inputs) {
    if (op === 'sum') {
      const acc = new Map<string, number>();
      for (const r of part) acc.set(r.key, (acc.get(r.key) ?? 0) + r.amount);
      for (const [key, amount] of acc) moved.push({ key, amount });
    } else moved.push(...part);
  }
  const outputs: OrderRec[][] = Array.from({ length: n }, () => []);
  for (const r of moved) outputs[crc32(r.key) % n]!.push(r);
  const stage2 = outputs.map((p) => p.length);
  return {
    inputs,
    kept: null,
    moved,
    outputs,
    stages: [stage1, stage2],
    time: Math.max(...stage1) + Math.max(...stage2),
  };
}

const list = (xs: number[]) => `[${xs.join(', ')}]`;

/** What SHUFFLE_SOURCE prints. */
export function shufflePrintout(s: ShuffleState, r: ShuffleResult): string {
  const lines = [`stage 1: ${INPUTS} tasks read ${list(r.stages[0]!)} records`];
  if (s.op === 'filter') lines.push(`kept per task: ${list(r.kept!)}`);
  else if (s.op === 'broadcast')
    lines.push('each task joins against its own copy of customers (6 rows); nothing moves');
  else {
    lines.push(`shuffle: ${r.moved.length} records to ${s.partitions} partitions`);
    lines.push(`stage 2: ${s.partitions} tasks read ${list(r.stages[1]!)} records`);
  }
  const maxes = r.stages.map((st) => Math.max(...st));
  lines.push(`time: ${maxes.join(' + ')} = ${r.time} units (each stage waits for its slowest task)`);
  return lines.join('\n');
}

export const SHUFFLE_SOURCE = `import zlib

OP = "{{op}}"  # filter, sum, join or broadcast
N = {{partitions}}  # shuffle partitions (spark.sql.shuffle.partitions)
SKEW = {{skew}}  # True: customer C1 places 14 of the 24 orders


def customer(i):
    if SKEW:
        return "C1" if i % 12 < 7 else f"C{i % 12 - 5}"
    return f"C{i % 6 + 1}"


orders = [(customer(i), (i * 7) % 50 + 5) for i in range(24)]
inputs = [orders[p * 8:(p + 1) * 8] for p in range(3)]  # 3 files, read as 3 partitions


def target(key):  # which shuffle partition a key goes to
    return zlib.crc32(key.encode()) % N


stage1 = [len(part) for part in inputs]
print(f"stage 1: {len(inputs)} tasks read {stage1} records")
if OP == "filter":  # narrow: every task works on its own partition; nothing moves
    print("kept per task:", [sum(1 for _, amount in part if amount >= 20) for part in inputs])
    stages = [stage1]
elif OP == "broadcast":  # the small customers table is copied to every task instead
    print("each task joins against its own copy of customers (6 rows); nothing moves")
    stages = [stage1]
else:
    moved = []
    for part in inputs:
        if OP == "sum":  # partial sums inside each task before the shuffle
            acc = {}
            for key, amount in part:
                acc[key] = acc.get(key, 0) + amount
            moved += acc.items()
        else:  # join: every order moves to its customer's partition
            moved += part
    outputs = [[] for _ in range(N)]
    for key, value in moved:
        outputs[target(key)].append((key, value))
    stage2 = [len(p) for p in outputs]
    print(f"shuffle: {len(moved)} records to {N} partitions")
    print(f"stage 2: {N} tasks read {stage2} records")
    stages = [stage1, stage2]
print("time:", " + ".join(str(max(s)) for s in stages), "=", sum(max(s) for s in stages),
      "units (each stage waits for its slowest task)")`;

export const shuffleSlots = (s: ShuffleState) => ({
  op: s.op,
  partitions: String(s.partitions),
  skew: s.skew ? 'True' : 'False',
});

export function shuffleExperiment(id: string): ExperimentDef<ShuffleState, ShuffleResult> {
  return {
    id,
    initial: { op: 'join', partitions: 4, skew: false },
    controls: [
      {
        kind: 'select',
        id: 'op',
        label: 'Operation',
        options: [
          { value: 'filter', label: 'filter (narrow)' },
          { value: 'sum', label: 'group-by sum' },
          { value: 'join', label: 'shuffle join' },
          { value: 'broadcast', label: 'broadcast join' },
        ],
        get: (s) => s.op,
        set: (s, v) => ({ ...s, op: v as SparkOp }),
      },
      {
        kind: 'slider',
        id: 'partitions',
        label: 'Shuffle partitions',
        min: PARTITIONS_MIN,
        max: PARTITIONS_MAX,
        get: (s) => s.partitions,
        set: (s, v) => ({ ...s, partitions: v }),
      },
      {
        kind: 'select',
        id: 'skew',
        label: 'Keys',
        options: [
          { value: 'off', label: 'Even (4 orders each)' },
          { value: 'on', label: 'Skewed (C1 has 14)' },
        ],
        get: (s) => (s.skew ? 'on' : 'off'),
        set: (s, v) => ({ ...s, skew: v === 'on' }),
      },
    ],
    compute: runShuffle,
    readout: (s, r) => [
      { label: 'Python: what shuffle.py prints', value: shufflePrintout(s, r) },
      {
        label: 'Records moved between machines',
        value: r.moved.length ? `${r.moved.length} (a shuffle)` : '0 (no shuffle)',
      },
    ],
  };
}
