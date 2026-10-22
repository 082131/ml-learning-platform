import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/precision chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'floating-point',
    term: 'Floating point',
    short: 'A number format that stores a sign, an exponent and a mantissa: value = ±1.mantissa × 2^exponent.',
    long: 'The exponent sets the range (how large or small a value can be), the mantissa sets the precision (how close neighboring values are). FP32 has 8 exponent and 23 mantissa bits, FP16 5 and 10, BF16 8 and 7.',
    introducedIn: 'inference/precision/precision-quantization',
    aliases: ['FP32', 'FP16', 'float32', 'float16', 'half precision', 'single precision'],
  },
  {
    id: 'mantissa',
    term: 'Mantissa',
    short: 'The fraction bits of a floating-point number, which set how many significant digits it keeps.',
    long: 'With m mantissa bits, neighboring values near 1 are 2^−m apart: about 1.2 × 10⁻⁷ for FP32, 0.00098 for FP16 and 0.0078 for BF16. Also called the significand.',
    introducedIn: 'inference/precision/precision-quantization',
    aliases: ['significand', 'fraction', 'exponent'],
  },
  {
    id: 'bfloat16',
    term: 'BF16 (bfloat16)',
    short: 'A 16-bit float with FP32’s 8 exponent bits and only 7 mantissa bits: FP32’s range at lower precision.',
    long: 'It is FP32 with the low 16 bits rounded away, so converting between them is cheap and values that fit in FP32 rarely overflow. Many recent models are trained and served in BF16.',
    introducedIn: 'inference/precision/precision-quantization',
    aliases: ['BF16', 'brain floating point'],
  },
  {
    id: 'quantization',
    term: 'Quantization',
    short: 'Storing numbers as low-bit integers plus a scale, so that q × scale approximates the original value.',
    long: 'INT8 weight quantization takes a quarter of FP32’s memory. Each value is rounded to the nearest multiple of the scale, so it moves by at most half a step; whether that matters is measured on real data.',
    introducedIn: 'inference/precision/precision-quantization',
    aliases: ['INT8', 'INT4', 'dequantization', 'quantize'],
  },
  {
    id: 'scale-zero-point',
    term: 'Scale and zero point',
    short: 'The two numbers that map integers back to real values: x ≈ (q − zero_point) × scale.',
    long: 'The scale is the real value of one integer step. Symmetric quantization fixes the zero point at 0; asymmetric quantization chooses it so the integer range covers [min, max] exactly.',
    introducedIn: 'inference/precision/precision-quantization',
    aliases: ['zero point', 'symmetric quantization', 'asymmetric quantization', 'affine quantization'],
  },
  {
    id: 'per-channel-quantization',
    term: 'Per-channel quantization',
    short: 'Using a separate scale for each output channel (row) of a weight matrix instead of one for the whole tensor.',
    long: 'Rows differ in magnitude. With a single scale, rows of small weights get only a few integer levels; per-channel scales give every row the full range for the cost of storing one scale per row.',
    introducedIn: 'inference/precision/precision-quantization',
    aliases: ['per-tensor quantization', 'per-row', 'granularity'],
  },
] satisfies GlossaryTerm[];
