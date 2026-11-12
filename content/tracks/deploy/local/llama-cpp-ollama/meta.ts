import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/local/llama-cpp-ollama',
  title: 'Running LLMs with llama.cpp and Ollama',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Run a GGUF model with llama.cpp from Python and from its OpenAI-compatible server',
    'Choose the context size, threads and GPU layers (-ngl) for a machine',
    'Estimate how many layers fit in GPU memory and the token rate that results',
    'Package a model for Ollama with a Modelfile and call its API',
  ],
  prerequisites: ['deploy/formats/onnx-gguf', 'inference/memory/memory-estimation'],
  concepts: ['llama-cpp', 'ollama', 'gpu-offload', 'openai-compatible-api', 'kv-cache', 'memory-bandwidth'],
  references: [
    { title: 'llama.cpp: llama-server README (endpoints and flags)', url: 'https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md' },
    { title: 'llama.cpp: llama-cli and common flags', url: 'https://github.com/ggml-org/llama.cpp/blob/master/tools/main/README.md' },
    { title: 'llama-cpp-python documentation', url: 'https://llama-cpp-python.readthedocs.io/', version: '0.3.36' },
    { title: 'Ollama: Modelfile reference', url: 'https://github.com/ollama/ollama/blob/main/docs/modelfile.md' },
    { title: 'Ollama: API reference', url: 'https://github.com/ollama/ollama/blob/main/docs/api.md' },
  ],
} satisfies LessonMeta;
