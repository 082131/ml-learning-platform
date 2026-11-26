import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/pretraining/scaling-compute',
  title: "Pretraining at scale: compute budgets and scaling laws",
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Estimate the training compute of a model with C ≈ 6·N·D and explain where the 6 comes from",
    "Turn a compute budget into GPU-hours, days and cost using model FLOPs utilization",
    "Explain the compute-optimal (Chinchilla) ratio of about 20 tokens per parameter, and why modern models train far past it",
    "Describe what goes into a pretraining data mixture",
  ],
  prerequisites: ["finetune/foundations/how-llms-learn", "inference/hardware/cpu-vs-gpu"],
  concepts: ["training-flops", "scaling-law", "compute-optimal", "model-flops-utilization", "data-mixture", "pretraining"],
  references: [
    { title: "Kaplan et al., Scaling Laws for Neural Language Models", url: "https://arxiv.org/abs/2001.08361" },
    { title: "Hoffmann et al., Training Compute-Optimal Large Language Models (Chinchilla)", url: "https://arxiv.org/abs/2203.15556" },
    { title: "Meta: Introducing Meta Llama 3", url: "https://ai.meta.com/blog/meta-llama-3/" },
    { title: "NVIDIA H100 Tensor Core GPU datasheet", url: "https://www.nvidia.com/en-us/data-center/h100/" },
  ],
} satisfies LessonMeta;
