import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/foundations chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'model-server',
    term: 'Model server',
    short: 'A long-running program that loads a model once and answers prediction requests over the network.',
    long: 'It keeps the weights in memory, batches requests where it can and exposes health checks. Examples: a FastAPI app, llama-server, vLLM, Triton.',
    introducedIn: 'deploy/foundations/deployment-map',
    aliases: ['inference server', 'serving runtime'],
  },
  {
    id: 'model-artifact',
    term: 'Model artifact',
    short:
      'The file or files a training run produces and deployment consumes: weights plus everything needed to use them.',
    long: 'Typically weights (safetensors, ONNX or GGUF), the config, the tokenizer or preprocessing, and a record of the code and data versions that produced it.',
    introducedIn: 'deploy/foundations/deployment-map',
    aliases: ['model file', 'weights file'],
  },
  {
    id: 'deployment-target',
    term: 'Deployment target',
    short:
      'The hardware and environment a model runs on in production: a laptop, a phone, one GPU server, a Kubernetes cluster or a batch job.',
    long: 'The target decides the format, the runtime, how much quantization is needed and how the service scales.',
    introducedIn: 'deploy/foundations/deployment-map',
    aliases: ['target hardware'],
  },
] satisfies GlossaryTerm[];
