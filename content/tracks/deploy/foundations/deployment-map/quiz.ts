import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pair',
    type: 'choice',
    prompt: 'Which pairing of format and runtime is a real, common combination?',
    options: [
      { text: 'GGUF files served by vLLM’s paged KV cache, as its default format', correct: false, explain: 'vLLM’s main format is safetensors (BF16, AWQ, GPTQ, FP8). Its GGUF support is limited; GGUF is llama.cpp’s format.' },
      { text: 'ONNX files run by llama.cpp on CPUs', correct: false, explain: 'llama.cpp reads only GGUF.' },
      { text: 'ONNX files run by ONNX Runtime, or by Triton with its ONNX backend', correct: true, explain: 'ONNX is a graph format; ONNX Runtime executes it, and Triton can host it with dynamic batching.' },
    ],
  },
  {
    id: 'size',
    type: 'numeric',
    prompt: 'A 3-billion-parameter model is quantized to 4.5 bits per weight. About how many GB (10^9 bytes) do its weights take? One decimal.',
    answer: 1.7,
    tolerance: 0.05,
    hint: 'parameters × bits per weight / 8 bytes.',
    explain: '3 × 10^9 × 4.5 / 8 = 1.6875 × 10^9 bytes, about 1.7 GB, before the KV cache and runtime overhead.',
  },
  {
    id: 'k8s-role',
    type: 'choice',
    prompt: 'In this map, which job belongs to Kubernetes rather than to the inference runtime?',
    options: [
      { text: 'Batching requests together so the GPU stays busy', correct: false, explain: 'Batching happens inside the runtime (vLLM, Triton, llama.cpp).' },
      { text: 'Keeping three copies running on machines with free GPUs, and replacing failed ones', correct: true, explain: 'Kubernetes schedules and supervises containers; it knows nothing about tokens or tensors.' },
      { text: 'Storing the KV cache in blocks', correct: false, explain: 'That is the engine’s memory manager (PagedAttention in vLLM).' },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the stages of shipping a model in order.',
    items: ['Train and evaluate in a pipeline', 'Register the model version', 'Convert and quantize to the runtime’s format', 'Package the server in a container', 'Deploy and scale on the cluster', 'Monitor, and roll back if needed'],
    explain: 'Each stage consumes the previous one’s artifact; skipping registration loses track of what is running.',
  },
];
