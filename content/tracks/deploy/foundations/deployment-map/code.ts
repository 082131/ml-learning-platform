// Code for the deployment map lesson. The planner is a set of stated rules of thumb, unit-tested in
// src/lib/deploy/stack.test.ts. The commands below are the ones the later lessons of this track ran or show.
import { stackExperiment } from '@/lib/deploy/stack';
import type { CodeExample } from '@/lib/types';

export const experiment = stackExperiment('stack', { model: 'llm-8b', target: 'laptop' });

export const journey: CodeExample = {
  id: 'deploy-journey',
  language: 'bash',
  source: `# 1. Pipeline: train, evaluate, register (lesson 2)
python pipeline.py --data v2 --C 1.0            # registers the model only if it beats production

# 2. Format: convert and quantize (lessons 5 and 6)
python convert_hf_to_gguf.py ./model --outtype bf16 --outfile model-bf16.gguf
llama-quantize model-bf16.gguf model-Q4_K_M.gguf Q4_K_M

# 3. Runtime: serve it (lessons 7 and 8)
llama-server -m model-Q4_K_M.gguf -c 8192 -ngl 99 --port 8080      # one machine
vllm serve ./model --max-model-len 8192                             # many users on a GPU

# 4. Package and 5. Scale: container and Kubernetes (lessons 3 and 4)
docker build -t model-server:1 .
kubectl apply -f model-server.yaml -f hpa.yaml

# 6. Operate: watch it, roll forward or back
kubectl rollout status deployment/model-server
kubectl rollout undo deployment/model-server`,
  annotations: [
    { id: 'pipe', range: { line: 2 }, kind: 'framework', title: 'Pipeline', what: 'Training and evaluation as repeatable steps, ending in a model registry.', why: 'Deployment starts from a versioned, evaluated model, never from a file on someone’s laptop.' },
    { id: 'conv', range: { line: 5 }, kind: 'framework', title: 'Convert', what: 'Hugging Face safetensors to one GGUF file.', why: 'Each runtime reads its own format: GGUF for llama.cpp, ONNX for ONNX Runtime, safetensors for vLLM.' },
    { id: 'quant', range: { line: 6 }, kind: 'framework', title: 'Quantize', what: '16-bit weights to about 4.8 bits per weight.', why: 'Smaller files load faster, fit smaller machines and generate faster.' },
    { id: 'serve', range: { line: 9 }, kind: 'framework', title: 'Serve', what: 'An HTTP server with an OpenAI-compatible API.', why: 'Applications talk to the model over the network, not by importing it.' },
    { id: 'k8s', range: { line: 14 }, kind: 'framework', title: 'Deploy and scale', what: 'A Deployment, Service and autoscaler on a cluster.', why: 'Kubernetes keeps the right number of copies running on machines with room.' },
    { id: 'undo', range: { line: 18 }, kind: 'framework', title: 'Roll back', what: 'Returns the Deployment to its previous pod template.', why: 'Every release needs a tested way back.' },
  ],
};
