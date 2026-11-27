import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the finetune/data chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'instruction-dataset',
    term: 'Instruction dataset',
    short: 'Training examples for supervised fine-tuning: each one is a conversation (or a prompt and a completion) showing the input and the answer you want the model to give.',
    introducedIn: 'finetune/data/chat-templates-masking',
    aliases: ['SFT data', 'demonstrations'],
  },
  {
    id: 'chat-template',
    term: 'Chat template',
    short: 'The exact text format a model uses to turn a list of messages into one token sequence, with special tokens marking where each role’s turn starts and ends.',
    long: 'It ships with the tokenizer (tokenizer.apply_chat_template in Transformers). Training and inference must use the same template, or the model sees an unfamiliar format at inference.',
    introducedIn: 'finetune/data/chat-templates-masking',
  },
  {
    id: 'special-token',
    term: 'Special token',
    short: 'A token reserved for structure rather than text, such as <|im_start|>, <|im_end|> or an end-of-sequence token. Generation stops when the model produces its end-of-turn token.',
    introducedIn: 'finetune/data/chat-templates-masking',
    aliases: ['EOS token', 'end-of-turn token'],
  },
  {
    id: 'loss-masking',
    term: 'Loss masking',
    short: 'Excluding some tokens from the loss, usually the system and user turns, by giving them the label −100. The model still reads them as context but is only trained to produce the answer.',
    introducedIn: 'finetune/data/chat-templates-masking',
    aliases: ['assistant-only loss', 'completion-only loss', 'label -100'],
  },
  {
    id: 'sequence-packing',
    term: 'Sequence packing',
    short: 'Putting several short examples into one fixed-length training row instead of padding each one, so less compute is spent on padding tokens.',
    introducedIn: 'finetune/data/chat-templates-masking',
    aliases: ['packing'],
  },
  {
    id: 'near-duplicate',
    term: 'Near-duplicate',
    short: 'Two examples that are almost the same text (a changed word, different punctuation or casing). They over-weight one example in training just like exact copies.',
    introducedIn: 'finetune/data/dataset-quality',
    aliases: ['fuzzy duplicate'],
  },
  {
    id: 'jaccard-similarity',
    term: 'Jaccard similarity',
    short: 'Size of the overlap of two sets divided by the size of their union: 1 for identical sets, 0 for sets with nothing in common. Used on sets of word n-grams to compare texts.',
    introducedIn: 'finetune/data/dataset-quality',
    aliases: ['Jaccard index'],
  },
  {
    id: 'minhash',
    term: 'MinHash',
    short: 'A short signature of a set (the minimum hash value under many hash functions). The share of positions where two signatures agree estimates their Jaccard similarity, without comparing the full sets.',
    introducedIn: 'finetune/data/dataset-quality',
    aliases: ['MinHash LSH'],
  },
  {
    id: 'data-contamination',
    term: 'Data contamination',
    short: 'Test or benchmark items that also appear in the training data. The model can recall them, so its score on them says nothing about how it handles new inputs.',
    introducedIn: 'finetune/data/dataset-quality',
    aliases: ['test-set leakage', 'benchmark contamination'],
  },
  {
    id: 'synthetic-data',
    term: 'Synthetic data',
    short: 'Training examples written by a model rather than by people, for example answers from a stronger model. Useful for volume, risky without filtering and human checks.',
    introducedIn: 'finetune/data/dataset-quality',
  },
] satisfies GlossaryTerm[];
