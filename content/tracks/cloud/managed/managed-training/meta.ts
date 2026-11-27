import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/managed/managed-training',
  title: 'Managed training: SageMaker and Vertex AI run the job for you',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain what a managed training job does for you (provisioning, data, logs, model upload, teardown) and what you give up',
    'Walk through a SageMaker training job’s phases and say which of them are billed',
    'Use the /opt/ml contract (and Vertex AI’s AIP_MODEL_DIR and /gcs paths) so one script runs locally and managed',
    'Choose between File and FastFile input modes, and turn on managed spot training with checkpoints',
  ],
  prerequisites: ['cloud/compute/spot-checkpoints'],
  concepts: ['managed-training-job', 'training-input-mode', 'managed-spot-training', 'training-container-contract'],
  references: [
    { title: 'Amazon SageMaker AI: How training works', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/how-it-works-training.html' },
    { title: 'Amazon SageMaker AI API: DescribeTrainingJob (TrainingStartTime, BillableTimeInSeconds)', url: 'https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeTrainingJob.html' },
    { title: 'Amazon SageMaker AI: Access training data (File, FastFile and Pipe modes)', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-access-training-data.html' },
    { title: 'Amazon SageMaker AI: Managed spot training', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html' },
    { title: 'SageMaker Python SDK: PyTorch estimator', url: 'https://sagemaker.readthedocs.io/en/stable/frameworks/pytorch/using_pytorch.html', version: '2.x' },
    { title: 'Vertex AI: Custom training overview', url: 'https://cloud.google.com/vertex-ai/docs/training/overview' },
    { title: 'Vertex AI: Use Cloud Storage FUSE for training', url: 'https://cloud.google.com/vertex-ai/docs/training/cloud-storage-file-system' },
    { title: 'Vertex AI SDK: aiplatform.CustomJob', url: 'https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob', version: '1.x' },
  ],
} satisfies LessonMeta;
