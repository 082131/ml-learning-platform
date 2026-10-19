import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/rag/rag-pipeline',
  title: 'Retrieval-augmented generation end to end',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Chunk documents and explain the size and overlap trade-off',
    'Retrieve relevant chunks with cosine similarity',
    'Assemble a grounded prompt from retrieved chunks',
  ],
  prerequisites: ['ai/prompting/structured-outputs'],
  concepts: [],
} satisfies LessonMeta;
