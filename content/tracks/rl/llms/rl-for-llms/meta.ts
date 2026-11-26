import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/llms/rl-for-llms',
  title: "RL for language models: RLHF, DPO and verifiable rewards",
  level: 'advanced',
  minutes: 60,
  kind: 'lesson',
  objectives: [
    "Map the RL vocabulary onto a language model: state, action, policy, episode and reward",
    "Explain how a reward model is trained from human preferences with the Bradley\u2013Terry model",
    "Explain why RLHF adds a KL penalty, and what reward hacking looks like when it is too weak",
    "Compare PPO-based RLHF, DPO, GRPO and RL with verifiable rewards",
  ],
  prerequisites: ['rl/deep/deep-rl', 'ai/llm/transformers-llms'],
  concepts: ['rlhf', 'reward-model', 'bradley-terry-model', 'kl-penalty', 'reward-hacking', 'dpo', 'grpo', 'rlvr'],
  references: [
    { title: "Ouyang et al. (2022): Training language models to follow instructions with human feedback (InstructGPT)", url: 'https://arxiv.org/abs/2203.02155' },
    { title: "Rafailov et al. (2023): Direct Preference Optimization", url: 'https://arxiv.org/abs/2305.18290' },
    { title: "Shao et al. (2024): DeepSeekMath (introduces GRPO)", url: 'https://arxiv.org/abs/2402.03300' },
    { title: "DeepSeek-AI (2025): DeepSeek-R1, RL with verifiable rewards", url: 'https://arxiv.org/abs/2501.12948' },
    { title: "Hugging Face TRL documentation", url: 'https://huggingface.co/docs/trl/', version: '1.19.0' },
  ],
} satisfies LessonMeta;
