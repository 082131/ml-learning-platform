import type { ExperimentDef, ReadoutItem } from '../types';
import { formatNumber } from '../trace/values';
import {
  bitFields,
  encode,
  encodeInt8,
  FLOAT_FORMATS,
  toHex,
  type Encoded,
  type FloatFormat,
} from './floatBits';

export interface BitsState {
  /** The number as typed, for example "0.1" or "1e-8". */
  text: string;
  /** INT8 step size: the real value one integer step stands for. */
  scale: number;
}

export interface FloatRow {
  format: FloatFormat;
  enc: Encoded;
  fields: { sign: string; exponent: string; mantissa: string };
  hex: string;
}

export interface BitsResult {
  /** The typed number, or undefined when it is not a number. */
  input?: number;
  rows: FloatRow[];
  int8?: ReturnType<typeof encodeInt8>;
}

export const MAX_TEXT = 24;

export function parseNumber(text: string): number | undefined {
  const t = text.trim();
  if (t === '' || !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return undefined;
  return Number(t);
}

/**
 * The typed number stored as FP32 first (as `torch.tensor(x)` does), then converted to FP16 and BF16,
 * and quantized to INT8 with the chosen scale.
 */
export function encodeAll(s: BitsState): BitsResult {
  const input = parseNumber(s.text);
  if (input === undefined) return { rows: [] };
  const f32 = encode(input, FLOAT_FORMATS[0]!).value;
  const rows = FLOAT_FORMATS.map((format) => {
    const enc = encode(format.id === 'fp32' ? input : f32, format);
    return { format, enc, fields: bitFields(enc, format), hex: toHex(enc, format) };
  });
  return { input, rows, int8: encodeInt8(f32, s.scale) };
}

/** Exact decimal of a stored value, as Python's repr would show it (shortest round-trip). */
export const shown = (v: number) => (Number.isFinite(v) ? String(v) : v > 0 ? 'inf' : '-inf');

export function bitsReadout(s: BitsState, r: BitsResult): ReadoutItem[] {
  if (r.input === undefined)
    return [
      { label: 'Input', value: `"${s.text}" is not a number. Try 0.1, -2.5 or 1e-8.`, status: 'error' },
    ];
  const err = (v: number) => (Number.isFinite(v) ? formatNumber(Math.abs(v - r.input!)) : 'overflow');
  return [
    ...r.rows.map((row) => ({
      label: `${row.format.label} stores`,
      value: `${shown(row.enc.value)}\nerror ${err(row.enc.value)}`,
    })),
    {
      label: `INT8 with scale ${formatNumber(s.scale)}`,
      value: `q = ${r.int8!.q}${r.int8!.clipped ? ' (clipped)' : ''}\nback to ${formatNumber(r.int8!.value)}\nerror ${err(r.int8!.value)}`,
    },
  ];
}

export const INT8_SCALES = [0.001, 0.01, 0.05, 0.1, 1];

export function bitsExperiment(id: string, initial: BitsState): ExperimentDef<BitsState, BitsResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'text',
        id: 'text',
        label: 'Number to store',
        maxLength: MAX_TEXT,
        get: (s) => s.text,
        set: (s, text) => ({ ...s, text }),
      },
      {
        kind: 'select',
        id: 'scale',
        label: 'INT8 scale',
        options: INT8_SCALES.map((v) => ({ value: String(v), label: String(v) })),
        get: (s) => String(s.scale),
        set: (s, v) => ({ ...s, scale: Number(v) }),
      },
    ],
    compute: encodeAll,
    readout: bitsReadout,
  };
}
