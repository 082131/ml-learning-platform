import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/foundations/deployment-map',
  title: 'The deployment map: from a trained model to a running service',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Name the stages a model passes through between training and serving users',
    'Place tools such as ONNX, GGUF, llama.cpp, Ollama, vLLM, Triton, KServe and Kubernetes on that map',
    'Choose a format, runtime and packaging for a given model and target hardware, and say why',
    'Estimate whether a model fits a device from its parameter count and bits per weight',
  ],
  prerequisites: ['inference/basics/what-is-inference'],
  concepts: ['model-server', 'model-artifact', 'deployment-target', 'onnx', 'gguf', 'kubernetes'],
  references: [
    { title: 'ONNX Runtime documentation', url: 'https://onnxruntime.ai/docs/' },
    { title: 'llama.cpp README (ggml-org/llama.cpp)', url: 'https://github.com/ggml-org/llama.cpp' },
    { title: 'vLLM documentation', url: 'https://docs.vllm.ai/' },
    { title: 'KServe documentation', url: 'https://kserve.github.io/website/' },
    { title: 'Kubernetes documentation: concepts', url: 'https://kubernetes.io/docs/concepts/' },
  ],
} satisfies LessonMeta;
