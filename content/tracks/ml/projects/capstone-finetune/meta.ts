import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-finetune',
  title: 'Capstone: fine-tune a pretrained transformer',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Fine-tune a pretrained transformer on a labeled dataset',
    'Compare it with a simple baseline on the same data',
    'Report cost, accuracy and failure cases',
  ],
  prerequisites: ['ml/deep/transformers', 'ml/practice/experiment-tracking', 'ml/practice/gpu-training'],
  concepts: [],
  references: [
    {
      title: 'Hugging Face Transformers: Fine-tuning (Trainer)',
      url: 'https://huggingface.co/docs/transformers/en/training',
      version: 'transformers 5',
    },
    {
      title: 'DistilBERT base uncased (model card)',
      url: 'https://huggingface.co/distilbert/distilbert-base-uncased',
    },
    { title: 'IMDb dataset card', url: 'https://huggingface.co/datasets/stanfordnlp/imdb' },
    {
      title: 'Sanh et al., DistilBERT, a distilled version of BERT (2019)',
      url: 'https://arxiv.org/abs/1910.01108',
    },
  ],
} satisfies LessonMeta;
