import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/alignment/rlhf-reward-models',
  title: "Preference tuning with RLHF: reward models and the KL penalty",
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Explain why preference data (comparisons) is used instead of more demonstrations",
    "Train a reward model with the Bradley-Terry loss and interpret its scores",
    "Explain the RLHF objective, reward minus β times KL, and what β controls",
    "Recognize reward hacking and the defences against it",
  ],
  prerequisites: ["finetune/sft/supervised-fine-tuning"],
  concepts: ["preference-pair", "reward-model", "bradley-terry-model", "rlhf", "kl-penalty", "reward-hacking", "reference-model", "ppo", "grpo"],
  references: [
    { title: "Ouyang et al., Training language models to follow instructions with human feedback (InstructGPT)", url: "https://arxiv.org/abs/2203.02155" },
    { title: "Stiennon et al., Learning to summarize from human feedback", url: "https://arxiv.org/abs/2009.01325" },
    { title: "Gao et al., Scaling Laws for Reward Model Overoptimization", url: "https://arxiv.org/abs/2210.10760" },
    { title: "TRL: RewardTrainer and GRPOTrainer", url: "https://huggingface.co/docs/trl/index", version: "TRL 1.19" },
  ],
} satisfies LessonMeta;
