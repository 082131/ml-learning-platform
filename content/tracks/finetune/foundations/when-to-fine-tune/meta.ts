import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/foundations/when-to-fine-tune',
  title: "When to fine-tune, and when prompting or retrieval is enough",
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    "Explain what fine-tuning can and cannot change in a model, and why it is weak at adding facts",
    "Choose between prompting, retrieval (RAG) and fine-tuning for a concrete problem, with reasons",
    "Estimate when a fine-tune pays for itself in saved prompt tokens",
    "Name what you need before starting: a baseline, examples, an evaluation set",
  ],
  prerequisites: ["finetune/foundations/how-llms-learn", "ai/rag/rag-pipeline"],
  concepts: ["fine-tuning", "retrieval-augmented-generation", "few-shot-prompting", "parametric-knowledge", "eval-set"],
  references: [
    { title: "Gekhman et al., Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations?", url: "https://arxiv.org/abs/2405.05904" },
    { title: "Ovadia et al., Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs", url: "https://arxiv.org/abs/2312.05934" },
    { title: "OpenAI: Model optimization guide (prompting, RAG and fine-tuning)", url: "https://platform.openai.com/docs/guides/model-optimization" },
  ],
} satisfies LessonMeta;
