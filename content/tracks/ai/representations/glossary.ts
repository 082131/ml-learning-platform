import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/representations chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'token',
    term: 'Token',
    short:
      'One unit of text as a model sees it: a word, part of a word, a punctuation mark or a special marker.',
    long: 'A tokenizer splits text into tokens and replaces each with its ID. "unbelievably" is five tokens for all-MiniLM-L6-v2: un, ##bel, ##ie, ##va, ##bly. Model limits and API prices are counted in tokens, not words.',
    introducedIn: 'ai/representations/tokens-embeddings',
    aliases: ['tokens'],
  },
  {
    id: 'tokenizer',
    term: 'Tokenizer',
    short:
      'The program that turns text into a model’s tokens and token IDs, using that model’s fixed vocabulary.',
    long: 'Each model is trained with one tokenizer and only understands IDs from its vocabulary, so you must use the matching tokenizer. Common algorithms are WordPiece (BERT), byte-pair encoding (GPT models) and SentencePiece.',
    introducedIn: 'ai/representations/tokens-embeddings',
    aliases: ['tokenization'],
  },
  {
    id: 'wordpiece',
    term: 'WordPiece',
    short:
      'A subword tokenizer that splits each word greedily into the longest pieces found in its vocabulary.',
    long: 'Pieces after the first one in a word carry a "##" prefix. A word that can’t be built from known pieces becomes [UNK]. BERT and all-MiniLM-L6-v2 use WordPiece with a 30,522-entry vocabulary.',
    introducedIn: 'ai/representations/tokens-embeddings',
  },
  {
    id: 'token-id',
    term: 'Token ID',
    short: 'The integer that stands for a token: its position in the tokenizer’s vocabulary.',
    long: 'The model never sees text, only IDs. For all-MiniLM-L6-v2, [CLS] is 101 and [SEP] is 102. The same text gets different IDs under a different tokenizer.',
    introducedIn: 'ai/representations/tokens-embeddings',
  },
  {
    id: 'sentence-embedding',
    term: 'Sentence embedding',
    short:
      'A fixed-length vector that represents a whole text, made so that texts with similar meaning get nearby vectors.',
    long: 'all-MiniLM-L6-v2 averages the vectors its transformer produces for each token and scales the result to length 1, giving 384 numbers per text. Embeddings from different models can’t be compared with each other.',
    introducedIn: 'ai/representations/tokens-embeddings',
    aliases: ['text embedding', 'embedding model'],
  },
  {
    id: 'cosine-similarity',
    term: 'Cosine similarity',
    short:
      'The cosine of the angle between two vectors: their dot product divided by the product of their lengths. It ranges from −1 to 1.',
    long: '1 means the vectors point the same way, 0 means they are perpendicular. Length doesn’t matter, so for vectors scaled to length 1 the cosine similarity equals the dot product.',
    introducedIn: 'ai/representations/tokens-embeddings',
    aliases: ['cosine'],
  },
] satisfies GlossaryTerm[];
