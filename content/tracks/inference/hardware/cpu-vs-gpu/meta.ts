import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/hardware/cpu-vs-gpu',
  title: 'CPU vs GPU execution',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why a GPU runs matrix multiplication with thousands of parallel threads and a CPU with a few wide cores',
    'Estimate when a model is small enough, or traffic light enough, for CPU inference',
    'Account for the cost of copying data between host and device memory',
    'Time the same model on CPU and GPU correctly, with warm-up and synchronization',
  ],
  prerequisites: ['inference/basics/tensors-graphs', 'ml/math/matrix-multiplication'],
  concepts: ['memory-bandwidth', 'memory-bound', 'kernel-launch', 'host-device-transfer'],
  references: [
    {
      title: 'NVIDIA T4 Tensor Core GPU datasheet',
      url: 'https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/tesla-t4/t4-tensor-core-datasheet-951643.pdf',
    },
    { title: 'NVIDIA L4 Tensor Core GPU datasheet', url: 'https://www.nvidia.com/en-us/data-center/l4/' },
    {
      title: 'NVIDIA A100 Tensor Core GPU datasheet',
      url: 'https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/a100/pdf/nvidia-a100-datasheet-us-nvidia-1758950-r4-web.pdf',
    },
    { title: 'NVIDIA H100 Tensor Core GPU datasheet', url: 'https://www.nvidia.com/en-us/data-center/h100/' },
    {
      title: 'PyTorch: CUDA semantics, asynchronous execution and synchronization',
      url: 'https://pytorch.org/docs/stable/notes/cuda.html#asynchronous-execution',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'torch.utils.benchmark',
      url: 'https://pytorch.org/docs/stable/benchmark_utils.html',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
  ],
} satisfies LessonMeta;
