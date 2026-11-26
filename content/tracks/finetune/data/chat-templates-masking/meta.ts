import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/data/chat-templates-masking',
  title: "Instruction data: chat templates, loss masking and packing",
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Write fine-tuning examples in the conversational format and render them with a chat template",
    "Explain loss masking: which tokens are trained, which get the label −100, and why the end-of-turn token must be trained",
    "Compare padding and packing, and compute how much compute padding wastes",
    "Avoid template mismatches between training and inference",
  ],
  prerequisites: ["finetune/foundations/how-llms-learn", "ai/representations/tokens-embeddings"],
  concepts: ["instruction-dataset", "chat-template", "loss-masking", "sequence-packing", "special-token", "supervised-fine-tuning"],
  references: [
    { title: "Hugging Face Transformers: Chat templates", url: "https://huggingface.co/docs/transformers/en/chat_templating", version: "transformers 5" },
    { title: "TRL: SFTTrainer (dataset formats, assistant_only_loss, packing)", url: "https://huggingface.co/docs/trl/sft_trainer", version: "TRL 1.19" },
    { title: "Wang et al., Self-Instruct", url: "https://arxiv.org/abs/2212.10560" },
  ],
} satisfies LessonMeta;
