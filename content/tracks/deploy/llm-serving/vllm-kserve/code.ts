// Code for the LLM serving lesson. The paged KV-cache model's printout is checked against CPython 3.13 in
// src/lib/deploy/pagedKv.test.ts. The vLLM, KServe and Triton examples were not run: the build container has no
// GPU and no KServe installation. They follow the documentation cited in the references.
import { annLine } from '@/lib/inference/annotate';
import { PAGED_SOURCE, pagedExperiment, pagedSlots, type PagedState } from '@/lib/deploy/pagedKv';
import type { CodeExample } from '@/lib/types';

export const experiment = pagedExperiment('paged', { budget: 16, maxLen: 8192, block: 16 });

const st = (s: unknown) => s as PagedState;
const P = PAGED_SOURCE;

export const pagedCode: CodeExample = {
  id: 'paged-kv',
  language: 'python',
  source: P,
  slots: Object.fromEntries(['budget', 'maxLen', 'block'].map((k) => [k, (s: unknown) => pagedSlots(st(s))[k]!])),
  annotations: [
    annLine(P, 'per', 'per_token = 2 * 32 * 8 * 128 * 2', {
      kind: 'math',
      title: '128 KiB per token',
      what: 'Keys and values (2) × 32 layers × 8 KV heads × 128 dimensions × 2 bytes (F16).',
      why: 'The same formula as in the memory and llama.cpp lessons. Every token of every running sequence costs this much.',
    }),
    annLine(P, 'contig', 'contiguous = min(len(lengths), budget // (max_len * per_token))', {
      kind: 'math',
      title: 'Contiguous allocation',
      what: 'Each sequence gets one block of memory big enough for max_len tokens, reserved when it starts.',
      why: 'The server cannot know how long an answer will be, so it must reserve the maximum. Most of it stays empty.',
    }),
    annLine(P, 'blocks', 'total_blocks = budget // (block * per_token)', {
      kind: 'math',
      title: 'The block pool',
      what: 'The KV memory cut into fixed blocks of block tokens each.',
      why: 'vLLM allocates blocks on demand and keeps a block table per sequence that maps its positions to blocks, like a page table.',
    }),
    annLine(P, 'need', 'need = math.ceil(n / block)', {
      kind: 'math',
      title: 'Blocks for one sequence',
      what: 'A sequence of n tokens uses ⌈n / block⌉ blocks; only the last one can be partly empty.',
      why: 'So the waste per sequence is under one block: internal fragmentation of at most block − 1 tokens.',
    }),
  ],
};

export const vllmServe: CodeExample = {
  id: 'vllm-serve',
  language: 'bash',
  source: `# Not run here: needs an NVIDIA GPU. pip install vllm, then:
vllm serve meta-llama/Llama-3.1-8B-Instruct \\
    --max-model-len 8192 \\
    --gpu-memory-utilization 0.90 \\
    --block-size 16 \\
    --tensor-parallel-size 1 \\
    --port 8000

# Same OpenAI-compatible API as llama.cpp's server
curl http://localhost:8000/v1/chat/completions -H 'Content-Type: application/json' -d '{
  "model": "meta-llama/Llama-3.1-8B-Instruct",
  "messages": [{"role": "user", "content": "Why page the KV cache?"}], "max_tokens": 64}'`,
  annotations: [
    { id: 'mml', range: { line: 3 }, kind: 'parameter', title: '--max-model-len', what: 'The longest sequence (prompt plus output) the server accepts.', why: 'It must fit in the KV memory for at least one sequence. Lower it if startup fails with a KV-cache error.' },
    { id: 'gmu', range: { line: 4 }, kind: 'parameter', title: '--gpu-memory-utilization', what: 'The share of GPU memory vLLM may use: weights, activations, then the rest becomes KV blocks.', why: 'On an 80 GB GPU, 0.90 is 72 GB; minus about 16 GB of BF16 weights and working memory, most of the remainder holds the KV cache.' },
    { id: 'bs', range: { line: 5 }, kind: 'parameter', title: '--block-size', what: 'Tokens per KV block. 16 is the default on GPUs.', why: 'Small blocks waste less per sequence; the experiment shows the difference is small either way.' },
    { id: 'tp', range: { line: 6 }, kind: 'parameter', title: '--tensor-parallel-size', what: 'How many GPUs to split each weight matrix across.', why: 'Set it to 2, 4 or 8 for models whose weights do not fit on one GPU, such as 70B in BF16.' },
  ],
};

export const kserve: CodeExample = {
  id: 'kserve-isvc',
  language: 'yaml',
  source: `# Not run here: needs a cluster with KServe installed and a GPU node.
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llama-8b
spec:
  predictor:
    minReplicas: 1
    maxReplicas: 3
    model:
      modelFormat:
        name: huggingface            # KServe's Hugging Face runtime, which uses vLLM for LLMs
      args:
        - --model_name=llama-8b
        - --model_id=meta-llama/Llama-3.1-8B-Instruct
        - --max-model-len=8192
      resources:
        requests: {cpu: "4", memory: 24Gi, nvidia.com/gpu: "1"}
        limits: {cpu: "8", memory: 32Gi, nvidia.com/gpu: "1"}`,
  annotations: [
    { id: 'kind', range: { line: 3 }, kind: 'framework', title: 'InferenceService', what: 'A KServe custom resource. Its controller creates the Deployment, Service, autoscaling and routing for you.', why: 'One object instead of the four or five you wrote by hand in the Kubernetes lessons.' },
    { id: 'fmt', range: { line: 12 }, kind: 'parameter', title: 'modelFormat: huggingface', what: 'Selects the serving runtime. Other formats: sklearn, onnx, triton, and more.', why: 'KServe picks a matching ServingRuntime container image for the model format.' },
    { id: 'gpu', range: { line: 18 }, kind: 'parameter', title: 'GPU request', what: 'The same nvidia.com/gpu request as in the Kubernetes lesson.', why: 'KServe still relies on the scheduler: without a free GPU node, the predictor pod stays Pending.' },
  ],
};

export const triton: CodeExample = {
  id: 'triton-config',
  language: 'bash',
  source: `# model_repository/digits/config.pbtxt for Triton Inference Server (not run here)
name: "digits"
platform: "onnxruntime_onnx"
max_batch_size: 64
input  [ { name: "pixels", data_type: TYPE_FP32, dims: [ 64 ] } ]
output [ { name: "logits", data_type: TYPE_FP32, dims: [ 10 ] } ]
dynamic_batching { max_queue_delay_microseconds: 2000 }
instance_group [ { count: 2, kind: KIND_GPU } ]`,
  annotations: [],
};
