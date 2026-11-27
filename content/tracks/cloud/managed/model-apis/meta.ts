import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/managed/model-apis',
  title: 'Model APIs: when a hosted model is cheaper than your own GPU',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare the monthly cost of a pay-per-token model API with self-hosting on GPUs, including the people who run it',
    'Explain why self-hosted GPUs sized for peak traffic sit mostly idle, and how the break-even volume moves',
    'Choose between on-demand APIs, batch inference, provisioned throughput, managed endpoints and your own servers',
    'Call a hosted model through Amazon Bedrock and Vertex AI with IAM credentials, and read the token usage you pay for',
  ],
  prerequisites: ['cloud/managed/managed-training'],
  concepts: ['model-api', 'open-weight-model', 'peak-to-average-ratio', 'provisioned-throughput', 'batch-inference', 'managed-endpoint'],
  references: [
    { title: 'Amazon Bedrock: Converse API', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html' },
    { title: 'Amazon Bedrock pricing (on-demand, batch, provisioned throughput)', url: 'https://aws.amazon.com/bedrock/pricing/' },
    { title: 'Amazon Bedrock: Use interface VPC endpoints (AWS PrivateLink)', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html' },
    { title: 'Amazon SageMaker AI: Deploy models for inference (real-time, serverless, asynchronous, batch)', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model.html' },
    { title: 'Vertex AI: Generative AI on Vertex AI pricing', url: 'https://cloud.google.com/vertex-ai/generative-ai/pricing' },
    { title: 'Google Gen AI SDK for Python', url: 'https://googleapis.github.io/python-genai/', version: '1.x' },
    { title: 'Vertex AI: Batch prediction for Gemini', url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini' },
  ],
} satisfies LessonMeta;
