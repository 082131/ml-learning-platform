import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/compression/quantize-prune-distill',
  title: 'Quantization, pruning and distillation trade-offs',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compare quantization, pruning and distillation by what each removes and what it costs to apply',
    'Prune a small model by weight magnitude and measure the accuracy change',
    'Distill a small student model from a larger teacher’s soft outputs',
    'Choose a compression method for a memory, latency or accuracy target and verify it on held-out data',
  ],
  prerequisites: ['inference/precision/precision-quantization', 'ml/deep/training-loop'],
  concepts: ['pruning', 'knowledge-distillation', 'softmax-temperature', 'sparse-matrix', 'quantization'],
  references: [
    {
      title: 'Han et al., Learning both Weights and Connections for Efficient Neural Networks (2015)',
      url: 'https://arxiv.org/abs/1506.02626',
    },
    {
      title: 'Hinton, Vinyals and Dean, Distilling the Knowledge in a Neural Network (2015)',
      url: 'https://arxiv.org/abs/1503.02531',
    },
    {
      title: 'Frankle and Carbin, The Lottery Ticket Hypothesis (2019)',
      url: 'https://arxiv.org/abs/1803.03635',
    },
    {
      title: 'torch.nn.utils.prune (l1_unstructured, global_unstructured, remove)',
      url: 'https://pytorch.org/docs/stable/nn.html#module-torch.nn.utils',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'NVIDIA: Accelerating inference with sparsity using the Ampere architecture and TensorRT (2:4 structured sparsity)',
      url: 'https://developer.nvidia.com/blog/accelerating-inference-with-sparsity-using-ampere-and-tensorrt/',
    },
    {
      title: 'UCI Optical Recognition of Handwritten Digits, CC BY 4.0',
      url: 'https://archive.ics.uci.edu/dataset/80',
    },
  ],
} satisfies LessonMeta;
