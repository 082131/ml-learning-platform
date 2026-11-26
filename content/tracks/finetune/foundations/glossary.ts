import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the finetune/foundations chapter (merged into the glossary by content/index.ts).
// perplexity and cross-entropy-loss are shared with the NLP track: whichever track merges second deletes its copy.
export default [
  {
    id: 'next-token-prediction',
    term: 'Next-token prediction',
    short: 'The training task of a language model: given the text so far, give a probability to every possible next token. Everything an LLM learns in pretraining comes from doing this billions of times.',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['causal language modeling', 'autoregressive training'],
  },
  {
    id: 'cross-entropy-loss',
    term: 'Cross-entropy loss',
    short: 'For one prediction, −ln p, where p is the probability the model gave to the correct answer. Averaged over all predicted tokens, it is the number LLM training minimizes.',
    long: 'It is 0 when the model gave the right token probability 1, and grows without limit as that probability approaches 0, so confident mistakes cost the most. Measured in nats with the natural log, or in bits with log base 2.',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['log loss', 'negative log-likelihood', 'NLL'],
  },
  {
    id: 'perplexity',
    term: 'Perplexity',
    short: 'e raised to the average cross-entropy loss. It reads as "the model is as unsure as if it were choosing uniformly among this many tokens".',
    long: 'A perplexity of 1 means the model is always certain and right; a model guessing uniformly over a 50,000-token vocabulary has perplexity 50,000. Perplexities are only comparable between models with the same tokenizer on the same text.',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['PPL'],
  },
  {
    id: 'pretraining',
    term: 'Pretraining',
    short: 'The first and most expensive training stage: next-token prediction on trillions of tokens of general text. It produces a base model that knows language and a lot about the world.',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['pre-training'],
  },
  {
    id: 'base-model',
    term: 'Base model',
    short: 'A model straight out of pretraining. It continues text rather than following instructions: asked a question, it may write more questions.',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['foundation model', 'pretrained base'],
  },
  {
    id: 'post-training',
    term: 'Post-training',
    short: 'Everything after pretraining that turns a base model into a useful assistant: supervised fine-tuning on example conversations, then preference tuning (RLHF, DPO and similar).',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['alignment training'],
  },
  {
    id: 'instruct-model',
    term: 'Instruct model',
    short: 'A base model after post-training: it answers questions, follows instructions and uses a chat format. Most models people chat with are instruct models.',
    introducedIn: 'finetune/foundations/how-llms-learn',
    aliases: ['chat model', 'instruction-tuned model'],
  },
  {
    id: 'parametric-knowledge',
    term: 'Parametric knowledge',
    short: 'What a model "knows" because it is stored in its weights, as opposed to knowledge given to it in the prompt (for example by retrieval).',
    introducedIn: 'finetune/foundations/when-to-fine-tune',
  },
] satisfies GlossaryTerm[];
