import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/throughput/batching-throughput',
  title: 'Batching, dynamic batching, latency vs throughput',
  level: 'advanced',
  minutes: 60,
  kind: 'lesson',
  objectives: [
    'Explain with the roofline model why batching raises throughput when inference is memory-bound',
    'Describe a dynamic batcher by its max batch size and max wait, and predict how each changes latency',
    'Compute capacity from a service-time model and recognize an overloaded system',
    'Report latency as percentiles and relate rate, latency and concurrency with Little’s law',
  ],
  prerequisites: ['inference/memory/memory-estimation', 'ml/math/probability'],
  concepts: [
    'latency-percentile',
    'throughput',
    'dynamic-batching',
    'poisson-process',
    'littles-law',
    'roofline-model',
    'batch',
  ],
  references: [
    {
      title: 'NVIDIA Triton Inference Server: Dynamic Batcher (max_batch_size, max_queue_delay_microseconds)',
      url: 'https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/batcher.html',
      version: 'Triton user guide, read 2026-10-20',
    },
    {
      title:
        'Williams, Waterman and Patterson, Roofline: An Insightful Visual Performance Model for Multicore Architectures (CACM 2009)',
      url: 'https://doi.org/10.1145/1498765.1498785',
    },
    {
      title: 'Little, A Proof for the Queuing Formula: L = λW (Operations Research, 1961)',
      url: 'https://doi.org/10.1287/opre.9.3.383',
    },
    {
      title:
        'Yu et al., Orca: A Distributed Serving System for Transformer-Based Generative Models (OSDI 2022), iteration-level scheduling',
      url: 'https://www.usenix.org/conference/osdi22/presentation/yu',
    },
    {
      title: 'Python math.log and math.ceil',
      url: 'https://docs.python.org/3.13/library/math.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
