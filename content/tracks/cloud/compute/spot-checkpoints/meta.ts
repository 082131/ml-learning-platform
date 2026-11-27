import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/compute/spot-checkpoints',
  title: 'Spot capacity and checkpoints: half-price GPUs that can be taken away',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain what spot (and Google Cloud Spot VM) capacity is, why it is cheap, and how interruptions are announced',
    'Estimate the expected run time and cost of a training job on spot, with and without checkpoints',
    'Choose a checkpoint interval with Young’s rule and explain the trade-off it balances',
    'Write a training loop that checkpoints atomically, resumes cleanly and saves on the interruption warning',
  ],
  prerequisites: ['cloud/compute/gpu-instances'],
  concepts: ['spot-instance', 'interruption-notice', 'checkpoint', 'checkpoint-interval'],
  references: [
    { title: 'Amazon EC2 Spot Instances', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html' },
    { title: 'Amazon EC2: Spot Instance interruption notices', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html' },
    { title: 'Google Cloud: Spot VMs', url: 'https://cloud.google.com/compute/docs/instances/spot' },
    { title: 'Amazon SageMaker AI: Managed spot training', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html' },
    { title: 'Young, J. W. (1974). A first order approximation to the optimum checkpoint interval. Communications of the ACM 17(9)', url: 'https://doi.org/10.1145/361147.361115' },
    { title: 'PyTorch: Saving and loading a general checkpoint', url: 'https://docs.pytorch.org/tutorials/recipes/recipes/saving_and_loading_a_general_checkpoint.html', version: '2.9' },
    { title: 'Python: os.replace (atomic rename)', url: 'https://docs.python.org/3.13/library/os.html#os.replace', version: 'Python 3.13' },
  ],
} satisfies LessonMeta;
