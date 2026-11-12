import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/llm-serving chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'vllm',
    term: 'vLLM',
    short:
      'An open-source LLM serving engine for GPUs that uses PagedAttention and continuous batching to serve many requests at once.',
    long: 'It serves an OpenAI-compatible API (vllm serve <model>) and supports tensor parallelism and quantized weights such as AWQ and GPTQ.',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['vllm serve'],
  },
  {
    id: 'paged-attention',
    term: 'PagedAttention',
    short:
      'Storing each sequence’s KV cache in fixed-size blocks (16 tokens by default in vLLM) allocated on demand, like pages of virtual memory.',
    long: 'Memory is no longer reserved for the longest possible sequence, so far more sequences fit at once. Blocks can also be shared between sequences with the same prefix.',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['paged KV cache', 'block table'],
  },
  {
    id: 'continuous-batching',
    term: 'Continuous batching',
    short:
      'Adding new requests to the running batch and removing finished ones after every generation step, instead of waiting for a whole batch to finish.',
    long: 'It keeps the GPU busy when requests have very different lengths. Also called iteration-level scheduling.',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['in-flight batching', 'iteration-level scheduling'],
  },
  {
    id: 'internal-fragmentation',
    term: 'Internal fragmentation',
    short:
      'Memory that is reserved but unused inside an allocation, such as the empty tail of a sequence’s last KV block.',
    long: 'Contiguous KV allocation wastes everything between a sequence’s real length and the maximum length; paging limits the waste to less than one block per sequence.',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['fragmentation'],
  },
  {
    id: 'kserve',
    term: 'KServe',
    short:
      'A Kubernetes add-on that turns an InferenceService manifest into a model server with autoscaling, canary rollouts and a standard prediction API.',
    long: 'It ships runtimes for scikit-learn, ONNX, Triton and Hugging Face models (which can run vLLM).',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['InferenceService'],
  },
  {
    id: 'triton-inference-server',
    term: 'Triton Inference Server',
    short:
      'NVIDIA’s model server that serves many models and frameworks (ONNX, TensorRT, PyTorch, Python) from a model repository, with dynamic batching.',
    long: 'Each model has a config.pbtxt that sets its inputs, outputs, batch sizes and instance counts.',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['Triton', 'config.pbtxt'],
  },
  {
    id: 'tensor-parallelism',
    term: 'Tensor parallelism',
    short:
      'Splitting each weight matrix of a model across several GPUs so they compute one layer together; set in vLLM with --tensor-parallel-size.',
    long: 'It lets a model larger than one GPU’s memory run, at the cost of communication between GPUs every layer.',
    introducedIn: 'deploy/llm-serving/vllm-kserve',
    aliases: ['--tensor-parallel-size', 'TP'],
  },
] satisfies GlossaryTerm[];
