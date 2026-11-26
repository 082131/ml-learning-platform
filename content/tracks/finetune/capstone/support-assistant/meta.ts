import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/capstone/support-assistant',
  title: "Capstone: fine-tune a support assistant end to end",
  level: 'advanced',
  minutes: 120,
  kind: 'capstone',
  objectives: [
    "Decide whether a support problem needs fine-tuning, with a measured prompting baseline",
    "Build, clean and split an instruction dataset from support conversations",
    "Fine-tune with LoRA or QLoRA, then preference-tune with DPO",
    "Evaluate with win rates, a regression suite and a contamination check, and write a release decision",
  ],
  prerequisites: ["finetune/evaluation/evaluating-fine-tunes", "finetune/peft/qlora-memory"],
  concepts: ["supervised-fine-tuning", "lora", "qlora", "dpo", "win-rate", "data-contamination"],
  references: [
    { title: "TRL documentation", url: "https://huggingface.co/docs/trl/index", version: "TRL 1.19" },
    { title: "Hugging Face PEFT documentation", url: "https://huggingface.co/docs/peft/index", version: "PEFT 0.22" },
    { title: "Hugging Face Transformers: Chat templates", url: "https://huggingface.co/docs/transformers/en/chat_templating", version: "transformers 5" },
  ],
} satisfies LessonMeta;
