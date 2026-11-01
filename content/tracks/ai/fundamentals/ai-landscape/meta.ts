import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/fundamentals/ai-landscape',
  title: 'AI, ML, DL, NLP and GenAI, and when to train, fine-tune, use a pretrained model or call an API',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Place AI, machine learning, deep learning, NLP and generative AI in relation to each other, with an example of each',
    'Tell apart the four ways to get a model: train from scratch, fine-tune a pretrained model, run a pretrained model as is, or call a hosted API',
    'Choose among training, fine-tuning, a pretrained model and an API for a use case, from its data, budget, latency and privacy needs',
    'Explain what each choice costs in data, compute, money and control, and what it leaves you responsible for',
  ],
  prerequisites: ['ml/foundations/what-is-ml'],
  concepts: [
    'artificial-intelligence',
    'machine-learning',
    'deep-learning',
    'natural-language-processing',
    'generative-ai',
    'pretrained-model',
    'fine-tuning',
    'model-api',
  ],
  references: [
    {
      title: 'Hugging Face: Fine-tuning a pretrained model (Transformers docs)',
      url: 'https://huggingface.co/docs/transformers/training',
    },
    {
      title: 'Anthropic: Choosing the right model and API pricing',
      url: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
    },
    {
      title: 'Google: Rules of Machine Learning, rule #1 (don’t be afraid to launch without ML)',
      url: 'https://developers.google.com/machine-learning/guides/rules-of-ml',
    },
  ],
} satisfies LessonMeta;
