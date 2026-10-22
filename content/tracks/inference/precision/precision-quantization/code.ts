// Code for the precision and quantization lesson. The quantization printout is checked against
// CPython 3.13 with NumPy 2.5.3 for every setting in src/lib/inference/quantize.test.ts; the struct and
// plain-Python outputs below are copied from CPython 3.13 runs. digits_mlp.json comes from
// generate_weights.py in this folder (scikit-learn 1.9.1).
import { bitsExperiment } from '@/lib/inference/bitsExperiment';
import type { DigitsModel } from '@/lib/inference/digitsModel';
import { QUANT_SOURCE, quantizationExperiment, quantSlots, type QuantState } from '@/lib/inference/quantExperiment';
import { buildQuantTrace, QUANT_BY_HAND_SOURCE, QUANT_BY_HAND_W } from '@/lib/inference/quantTrace';
import type { CodeExample } from '@/lib/types';
import digits from './digits_mlp.json';

/** The bit-layout explorer starts at 0.1, which no binary format stores exactly. */
export const bits = bitsExperiment('bits', { text: '0.1', scale: 0.01 });

/** One state for the error histogram, the level chart, the accuracy chart, the code and the readout. */
export const quant = quantizationExperiment('quant', digits as DigitsModel, {
  scheme: 'symmetric',
  granularity: 'tensor',
  bits: 8,
});

const st = (s: unknown) => s as QuantState;

export const quantCode: CodeExample = {
  id: 'quant-numpy',
  language: 'python',
  source: QUANT_SOURCE,
  slots: Object.fromEntries(['scheme', 'bits', 'axis'].map((k) => [k, (s: unknown) => quantSlots(st(s))[k]!])),
  annotations: [
    {
      id: 'qmax',
      range: { line: 5, startCol: 4, endCol: 8 },
      match: 'qmax',
      kind: 'variable',
      title: 'qmax',
      what: 'The largest integer used: 127 for 8 bits, 7 for 4 bits.',
      why: 'Symmetric quantization uses −qmax…qmax, so 0 maps exactly to 0 and the range is balanced. It gives up −128.',
    },
    {
      id: 'scale-sym',
      range: { line: 6, startCol: 12, endCol: 51 },
      match: 'np.abs(w).max(axis=axis, keepdims=True)',
      kind: 'framework',
      title: 'The largest |w|, per tensor or per row',
      what: 'With axis=None it is one number for the whole matrix; with axis=1 it is one number per row. keepdims=True keeps the result 2-D so it broadcasts against w.',
      why: 'The largest weight must map to qmax, otherwise it would be clipped. Dividing by qmax gives the value of one integer step.',
      output: 'scale: shape (1, 1) per tensor, (rows, 1) per row',
    },
    {
      id: 'round',
      range: { line: 7, startCol: 16, endCol: 35 },
      match: 'np.round(w / scale)',
      kind: 'math',
      title: 'np.round(w / scale)',
      what: 'Counts how many steps each weight is from 0 and rounds to the nearest whole step (ties to the even number).',
      why: 'This is the only place information is lost: each weight moves by at most half a step.',
    },
    {
      id: 'clip',
      range: { line: 7, startCol: 8, endCol: 15 },
      match: 'np.clip',
      kind: 'framework',
      title: 'np.clip',
      what: 'Limits values to the integer range.',
      why: 'With this scale nothing exceeds qmax, but the clip is what makes the result fit the integer type when the scale comes from calibration data instead.',
    },
    {
      id: 'dequant',
      range: { line: 8, startCol: 11, endCol: 20 },
      match: 'q * scale',
      kind: 'math',
      title: 'q * scale (dequantize)',
      what: 'Turns the integers back into real numbers on a grid of step scale.',
      why: 'A real INT8 kernel keeps q and scale separately and multiplies later; here we dequantize to measure what was lost.',
    },
    {
      id: 'zero-point',
      range: { line: 15, startCol: 4, endCol: 14 },
      match: 'zero_point',
      kind: 'variable',
      title: 'zero_point',
      what: 'The integer that represents 0.0.',
      why: 'Asymmetric quantization spreads [min, max] over all 256 levels. When the values are not centered on 0, 0 lands on some other integer, and that integer must be stored with the scale.',
    },
    {
      id: 'scheme',
      range: { line: 21, startCol: 9, endCol: 28 },
      match: 'quantize_{{scheme}}',
      kind: 'function',
      title: 'Which scheme',
      what: 'Calls the symmetric or the asymmetric function, as chosen in the experiment.',
      why: 'Both store b-bit integers; they differ in how the range is placed.',
    },
    {
      id: 'bits',
      range: { line: 21, startCol: 33, endCol: 46 },
      match: 'bits={{bits}}',
      kind: 'parameter',
      title: 'bits',
      what: 'Bits per weight. Each bit doubles the number of levels.',
      why: 'Fewer bits shrink memory linearly and double the step size for each bit removed.',
    },
    {
      id: 'axis',
      range: { line: 21, startCol: 48, endCol: 61 },
      match: 'axis={{axis}}',
      kind: 'parameter',
      title: 'axis: per tensor or per channel',
      what: 'None: one scale for the whole matrix. 1: one scale per row, that is per output neuron (channel).',
      why: 'Rows differ in size. A shared scale is set by the largest row, so rows with small weights get very few levels.',
    },
    {
      id: 'concat',
      range: { line: 24, startCol: 6, endCol: 20 },
      match: 'np.concatenate',
      kind: 'framework',
      title: 'All the errors in one array',
      what: 'Flattens both matrices’ errors (dequantized minus original) into one vector of 1,184 numbers.',
      why: 'The histogram above shows exactly this vector.',
    },
    {
      id: 'forward',
      range: { line: 29, startCol: 18, endCol: 30 },
      match: 'X @ W1_hat.T',
      kind: 'math',
      title: 'Run the quantized model',
      what: '(360, 64) @ (64, 16): every test image through the first layer, with the dequantized weights.',
      why: 'Error statistics say how much the weights moved; accuracy says whether it matters.',
      output: 'shape (360, 16)',
    },
    {
      id: 'argmax',
      range: { line: 30, startCol: 36, endCol: 50 },
      match: 'argmax(axis=1)',
      kind: 'framework',
      title: 'argmax(axis=1)',
      what: 'For each image, the digit with the highest score.',
      why: 'The prediction only changes when rounding swaps the order of the top two scores.',
      output: 'pred: shape (360,)',
    },
  ],
};

/** Quantizing five numbers by hand, in plain Python (runs in the browser without packages). */
export const byHand: CodeExample = {
  id: 'quant-by-hand',
  language: 'python',
  run: 'pyodide',
  source: QUANT_BY_HAND_SOURCE,
  annotations: [
    {
      id: 'scale',
      range: { line: 4 },
      kind: 'math',
      title: 'scale = max|w| / qmax',
      what: 'The largest |w| is 1.27, so one integer step is worth 1.27 / 127 = 0.01.',
      why: 'This makes −1.27 map to −127 exactly, the edge of the range.',
    },
    {
      id: 'round',
      range: { line: 5 },
      kind: 'math',
      title: 'round(x / scale)',
      what: '0.057 / 0.01 = 5.7 rounds to 6, and 0.894 / 0.01 = 89.4 rounds to 89.',
      why: 'Python’s round() rounds exact halves to the even integer, like np.round.',
    },
  ],
  expectedOutput: '[31, -127, 6, 89, -40]\n[0.31, -1.27, 0.06, 0.89, -0.4]\n[0.0, 0.0, 0.003, -0.004, 0.002]',
};

export const byHandTrace = buildQuantTrace(QUANT_BY_HAND_W);

/** The bytes of 0.1 in FP32, FP16 and BF16, with Python's struct module. */
export const structBits: CodeExample = {
  id: 'quant-struct',
  language: 'python',
  run: 'pyodide',
  source: `import struct

x = 0.1
fp32 = struct.pack(">f", x)          # 4 bytes, most significant first
fp16 = struct.pack(">e", x)          # 2 bytes
print(fp32.hex(), struct.unpack(">f", fp32)[0])
print(fp16.hex(), struct.unpack(">e", fp16)[0])

# BF16 is the top 16 bits of FP32, rounded to nearest (ties to even)
bits = int.from_bytes(fp32, "big")
bf16 = (bits + 0x7FFF + ((bits >> 16) & 1)) >> 16
print(f"{bf16:04x}", struct.unpack(">f", (bf16 << 16).to_bytes(4, "big"))[0])`,
  annotations: [
    {
      id: 'pack',
      range: { line: 4, startCol: 7, endCol: 18 },
      match: 'struct.pack',
      kind: 'framework',
      title: 'struct.pack(">f", x)',
      what: 'Converts x to the bytes of a 32-bit float. ">e" does the same for a 16-bit float.',
      why: 'It is the standard library’s way to see the exact bits a format stores.',
    },
    {
      id: 'bf16',
      range: { line: 11 },
      kind: 'math',
      title: 'Round FP32 to BF16',
      what: 'Adds just under half of the dropped part (0x7FFF), plus 1 if the kept part is odd, then drops the low 16 bits.',
      why: 'This is round to nearest, ties to even, written with integer operations. (It ignores NaN, which a library must handle.)',
    },
  ],
  expectedOutput: '3dcccccd 0.10000000149011612\n2e66 0.0999755859375\n3dcd 0.10009765625',
};
