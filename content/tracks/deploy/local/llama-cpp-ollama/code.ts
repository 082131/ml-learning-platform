// Code for the llama.cpp and Ollama lesson. run_local.py, the server and client.py ran with llama-cpp-python
// 0.3.36 (CPU build) and openai 3.49.0 on a 4-core VM, against tiny-llama-Q4_K_M.gguf from the quantization
// lesson; outputs are recorded below. The offload estimator's printout is checked against CPython 3.13 in
// src/lib/deploy/offload.test.ts. Ollama could not be run here (its model registry is not reachable).
import { annLine } from '@/lib/inference/annotate';
import { OFFLOAD_SOURCE, offloadExperiment, offloadSlots, type OffloadState } from '@/lib/deploy/offload';
import type { CodeExample } from '@/lib/types';
import clientSource from './client.py?raw';
import runLocalSource from './run_local.py?raw';

export const experiment = offloadExperiment('offload', { model: '8b', quant: 'Q4_K_M', gpu: '12', ctx: 8192 });

const st = (s: unknown) => s as OffloadState;
const R = runLocalSource.replace(/\n$/, '');

export const runLocal: CodeExample = {
  id: 'llama-run-local',
  language: 'python',
  source: R,
  annotations: [
    annLine(R, 'ctx', 'n_ctx=512,', {
      kind: 'parameter',
      title: 'n_ctx: the context to allocate',
      what: 'The KV cache is allocated for this many tokens when the model loads.',
      why: 'Memory grows linearly with it. The default in many tools is far below the model’s maximum (131,072 for Llama 3.1) for that reason.',
    }),
    annLine(R, 'threads', 'n_threads=4,', {
      kind: 'parameter',
      title: 'n_threads',
      what: 'CPU threads for the layers that run on the CPU.',
      why: 'Use the number of physical (performance) cores. More threads than cores usually slows generation, which is limited by memory bandwidth anyway.',
    }),
    annLine(R, 'ngl', 'n_gpu_layers=0,', {
      kind: 'parameter',
      title: 'n_gpu_layers (-ngl)',
      what: 'How many transformer layers to put in GPU memory. -1 (or a large number such as 99) means all.',
      why: 'The experiment below estimates the largest value that fits. Layers left on the CPU set the speed.',
    }),
    annLine(R, 'call', 'out = llm("the model", max_tokens=8, temperature=0.0)', {
      kind: 'framework',
      title: 'Generate',
      what: 'Plain completion, greedy. create_chat_completion applies the chat template stored in the GGUF instead.',
      why: 'This random-weight model has no chat template, and its output is meaningless; the calls are the same for a real model.',
    }),
  ],
};

export const runLocalOutput: CodeExample = {
  id: 'llama-run-local-output',
  language: 'bash',
  source: `$ python run_local.py
'OOOOOOOOOOOOOOOOOOOO' length
512 tokens of context, 269 tokens in the vocabulary

# from the load log (verbose=True)
print_info: file type   = Q4_K - Medium
print_info: file size   = 14.62 MiB (4.82 BPW)
print_info: model params          = 25.45 M
load_tensors:   CPU_Mapped model buffer size =    14.20 MiB
llama_kv_cache: size =    4.00 MiB (   512 cells,   8 layers,  1/1 seqs), K (f16):    2.00 MiB, V (f16):    2.00 MiB`,
  annotations: [],
};

export const serverRun: CodeExample = {
  id: 'llama-server-run',
  language: 'bash',
  source: `# The Python package's server (pip install 'llama-cpp-python[server]'); llama.cpp's own binary is
# llama-server -m tiny-llama-Q4_K_M.gguf -c 512 -t 4 --port 8080, with the same endpoints.
$ python -m llama_cpp.server --model tiny-llama-Q4_K_M.gguf --n_ctx 512 --n_threads 4 --port 8080
INFO:     Uvicorn running on http://localhost:8080 (Press CTRL+C to quit)

$ curl -s localhost:8080/v1/models
{"object":"list","data":[{"id":"tiny-llama-Q4_K_M.gguf","object":"model","owned_by":"me","permissions":[]}]}

$ curl -s localhost:8080/v1/completions -H 'Content-Type: application/json' \\
    -d '{"prompt": "the model", "max_tokens": 8, "temperature": 0}'
{"id":"cmpl-a5776425-...","object":"text_completion","created":1794482621,"model":"tiny-llama-Q4_K_M.gguf",
 "choices":[{"text":"OOOOOOOOOOOOOOOOOOOO","index":0,"logprobs":null,"finish_reason":"length"}],
 "usage":{"prompt_tokens":15,"completion_tokens":309,"total_tokens":324}}`,
  annotations: [],
};

const C = clientSource.replace(/\n$/, '');
export const client: CodeExample = {
  id: 'llama-openai-client',
  language: 'python',
  source: C,
  annotations: [
    annLine(C, 'base', 'client = OpenAI(base_url=', {
      kind: 'framework',
      title: 'Point the OpenAI client at your server',
      what: 'Only the base URL changes. The key is required by the client library but ignored by a local server.',
      why: 'Code written against an OpenAI-compatible API runs against llama.cpp, Ollama (port 11434) or vLLM without changes.',
    }),
  ],
};

export const offloadCode: CodeExample = {
  id: 'offload-estimate',
  language: 'python',
  source: OFFLOAD_SOURCE,
  slots: Object.fromEntries(['shape', 'label', 'bpw', 'ctx', 'gpu'].map((k) => [k, (s: unknown) => offloadSlots(st(s))[k]!])),
  annotations: [
    annLine(OFFLOAD_SOURCE, 'layer', 'layer = (params - 2 * embed)', {
      kind: 'math',
      title: 'Size of one layer',
      what: 'All parameters except the embedding table and the output matrix, spread evenly over the layers.',
      why: 'Every layer of a Llama model has the same shapes, so the layers are equal in size.',
    }),
    annLine(OFFLOAD_SOURCE, 'kv', 'kv_layer = 2 * kv_heads', {
      kind: 'math',
      title: 'KV cache per layer',
      what: 'Keys and values for every token of the context, in F16: 2 × 8 × 128 × 8192 × 2 bytes = 32 MiB per layer for Llama 3.1 8B.',
      why: 'An offloaded layer keeps its KV cache on the GPU too, so a longer context leaves room for fewer layers.',
    }),
    annLine(OFFLOAD_SOURCE, 'loop', 'while ngl < layers and', {
      kind: 'framework',
      title: 'The largest -ngl that fits',
      what: 'Adds layers while their weights and KV cache still fit in what is free.',
      why: 'If you ask llama.cpp for more, loading fails with an out-of-memory error from the GPU backend.',
    }),
    annLine(OFFLOAD_SOURCE, 'time', 'seconds = (gpu_read', {
      kind: 'math',
      title: 'Bandwidth-bound time per token',
      what: 'Bytes read on each side divided by that side’s bandwidth, added together because the layers run one after another.',
      why: 'Generating one token reads every weight once. A ceiling, not a measurement: real speeds are lower.',
    }),
  ],
};

export const modelfile: CodeExample = {
  id: 'ollama-modelfile',
  language: 'bash',
  source: `# Not run here: Ollama's registry is not reachable from our build container.
$ cat Modelfile
FROM ./llama-1b-Q4_K_M.gguf          # a local GGUF file (or a registry name such as llama3.2:1b)
PARAMETER temperature 0.2
PARAMETER num_ctx 8192                # Ollama's name for llama.cpp's -c
SYSTEM "You answer questions about our deployment runbooks in two sentences."

$ ollama create runbook-bot -f Modelfile
$ ollama run runbook-bot "How do I roll back a model release?"
$ curl http://localhost:11434/api/chat -d '{"model": "runbook-bot", "stream": false,
    "messages": [{"role": "user", "content": "How do I roll back?"}]}'
# Ollama also serves the OpenAI-compatible API at http://localhost:11434/v1`,
  annotations: [],
};
