import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/llm-serving/vllm-kserve',
  title: 'Serving LLMs at scale: vLLM, paged KV cache, KServe and Triton',
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Explain how PagedAttention stores the KV cache in fixed-size blocks and why that fits more sequences',
    'Compute how many concurrent sequences fit in a KV-cache budget, contiguous versus paged',
    'Start vLLM with the flags that control memory and context, and call its OpenAI-compatible API',
    'Deploy an LLM on Kubernetes with a KServe InferenceService, and know when Triton fits better',
  ],
  prerequisites: ['deploy/local/llama-cpp-ollama', 'deploy/kubernetes/autoscaling-rollouts', 'inference/throughput/batching-throughput'],
  concepts: ['vllm', 'paged-attention', 'continuous-batching', 'internal-fragmentation', 'kserve', 'triton-inference-server', 'tensor-parallelism'],
  references: [
    { title: 'Kwon et al., Efficient Memory Management for Large Language Model Serving with PagedAttention (SOSP 2023)', url: 'https://arxiv.org/abs/2309.06180' },
    { title: 'vLLM: engine arguments (gpu-memory-utilization, max-model-len, block-size)', url: 'https://docs.vllm.ai/en/latest/configuration/engine_args.html' },
    { title: 'vLLM: OpenAI-compatible server', url: 'https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html' },
    { title: 'KServe: InferenceService and the Hugging Face serving runtime', url: 'https://kserve.github.io/website/' },
    { title: 'NVIDIA Triton: model configuration and dynamic batching', url: 'https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html' },
  ],
} satisfies LessonMeta;
