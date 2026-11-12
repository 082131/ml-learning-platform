import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/quantization/llm-quantization',
  title: 'Quantizing LLMs: block formats, GGUF types, GPTQ and AWQ',
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Quantize a block of weights to Q8_0 and Q4_0 by hand and dequantize it',
    'Explain why one scale per block of 32 handles outliers better than one scale per tensor',
    'Compute bits per weight, including scales, and the file size of a model in each format',
    'Tell apart round-to-nearest, GPTQ and AWQ, and choose a quantization for a deployment',
  ],
  prerequisites: ['inference/precision/precision-quantization'],
  concepts: ['block-quantization', 'bits-per-weight', 'k-quants', 'gptq', 'awq', 'quantization', 'scale-zero-point'],
  references: [
    { title: 'ggml block formats (ggml-common.h, block_q4_0 and block_q8_0)', url: 'https://github.com/ggml-org/ggml/blob/master/src/ggml-common.h' },
    { title: 'gguf Python package: quants.py (NumPy reference quantizers)', url: 'https://github.com/ggml-org/llama.cpp/blob/master/gguf-py/gguf/quants.py', version: 'gguf 0.19.0' },
    { title: 'llama.cpp: quantize tool README', url: 'https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md' },
    { title: 'Frantar et al., GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers (2022)', url: 'https://arxiv.org/abs/2210.17323' },
    { title: 'Lin et al., AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration (2023)', url: 'https://arxiv.org/abs/2306.00978' },
    { title: 'Dettmers et al., LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale (2022)', url: 'https://arxiv.org/abs/2208.07339' },
    { title: 'llama-cpp-python (bindings used for the recorded runs)', url: 'https://github.com/abetlen/llama-cpp-python', version: '0.3.36' },
  ],
} satisfies LessonMeta;
