import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/fundamentals/ai-landscape',
  title: 'AI, ML, DL, NLP and GenAI, and when to train, fine-tune, use a pretrained model or call an API',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Place AI, ML, deep learning, NLP and generative AI in relation to each other',
    'Decide between training, fine-tuning, a pretrained model or an API for a use case',
    'List the cost, data and control trade-offs of each choice',
  ],
  prerequisites: ['ml/foundations/what-is-ml'],
  concepts: [],
} satisfies LessonMeta;
