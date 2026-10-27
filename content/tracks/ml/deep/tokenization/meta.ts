import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/tokenization',
  title: 'Tokenization and token IDs',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why a model needs text turned into a list of integer token IDs',
    'Run byte-pair encoding by hand: count pairs, merge the most frequent one, repeat',
    'Predict how a trained BPE tokenizer splits a new word, including characters it has never seen',
    'Describe how byte-level BPE (GPT-2) and SentencePiece differ from the toy tokenizer',
  ],
  prerequisites: ['ml/foundations/python-collections'],
  concepts: ['token', 'tokenizer', 'vocabulary', 'byte-pair-encoding'],
  references: [
    {
      title: 'Sennrich, Haddow and Birch (2016), Neural Machine Translation of Rare Words with Subword Units',
      url: 'https://aclanthology.org/P16-1162/',
    },
    {
      title:
        'Radford et al. (2019), Language Models are Unsupervised Multitask Learners (GPT-2), section 2.2',
      url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
    },
    {
      title: 'Kudo and Richardson (2018), SentencePiece: a simple and language independent subword tokenizer',
      url: 'https://aclanthology.org/D18-2012/',
    },
    {
      title: 'SentencePiece repository and options (byte_fallback, model_type)',
      url: 'https://github.com/google/sentencepiece',
      version: 'sentencepiece 0.2.2',
    },
    {
      title: 'Hugging Face Tokenizers: components (pre-tokenizers, BPE, WordPiece, Unigram)',
      url: 'https://huggingface.co/docs/tokenizers/components',
      version: 'tokenizers 0.23',
    },
    {
      title: 'Hugging Face LLM course, chapter 6.5: Byte-Pair Encoding tokenization',
      url: 'https://huggingface.co/learn/llm-course/chapter6/5',
    },
    {
      title: 'tiktoken (OpenAI’s byte-level BPE tokenizer)',
      url: 'https://github.com/openai/tiktoken',
      version: 'tiktoken 0.14',
    },
  ],
} satisfies LessonMeta;
