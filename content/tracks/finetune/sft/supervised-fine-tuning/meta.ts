import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/sft/supervised-fine-tuning',
  title: "Supervised fine-tuning: hyperparameters, overfitting and forgetting",
  level: 'intermediate',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Run a supervised fine-tune with TRL’s SFTTrainer and explain each important setting",
    "Choose a starting learning rate, number of epochs and evaluation schedule for full fine-tuning and for LoRA",
    "Read training and validation loss together to spot overfitting, and pick the checkpoint to keep",
    "Explain catastrophic forgetting and how to measure and limit it",
  ],
  prerequisites: ["finetune/data/dataset-quality", "finetune/pretraining/training-runs"],
  concepts: ["supervised-fine-tuning", "overfitting", "early-stopping", "catastrophic-forgetting", "epoch", "learning-rate"],
  references: [
    { title: "TRL: SFTTrainer", url: "https://huggingface.co/docs/trl/sft_trainer", version: "TRL 1.19" },
    { title: "Biderman et al., LoRA Learns Less and Forgets Less", url: "https://arxiv.org/abs/2405.09673" },
    { title: "Luo et al., An Empirical Study of Catastrophic Forgetting in LLMs During Continual Fine-tuning", url: "https://arxiv.org/abs/2308.08747" },
  ],
} satisfies LessonMeta;
