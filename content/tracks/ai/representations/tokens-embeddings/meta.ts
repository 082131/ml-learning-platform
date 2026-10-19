import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/representations/tokens-embeddings',
  title: 'Tokenization, embeddings and similarity',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Tokenize text into subword pieces and read their token IDs',
    'Explain why a model needs the tokenizer it was trained with',
    'Rank texts by the cosine similarity of their embeddings',
    'Recognize what a sentence embedding captures (topic, wording) and what it misses (negation, exact codes)',
  ],
  prerequisites: ['ai/fundamentals/ai-landscape', 'ml/deep/embeddings'],
  concepts: ['token', 'tokenizer', 'wordpiece', 'token-id', 'sentence-embedding', 'cosine-similarity'],
  references: [
    {
      title: 'sentence-transformers/all-MiniLM-L6-v2 model card',
      url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
      version: 'revision 7dbbc903',
    },
    {
      title: 'Hugging Face tokenizers: Tokenizer and Encoding',
      url: 'https://huggingface.co/docs/tokenizers/api/tokenizer',
      version: 'tokenizers 0.23',
    },
    {
      title: 'Sentence Transformers: semantic search',
      url: 'https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html',
    },
    {
      title: 'Devlin et al., BERT (WordPiece tokenization, section 3)',
      url: 'https://arxiv.org/abs/1810.04805',
    },
  ],
} satisfies LessonMeta;
