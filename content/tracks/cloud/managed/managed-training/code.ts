// Code for "Managed training". The phase model is src/lib/cloud/managed.ts (unit-tested); SageMaker bills from
// TrainingStartTime to TrainingEndTime (download, training, upload), not provisioning. billing.py runs under CPython 3.13
// and Pyodide (checked by python-outputs.test.ts). The SageMaker (Python SDK 2.x) and Vertex AI
// (google-cloud-aiplatform 1.x) snippets need cloud accounts and are not run here.
import { managedExperiment } from '@/lib/cloud/experiments';
import type { ManagedInput } from '@/lib/cloud/managed';
import type { CodeExample } from '@/lib/types';

export const managed = managedExperiment('cloud-managed');

const M = (s: unknown) => s as ManagedInput;

export const billingDemo: CodeExample = {
  id: 'cloud-managed-billing',
  language: 'python',
  run: 'pyodide',
  source: `def minutes(gb, mb_per_s):
    return gb * 1000 / mb_per_s / 60

price, dataset_gb, model_gb, rate = 1.86, 200, 16, 500          # $/h, GB, GB, MB/s from S3
train_min = 3 * 60

managed = {"starting (not billed)": 0, "downloading": minutes(dataset_gb, rate),
           "training": train_min, "uploading": minutes(model_gb, rate)}
vm = {"setup by hand": 45, "copying data": minutes(dataset_gb, rate), "training": train_min,
      "uploading": minutes(model_gb, rate), "idle overnight": 14 * 60}

for name, phases in (("managed job", managed), ("own VM", vm)):
    hours = sum(phases.values()) / 60
    print(f"{name:12} billed {hours:5.2f} h  \${hours * price:6.2f}")`,
  expectedOutput: `managed job  billed  3.12 h  $  5.80
own VM       billed 17.87 h  $ 33.24`,
  annotations: [
    {
      id: 'not-billed',
      range: { line: 7 },
      kind: 'variable',
      title: 'Provisioning is free',
      what: 'SageMaker starts billing when the instances are ready (TrainingStartTime), so waiting for capacity costs nothing.',
      why: 'On your own VM the meter runs from boot, including every minute spent installing drivers.',
    },
    {
      id: 'idle',
      range: { line: 10 },
      kind: 'variable',
      title: 'The idle hours',
      what: 'A VM someone forgot to stop runs all night at full price.',
      why: 'A managed job tears its instances down the moment training ends. This one difference is most of the gap.',
    },
  ],
};

export const sagemakerCode: CodeExample = {
  id: 'cloud-sagemaker-estimator',
  language: 'python',
  source: `from sagemaker.pytorch import PyTorch

estimator = PyTorch(
    entry_point="train.py", source_dir="src",
    role="arn:aws:iam::111122223333:role/train-job",       # the execution role from the IAM lesson
    instance_type="ml.g6e.xlarge", instance_count={{instances}},
    framework_version="2.5", py_version="py311",
    input_mode="{{mode}}",                                  # File copies first; FastFile streams
    use_spot_instances=True, max_run=8 * 3600, max_wait=12 * 3600,
    checkpoint_s3_uri="s3://acme-ml/checkpoints/run-42/",   # /opt/ml/checkpoints is synced here
    output_path="s3://acme-ml/models/",                     # /opt/ml/model -> model.tar.gz
)
estimator.fit({"train": "s3://acme-ml/datasets/v7/"})      # appears at /opt/ml/input/data/train`,
  slots: {
    instances: (s) => String(M(s).instances),
    mode: (s) => M(s).inputMode,
  },
  annotations: [
    {
      id: 'role',
      range: { line: 5 },
      kind: 'parameter',
      title: 'The job runs as a role',
      what: 'SageMaker assumes this execution role to read the data, write the model and send logs.',
      why: 'No keys anywhere: the permissions are exactly the role’s policies. Passing it requires iam:PassRole.',
    },
    {
      id: 'mode',
      range: { line: 8 },
      kind: 'parameter',
      title: 'Input mode',
      what: 'File downloads the whole channel to local disk before train.py starts (billed time). FastFile exposes S3 objects as files and streams them on first read.',
      why: 'For large datasets read sequentially, FastFile removes the download phase from the timeline in the lab.',
    },
    {
      id: 'spot',
      range: { line: 9 },
      kind: 'parameter',
      title: 'Managed spot training',
      what: 'Runs on spot capacity; max_run limits training time, max_wait limits training plus waiting for capacity.',
      why: 'The previous lesson’s checkpoint logic, handled by the service: it restarts the job and restores /opt/ml/checkpoints.',
    },
    {
      id: 'output',
      range: { line: 11 },
      kind: 'framework',
      title: 'Where the model goes',
      what: 'Whatever train.py writes to /opt/ml/model is packed into model.tar.gz under output_path when the job ends.',
      why: 'A fixed contract between your script and the platform, so the same script runs locally and managed.',
    },
  ],
};

export const vertexCode: CodeExample = {
  id: 'cloud-vertex-job',
  language: 'python',
  source: `from google.cloud import aiplatform

aiplatform.init(project="acme-ml", location="us-central1", staging_bucket="gs://acme-ml-staging")
job = aiplatform.CustomJob.from_local_script(
    display_name="finetune-run-42",
    script_path="src/train.py",
    container_uri="us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.2-4.py310:latest",
    machine_type="g2-standard-8", accelerator_type="NVIDIA_L4", accelerator_count=1,
)
job.run(service_account="train-job@acme-ml.iam.gserviceaccount.com")
# Inside train.py: read gs://acme-ml/datasets/v7 as /gcs/acme-ml/datasets/v7, write to os.environ["AIP_MODEL_DIR"]`,
  annotations: [
    {
      id: 'machine',
      range: { line: 8 },
      kind: 'parameter',
      title: 'Machine and GPU are separate fields',
      what: 'On Vertex AI the machine type and the accelerator are named separately; G2 machines carry L4 GPUs.',
      why: 'Same idea as an AWS instance type, split into two settings.',
    },
    {
      id: 'sa',
      range: { line: 10 },
      kind: 'parameter',
      title: 'A service account, not keys',
      what: 'The job runs with this service account’s IAM roles.',
      why: 'Google Cloud’s equivalent of the SageMaker execution role.',
    },
    {
      id: 'gcs',
      range: { line: 11 },
      kind: 'framework',
      title: 'Cloud Storage as a file path',
      what: 'Vertex AI mounts Cloud Storage with Cloud Storage FUSE under /gcs/, and tells the script where to save the model through AIP_MODEL_DIR.',
      why: 'The equivalent of SageMaker’s /opt/ml/input and /opt/ml/model contract.',
    },
  ],
};
