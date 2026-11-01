import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/basics/what-is-inference',
  title: 'Inference vs training',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Explain what changes between training and inference: no gradients, no optimizer state, fixed weights',
    'Trace one request through a served model from input to response',
    'Distinguish online, batch and streaming (token-by-token) inference and give an example of each',
    'Name the goals a serving system is judged on: latency, throughput, cost and accuracy',
  ],
  prerequisites: ['ml/foundations/what-is-ml', 'ml/deep/forward-propagation'],
  concepts: ['inference', 'training', 'online-inference', 'batch-inference', 'streaming-inference', 'optimizer-state'],
  references: [
    {
      title: 'torch.inference_mode',
      url: 'https://pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'Kaplan et al., Scaling Laws for Neural Language Models (2020), section 2.1 on the 6N FLOPs per token estimate',
      url: 'https://arxiv.org/abs/2001.08361',
    },
    {
      title: 'numpy.random.Generator',
      url: 'https://numpy.org/doc/stable/reference/random/generator.html',
      version: 'NumPy 2.5',
    },
  ],
} satisfies LessonMeta;
