// Code for the Model Deployment capstone. llama-server.yaml was accepted by a K3s v1.33.5 API server
// (`kubectl apply --dry-run=server`); pods were not started, because the build container cannot run them. The
// re-quantization error in index.mdx was recorded with llama-cpp-python 0.3.36.
import { annLine } from '@/lib/inference/annotate';
import type { CodeExample, ProjectBrief } from '@/lib/types';
import manifestSource from './llama-server.yaml?raw';

const M = manifestSource.replace(/\n$/, '');

export const manifestCode: CodeExample = {
  id: 'capstone-llama-manifest',
  language: 'yaml',
  source: M,
  annotations: [
    annLine(M, 'surge', 'rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }', {
      kind: 'parameter',
      title: 'Never below capacity',
      what: 'A new pod must be Ready before an old one is removed.',
      why: 'LLM pods take long to become ready; with maxUnavailable above 0 a rollout briefly serves with fewer replicas.',
    }),
    annLine(M, 'fetch', '- name: fetch-model', {
      kind: 'framework',
      title: 'Model outside the image',
      what: 'An init container downloads the GGUF file into a shared volume before the server starts.',
      why: 'The image stays small and generic; the model version is configuration. A registry or object store URL goes here.',
    }),
    annLine(M, 'args', 'args: ["-m", "/models/model.gguf", "--host", "0.0.0.0", "--port", "8080",', {
      kind: 'parameter',
      title: 'llama-server flags',
      what: '-c is the context per server, split across --parallel slots; --metrics exposes Prometheus metrics at /metrics.',
      why: 'Two slots of 2,048 tokens each: concurrency and context compete for the same KV-cache memory.',
    }),
    annLine(M, 'startup', 'failureThreshold: 60', {
      kind: 'parameter',
      title: 'Room to load',
      what: 'Up to 60 × 5 s = 5 minutes for the model to load before liveness checks begin.',
      why: '/health answers 503 while the model loads. Without a startup probe, liveness would restart a pod that is still loading.',
    }),
    annLine(M, 'mem', 'limits: { memory: 3Gi }', {
      kind: 'parameter',
      title: 'Memory from the file size',
      what: 'The limit covers the model file, the KV cache for -c tokens, and the runtime.',
      why: 'A Q4_K_M 1B model is under 1 GiB; a Q8_0 one nearly doubles it. Size the limit from what you measured.',
    }),
  ],
};

export const dryRun: CodeExample = {
  id: 'capstone-dry-run',
  language: 'bash',
  source: `$ kubectl apply --dry-run=server -f llama-server.yaml
deployment.apps/llm created (server dry run)
service/llm created (server dry run)
horizontalpodautoscaler.autoscaling/llm created (server dry run)`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Take a small open language model from its Hugging Face files to a quantized GGUF served on a local Kubernetes cluster: choose the quantization from measurements, automate the conversion as a pipeline with a quality gate, and roll out a new version without dropping requests.',
  dataset:
    'A small instruct model you are allowed to download, such as Qwen2.5-0.5B-Instruct or Llama-3.2-1B-Instruct (accept its licence first), and a text file of a few thousand tokens for perplexity (for example a WikiText-2 test excerpt). Use 20 to 50 real prompts from your own work for latency tests.',
  milestones: [
    'Convert the model to a BF16 GGUF with convert_hf_to_gguf.py and run it with llama-cli; record the file size and the llama.cpp commit',
    'Quantize to Q8_0, Q4_K_M and Q4_0; for each, measure file size, perplexity on your text (llama-perplexity) and tokens per second (llama-bench), three runs each',
    'State a quality tolerance before looking at the results (for example perplexity at most 5% above BF16), then pick the variant to ship and write down why',
    'Write the conversion as a pipeline (a Python script, Makefile or KFP pipeline) whose steps are cached by input hash and which refuses to publish a model that fails the gate',
    'Run llama-server in a container locally, call /v1/chat/completions, and check /health and /metrics',
    'Create a local cluster (kind, k3d or minikube) and deploy the reference manifests with your model URL; check that pods become Ready and the Service answers',
    'Load test with increasing concurrency; record p50 and p99 latency and tokens per second, and watch the autoscaler react',
    'Publish a second version (another quantization or a new model) and roll it out while a load test runs; show that no request failed, then roll back',
    'Write the report: setup, measurements table, gate and decision, cluster results, rollout evidence, and what you would change for a GPU or a larger model',
  ],
  rubric: [
    {
      criterion: 'Measured choice',
      detail:
        'Size, perplexity and speed for every variant on the same machine and text, repeated runs with their spread, and a tolerance stated before the results.',
    },
    {
      criterion: 'Pipeline',
      detail:
        'Conversion and quantization run from one command; unchanged steps are skipped; the gate blocks a model that misses the tolerance; versions are recorded.',
    },
    {
      criterion: 'Kubernetes',
      detail:
        'Requests and limits sized from measurements, startup and readiness probes on /health, a rolling update that keeps capacity, and an autoscaler with a stabilization window.',
    },
    {
      criterion: 'Rollout evidence',
      detail:
        'A load test across a rollout and a rollback, with the error count and latency during each.',
    },
    {
      criterion: 'Reproducibility',
      detail:
        'Model and llama.cpp versions, hardware, flags and commands are written down; someone else can rebuild the same files and table.',
    },
  ],
  hints: [
    'Quantize every variant from the BF16 file, not from another quantized one.',
    'Perplexity is only comparable with the same text, context length and tokenizer. Use llama-perplexity with the same -c for every file.',
    'If pods restart while loading, look at the startup probe and the memory limit first (kubectl describe pod shows OOMKilled).',
    'kind and k3d can load a local image into the cluster (kind load docker-image), so you do not need a registry for the server image.',
    'A rollout drops requests when old pods stop before in-flight requests finish: keep maxUnavailable at 0 and give the server a grace period.',
  ],
};

export const reportTemplate: CodeExample = {
  id: 'capstone-deploy-report',
  language: 'bash',
  source: `## Setup
Model: Qwen2.5-0.5B-Instruct (Hugging Face revision ...). llama.cpp commit ... ; 8-core laptop CPU, 16 GB RAM.
Cluster: kind v0.x, 1 node; llama-server image ghcr.io/ggml-org/llama.cpp:server@sha256:...

## Quantization (3 runs each, perplexity on 4,096 tokens of WikiText-2 test, -c 512)
| Variant | Size (MiB) | Bits/weight | Perplexity | vs BF16 | tokens/s (range) |
| BF16    |            |             |            |   0.0%  |                  |
| Q8_0    |            |             |            |         |                  |
| Q4_K_M  |            |             |            |         |                  |
| Q4_0    |            |             |            |         |                  |
Tolerance, set before measuring: perplexity at most 5% above BF16. Shipped: ... because ...

## Cluster
Requests/limits, probes, p50/p99 at 1, 4 and 8 concurrent requests, replicas over time.

## Rollout
Version 1 -> 2 under load: requests sent, failed, p99 during the rollout. Rollback: same.`,
  annotations: [],
};
