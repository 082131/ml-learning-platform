import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/fundamentals chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'natural-language-processing',
    term: 'Natural language processing (NLP)',
    short:
      'The part of AI that works with human language: classifying, extracting from, translating or generating text.',
    long: 'Older NLP systems used rules and task-specific models; most current NLP uses pretrained transformers, often large language models.',
    introducedIn: 'ai/fundamentals/ai-landscape',
    aliases: ['NLP'],
  },
  {
    id: 'generative-ai',
    term: 'Generative AI',
    short: 'Models that produce new content (text, images, audio, code) instead of only a label or a number.',
    long: 'A large language model is generative: it writes text one token at a time. A spam classifier is not: it outputs a class.',
    introducedIn: 'ai/fundamentals/ai-landscape',
    aliases: ['GenAI', 'generative model'],
  },
  {
    id: 'pretrained-model',
    term: 'Pretrained model',
    short: 'A model someone already trained on a large, general dataset, which you can use as is or adapt.',
    long: 'Pretraining is the expensive part (weeks on many GPUs). Using a pretrained model means you only pay for running it, and for fine-tuning if you adapt it.',
    introducedIn: 'ai/fundamentals/ai-landscape',
    aliases: ['pretrained', 'foundation model', 'pretraining'],
  },
  {
    id: 'fine-tuning',
    term: 'Fine-tuning',
    short:
      'Continuing to train a pretrained model on your own, smaller labeled dataset so it adapts to your task.',
    long: 'Fine-tuning changes the model’s weights. It needs labeled examples (usually hundreds to many thousands), an evaluation set and a way to version and serve the new model.',
    introducedIn: 'ai/fundamentals/ai-landscape',
    aliases: ['fine-tune', 'fine-tuned'],
  },
  {
    id: 'model-api',
    term: 'Hosted model API',
    short:
      'A model run by a provider on its servers, which you call over HTTP and pay for per use, usually per token.',
    long: 'You send your input to the provider and get the output back. You don’t manage GPUs, but your data leaves your servers and you depend on the provider’s prices, limits and model versions.',
    introducedIn: 'ai/fundamentals/ai-landscape',
    aliases: ['model API', 'hosted API', 'LLM API'],
  },
] satisfies GlossaryTerm[];
