import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/perf/gpu-bottlenecks',
  title: 'GPU utilization and bottleneck analysis',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Tell compute-bound from memory-bound kernels with arithmetic intensity and the roofline model',
    'Read GPU utilization and memory bandwidth metrics and know what each does not show',
    'Find stalls caused by the CPU, data loading or host-to-device copies',
    'Choose an optimization that targets the actual bottleneck and measure its effect',
  ],
  prerequisites: ['inference/perf/profiling', 'inference/hardware/cpu-vs-gpu'],
  concepts: ['arithmetic-intensity', 'roofline-model', 'gpu-utilization', 'cuda-graph'],
  references: [
    {
      title: 'Williams, Waterman and Patterson, Roofline: an insightful visual performance model (2009)',
      url: 'https://doi.org/10.1145/1498765.1498785',
    },
    {
      title: 'NVIDIA A100 datasheet',
      url: 'https://www.nvidia.com/en-us/data-center/a100/',
      version: 'read 2026-11-01',
    },
    {
      title: 'NVIDIA H100 datasheet',
      url: 'https://www.nvidia.com/en-us/data-center/h100/',
      version: 'read 2026-11-01',
    },
    {
      title: 'NVIDIA L4 datasheet',
      url: 'https://www.nvidia.com/en-us/data-center/l4/',
      version: 'read 2026-11-01',
    },
    {
      title: 'NVIDIA T4 datasheet',
      url: 'https://www.nvidia.com/en-us/data-center/tesla-t4/',
      version: 'read 2026-11-01',
    },
    {
      title:
        'nvidia-smi documentation: utilization.gpu is the percent of time one or more kernels was executing',
      url: 'https://docs.nvidia.com/deploy/nvidia-smi/index.html',
      version: 'read 2026-11-01',
    },
    {
      title: 'Nsight Systems and Nsight Compute',
      url: 'https://docs.nvidia.com/nsight-compute/',
      version: 'read 2026-11-01',
    },
    {
      title: 'CUDA graphs in PyTorch',
      url: 'https://pytorch.org/docs/stable/notes/cuda.html#cuda-graphs',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
  ],
} satisfies LessonMeta;
