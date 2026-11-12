import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/capstone/quantize-and-ship',
  title: 'Capstone: quantize, package and ship a model to Kubernetes',
  level: 'advanced',
  minutes: 240,
  kind: 'capstone',
  objectives: [
    'Build a pipeline that converts, quantizes and evaluates a small language model',
    'Choose a quantization from measured size, speed and quality, not from defaults',
    'Package the model server in a container with health checks and deploy it to a local Kubernetes cluster',
    'Autoscale it, roll out a new version without dropping requests, and write up the results',
  ],
  prerequisites: ['deploy/llm-serving/vllm-kserve', 'deploy/pipelines/data-model-pipelines'],
  concepts: ['gguf', 'block-quantization', 'kubernetes', 'horizontal-pod-autoscaler', 'rolling-update', 'model-registry'],
  references: [
    { title: 'kind: Kubernetes in Docker', url: 'https://kind.sigs.k8s.io/' },
    { title: 'llama.cpp: perplexity tool', url: 'https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md' },
    { title: 'llama.cpp: llama-bench', url: 'https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md' },
  ],
} satisfies LessonMeta;
