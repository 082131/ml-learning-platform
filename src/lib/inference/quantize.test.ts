import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import model from '../../../content/tracks/inference/precision/precision-quantization/digits_mlp.json';
import { countCorrect, type DigitsModel } from './digitsModel';
import { BF16, encode, encodeInt8, FP16, FP32, formatRange, roundHalfEven, toHex } from './floatBits';
import {
  pyExp,
  QUANT_SOURCE,
  quantizationExperiment,
  quantPrintout,
  quantSlots,
  runQuantization,
  type QuantState,
} from './quantExperiment';
import { errorStats, histogram, quantizeMatrix, quantParams, quantizeValue } from './quantize';
import { hasPython } from './testPython';

const digits = model as DigitsModel;
const LESSON_DIR = 'content/tracks/inference/precision/precision-quantization';

describe('floating-point layouts', () => {
  it('rounds 0.1 into FP32, FP16 and BF16 with the known bit patterns', () => {
    const f32 = encode(0.1, FP32);
    expect(toHex(f32, FP32)).toBe('3dcccccd');
    expect(f32.value).toBe(Math.fround(0.1)); // 0.100000001490116…
    expect(toHex(encode(f32.value, FP16), FP16)).toBe('2e66');
    expect(encode(f32.value, FP16).value).toBe(0.0999755859375);
    // FP32 3dcc|cccd: the low half 0xcccd is above 0x8000, so BF16 rounds up to 3dcd.
    expect(toHex(encode(f32.value, BF16), BF16)).toBe('3dcd');
    expect(encode(f32.value, BF16).value).toBe(0.10009765625);
  });

  it('knows the ranges: FP16 tops out at 65504, BF16 keeps FP32’s exponent range', () => {
    expect(formatRange(FP16)).toEqual({ max: 65504, minNormal: 2 ** -14, epsilon: 2 ** -10 });
    expect(formatRange(BF16).minNormal).toBe(formatRange(FP32).minNormal);
    expect(encode(70000, FP16).kind).toBe('infinity');
    expect(encode(65519, FP16).value).toBe(65504); // below the halfway point to 65536
    expect(encode(65520, FP16).kind).toBe('infinity'); // the tie rounds to the even pattern, infinity
    expect(encode(70000, BF16).value).toBe(70144);
    expect(encode(2 ** -24, FP16).kind).toBe('subnormal');
    expect(encode(2 ** -26, FP16).kind).toBe('zero');
  });

  it('rounds half to even like NumPy', () => {
    expect([0.5, 1.5, 2.5, -0.5, -1.5, -2.5, 2.4].map(roundHalfEven)).toEqual([0, 2, 2, -0, -2, -2, 2]);
  });

  it('stores INT8 in two’s complement and clips at −128 and 127', () => {
    expect(encodeInt8(-1.27, 0.01)).toMatchObject({ q: -127, bits: '10000001', clipped: false });
    expect(encodeInt8(2, 0.01)).toMatchObject({ q: 127, clipped: true });
  });
});

describe('quantization', () => {
  // Hand-worked: w = [0.42, −1.27, 0.08, 0.9, −0.33], 8-bit symmetric: scale = 1.27 / 127 = 0.01.
  const w = [0.42, -1.27, 0.08, 0.9, -0.33];
  it('quantizes a vector symmetrically with scale max|w| / 127', () => {
    const p = quantParams(w, 8, 'symmetric');
    expect(p).toEqual({ scale: 1.27 / 127, zeroPoint: 0 });
    expect(w.map((x) => quantizeValue(x, p, 8, 'symmetric'))).toEqual([42, -127, 8, 90, -33]);
  });

  it('spreads [min, max] over all 256 integers asymmetrically, with a zero point', () => {
    const p = quantParams([0, 0.5, 1.02], 8, 'asymmetric');
    expect(p.scale).toBeCloseTo(1.02 / 255, 12);
    expect(p.zeroPoint).toBe(-128); // 0 is the smallest value, so it maps to qmin
    expect(quantizeValue(1.02, p, 8, 'asymmetric')).toBe(127);
  });

  it('uses one scale per row for per-channel quantization', () => {
    const q = quantizeMatrix(
      [
        [1, -0.5],
        [0.01, 0.02],
      ],
      8,
      'symmetric',
      'channel',
    );
    expect(q.params.map((p) => p.scale)).toEqual([1 / 127, 0.02 / 127]);
    expect(q.q[1]).toEqual([64, 127]);
  });

  it('summarizes errors and bins them', () => {
    expect(errorStats([1, 2], [1.5, 2])).toEqual({ count: 2, maxAbs: 0.5, mse: 0.125, sqnrDb: 10 * Math.log10(5 / 0.25) });
    expect(histogram([-1, 0, 0.2, 1], 1, 4).counts).toEqual([1, 0, 2, 1]);
  });

  it('formats like Python', () => {
    expect(pyExp(0.0001234, 3)).toBe('1.234e-04');
    expect(pyExp(12345, 2)).toBe('1.23e+04');
  });
});

describe('the digits model', () => {
  it('the float weights classify the recorded number of test images', () => {
    expect(countCorrect(digits, digits.W1, digits.W2)).toBe(digits.floatCorrect);
  });

  it('8-bit per-channel quantization changes the weights by at most half a scale step', () => {
    const r = runQuantization(digits, { scheme: 'symmetric', granularity: 'channel', bits: 8 });
    const halfStep = Math.max(...r.layers.flatMap((l) => l.params.map((p) => p.scale))) / 2;
    expect(r.stats.maxAbs).toBeLessThanOrEqual(halfStep + 1e-12);
    expect(r.bytes.quantized).toBe((16 * 64 + 10 * 16) * 1);
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(quantizationExperiment('q', digits, { scheme: 'symmetric', granularity: 'tensor', bits: 8 }))).toEqual([]);
  });
});

const hasNumpy = hasPython() && (() => {
  try {
    execFileSync('python3', ['-c', 'import numpy']);
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasNumpy)('the printout equals what CPython and NumPy print', () => {
  const states: QuantState[] = [];
  for (const scheme of ['symmetric', 'asymmetric'] as const)
    for (const granularity of ['tensor', 'channel'] as const)
      for (let bits = 2; bits <= 8; bits++) states.push({ scheme, granularity, bits });
  it('for every scheme, granularity and bit width', () => {
    // One Python process runs every configuration, with digits_mlp.json in its working directory.
    const programs = states.map((s) => fillSlots(QUANT_SOURCE, [], quantSlots(s)).source);
    const driver = `import json,sys,io,contextlib\nfor src in json.loads(sys.stdin.read()):\n    buf = io.StringIO()\n    with contextlib.redirect_stdout(buf): exec(src, {})\n    print(json.dumps(buf.getvalue().rstrip()))`;
    const out = execFileSync('python3', ['-c', driver], { cwd: LESSON_DIR, input: JSON.stringify(programs), encoding: 'utf8' })
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as string);
    const expected = states.map((s) => quantPrintout(runQuantization(digits, s)).join('\n'));
    expect(out).toEqual(expected);
  });
});

describe.skipIf(!hasPython())('floating-point encodings equal Python’s struct module', () => {
  it('FP32 and FP16 bit patterns for a range of values', () => {
    const values = [0.1, -2.5, 1 / 3, 65504, 65519, 1e-5, 6e-8, 3.14159, -7.25, 1e-30, 123456.789];
    const py = execFileSync(
      'python3',
      ['-c', `import struct,json,sys\nfor v in json.loads(sys.argv[1]):\n    f = struct.unpack('>f', struct.pack('>f', v))[0]\n    try: h = struct.pack('>e', f).hex()\n    except OverflowError: h = 'overflow'\n    print(struct.pack('>f', v).hex(), h)`, JSON.stringify(values)],
      { encoding: 'utf8' },
    ).trim().split('\n');
    const ts = values.map((v) => {
      const f = encode(v, FP32);
      const h = encode(f.value, FP16);
      return `${toHex(f, FP32)} ${h.kind === 'infinity' ? 'overflow' : toHex(h, FP16)}`;
    });
    expect(ts).toEqual(py);
  });
});

describe('the bit-layout experiment', () => {
  it('stores 0.1 in each format and explains bad input', async () => {
    const { encodeAll, bitsReadout, bitsExperiment } = await import('./bitsExperiment');
    const r = encodeAll({ text: '0.1', scale: 0.01 });
    expect(r.rows.map((x) => x.hex)).toEqual(['3dcccccd', '2e66', '3dcd']);
    expect(r.rows[1]!.fields).toEqual({ sign: '0', exponent: '01011', mantissa: '1001100110' });
    expect(r.int8).toMatchObject({ q: 10, bits: '00001010' });
    expect(bitsReadout({ text: 'abc', scale: 0.01 }, encodeAll({ text: 'abc', scale: 0.01 }))[0]!.status).toBe('error');
    expect(validateExperiment(bitsExperiment('b', { text: '0.1', scale: 0.01 }))).toEqual([]);
  });
});

describe('the quantize-by-hand trace', () => {
  it('ends with what CPython prints', async () => {
    const { buildQuantTrace, QUANT_BY_HAND_W } = await import('./quantTrace');
    const t = buildQuantTrace(QUANT_BY_HAND_W);
    const last = t.steps.at(-1)!.vars.output;
    // CPython 3.13 output of QUANT_BY_HAND_SOURCE
    expect(last).toEqual({
      kind: 'text',
      value: '[31, -127, 6, 89, -40]\n[0.31, -1.27, 0.06, 0.89, -0.4]\n[0.0, 0.0, 0.003, -0.004, 0.002]',
    });
    expect(t.steps.find((s) => s.note.startsWith('w[2]'))!.note).toContain('= 5.7, which rounds to 6');
  });
});

describe('BF16 matches ml_dtypes', () => {
  it('for a few values (ml_dtypes 0.6.0: np.float32(v).astype(bfloat16))', () => {
    const hex = [0.1, 3.14159, 70000, 1e-30, -2.5].map((v) => toHex(encode(Math.fround(v), BF16), BF16));
    expect(hex).toEqual(['3dcd', '4049', '4789', '0da2', 'c020']);
  });
});
