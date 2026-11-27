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
] satisfies GlossaryTerm[];
