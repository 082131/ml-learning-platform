import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/capstone/fine-tune-and-serve',
  title: 'Capstone: fine-tune and serve a model on a budget',
  level: 'advanced',
  minutes: 120,
  kind: 'capstone',
  objectives: [
    'Turn a set of requirements (model size, deadline, budget, security) into a cloud plan, and check each requirement with the track’s formulas',
    'Build the foundations as code: a private network, least-privilege roles, buckets with lifecycle rules, budgets and a locked state backend',
    'Run a LoRA fine-tune as a managed spot job that survives an interruption, and serve the result on an autoscaling private endpoint',
    'Compare the real bill with the estimate line by line, and tear everything down cleanly',
  ],
  prerequisites: ['cloud/operations/infrastructure-as-code', 'cloud/managed/model-apis'],
  concepts: ['fine-tuning', 'managed-training-job', 'managed-spot-training', 'gpu-memory-estimate', 'iam-role', 'vpc-endpoint', 'managed-endpoint', 'infrastructure-as-code', 'cloud-budget'],
  references: [
    { title: 'AWS Well-Architected Framework: Machine Learning Lens', url: 'https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/machine-learning-lens.html' },
    { title: 'Google Cloud Architecture Framework: AI and ML perspective', url: 'https://cloud.google.com/architecture/framework/perspectives/ai-ml' },
    { title: 'Amazon SageMaker AI: Managed spot training', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html' },
    { title: 'Amazon SageMaker AI: Automatic scaling of models', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling.html' },
    { title: 'Hu et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models', url: 'https://arxiv.org/abs/2106.09685' },
    { title: 'Hugging Face PEFT documentation', url: 'https://huggingface.co/docs/peft/index' },
  ],
} satisfies LessonMeta;
