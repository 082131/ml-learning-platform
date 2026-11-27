// Code for "Infrastructure as code". The plan logic is src/lib/cloud/iac.ts (unit-tested), which follows
// Terraform's documented behaviour: compare configuration, state and refreshed resources; update in place unless an
// argument forces replacement. plan.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts).
// main.tf targets Terraform 1.10+ (S3 native state locking) and the AWS provider 6.x; it needs an AWS account.
import { IAC_SCENARIOS, iacExperiment, type IacState } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const iac = iacExperiment('cloud-iac');

const I = (s: unknown) => s as IacState;
/** The value of one argument in the lab's current configuration. */
const arg = (s: unknown, address: string, key: string) =>
  (IAC_SCENARIOS[I(s).scenario] ?? IAC_SCENARIOS.first!).config.find((r) => r.address === address)?.attrs[key] ?? '';

export const planDemo: CodeExample = {
  id: 'cloud-plan-demo',
  language: 'python',
  run: 'pyodide',
  source: `FORCES_NEW = {"aws_s3_bucket": {"bucket"}, "aws_instance": {"ami"}}   # from the AWS provider docs

def plan(config, state):
    add = change = destroy = 0
    for addr in sorted(config.keys() | state.keys()):
        want, have = config.get(addr), state.get(addr)
        if have is None:
            print(f"  + {addr}")
            add += 1
        elif want is None:
            print(f"  - {addr}")
            destroy += 1
        else:
            diff = {k: (have.get(k), v) for k, v in want.items() if have.get(k) != v}
            if not diff:
                continue
            forces = diff.keys() & FORCES_NEW.get(addr.split(".")[0], set())
            symbol = "-/+" if forces else "~"
            print(f"  {symbol} {addr}: " + ", ".join(f"{k} {a} -> {b}" for k, (a, b) in diff.items()))
            add, change, destroy = (add + 1, change, destroy + 1) if forces else (add, change + 1, destroy)
    print(f"Plan: {add} to add, {change} to change, {destroy} to destroy.")

state = {"aws_s3_bucket.data": {"bucket": "acme-ml-data"},
         "aws_instance.notebook": {"ami": "ami-0a1b2c3d", "instance_type": "g5.xlarge"}}

plan(state, {})                                                                     # first apply
plan({**state, "aws_instance.notebook": {"ami": "ami-0a1b2c3d", "instance_type": "g6.xlarge"}}, state)
plan({**state, "aws_instance.notebook": {"ami": "ami-9z8y7x6w", "instance_type": "g5.xlarge"}}, state)
plan({"aws_s3_bucket.data": {"bucket": "acme-ml-data"}}, state)                       # block deleted`,
  expectedOutput: `  + aws_instance.notebook
  + aws_s3_bucket.data
Plan: 2 to add, 0 to change, 0 to destroy.
  ~ aws_instance.notebook: instance_type g5.xlarge -> g6.xlarge
Plan: 0 to add, 1 to change, 0 to destroy.
  -/+ aws_instance.notebook: ami ami-0a1b2c3d -> ami-9z8y7x6w
Plan: 1 to add, 0 to change, 1 to destroy.
  - aws_instance.notebook
Plan: 0 to add, 0 to change, 1 to destroy.`,
  annotations: [
    {
      id: 'forces',
      range: { line: 1 },
      kind: 'variable',
      title: 'Some arguments cannot change in place',
      what: 'An S3 bucket cannot be renamed and an EC2 instance cannot switch machine image; the provider marks these arguments as forcing a new resource.',
      why: 'That one fact turns an innocent-looking edit into “destroy and create”.',
    },
    {
      id: 'compare',
      range: { line: 14 },
      kind: 'math',
      title: 'Plan = configuration minus state',
      what: 'For each resource, the arguments whose wanted value differs from the recorded one.',
      why: 'Terraform never asks “what should I do?”; it computes the difference between what you wrote and what it knows exists.',
    },
    {
      id: 'deleted',
      range: { line: 10 },
      kind: 'variable',
      title: 'Missing from the code means delete',
      what: 'A resource in the state but not in the configuration is planned for destruction.',
      why: 'Deleting a block is not “stop managing it”; it is “destroy it”. Read every minus sign in a plan.',
    },
  ],
};

export const mainTf: CodeExample = {
  id: 'cloud-main-tf',
  language: 'hcl',
  source: `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "ml-platform/terraform.tfstate"
    region       = "eu-west-1"
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-west-1"
  default_tags {
    tags = { project = "ml-platform", owner = "ml-team" }
  }
}

resource "aws_s3_bucket" "data" {
  bucket = "{{bucket}}"
  lifecycle {
    prevent_destroy = {{prevent}}
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_instance" "notebook" {
  ami           = "{{ami}}"
  instance_type = "{{type}}"
}`,
  slots: {
    bucket: (s) => arg(s, 'aws_s3_bucket.data', 'bucket') || 'acme-ml-data',
    prevent: (s) => String(I(s).preventDestroy),
    ami: (s) => arg(s, 'aws_instance.notebook', 'ami') || 'ami-0a1b2c3d',
    type: (s) => arg(s, 'aws_instance.notebook', 'instance_type') || 'g5.xlarge',
  },
  annotations: [
    {
      id: 'backend',
      range: { line: 5 },
      kind: 'framework',
      title: 'State lives in a bucket, with a lock',
      what: 'The state file records which real resource belongs to each block. use_lockfile makes Terraform take a lock file next to it during plan and apply.',
      why: 'Shared remote state lets the whole team and CI work from one record; the lock stops two applies from writing it at once.',
    },
    {
      id: 'tags',
      range: { line: 15 },
      kind: 'parameter',
      title: 'Tags on everything, for free',
      what: 'default_tags adds these tags to every resource this provider creates.',
      why: 'The cost-control lesson’s first rule, enforced by code instead of by memory.',
    },
    {
      id: 'prevent',
      range: { line: 23 },
      kind: 'parameter',
      title: 'prevent_destroy',
      what: 'Any plan that would destroy this bucket, including a replacement, stops with an error. Linked to the lab’s switch.',
      why: 'For the few resources whose loss is unrecoverable: training data, model registries, state buckets.',
    },
    {
      id: 'ref',
      range: { line: 28 },
      kind: 'variable',
      title: 'A reference, not a copy',
      what: 'aws_s3_bucket.data.id is the bucket’s ID, read from the other resource.',
      why: 'Terraform orders creation by these references, and replaces the versioning resource if the bucket is replaced.',
    },
    {
      id: 'instance',
      range: { line: 35 },
      kind: 'parameter',
      title: 'Edit here, then plan',
      what: 'The lab’s scenarios edit these values: a new instance_type updates in place, a new ami replaces the instance.',
      why: 'The same one-word edit can mean a restart or a new machine with an empty disk. The plan tells you which.',
    },
  ],
};

export const workflowCode: CodeExample = {
  id: 'cloud-tf-workflow',
  language: 'bash',
  source: `terraform init                     # download the provider, connect to the state backend
terraform fmt -check && terraform validate
terraform plan -out=tfplan         # read the cloud, compare, write the exact plan to a file
terraform show tfplan              # what a reviewer reads in the pull request
terraform apply tfplan             # applies that plan and nothing else

# nightly drift check in CI: exit code 0 = no changes, 1 = error, 2 = changes (drift or unapplied code)
terraform plan -detailed-exitcode -lock=false > /dev/null; test $? -ne 2 || echo "drift found"`,
  annotations: [
    {
      id: 'saved',
      range: { line: 3 },
      kind: 'framework',
      title: 'Save the plan you reviewed',
      what: 'plan -out writes the exact set of changes to a file.',
      why: 'apply tfplan then does precisely what was reviewed, even if the code or the cloud changed in between (it fails instead of improvising).',
    },
    {
      id: 'drift',
      range: { line: 8 },
      kind: 'framework',
      title: 'Detect drift on a schedule',
      what: 'With -detailed-exitcode, plan exits with 2 whenever real resources differ from the code.',
      why: 'Console changes are found the next morning rather than on the day someone’s apply silently reverts them.',
    },
  ],
};
