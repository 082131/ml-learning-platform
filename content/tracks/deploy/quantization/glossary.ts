import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/quantization chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'block-quantization',
    term: 'Block quantization',
    short:
      'Quantization with one scale per small block of consecutive weights (32 in GGUF Q4_0 and Q8_0) instead of one per tensor or row.',
    long: 'A large weight then only coarsens the 31 weights in its own block. The scales add overhead: 16 bits per 32 weights is 0.5 bits per weight.',
    introducedIn: 'deploy/quantization/llm-quantization',
    aliases: ['group-wise quantization', 'Q4_0', 'Q8_0', 'group size'],
  },
  {
    id: 'bits-per-weight',
    term: 'Bits per weight (BPW)',
    short:
      'The average storage per weight, including the scales and other per-block data. Q8_0 is 8.5, Q4_0 is 4.5.',
    long: 'File size ≈ parameters × BPW / 8 bytes. llama.cpp prints the BPW of a file when it quantizes it.',
    introducedIn: 'deploy/quantization/llm-quantization',
    aliases: ['BPW', 'bpw'],
  },
  {
    id: 'k-quants',
    term: 'K-quants',
    short:
      'llama.cpp quantization types such as Q4_K and Q6_K that group blocks into super-blocks of 256 weights with their own scales, and mixes like Q4_K_M that use more bits for sensitive tensors.',
    long: 'The suffix S, M or L says how many tensors are kept at a higher precision: small, medium or large.',
    introducedIn: 'deploy/quantization/llm-quantization',
    aliases: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q4_K'],
  },
  {
    id: 'gptq',
    term: 'GPTQ',
    short:
      'A post-training quantization method that quantizes the weights of a layer one column at a time and adjusts the remaining weights to cancel the error, using a small calibration set.',
    long: 'It needs calibration data and a GPU for a few hours on large models; it produces 3- or 4-bit weights with less accuracy loss than plain rounding.',
    introducedIn: 'deploy/quantization/llm-quantization',
    aliases: ['GPTQ'],
  },
  {
    id: 'awq',
    term: 'AWQ',
    short:
      'Activation-aware Weight Quantization: scales up the small share of weight channels that see large activations before quantizing, so they lose less precision.',
    long: 'Like GPTQ it uses calibration data and targets 4-bit weights; it does not adjust weights column by column.',
    introducedIn: 'deploy/quantization/llm-quantization',
    aliases: ['AWQ'],
  },
] satisfies GlossaryTerm[];
