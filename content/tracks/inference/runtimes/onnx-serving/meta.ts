import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/runtimes/onnx-serving',
  title: 'ONNX, ONNX Runtime and serving runtimes',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Export a PyTorch model to ONNX and check that its outputs match the original',
    'Run an ONNX model with ONNX Runtime and select an execution provider',
    'Explain the graph optimizations a runtime applies, such as operator fusion and constant folding',
    'Compare serving runtimes and choose one for a given model and hardware',
  ],
  prerequisites: ['inference/runtime/loading-serialization'],
  concepts: ['onnx', 'execution-provider', 'operator-fusion', 'constant-folding', 'computation-graph'],
  references: [
    { title: 'ONNX operator specifications (opsets)', url: 'https://onnx.ai/onnx/operators/', version: 'onnx 1.23' },
    {
      title: 'ONNX Runtime: graph optimizations (basic, extended, layout levels)',
      url: 'https://onnxruntime.ai/docs/performance/model-optimizations/graph-optimizations.html',
      version: 'onnxruntime 1.29',
    },
    {
      title: 'ONNX Runtime: execution providers',
      url: 'https://onnxruntime.ai/docs/execution-providers/',
      version: 'onnxruntime 1.29',
    },
    {
      title: 'ONNX Runtime compatibility (supported IR and opset versions per release)',
      url: 'https://onnxruntime.ai/docs/reference/compatibility.html',
    },
    {
      title: 'torch.onnx: exporting a PyTorch model to ONNX',
      url: 'https://pytorch.org/docs/stable/onnx.html',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    { title: 'NVIDIA Triton Inference Server documentation', url: 'https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/' },
    { title: 'vLLM documentation', url: 'https://docs.vllm.ai/' },
  ],
} satisfies LessonMeta;
