import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/peft/qlora-memory',
  title: "QLoRA and GPU memory: what fits where",
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Estimate the GPU memory of full fine-tuning, LoRA and QLoRA from bytes per parameter",
    "Explain what QLoRA quantizes (the frozen base, to 4-bit NF4) and what stays in 16 bit",
    "Use activation checkpointing, micro batches and sequence length to fit a run on a GPU",
    "Pick a method and GPU for a given model size",
  ],
  prerequisites: ["finetune/peft/lora", "inference/memory/memory-estimation", "inference/precision/precision-quantization"],
  concepts: ["qlora", "nf4", "optimizer-state", "activation-checkpointing", "activation-memory", "mixed-precision"],
  references: [
    { title: "Dettmers et al., QLoRA: Efficient Finetuning of Quantized LLMs", url: "https://arxiv.org/abs/2305.14314" },
    { title: "Rajbhandari et al., ZeRO: Memory Optimizations Toward Training Trillion Parameter Models", url: "https://arxiv.org/abs/1910.02054" },
    { title: "Korthikanti et al., Reducing Activation Recomputation in Large Transformer Models", url: "https://arxiv.org/abs/2205.05198" },
    { title: "Hugging Face Transformers: bitsandbytes quantization", url: "https://huggingface.co/docs/transformers/en/quantization/bitsandbytes", version: "transformers 5" },
  ],
} satisfies LessonMeta;
