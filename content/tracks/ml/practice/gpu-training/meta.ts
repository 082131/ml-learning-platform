import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/gpu-training',
  title: 'GPU fundamentals and training optimization',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain why GPUs speed up training',
    'Estimate training memory and step time from the model size, batch and GPU, and say what the estimate leaves out',
    'Use mixed precision, batch size and activation checkpointing to trade memory for speed',
    'Find whether data loading or compute is the bottleneck',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: ['mixed-precision', 'activation-checkpointing', 'model-flops-utilization'],
  references: [
    {
      title: 'PyTorch: Automatic Mixed Precision package (torch.amp)',
      url: 'https://docs.pytorch.org/docs/2.14/amp.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: Automatic Mixed Precision examples',
      url: 'https://docs.pytorch.org/docs/2.14/notes/amp_examples.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'Kaplan et al., Scaling Laws for Neural Language Models (2020)',
      url: 'https://arxiv.org/abs/2001.08361',
    },
    {
      title: 'Korthikanti et al., Reducing Activation Recomputation in Large Transformer Models (2022)',
      url: 'https://arxiv.org/abs/2205.05198',
    },
    {
      title: 'Micikevicius et al., Mixed Precision Training (2017)',
      url: 'https://arxiv.org/abs/1710.03740',
    },
    {
      title:
        'Rajbhandari et al., ZeRO: Memory Optimizations Toward Training Trillion Parameter Models (2019)',
      url: 'https://arxiv.org/abs/1910.02054',
    },
    { title: 'NVIDIA T4 datasheet', url: 'https://www.nvidia.com/en-us/data-center/tesla-t4/' },
    { title: 'NVIDIA L4 datasheet', url: 'https://www.nvidia.com/en-us/data-center/l4/' },
    { title: 'NVIDIA A100 datasheet', url: 'https://www.nvidia.com/en-us/data-center/a100/' },
    { title: 'NVIDIA H100 datasheet', url: 'https://www.nvidia.com/en-us/data-center/h100/' },
  ],
} satisfies LessonMeta;
