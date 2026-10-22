/**
 * Bit layouts of binary floating-point formats, and rounding a number into them with
 * round-to-nearest, ties-to-even (the IEEE 754 default, used by NumPy and PyTorch).
 */
export interface FloatFormat {
  id: 'fp32' | 'fp16' | 'bf16';
  label: string;
  exponentBits: number;
  mantissaBits: number;
}

export const FP32: FloatFormat = { id: 'fp32', label: 'FP32', exponentBits: 8, mantissaBits: 23 };
export const FP16: FloatFormat = { id: 'fp16', label: 'FP16', exponentBits: 5, mantissaBits: 10 };
export const BF16: FloatFormat = { id: 'bf16', label: 'BF16', exponentBits: 8, mantissaBits: 7 };
export const FLOAT_FORMATS = [FP32, FP16, BF16];

export const bias = (f: FloatFormat) => 2 ** (f.exponentBits - 1) - 1;

/** Largest finite value, smallest positive normal value, and the gap between 1 and the next value. */
export function formatRange(f: FloatFormat) {
  const b = bias(f);
  return {
    max: (2 - 2 ** -f.mantissaBits) * 2 ** b,
    minNormal: 2 ** (1 - b),
    epsilon: 2 ** -f.mantissaBits,
  };
}

/** Round half to even, as NumPy's np.round and Python's round do. */
export function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

export interface Encoded {
  sign: 0 | 1;
  /** The stored (biased) exponent field. All ones means infinity or NaN; zero means zero or subnormal. */
  exponent: number;
  mantissa: number;
  value: number;
  kind: 'normal' | 'subnormal' | 'zero' | 'infinity' | 'nan';
}

const exponentOf = (a: number) => {
  // floor(log2(a)) without floating-point log error: adjust the estimate by exact powers of two.
  let e = Math.floor(Math.log2(a));
  if (2 ** e > a) e -= 1;
  else if (2 ** (e + 1) <= a) e += 1;
  return e;
};

/** Rounds `x` to the nearest value of format `f` and returns its fields. */
export function encode(x: number, f: FloatFormat): Encoded {
  const M = f.mantissaBits;
  const allOnes = 2 ** f.exponentBits - 1;
  const sign = x < 0 || Object.is(x, -0) ? 1 : 0;
  if (Number.isNaN(x)) return { sign: 0, exponent: allOnes, mantissa: 2 ** (M - 1), value: NaN, kind: 'nan' };
  const a = Math.abs(x);
  const inf = (): Encoded => ({ sign, exponent: allOnes, mantissa: 0, value: sign ? -Infinity : Infinity, kind: 'infinity' });
  if (a === Infinity) return inf();
  const emin = 1 - bias(f);
  let e = a === 0 ? emin : Math.max(exponentOf(a), emin);
  // Scaling by a power of two is exact, so the only rounding is roundHalfEven.
  let m = roundHalfEven((a / 2 ** e) * 2 ** M);
  if (m >= 2 ** (M + 1)) {
    m /= 2;
    e += 1;
  }
  if (e > bias(f)) return inf();
  const exponent = m >= 2 ** M ? e + bias(f) : 0;
  const mantissa = exponent === 0 ? m : m - 2 ** M;
  const magnitude = m * 2 ** (e - M);
  return {
    sign,
    exponent,
    mantissa,
    value: sign ? -magnitude : magnitude,
    kind: magnitude === 0 ? 'zero' : exponent === 0 ? 'subnormal' : 'normal',
  };
}

/** The bits as a string: sign, exponent field, mantissa field. */
export function bitFields(enc: Encoded, f: FloatFormat) {
  return {
    sign: String(enc.sign),
    exponent: enc.exponent.toString(2).padStart(f.exponentBits, '0'),
    mantissa: enc.mantissa.toString(2).padStart(f.mantissaBits, '0'),
  };
}

/** The whole bit pattern as hexadecimal, for example 3dcccccd for 0.1 in FP32. */
export function toHex(enc: Encoded, f: FloatFormat): string {
  const bits = BigInt(enc.sign) << BigInt(f.exponentBits + f.mantissaBits);
  const all = bits | (BigInt(enc.exponent) << BigInt(f.mantissaBits)) | BigInt(enc.mantissa);
  return all.toString(16).padStart((1 + f.exponentBits + f.mantissaBits) / 4, '0');
}

/** INT8 with a scale: q = clamp(round(x / scale), −128, 127), stored in two's complement. */
export function encodeInt8(x: number, scale: number) {
  const raw = roundHalfEven(x / scale);
  const q = Math.min(127, Math.max(-128, Number.isFinite(raw) ? raw : x > 0 ? 127 : -128));
  return {
    q,
    clipped: raw !== q,
    bits: (q & 0xff).toString(2).padStart(8, '0'),
    value: q * scale,
  };
}
