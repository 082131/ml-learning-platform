import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/foundations/how-llms-learn',
  title: 'How an LLM learns: next-token loss, pretraining and fine-tuning',
  level: 'beginner',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain the three training stages (pretraining, supervised fine-tuning, preference tuning) as one chain: what each stage starts from, what data it uses and what it adds',
    'Compute the cross-entropy loss of a prediction and of a sentence, and say why the logarithm is there',
    'Turn an average loss into a perplexity and explain what that number means',
    'Tell apart a base model and an instruct model, and fine-tuning and prompting',
  ],
  prerequisites: ['ai/llm/transformers-llms'],
  concepts: ['next-token-prediction', 'cross-entropy-loss', 'perplexity', 'pretraining', 'base-model', 'post-training', 'instruct-model', 'fine-tuning'],
  references: [
    { title: 'Radford et al., Language Models are Unsupervised Multitask Learners (GPT-2)', url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf' },
    { title: 'Ouyang et al., Training language models to follow instructions with human feedback (InstructGPT)', url: 'https://arxiv.org/abs/2203.02155' },
    { title: 'Hugging Face Transformers: Perplexity of fixed-length models', url: 'https://huggingface.co/docs/transformers/en/perplexity', version: 'transformers 5' },
    { title: 'Hugging Face TRL documentation', url: 'https://huggingface.co/docs/trl/index', version: 'TRL 1.19' },
  ],
} satisfies LessonMeta;
