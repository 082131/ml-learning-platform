import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/formats chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'gguf',
    term: 'GGUF',
    short:
      'A single-file model format used by llama.cpp and Ollama: a header, key-value metadata (architecture, tokenizer, settings) and tensors that may be quantized.',
    long: 'Because the tokenizer and hyperparameters are inside the file, one .gguf is enough to run the model.',
    introducedIn: 'deploy/formats/onnx-gguf',
    aliases: ['.gguf', 'GGML'],
  },
  {
    id: 'tensor-alignment',
    term: 'Tensor alignment',
    short:
      'Padding a file so every tensor’s data starts at a multiple of a fixed number of bytes (32 by default in GGUF).',
    long: 'Aligned data can be memory-mapped and read with fast vector instructions without copying.',
    introducedIn: 'deploy/formats/onnx-gguf',
    aliases: ['alignment', 'padding'],
  },
] satisfies GlossaryTerm[];
