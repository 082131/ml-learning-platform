import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/formats/onnx-gguf',
  title: 'Model formats: ONNX graphs and GGUF files',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain what a checkpoint, a safetensors file, an ONNX file and a GGUF file each contain',
    'Read a GGUF file header byte by byte: magic, version, metadata and tensor descriptions',
    'Decide which format to export to for a given runtime',
    'Convert a Hugging Face model to GGUF and quantize it with llama.cpp tools',
  ],
  prerequisites: ['deploy/quantization/llm-quantization', 'inference/runtimes/onnx-serving'],
  concepts: ['gguf', 'onnx', 'safetensors', 'tensor-alignment', 'checkpoint'],
  references: [
    { title: 'GGUF specification (ggml docs/gguf.md)', url: 'https://github.com/ggml-org/ggml/blob/master/docs/gguf.md' },
    { title: 'gguf Python package (GGUFWriter, GGUFReader)', url: 'https://pypi.org/project/gguf/', version: 'gguf 0.19.0' },
    { title: 'llama.cpp: convert_hf_to_gguf.py', url: 'https://github.com/ggml-org/llama.cpp/blob/master/convert_hf_to_gguf.py' },
    { title: 'ONNX: Open Neural Network Exchange, IR specification', url: 'https://onnx.ai/onnx/repo-docs/IR.html', version: 'onnx 1.23' },
    { title: 'Hugging Face Optimum: export to ONNX', url: 'https://huggingface.co/docs/optimum-onnx/' },
  ],
} satisfies LessonMeta;
