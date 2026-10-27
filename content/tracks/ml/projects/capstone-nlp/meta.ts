import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-nlp',
  title: 'Capstone: text-processing and NLP system',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build a text retrieval system with keyword and embedding search',
    'Evaluate it with suitable metrics on a labeled query set',
    'Analyze errors by type of query',
  ],
  prerequisites: ['ml/deep/embeddings', 'ml/classical/project-classification'],
  concepts: [],
  references: [
    { title: 'Python documentation downloads (plain text)', url: 'https://docs.python.org/3/download.html' },
    {
      title: 'Robertson and Zaragoza, The Probabilistic Relevance Framework: BM25 and Beyond (2009)',
      url: 'https://doi.org/10.1561/1500000019',
    },
    {
      title: 'all-MiniLM-L6-v2 (model card)',
      url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
    },
    {
      title: 'Cormack, Clarke and Büttcher, Reciprocal Rank Fusion (SIGIR 2009)',
      url: 'https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf',
    },
  ],
} satisfies LessonMeta;
