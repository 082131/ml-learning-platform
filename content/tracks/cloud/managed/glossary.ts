import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the cloud/managed chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'managed-training-job',
    term: 'Managed training job',
    short: 'A training run you describe (script, container, instance type, data location) and the cloud runs for you: it starts the machines, copies data, streams logs, uploads the model and shuts everything down (SageMaker training job, Vertex AI custom job).',
    introducedIn: 'cloud/managed/managed-training',
    aliases: ['SageMaker training job', 'Vertex AI custom job', 'CustomJob'],
  },
  {
    id: 'training-container-contract',
    term: 'Training container contract',
    short: 'The fixed paths and variables a managed job agrees on with your script: on SageMaker, data under /opt/ml/input/data/<channel>, the model in /opt/ml/model, checkpoints in /opt/ml/checkpoints; on Vertex AI, /gcs/ paths and AIP_MODEL_DIR.',
    introducedIn: 'cloud/managed/managed-training',
    aliases: ['/opt/ml', 'AIP_MODEL_DIR'],
  },
  {
    id: 'training-input-mode',
    term: 'Training input mode',
    short: 'How a SageMaker job gets data from S3: File copies the whole channel to local disk before the script starts (and that copy is billed), FastFile exposes the objects as files and streams them on first read, Pipe streams them through a named pipe.',
    introducedIn: 'cloud/managed/managed-training',
    aliases: ['File mode', 'FastFile mode', 'Pipe mode'],
  },
  {
    id: 'managed-spot-training',
    term: 'Managed spot training',
    short: 'A SageMaker option that runs the job on spot capacity, syncs /opt/ml/checkpoints to S3, and restarts the job after an interruption. max_run caps training time; max_wait (at least max_run) caps training plus waiting.',
    introducedIn: 'cloud/managed/managed-training',
    aliases: ['use_spot_instances', 'max_wait'],
  },
  {
    id: 'open-weight-model',
    term: 'Open-weight model',
    short: 'A model whose trained weights you can download and run yourself (Llama, Mistral, Qwen, Gemma), so the same model can be called through a hosted API or served on your own GPUs.',
    introducedIn: 'cloud/managed/model-apis',
    aliases: ['open model', 'open weights'],
  },
  {
    id: 'peak-to-average-ratio',
    term: 'Peak-to-average ratio',
    short: 'Traffic in the busiest hour divided by the average hour. A fleet sized for the peak is busy on average at most 1 ÷ this ratio of the time, unless it scales down.',
    introducedIn: 'cloud/managed/model-apis',
    aliases: ['peak factor'],
  },
  {
    id: 'provisioned-throughput',
    term: 'Provisioned throughput',
    short: 'Capacity on a hosted model bought by the hour or month (Bedrock model units, Vertex AI provisioned throughput) instead of per token: a guaranteed rate at a fixed price, between on-demand APIs and your own GPUs.',
    introducedIn: 'cloud/managed/model-apis',
  },
  {
    id: 'managed-endpoint',
    term: 'Managed endpoint',
    short: 'A model you supply, served by the cloud on instances it runs and scales (SageMaker real-time, serverless or asynchronous endpoints, Vertex AI endpoints). Billed per instance-hour, or per use for serverless.',
    introducedIn: 'cloud/managed/model-apis',
    aliases: ['SageMaker endpoint', 'Vertex AI endpoint'],
  },
] satisfies GlossaryTerm[];
