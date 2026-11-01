import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/llm/transformers-llms',
  title: 'Transformers, attention and LLM fundamentals',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain how a language model generates text one token at a time by predicting the next token',
    'Describe how temperature and top-p sampling change the output, and when to use each',
    'Relate context length to the cost of attention and to what the model can see',
    'Explain why a model produces fluent text that can still be wrong, and what that implies for using it',
  ],
  prerequisites: ['ai/representations/tokens-embeddings', 'ml/deep/transformers'],
  concepts: [
    'language-model',
    'logit',
    'softmax',
    'temperature',
    'top-p-sampling',
    'greedy-decoding',
    'context-window',
    'hallucination',
    'transformer',
    'attention',
  ],
  references: [
    {
      title: 'Holtzman et al., The Curious Case of Neural Text Degeneration (nucleus sampling)',
      url: 'https://arxiv.org/abs/1904.09751',
    },
    {
      title: 'Vaswani et al., Attention Is All You Need',
      url: 'https://arxiv.org/abs/1706.03762',
    },
    {
      title: 'Hugging Face Transformers: generation strategies (temperature, top_p, do_sample)',
      url: 'https://huggingface.co/docs/transformers/generation_strategies',
    },
    {
      title: 'Anthropic API: versions (which request parameters each API version accepts)',
      url: 'https://docs.anthropic.com/en/api/versioning',
    },
  ],
} satisfies LessonMeta;
