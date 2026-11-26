import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/pretraining/training-runs',
  title: "Running a training job: batches, learning-rate schedules and loss curves",
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Compute the effective batch size in sequences and tokens from micro batch, gradient accumulation and GPU count",
    "Explain why training warms up the learning rate and then decays it, and read warmup, cosine, linear and WSD schedules",
    "Explain gradient clipping and use it to reason about loss spikes",
    "Read a loss curve: healthy, too high a learning rate, a spike, a plateau",
  ],
  prerequisites: ["finetune/pretraining/scaling-compute", "python/pytorch/training-loop"],
  concepts: ["lr-schedule", "cosine-decay", "learning-rate", "gradient-accumulation", "gradient-clipping", "loss-spike", "checkpoint"],
  references: [
    { title: "Hugging Face Transformers: optimizer schedules", url: "https://huggingface.co/docs/transformers/en/main_classes/optimizer_schedules", version: "transformers 5" },
    { title: "Loshchilov and Hutter, SGDR: Stochastic Gradient Descent with Warm Restarts (cosine schedule)", url: "https://arxiv.org/abs/1608.03983" },
    { title: "Hägele et al., Scaling Laws and Compute-Optimal Training Beyond Fixed Training Durations (WSD)", url: "https://arxiv.org/abs/2405.18392" },
    { title: "Pascanu et al., On the difficulty of training recurrent neural networks (gradient clipping)", url: "https://arxiv.org/abs/1211.5063" },
  ],
} satisfies LessonMeta;
