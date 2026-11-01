import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/basics/tensors-graphs',
  title: 'Inputs, outputs, tensors, batches and computational graphs',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Describe a model’s inputs and outputs as tensors with a shape and a dtype',
    'Explain how batching adds a leading dimension and why a model must accept it',
    'Read the computational graph of a small network and follow a tensor’s shape through it',
    'Spot shape and dtype mismatches between preprocessing and the model',
  ],
  prerequisites: ['inference/basics/what-is-inference', 'ml/math/tensors'],
  concepts: ['tensor', 'shape', 'dtype', 'batch', 'computation-graph', 'symbolic-dimension'],
  references: [
    {
      title: 'numpy.matmul (broadcasting rules for stacks of matrices)',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.matmul.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'ONNX Python API: onnx.helper (make_node, make_graph, make_tensor_value_info)',
      url: 'https://onnx.ai/onnx/api/helper.html',
      version: 'onnx 1.23',
    },
    {
      title: 'ONNX Runtime Python API: InferenceSession, get_inputs, run',
      url: 'https://onnxruntime.ai/docs/api/python/api_summary.html',
      version: 'onnxruntime 1.29',
    },
    {
      title: 'UCI Optical Recognition of Handwritten Digits (the 8 × 8 digits used here), CC BY 4.0',
      url: 'https://archive.ics.uci.edu/dataset/80',
    },
  ],
} satisfies LessonMeta;
