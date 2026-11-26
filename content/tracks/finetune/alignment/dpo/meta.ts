import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/alignment/dpo',
  title: "DPO: preference tuning without a reward model",
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Explain how DPO turns the RLHF objective into a simple classification-style loss on preference pairs",
    "Compute the DPO loss, implicit rewards and margin from four log-probabilities",
    "Explain the role of the reference model and of β",
    "Run DPO with TRL and know its common failure modes",
  ],
  prerequisites: ["finetune/alignment/rlhf-reward-models"],
  concepts: ["dpo", "implicit-reward", "reference-model", "preference-pair", "kl-penalty"],
  references: [
    { title: "Rafailov et al., Direct Preference Optimization: Your Language Model is Secretly a Reward Model", url: "https://arxiv.org/abs/2305.18290" },
    { title: "TRL: DPOTrainer", url: "https://huggingface.co/docs/trl/dpo_trainer", version: "TRL 1.19" },
    { title: "Azar et al., A General Theoretical Paradigm to Understand Learning from Human Preferences (IPO)", url: "https://arxiv.org/abs/2310.12036" },
  ],
} satisfies LessonMeta;
