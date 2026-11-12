import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/local chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'llama-cpp',
    term: 'llama.cpp',
    short:
      'An open-source C/C++ inference engine for LLMs in GGUF format that runs on CPUs, Apple Silicon and GPUs, with a CLI and an HTTP server.',
    long: 'Its tools include llama-cli, llama-server, llama-quantize, llama-bench and llama-perplexity. Python bindings: llama-cpp-python.',
    introducedIn: 'deploy/local/llama-cpp-ollama',
    aliases: ['llama-server', 'llama-cli', 'llama-cpp-python', 'ggml'],
  },
  {
    id: 'ollama',
    term: 'Ollama',
    short:
      'A tool that downloads, stores and serves GGUF models on a local machine with one command, built on llama.cpp.',
    long: 'A Modelfile names the base model and sets the prompt template, system prompt and parameters. It serves an HTTP API on port 11434.',
    introducedIn: 'deploy/local/llama-cpp-ollama',
    aliases: ['Modelfile'],
  },
  {
    id: 'gpu-offload',
    term: 'GPU layer offloading',
    short:
      'Putting some of a model’s layers in GPU memory and running the rest on the CPU, set in llama.cpp with --n-gpu-layers (-ngl).',
    long: 'Every token passes through every layer, so the layers left on the CPU, read from slower RAM, set the speed.',
    introducedIn: 'deploy/local/llama-cpp-ollama',
    aliases: ['-ngl', 'n_gpu_layers', 'partial offload'],
  },
  {
    id: 'openai-compatible-api',
    term: 'OpenAI-compatible API',
    short:
      'An HTTP interface that accepts the same request shape as OpenAI’s /v1/chat/completions, so existing client code works by changing the base URL.',
    long: 'llama-server, vLLM, Ollama and others implement it. Only the core fields are guaranteed to match.',
    introducedIn: 'deploy/local/llama-cpp-ollama',
    aliases: ['/v1/chat/completions', '/v1/completions'],
  },
] satisfies GlossaryTerm[];
