import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'bf16-range',
    type: 'choice',
    prompt: 'FP16 and BF16 both use 16 bits. Why is BF16 often preferred for large models?',
    options: [
      {
        text: 'It has FP32’s 8 exponent bits, so it covers the same range of magnitudes and rarely overflows',
        correct: true,
        explain:
          'FP16’s largest value is 65,504; BF16 reaches about 3.4 × 10³⁸ like FP32. Large activations and gradients that overflow FP16 fit in BF16.',
      },
      {
        text: 'It has more mantissa bits, so it is more precise',
        correct: false,
        explain:
          'The opposite: BF16 has 7 mantissa bits to FP16’s 10, so each value is rounded more coarsely.',
      },
      {
        text: 'It stores integers, which GPUs multiply faster',
        correct: false,
        explain: 'BF16 is a floating-point format with a sign, an exponent and a mantissa, like FP16.',
      },
    ],
  },
  {
    id: 'scale',
    type: 'numeric',
    prompt:
      'You quantize a weight matrix to 8 bits, symmetric, per tensor. Its largest |w| is 0.635. What is the scale?',
    answer: 0.005,
    tolerance: 0,
    hint: 'scale = max|w| / qmax, and qmax = 2⁷ − 1 for 8 bits.',
    explain: '0.635 / 127 = 0.005. One integer step stands for 0.005.',
  },
  {
    id: 'q-of',
    type: 'numeric',
    prompt: 'With that scale of 0.005, which integer stores the weight 0.2013?',
    answer: 40,
    tolerance: 0,
    hint: 'Divide by the scale and round to the nearest integer.',
    explain:
      '0.2013 / 0.005 = 40.26, which rounds to 40. Dequantized, it is 40 × 0.005 = 0.2, an error of 0.0013.',
  },
  {
    id: 'max-error',
    type: 'numeric',
    prompt: 'With scale 0.005 and no clipping, what is the largest possible rounding error for one weight?',
    answer: 0.0025,
    tolerance: 0,
    hint: 'Rounding moves a value to the nearest grid point. How far can the nearest grid point be?',
    explain: 'Half a step: 0.005 / 2 = 0.0025. Removing one bit doubles the step and so doubles this bound.',
  },
  {
    id: 'per-channel',
    type: 'choice',
    prompt:
      'One row of a weight matrix has weights within ±0.02, while another row reaches ±1.9. With one scale for the whole matrix at 8 bits, what happens to the small row?',
    options: [
      {
        text: 'It uses only a few of the 255 levels, so its weights are rounded very coarsely relative to their size',
        correct: true,
        explain:
          'The scale is 1.9 / 127 ≈ 0.015, so ±0.02 covers about ±1 step: three levels. A scale per row gives that row all 255.',
      },
      {
        text: 'It gets clipped to ±127',
        correct: false,
        explain:
          'Clipping affects values beyond the largest |w|. Small values are never clipped; they are rounded coarsely.',
      },
      {
        text: 'Nothing: every weight gets the same absolute error bound, so all rows are equally accurate',
        correct: false,
        explain:
          'The absolute bound is the same, but relative to weights of size 0.02 an error of up to 0.0075 is huge.',
      },
    ],
  },
  {
    id: 'asymmetric',
    type: 'choice',
    prompt: 'When does asymmetric quantization (with a zero point) help most?',
    options: [
      {
        text: 'When the values are not centered on zero, for example ReLU outputs, which are all ≥ 0',
        correct: true,
        explain:
          'Symmetric quantization would waste the negative half of the integers. Asymmetric maps [0, max] onto all 256 levels.',
      },
      {
        text: 'When the values are symmetric around zero, like most weight matrices',
        correct: false,
        explain:
          'Then the zero point ends up near 0 and the result is close to symmetric quantization, with an extra number to store.',
      },
      {
        text: 'Never: it always gives a larger error than symmetric quantization',
        correct: false,
        explain:
          'It uses all 2ᵇ levels instead of 2ᵇ − 1 and fits the actual range, so its steps are never larger.',
      },
    ],
  },
];

export const quantExercise: Exercise = {
  id: 'quantize-symmetric',
  prompt:
    'Write `quantize(w, bits)` returning `(q, scale)` for symmetric quantization of a list, and `dequantize(q, scale)`.',
  starter: `def quantize(w, bits):
    # Return (q, scale): q is a list of ints in -qmax..qmax.
    pass


def dequantize(q, scale):
    pass`,
  hints: [
    'qmax = 2 ** (bits - 1) - 1, and scale = max(abs(x) for x in w) / qmax.',
    'q = [round(x / scale) for x in w]. If every weight is 0, use scale = 1 to avoid dividing by zero.',
    'dequantize multiplies each integer by the scale: `[v * scale for v in q]`.',
  ],
  solution: `def quantize(w, bits):
    qmax = 2 ** (bits - 1) - 1
    largest = max(abs(x) for x in w)
    scale = largest / qmax if largest > 0 else 1.0
    q = [max(-qmax, min(qmax, round(x / scale))) for x in w]
    return q, scale


def dequantize(q, scale):
    return [v * scale for v in q]`,
  explanation:
    'The largest |w| maps to ±qmax, so nothing is clipped and every weight moves by at most half a step. An all-zero list has no largest value to scale by, so any nonzero scale works.',
  tests: `q, scale = quantize([0.31, -1.27, 0.057, 0.894, -0.402], 8)
assert q == [31, -127, 6, 89, -40], 'the lesson example should give [31, -127, 6, 89, -40]'
assert abs(scale - 0.01) < 1e-12, 'scale should be 1.27 / 127 = 0.01'
w = [0.5, -0.25, 0.1, -0.7]
q4, s4 = quantize(w, 4)
assert q4 == [5, -2, 1, -7], '4 bits: qmax is 7, scale is 0.1, so q should be [5, -2, 1, -7]'
assert all(abs(a - b) <= s4 / 2 + 1e-12 for a, b in zip(dequantize(q4, s4), w)), 'each dequantized value should be within half a step of the original'
assert quantize([0.0, 0.0], 8)[0] == [0, 0], 'an all-zero list should quantize to zeros without dividing by zero'`,
};
