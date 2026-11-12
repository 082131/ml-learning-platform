import type { ExperimentDef, ReadoutItem } from '../types';
import { FP16, encode } from '../inference/floatBits';

/**
 * GGUF block quantization (Q8_0 and Q4_0) of 64 weights, in two blocks of 32, following ggml's reference
 * quantizers: Q8_0 uses d = max|x| / 127 and q = roundf(x / d); Q4_0 uses d = m / -8, where m is the weight with
 * the largest magnitude (sign kept), and q = min(15, trunc(x / d + 8.5)), stored as q − 8. The scale d is stored
 * as float16. 'int4-tensor' applies the Q4_0 rule with one scale for all 64 weights, for comparison.
 * QUANT_SOURCE is the same algorithm in plain Python, checked against CPython in blockQuant.test.ts; on these
 * weights, read as float32 as a model stores them, it gives exactly the values of gguf 0.19.0's NumPy
 * quantizers (gguf.quants); see quant_check.py in the lesson folder.
 */
export const WEIGHTS = [
  0.0, 0.006, -0.0055, -0.0178, -0.0091, -0.0198, 0.0012, 0.0268, -0.0098, -0.0124, 0.0098, 0.0071, 0.0021, -0.0186,
  -0.0006, 0.0139, -0.0269, -0.0092, -0.038, -0.0258, -0.0368, -0.0047, -0.0253, 0.0054, 0.0031, -0.0037, -0.0503,
  -0.0108, -0.001, 0.0023, -0.0306, -0.0096, -0.0196, -0.0162, 0.0212, -0.0162, -0.0007, 0.0177, -0.0117, -0.0022,
  0.0022, 0.0013, -0.0245, 0.0015, 0.0272, -0.0309, 0.0172, 0.0024, -0.0128, 0.04, 0.0152, -0.024, 0.0015, 0.0115,
  -0.0038, 0.0137, -0.0013, 0.0133, 0.0288, -0.0135, 0.0041, -0.0093, 0.0025, -0.0237,
];
export const OUTLIER_INDEX = 37;
export const OUTLIER = 0.31;

export type QuantFormat = 'Q8_0' | 'Q4_0' | 'INT4_TENSOR';
export interface QuantState {
  format: QuantFormat;
  outlier: 'on' | 'off';
}
export interface QuantBlock {
  d: number;
  q: number[];
  maxErr: number;
}
export interface QuantResult {
  weights: number[];
  deq: number[];
  err: number[];
  blocks: QuantBlock[];
  rmse: number;
  bpw: number;
}

export const fp16 = (x: number) => encode(x, FP16).value;
/** C's roundf: halves away from zero. */
export const roundAway = (v: number) => (v >= 0 ? Math.trunc(v + 0.5) : -Math.trunc(-v + 0.5));

export function weightsFor(s: QuantState): number[] {
  return WEIGHTS.map((w, i) => (s.outlier === 'on' && i === OUTLIER_INDEX ? OUTLIER : w));
}

export function quantizeBlock(block: number[], fmt: 'Q8_0' | 'Q4_0'): { d: number; q: number[]; deq: number[] } {
  if (fmt === 'Q8_0') {
    const d = Math.max(...block.map(Math.abs)) / 127;
    const q = block.map((x) => (d ? roundAway(x / d) : 0));
    const d16 = fp16(d);
    return { d: d16, q, deq: q.map((v) => v * d16) };
  }
  let m = 0;
  for (const x of block) if (Math.abs(x) > Math.abs(m)) m = x;
  const d = m / -8;
  const q = block.map((x) => (d ? Math.min(15, Math.trunc(x / d + 8.5)) : 8));
  const d16 = fp16(d);
  return { d: d16, q, deq: q.map((v) => (v - 8) * d16) };
}

export function runQuant(s: QuantState): QuantResult {
  const weights = weightsFor(s);
  const size = s.format === 'INT4_TENSOR' ? 64 : 32;
  const fmt = s.format === 'Q8_0' ? 'Q8_0' : 'Q4_0';
  const deq: number[] = [];
  const blocks: QuantBlock[] = [];
  for (let i = 0; i < weights.length; i += size) {
    const block = weights.slice(i, i + size);
    const r = quantizeBlock(block, fmt);
    deq.push(...r.deq);
    blocks.push({ d: r.d, q: r.q, maxErr: Math.max(...block.map((x, k) => Math.abs(r.deq[k]! - x))) });
  }
  const err = deq.map((v, i) => v - weights[i]!);
  const rmse = Math.sqrt(err.reduce((a, e) => a + e * e, 0) / err.length);
  const bits = fmt === 'Q8_0' ? 8 : 4;
  return { weights, deq, err, blocks, rmse, bpw: (size * bits + 16) / size };
}

export const QUANT_SOURCE = `import math
import struct

w = ${'{{weights}}'}                                        # 64 weights (see the experiment)
FORMAT, BLOCK = "{{format}}", {{block}}


def fp16(x):                                       # the scale is stored as a 16-bit float
    return struct.unpack("e", struct.pack("e", x))[0]


def quantize(block):
    if FORMAT == "Q8_0":                           # 8-bit: q in -127..127
        d = max(abs(x) for x in block) / 127
        q = [math.floor(x / d + 0.5) if x >= 0 else -math.floor(-x / d + 0.5) for x in block]
        return fp16(d), q, [v * fp16(d) for v in q]
    m = max(block, key=abs)                        # 4-bit: largest magnitude, sign kept
    d = m / -8                                     # so m maps to q = 0, i.e. -8 after the offset
    q = [min(15, int(x / d + 8.5)) for x in block] # stored as 0..15, meaning q - 8
    return fp16(d), q, [(v - 8) * fp16(d) for v in q]


errors = []
for start in range(0, len(w), BLOCK):
    block = w[start:start + BLOCK]
    d, q, deq = quantize(block)
    err = [a - b for a, b in zip(deq, block)]
    errors += err
    print(f"block {start // BLOCK}: d = {d:.7f}  max |error| {max(abs(e) for e in err):.6f}")
rmse = math.sqrt(sum(e * e for e in errors) / len(errors))
bits = 8 if FORMAT == "Q8_0" else 4
print(f"RMSE {rmse:.6f}, {(BLOCK * bits + 16) / BLOCK} bits per weight")`;

/** Python's repr of a float list, as the weights slot. */
export const pyList = (xs: number[]) => `[${xs.map((x) => (Number.isInteger(x) ? `${x}.0` : String(x))).join(', ')}]`;

export const quantSlots = (s: QuantState): Record<string, string> => ({
  weights: pyList(weightsFor(s)),
  format: s.format === 'Q8_0' ? 'Q8_0' : 'Q4_0',
  block: s.format === 'INT4_TENSOR' ? '64' : '32',
});

/** Python's repr of a float, as f"{x}" prints it (shortest round-trip). */
const pyRepr = (x: number) => (Number.isInteger(x) ? `${x}.0` : String(x));

export function quantPrintout(r: QuantResult): string[] {
  return [
    ...r.blocks.map((b, i) => `block ${i}: d = ${b.d.toFixed(7)}  max |error| ${b.maxErr.toFixed(6)}`),
    `RMSE ${r.rmse.toFixed(6)}, ${pyRepr(r.bpw)} bits per weight`,
  ];
}

export function quantReadout(_s: QuantState, r: QuantResult): ReadoutItem[] {
  return [
    { label: 'What the code prints', value: quantPrintout(r).join('\n') },
    { label: 'Bits per weight', value: `${pyRepr(r.bpw)} (data plus one 16-bit scale per block)` },
  ];
}

export function blockQuantExperiment(id: string, initial: QuantState): ExperimentDef<QuantState, QuantResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'format',
        label: 'Format',
        options: [
          { value: 'Q8_0', label: 'Q8_0 (8-bit, blocks of 32)' },
          { value: 'Q4_0', label: 'Q4_0 (4-bit, blocks of 32)' },
          { value: 'INT4_TENSOR', label: '4-bit, one scale for all 64' },
        ],
        get: (s) => s.format,
        set: (s, v) => ({ ...s, format: v as QuantFormat }),
      },
      {
        kind: 'select',
        id: 'outlier',
        label: `Outlier: weight ${OUTLIER_INDEX} = ${OUTLIER}`,
        options: [
          { value: 'off', label: 'off' },
          { value: 'on', label: 'on' },
        ],
        get: (s) => s.outlier,
        set: (s, v) => ({ ...s, outlier: v as QuantState['outlier'] }),
      },
    ],
    compute: runQuant,
    readout: quantReadout,
  };
}
