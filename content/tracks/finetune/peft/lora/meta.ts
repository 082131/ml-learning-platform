import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/peft/lora',
  title: "LoRA: fine-tuning with small low-rank adapters",
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Explain the LoRA update W + (alpha / r)·B·A and why a low-rank update is enough for most fine-tunes",
    "Count LoRA’s trainable parameters for a real model shape and target set",
    "Choose rank, alpha and target modules, and explain what each controls",
    "Merge an adapter into the base weights, or serve several adapters on one base model",
  ],
  prerequisites: ["finetune/sft/supervised-fine-tuning", "ml/math/matrix-multiplication"],
  concepts: ["peft", "lora", "lora-rank", "lora-alpha", "adapter-merging", "matrix-multiplication"],
  references: [
    { title: "Hu et al., LoRA: Low-Rank Adaptation of Large Language Models", url: "https://arxiv.org/abs/2106.09685" },
    { title: "Hugging Face PEFT: LoraConfig", url: "https://huggingface.co/docs/peft/package_reference/lora", version: "PEFT 0.22" },
    { title: "Kalajdzievski, A Rank Stabilization Scaling Factor for Fine-Tuning with LoRA (rsLoRA)", url: "https://arxiv.org/abs/2312.03732" },
    { title: "Meta Llama 3.1 8B model card and config", url: "https://huggingface.co/meta-llama/Llama-3.1-8B" },
  ],
} satisfies LessonMeta;
