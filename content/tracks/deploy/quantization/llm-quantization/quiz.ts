import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'bpw',
    type: 'numeric',
    prompt:
      'A 4-bit format uses blocks of 64 weights, each with one 16-bit scale and one 16-bit minimum. How many bits per weight is that?',
    answer: 4.5,
    tolerance: 0.001,
    hint: '(weights × bits + extra bits per block) / weights.',
    explain: '(64 × 4 + 16 + 16) / 64 = 288 / 64 = 4.5. Same as Q4_0 (32 weights, one scale): the extra minimum is paid for by the bigger block.',
  },
  {
    id: 'size',
    type: 'numeric',
    prompt:
      'Llama 3.1 8B has 8.03 billion parameters. Roughly how many GB (10^9 bytes) is its Q8_0 GGUF file? Round to one decimal.',
    answer: 8.5,
    tolerance: 0.1,
    hint: 'Q8_0 is 8.5 bits per weight. Bytes = parameters × bits per weight / 8.',
    explain:
      '8.03 × 10^9 × 8.5 / 8 = 8.53 × 10^9 bytes, about 8.5 GB (7.9 GiB). Q4_0 at 4.5 bits would be about 4.5 GB.',
  },
  {
    id: 'outlier',
    type: 'choice',
    prompt:
      'One weight of 0.31 sits among weights of about ±0.02. With 4-bit block quantization (blocks of 32), what happens to the other 31 weights in its block?',
    options: [
      {
        text: 'Nothing changes for them, since every weight has its own scale in Q4_0',
        correct: false,
        explain: 'There is one scale per block of 32, not per weight. That shared scale is the whole point and the whole cost.',
      },
      {
        text: 'Most round to 0, since one step is now 0.31 / 8 ≈ 0.039',
        correct: true,
        explain:
          'The experiment shows it: block 1’s scale grows from 0.0050 to 0.0388 and its largest error from 0.0025 to 0.0192. Block 0 is untouched, which is why blocks beat one scale per tensor.',
      },
      {
        text: 'The outlier is clipped to the block’s range, so the rest keep their precision',
        correct: false,
        explain:
          'Q4_0 sets the scale from the largest magnitude, so nothing is clipped and the outlier is stored exactly. The cost falls on its neighbours.',
      },
    ],
  },
  {
    id: 'gptq-awq',
    type: 'choice',
    prompt: 'What do GPTQ and AWQ have in common that plain round-to-nearest (as in Q4_0) does not?',
    options: [
      {
        text: 'Both quantize activations as well as weights, to 4 bits',
        correct: false,
        explain: 'Both are weight-only methods; activations stay in 16-bit floating point.',
      },
      {
        text: 'Both store each weight with its own scale, so no block structure is needed',
        correct: false,
        explain: 'Both use group-wise scales (often groups of 128), much like blocks.',
      },
      {
        text: 'Both use calibration data to decide how to round with less output error',
        correct: true,
        explain:
          'GPTQ adjusts the not-yet-quantized weights to compensate for each rounding error; AWQ rescales channels that see large activations. Round-to-nearest looks at each weight alone.',
      },
    ],
  },
  {
    id: 'k-quants',
    type: 'choice',
    prompt: 'Your Q4_K_M file came out at 4.82 bits per weight, not the 4.5 of Q4_K. Why?',
    options: [
      {
        text: 'Some tensors, such as the output layer and some attention value and FFN down projections, were stored as Q6_K',
        correct: true,
        explain: 'The log shows it: output.weight, attn_v and ffn_down converted to q6_K. The M mix spends extra bits where errors hurt most.',
      },
      {
        text: 'GGUF metadata, such as the tokenizer, is counted in bits per weight',
        correct: false,
        explain: 'llama.cpp’s BPW counts tensor data only. The tokenizer adds a little to the file but not to the BPW figure.',
      },
      {
        text: 'K-quants add one 32-bit scale per weight on top of the 4-bit data',
        correct: false,
        explain: 'That would be 36 bits per weight. K-quants use small 6-bit scales per sub-block and one 16-bit scale per 256 weights.',
      },
    ],
  },
];

export const q8Exercise: Exercise = {
  id: 'q8-block',
  prompt:
    'Write `q8_0(block)` that returns `(d, q)` for one block: d = max|x| / 127 and q rounded half away from zero. Then `dequant(d, q)`.',
  starter: `import math


def q8_0(block):
    pass


def dequant(d, q):
    pass`,
  hints: [
    'd = max(abs(x) for x in block) / 127. If d is 0, every q is 0.',
    'Round half away from zero: math.floor(v + 0.5) for v >= 0, and -math.floor(-v + 0.5) otherwise.',
    'dequant returns [v * d for v in q].',
  ],
  solution: `import math


def q8_0(block):
    d = max(abs(x) for x in block) / 127
    if d == 0:
        return 0.0, [0] * len(block)
    q = [math.floor(x / d + 0.5) if x >= 0 else -math.floor(-x / d + 0.5) for x in block]
    return d, q


def dequant(d, q):
    return [v * d for v in q]`,
  explanation:
    'This is ggml’s Q8_0 rule, except that the file also rounds d to float16. Every weight moves by at most half a step, d / 2.',
  tests: `d, q = q8_0([1.27, -0.635, 0.0, 0.5])
assert abs(d - 0.01) < 1e-12, 'd should be 1.27 / 127 = 0.01'
assert q == [127, -64, 0, 50], 'q should be [127, -64, 0, 50]: -63.5 rounds away from zero to -64'
assert q8_0([0.0, 0.0])[1] == [0, 0], 'an all-zero block gives zeros'
d2, q2 = q8_0([0.3, -0.2, 0.05])
assert all(abs(a - b) <= d2 / 2 + 1e-12 for a, b in zip(dequant(d2, q2), [0.3, -0.2, 0.05])), 'each weight within half a step'`,
};
