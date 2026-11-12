// Code for the LLM quantization lesson. The block quantizer's printout is checked against CPython 3.13 in
// src/lib/deploy/blockQuant.test.ts, and quant_check.py shows it gives the same values as gguf 0.19.0's NumPy
// reference quantizers. quantize_all.py ran with llama-cpp-python 0.3.36 (llama.cpp built for CPU) on a 4-core
// Intel Xeon VM at 2.1 GHz; its outputs are recorded below.
import { ann, annLine } from '@/lib/inference/annotate';
import { QUANT_SOURCE, blockQuantExperiment, quantSlots, type QuantState } from '@/lib/deploy/blockQuant';
import type { CodeExample } from '@/lib/types';
import quantizeAllSource from './quantize_all.py?raw';

export const experiment = blockQuantExperiment('blockq', { format: 'Q4_0', outlier: 'off' });

const st = (s: unknown) => s as QuantState;
const Q = QUANT_SOURCE;

export const quantCode: CodeExample = {
  id: 'blockq-python',
  language: 'python',
  source: Q,
  slots: Object.fromEntries(['weights', 'format', 'block'].map((k) => [k, (s: unknown) => quantSlots(st(s))[k]!])),
  annotations: [
    annLine(Q, 'fp16', 'def fp16(x):', {
      kind: 'function',
      title: 'The scale is a float16',
      what: 'Packs the number into 2 bytes and back, rounding it to the nearest float16.',
      why: 'GGUF stores each block’s scale d in 16 bits. Dequantizing uses this rounded d, so the file’s values are exactly these.',
    }),
    annLine(Q, 'd8', 'd = max(abs(x) for x in block) / 127', {
      kind: 'math',
      title: 'Q8_0 scale',
      what: 'The largest |weight| in the block maps to ±127.',
      why: 'The same symmetric rule as in the precision lesson, applied to 32 weights at a time instead of a whole row.',
    }),
    annLine(Q, 'round', 'q = [math.floor(x / d + 0.5)', {
      kind: 'math',
      title: 'Round halves away from zero',
      what: 'C’s roundf, which ggml uses. Python’s round() would send 2.5 to 2, not 3.',
      why: 'To get the same bytes as llama.cpp you must round the same way.',
    }),
    annLine(Q, 'm', 'm = max(block, key=abs)', {
      kind: 'framework',
      title: 'The largest magnitude, sign kept',
      what: 'For [0.25, -0.8, 0.7] this is -0.8, not 0.8.',
      why: 'Q4_0 has 16 levels, -8 to 7: one more on the negative side. Mapping the extreme weight to -8 uses that extra level for it.',
    }),
    annLine(Q, 'd4', 'd = m / -8', {
      kind: 'math',
      title: 'Q4_0 scale',
      what: 'The extreme weight becomes q - 8 = -8. If it is positive, d is negative, which flips the grid.',
      why: 'Every other weight lands on one of 16 equally spaced levels between the extreme and its mirror.',
    }),
    annLine(Q, 'trunc', 'q = [min(15, int(x / d + 8.5))', {
      kind: 'math',
      title: 'Offset, round and clamp',
      what: 'Adding 8.5 and truncating rounds to the nearest level and shifts it into 0..15, which fits in 4 bits.',
      why: 'Two 4-bit values are packed into each byte in the file: 16 bytes of data plus 2 bytes of scale per 32 weights.',
    }),
    ann(Q, 'block', 'FORMAT, BLOCK =', '{{block}}', {
      kind: 'parameter',
      title: 'Block size',
      what: '32 for Q8_0 and Q4_0. 64 here means one scale for all the weights, the per-tensor case.',
      why: 'Smaller blocks follow the weights more closely but store more scales: 16 bits per block.',
    }),
    annLine(Q, 'bpw', 'print(f"RMSE', {
      kind: 'math',
      title: 'Bits per weight',
      what: '(32 × 4 + 16) / 32 = 4.5 for Q4_0, (32 × 8 + 16) / 32 = 8.5 for Q8_0.',
      why: 'This is what sets the file size: parameters × bits per weight / 8 bytes.',
    }),
  ],
};

const A = quantizeAllSource.replace(/\n$/, '');

export const quantizeAll: CodeExample = {
  id: 'quantize-all',
  language: 'python',
  source: A,
  annotations: [
    annLine(A, 'types', 'TYPES = {', {
      kind: 'variable',
      title: 'Three target types',
      what: 'The same quantization types llama-quantize accepts by name: Q8_0, Q4_K_M and Q4_0.',
      why: 'These are the most common choices for local LLMs: near-lossless, the usual default, and the simplest 4-bit type.',
    }),
    annLine(A, 'call', 'rc = llama_cpp.llama_model_quantize(', {
      kind: 'framework',
      title: 'llama.cpp’s own quantizer',
      what: 'The C function behind the llama-quantize command line tool, called through the Python bindings.',
      why: 'From the command line this is: llama-quantize tiny-llama-f32.gguf tiny-llama-Q4_K_M.gguf Q4_K_M',
    }),
    annLine(A, 'gen', 'for _tok in m.generate(prompt, temp=0.0, reset=True):', {
      kind: 'framework',
      title: 'Count generated tokens',
      what: 'Greedy decoding (temperature 0), stopped after 64 tokens.',
      why: 'Counting tokens as they come out is reliable; the text of a random model is not.',
    }),
    annLine(A, 'best', 'best = max(best,', {
      kind: 'math',
      title: 'Best of 4',
      what: 'The fastest of four runs; the first also warms caches.',
      why: 'On a shared VM, the slowest runs mostly measure other programs. Even so, results moved by up to 20% between two sessions.',
    }),
  ],
};

export const quantizeLog: CodeExample = {
  id: 'quantize-log',
  language: 'bash',
  source: `$ python quantize_all.py          # excerpt of llama.cpp's log while writing Q4_K_M, spaces trimmed
[   1/  75] output.weight            - [   512,    269, 1, 1], type = f32, converting to q6_K .. size = 0.53 MiB -> 0.11 MiB
[   4/  75] blk.0.attn_k.weight      - [   512,    256, 1, 1], type = f32, converting to q4_K .. size = 0.50 MiB -> 0.07 MiB
[   8/  75] blk.0.attn_v.weight      - [   512,    256, 1, 1], type = f32, converting to q6_K .. size = 0.50 MiB -> 0.10 MiB
[   9/  75] blk.0.ffn_down.weight    - [  1536,    512, 1, 1], type = f32, converting to q6_K .. size = 3.00 MiB -> 0.62 MiB
[  10/  75] blk.0.ffn_gate.weight    - [   512,   1536, 1, 1], type = f32, converting to q4_K .. size = 3.00 MiB -> 0.42 MiB
[  11/  75] blk.0.ffn_norm.weight    - [   512,      1, 1, 1], type = f32, size = 0.002 MiB
llama_model_quantize_impl: model size  =    97.08 MiB (32.00 BPW)
llama_model_quantize_impl: quant size  =    14.62 MiB (4.82 BPW)

# The summary lines for the other two types
llama_model_quantize_impl: quant size  =    25.81 MiB (8.51 BPW)     # Q8_0
llama_model_quantize_impl: quant size  =    13.71 MiB (4.52 BPW)     # Q4_0

# The script's own output, two separate sessions on the same VM
F32       97.1 MiB    396 tokens/s        |   334 tokens/s
Q8_0      25.8 MiB    612 tokens/s        |   620 tokens/s
Q4_K_M    14.6 MiB    822 tokens/s        |   648 tokens/s
Q4_0      13.7 MiB    795 tokens/s        |   710 tokens/s`,
  annotations: [],
};
