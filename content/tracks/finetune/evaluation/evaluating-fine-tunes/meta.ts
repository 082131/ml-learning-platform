import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/evaluation/evaluating-fine-tunes',
  title: "Evaluating a fine-tune: win rates, judges and regressions",
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    "Design an evaluation for a fine-tune: a target-task set, a regression suite and a safety set",
    "Compute a pairwise win rate with a 95% confidence interval and decide whether a difference is real",
    "Run an LLM judge without position and length bias",
    "Spot contamination and other results that are too good to be true",
  ],
  prerequisites: ["finetune/alignment/dpo", "ai/reliability/evals-guardrails"],
  concepts: ["win-rate", "confidence-interval", "llm-as-judge", "position-bias", "data-contamination", "eval-set"],
  references: [
    { title: "Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", url: "https://arxiv.org/abs/2306.05685" },
    { title: "Dubois et al., Length-Controlled AlpacaEval", url: "https://arxiv.org/abs/2404.04475" },
    { title: "Wilson, Probable Inference, the Law of Succession, and Statistical Inference (1927)", url: "https://www.jstor.org/stable/2276774" },
    { title: "EleutherAI lm-evaluation-harness", url: "https://github.com/EleutherAI/lm-evaluation-harness" },
  ],
} satisfies LessonMeta;
