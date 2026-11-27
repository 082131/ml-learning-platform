import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'billed-phases',
    type: 'choice',
    prompt: 'A SageMaker job spent 9 minutes in “Starting” waiting for a GPU, 7 minutes “Downloading” the dataset, 3 hours “Training” and 1 minute “Uploading”. How much of that is billed?',
    options: [
      { text: 'All of it: 3 hours 17 minutes, because the instance was reserved for you from the start', correct: false, explain: 'Billing starts at TrainingStartTime, after provisioning. Waiting for capacity costs time, not money.' },
      { text: '3 hours 8 minutes: downloading, training and uploading, but not the wait for the instance', correct: true, explain: 'The billed window runs from TrainingStartTime to TrainingEndTime, which covers the download and the upload as well as training.' },
      { text: 'Exactly 3 hours: only the time your script spends training', correct: false, explain: 'The download (File mode) and the model upload run on your instances, so they are inside the billed window.' },
    ],
  },
  {
    id: 'fastfile-slower',
    type: 'choice',
    prompt: 'You switch a job from File to FastFile. The 7-minute download disappears from the timeline, but training now takes 40 minutes longer. The dataset is 2 million small JPEGs read in random order. What happened?',
    options: [
      { text: 'FastFile throttles bandwidth to save cost, so every read is slower', correct: false, explain: 'There is no such throttle. The extra time comes from how many separate requests the loader now makes.' },
      { text: 'Each first read is now an S3 request with its own latency, paid during training while the GPU waits', correct: true, explain: 'The object-storage lesson’s rule again: millions of small files each pay time-to-first-byte. Shards (or File mode) fix it.' },
      { text: 'FastFile copies the data twice, once to a cache and once to the GPU', correct: false, explain: 'FastFile reads on demand; nothing is copied up front. The cost moved from a download phase into training.' },
    ],
  },
  {
    id: 'two-instances',
    type: 'numeric',
    prompt: 'A File-mode job runs on 2 instances at $1.86 per hour each. Each instance downloads a 400 GB dataset at 500 MB/s, trains for 5 hours, and the job uploads a 10 GB model at the same rate. Assume both instances are billed for the whole download-train-upload window. What does the job cost, in dollars?',
    answer: 19.45,
    tolerance: 0.05,
    hint: 'Download: 400 × 1000 / 500 / 60 minutes. Add 300 minutes of training and the upload, convert to hours, then × 2 instances × $1.86.',
    explain: 'Download 13.33 min + training 300 min + upload 0.33 min = 313.67 min = 5.228 h per instance. × 2 = 10.46 instance-hours × $1.86 ≈ $19.45. With the default FullyReplicated distribution, every instance copies the full dataset.',
  },
  {
    id: 'wrong-path',
    type: 'choice',
    prompt: 'train.py saves the final weights to /home/user/outputs/model.pt. The job finishes with status Completed. What do you find under output_path in S3?',
    options: [
      { text: 'A model.tar.gz with none of your weights in it', correct: true, explain: 'SageMaker packs whatever is in /opt/ml/model. Anything written elsewhere vanishes with the instance when the job ends.' },
      { text: 'model.pt, because SageMaker uploads every file the script created', correct: false, explain: 'Only /opt/ml/model (the model) and /opt/ml/output (failure files, extra data) are uploaded at the end, plus /opt/ml/checkpoints if configured.' },
      { text: 'Nothing: the job fails with an error saying /opt/ml/model is empty', correct: false, explain: 'An empty model directory is not an error. That is what makes this mistake expensive: the job “succeeds”.' },
    ],
  },
  {
    id: 'max-wait',
    type: 'choice',
    prompt: 'A teammate turns on managed spot training with max_run = 8 hours and max_wait = 6 hours “so it fails fast”. What happens?',
    options: [
      { text: 'SageMaker rejects the job: max_wait must be at least max_run', correct: true, explain: 'max_wait covers training plus waiting for spot capacity, so it can never be shorter than the training limit.' },
      { text: 'The job runs, and stops after 6 hours of training even if it is not finished', correct: false, explain: 'The limits are validated before the job starts. A max_wait shorter than max_run is invalid.' },
      { text: 'The job waits at most 6 hours for capacity, then trains for up to 8 more', correct: false, explain: 'max_wait is the total of waiting and training, not the waiting alone.' },
    ],
  },
  {
    id: 'vertex-map',
    type: 'choice',
    prompt: 'You move the script to a Vertex AI custom job. Which pair plays the role SageMaker’s /opt/ml/model and execution role played?',
    options: [
      { text: 'The AIP_MODEL_DIR environment variable and the job’s service account', correct: true, explain: 'Vertex AI tells the script where to write the model through AIP_MODEL_DIR (a Cloud Storage path), and the job acts as the service account you pass.' },
      { text: 'The /gcs/ mount and an API key stored in the container', correct: false, explain: '/gcs/ is how data is read through Cloud Storage FUSE. Keys in a container are exactly what roles and service accounts avoid.' },
      { text: 'The staging_bucket and the user who submitted the job', correct: false, explain: 'The staging bucket holds the packaged code. The job does not run with your personal identity unless you configure it to.' },
    ],
  },
];

export const managedExercise: Exercise = {
  id: 'cloud-managed-hours',
  prompt:
    'Write `managed_billed_hours(dataset_gb, mode, mb_per_s, train_h, model_gb, instances)`: the billed instance-hours of a SageMaker job (download only in "File" mode, then training, then the model upload; provisioning is free). Then write `vm_billed_hours(dataset_gb, mb_per_s, train_h, model_gb, setup_min, idle_h)` for one VM you run yourself: setup, copy, training, upload and the idle hours until someone stops it. 1 GB = 1000 MB.',
  starter: `def managed_billed_hours(dataset_gb, mode, mb_per_s, train_h, model_gb, instances):
    return train_h

def vm_billed_hours(dataset_gb, mb_per_s, train_h, model_gb, setup_min, idle_h):
    return train_h`,
  hints: [
    'Transfer minutes: gb × 1000 / mb_per_s / 60. Work in minutes and divide by 60 at the end.',
    'Managed: (download if mode == "File" else 0) + train_h × 60 + upload, then / 60 × instances. VM: setup + copy + training + upload + idle_h × 60.',
  ],
  solution: `def _minutes(gb, mb_per_s):
    return gb * 1000 / mb_per_s / 60

def managed_billed_hours(dataset_gb, mode, mb_per_s, train_h, model_gb, instances):
    download = _minutes(dataset_gb, mb_per_s) if mode == "File" else 0
    total = download + train_h * 60 + _minutes(model_gb, mb_per_s)
    return total / 60 * instances

def vm_billed_hours(dataset_gb, mb_per_s, train_h, model_gb, setup_min, idle_h):
    total = setup_min + _minutes(dataset_gb, mb_per_s) + train_h * 60 + _minutes(model_gb, mb_per_s) + idle_h * 60
    return total / 60`,
  explanation:
    'The two functions differ in exactly the phases the lesson named: the managed side drops provisioning (free) and the idle tail (the job tears down), and FastFile also drops the download. Everything else is the same arithmetic.',
  tests: `assert abs(managed_billed_hours(200, "File", 500, 3, 16, 1) - 3.12) < 1e-9
assert abs(managed_billed_hours(200, "FastFile", 500, 3, 16, 1) - 3.008889) < 1e-5
assert abs(managed_billed_hours(200, "File", 500, 3, 16, 2) - 6.24) < 1e-9
assert abs(vm_billed_hours(200, 500, 3, 16, 45, 14) - 17.87) < 1e-9
assert abs(vm_billed_hours(200, 500, 3, 16, 0, 0) - 3.12) < 1e-9`,
};
