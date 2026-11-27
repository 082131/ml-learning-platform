// Code for the Cloud for ML capstone. The plan checker is src/lib/cloud/capstone.ts (unit-tested), built from the
// earlier lessons' functions; prices are the track's illustrative figures. check_plan.py runs under CPython 3.13 and
// Pyodide (checked by python-outputs.test.ts). The layout is a suggestion, not run.
import { capstoneExperiment } from '@/lib/cloud/experiments';
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const capstone = capstoneExperiment('cloud-capstone');

export const checkDemo: CodeExample = {
  id: 'cloud-capstone-check',
  language: 'python',
  run: 'pyodide',
  source: `RATE, SAVE_MIN, RESTART_MIN, DISCOUNT = 0.05, 3, 10, 0.65     # spot assumptions used by the checker

def wall_hours(work_h, every_min, spot):
    if not spot:
        return work_h
    c, r, tau = SAVE_MIN / 60, RESTART_MIN / 60, every_min / 60
    return work_h * (1 + c / tau) / (1 - RATE * ((tau + c) / 2 + r))

need_gb = 8 * 2 * 1.2                      # 8B params, LoRA on 16-bit weights, 20% headroom
gpu_gb, price, train_h = 24, 0.80, 20      # g6.xlarge (1 x L4), illustrative $/h, measured hours
hours = wall_hours(train_h, every_min=60, spot=True)
training = hours * price * (1 - DISCOUNT) * 4          # four runs a month
serving = 1.4 * 730 * 0.80                             # autoscaled endpoint, 1.4 instances on average

print(f"fits:     {need_gb:.1f} GB of {gpu_gb} GB -> {need_gb <= gpu_gb}")
print(f"deadline: {hours:.2f} h of 30 h -> {hours <= 30}")
print(f"budget:   \${training + serving:,.2f} of \$2,500 -> {training + serving <= 2500}")
print(f"          training \${training:,.2f} + serving \${serving:,.2f}")`,
  expectedOutput: `fits:     19.2 GB of 24 GB -> True
deadline: 21.75 h of 30 h -> True
budget:   $841.96 of $2,500 -> True
          training $24.36 + serving $817.60`,
  annotations: [
    {
      id: 'wall',
      range: { line: 7 },
      kind: 'math',
      title: 'The spot lesson’s formula',
      what: 'Work plus saving, divided by the useful share of each hour.',
      why: 'The deadline check is the expected wall-clock time, not the benchmark’s 20 hours.',
    },
    {
      id: 'need',
      range: { line: 9 },
      kind: 'math',
      title: 'The GPU lesson’s estimate',
      what: '8 billion parameters × 2 bytes (16-bit base weights for LoRA) × 1.2 headroom = 19.2 GB.',
      why: 'It rules out the 16 GB T4 before anything else is considered.',
    },
    {
      id: 'serving',
      range: { line: 13 },
      kind: 'math',
      title: 'Serving is the real bill',
      what: '1.4 instances on average × 730 hours × $0.80.',
      why: 'Four fine-tunes cost about $24 a month on spot; the endpoint costs over thirty times as much. Optimise the line that is large.',
    },
  ],
};

export const layout: CodeExample = {
  id: 'cloud-capstone-layout',
  language: 'bash',
  source: `finetune-and-serve/
├── infra/                      # Terraform: everything below is created from here
│   ├── main.tf                 # provider, locked S3 backend, default_tags (project, owner)
│   ├── network.tf              # VPC, private subnets, S3 gateway endpoint, no inbound rules
│   ├── iam.tf                  # train-job and endpoint roles, least privilege, iam:PassRole for CI only
│   ├── storage.tf              # data and model buckets (prevent_destroy), lifecycle rules for checkpoints
│   ├── endpoint.tf             # serving endpoint, autoscaling 1 to 3, alarms
│   └── budget.tf               # monthly budget with forecast and anomaly alerts
├── train/
│   ├── train.py                # reads SM_CHANNEL_TRAIN, writes SM_MODEL_DIR, checkpoints to /opt/ml/checkpoints
│   ├── launch.py               # estimator: spot, max_run / max_wait, checkpoint_s3_uri, FastFile, tags
│   └── benchmark.md            # 30-minute benchmark run -> measured hours for the full job
├── serve/
│   └── smoke_test.py           # call the endpoint, check latency and one known answer
├── costs/
│   └── month.py                # the month as named lines, compared with the actual bill
├── .github/workflows/
│   └── infra.yml               # terraform plan on pull requests, apply the saved plan after approval
└── DESIGN.md                   # the plan, every check, the numbers and what you would change`,
  annotations: [
    {
      id: 'infra',
      range: { line: 2 },
      kind: 'framework',
      title: 'Infrastructure first, as code',
      what: 'Network, roles, buckets, endpoint and budget are Terraform, reviewed like application code.',
      why: 'The whole platform can be recreated, reviewed and torn down: nothing exists only because someone clicked it.',
    },
    {
      id: 'train',
      range: { line: 10 },
      kind: 'framework',
      title: 'One script, local and managed',
      what: 'train.py follows the /opt/ml contract with local defaults.',
      why: 'Debug on a laptop or a small instance, then run the identical script as a managed spot job.',
    },
    {
      id: 'design',
      range: { line: 19 },
      kind: 'framework',
      title: 'Write down the reasoning',
      what: 'DESIGN.md records each requirement, the decision that meets it and the number that proves it.',
      why: 'A reviewer should be able to check your plan with the same arithmetic as the lab.',
    },
  ],
};

export const brief: ProjectBrief = {
  goal: 'Fine-tune an 8-billion-parameter open-weight model with LoRA four times a month and serve it behind a private endpoint, within 30 hours per run and $2,500 a month, with no long-lived keys, nothing open to the internet and every resource created from code.',
  dataset:
    'Any instruction dataset you may use (for example a public support-conversation or Q&A set), about 200 GB with its tokenised shards, stored as large shard files in a bucket in the same region as the GPUs. For a low-cost rehearsal, use a 1B to 3B model and a 1 GB sample: every step is the same.',
  milestones: [
    'Plan on paper: pick the instance with the GPU memory estimate, measure training hours with a 30-minute benchmark run, and check deadline and budget with the lab’s formulas. Record the numbers in DESIGN.md.',
    'Foundations in Terraform: a VPC with private subnets and an S3 gateway endpoint, IAM roles for the training job and the endpoint, buckets with prevent_destroy and lifecycle rules, default tags, and a locked remote state backend.',
    'Data: shard the dataset into files of a few hundred MB in the GPUs’ region, and show the loader keeps the GPU busy (the object-storage lesson’s throughput check).',
    'Training: a managed spot job with checkpoints to /opt/ml/checkpoints, max_run and max_wait set, and train.py resuming from the latest checkpoint. Interrupt it once on purpose (stop the job, start a new one with the same checkpoint path) and show it resumes.',
    'Serving: deploy the merged or adapter model to an autoscaling endpoint (1 to 3 instances) reachable only from inside the VPC, with a smoke test and a latency alarm. Compare its monthly cost with a hosted model API at your expected traffic.',
    'Cost and operations: a budget with forecast and anomaly alerts, a month.py that lists the month as named lines, a CI workflow that plans on pull requests and applies only reviewed plans, and a drift check.',
    'Tear down: terraform destroy everything except the protected buckets, and confirm the bill stops.',
  ],
  rubric: [
    { criterion: 'Every check passes with numbers', detail: 'Memory fit, expected wall-clock time on spot, monthly bill, credentials, network exposure and data placement each have a figure in DESIGN.md that matches the lab’s formulas.' },
    { criterion: 'Survives interruption', detail: 'The deliberate interruption loses at most one checkpoint interval of work, and the final model matches a run that was not interrupted (same step count, loss curve continuous).' },
    { criterion: 'Least privilege, private by default', detail: 'No access keys anywhere; the job role can read only the data prefix and write only its output and checkpoint prefixes; no security group allows inbound traffic from the internet.' },
    { criterion: 'Everything from code', detail: 'A fresh account can be brought to the same state with terraform apply; a plan run after setup shows no changes.' },
    { criterion: 'Cost awareness', detail: 'The real bill for the rehearsal is compared line by line with the estimate, with the largest difference explained.' },
  ],
  hints: [
    'Rehearse with a small model first: the expensive mistakes (wrong output path, missing checkpoints, open ports) are just as visible at 1B parameters.',
    'Write train.py against the /opt/ml paths with local defaults, and run it locally for a few steps before launching any job.',
    'Request the GPU quota for your chosen instance family on day one; it is often zero in a new account.',
    'Keep serving the largest line in view: autoscaling and a scale-to-zero option for non-production endpoints usually save more than any training trick.',
  ],
};
