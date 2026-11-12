import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'partial',
    type: 'choice',
    prompt:
      'An 8B model in Q8_0 runs at about 23 tokens/s with 30 of 32 layers on an 8 GB GPU. A smaller quantization would put all 32 layers on the GPU. What explains the large difference this makes?',
    options: [
      {
        text: 'The CPU layers are read from RAM at a fraction of the GPU’s bandwidth, and each token has to wait for them',
        correct: true,
        explain:
          'In the estimator, 0.95 GiB from RAM at 60 GB/s takes longer than 6.47 GiB from the GPU at 272 GB/s. The slowest part sets the pace.',
      },
      {
        text: 'Moving activations between GPU and CPU for each layer costs more than reading the weights',
        correct: false,
        explain: 'The activations for one token are a few kilobytes. The cost is reading gigabytes of weights from slow memory.',
      },
      {
        text: 'llama.cpp disables batching whenever any layer is on the CPU',
        correct: false,
        explain: 'Batching is independent of offloading. The time is lost to memory reads.',
      },
    ],
  },
  {
    id: 'ctx-memory',
    type: 'numeric',
    prompt:
      'Llama 3.1 8B has 32 layers, 8 KV heads and a head dimension of 128. How many GiB does its F16 KV cache need for a context of 32,768 tokens?',
    answer: 4,
    tolerance: 0.01,
    hint: '2 (K and V) × layers × kv_heads × head_dim × tokens × 2 bytes.',
    explain: '2 × 32 × 8 × 128 × 32,768 × 2 = 4,294,967,296 bytes = 4 GiB. That is why raising -c can push layers off the GPU.',
  },
  {
    id: 'usage',
    type: 'choice',
    prompt:
      'The recorded server reply reports completion_tokens 309 for max_tokens 8. What is the most likely reason?',
    options: [
      {
        text: 'The server ignored max_tokens and generated 309 tokens',
        correct: false,
        explain: 'finish_reason is "length" after 8 tokens, and the text is 20 characters long. Generation stopped where it should.',
      },
      {
        text: 'The count comes from re-tokenizing the text, and this toy vocabulary splits it into single bytes',
        correct: true,
        explain:
          'With a real vocabulary the two counts agree closely. The lesson: check usage numbers before you bill or rate-limit on them.',
      },
      {
        text: 'Usage counts characters, not tokens, in llama.cpp-based servers',
        correct: false,
        explain: '20 characters would not give 309 either. The field is meant to count tokens.',
      },
    ],
  },
  {
    id: 'which-tool',
    type: 'choice',
    prompt:
      'A team wants five colleagues to try a quantized model on their own laptops this afternoon, with a chat API. What is the simplest fit?',
    options: [
      {
        text: 'Deploy vLLM on a Kubernetes GPU node with a KServe InferenceService',
        correct: false,
        explain: 'That is the production path for many users on GPUs, and far more setup than five laptops need.',
      },
      {
        text: 'Export the model to ONNX and run it with ONNX Runtime',
        correct: false,
        explain: 'Possible for some models, but you would build the tokenizer, KV cache handling and chat API yourself.',
      },
      {
        text: 'Ollama with a Modelfile around the GGUF file',
        correct: true,
        explain: 'One install and one command per laptop, with a local API on port 11434 that also speaks the OpenAI format.',
      },
    ],
  },
];

export const nglExercise: Exercise = {
  id: 'max-ngl',
  prompt:
    'Write `max_ngl(layers, layer_gib, kv_layer_gib, gpu_gib, reserve_gib=0.5)` returning the largest number of layers that fits on the GPU.',
  starter: `def max_ngl(layers, layer_gib, kv_layer_gib, gpu_gib, reserve_gib=0.5):
    pass`,
  hints: [
    'Each offloaded layer needs layer_gib + kv_layer_gib.',
    'Free memory is gpu_gib - reserve_gib (and 0 if there is no GPU).',
    'Use integer division of the free memory by the per-layer need, then cap at layers.',
  ],
  solution: `def max_ngl(layers, layer_gib, kv_layer_gib, gpu_gib, reserve_gib=0.5):
    free = gpu_gib - reserve_gib if gpu_gib > 0 else 0
    if free <= 0:
        return 0
    return min(layers, int(free // (layer_gib + kv_layer_gib)))`,
  explanation:
    'The same rule as the estimator. In practice, start from this number, watch the GPU memory llama.cpp reports while loading, and lower it if loading fails.',
  tests: `assert max_ngl(32, 0.216, 0.03125, 8) == 30, 'Q8_0 8B on 8 GB at 8192 tokens: 30 layers'
assert max_ngl(32, 0.123, 0.03125, 12) == 32, 'Q4_K_M 8B on 12 GB: all 32 layers'
assert max_ngl(32, 0.123, 0.5, 12) == 18, 'at 131,072 tokens the KV cache leaves room for 18'
assert max_ngl(32, 0.123, 0.03125, 0) == 0, 'no GPU: 0 layers'`,
};
