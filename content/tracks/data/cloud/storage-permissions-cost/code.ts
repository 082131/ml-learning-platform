// Code for the cloud storage, permissions and cost lesson. cost.py is pure Python; its output for every
// setting was produced with CPython 3.13.18 (cloudCost.test.ts checks the browser's estimate against it). The
// prices are example values, not a provider's price list. policy.py runs in the browser and is checked under
// CPython. The IAM policy follows the AWS IAM JSON policy reference and is not applied here.
import { COST_SOURCE, costExperiment, costSlots, type CostState } from '@/lib/data/cloudCost';
import type { CodeExample } from '@/lib/types';

export const cost = costExperiment('cost');

const st = (s: unknown) => s as CostState;

export const costPython: CodeExample = {
  id: 'cost-python',
  language: 'python',
  source: COST_SOURCE,
  slots: {
    newGb: (s) => costSlots(st(s)).newGb,
    lifecycle: (s) => costSlots(st(s)).lifecycle,
    queries: (s) => costSlots(st(s)).queries,
    scan: (s) => costSlots(st(s)).scan,
  },
  annotations: [
    {
      id: 'price',
      range: { line: 1 },
      kind: 'variable',
      title: 'PRICE',
      what: 'Example storage prices per GB per month for three storage classes.',
      why: 'Colder classes cost less to keep and more (or slower) to read. Look up your provider’s current list before deciding.',
    },
    {
      id: 'scan-price',
      range: { line: 2 },
      kind: 'variable',
      title: 'SCAN_PRICE',
      what: 'An example price per terabyte that a query engine reads.',
      why: 'Serverless query engines bill by bytes scanned, so how a table is laid out decides what every query costs.',
    },
    {
      id: 'new-gb',
      range: { line: 3, startCol: 9, endCol: 18 },
      match: '{{newGb}}',
      kind: 'parameter',
      title: 'NEW_GB',
      what: 'GB landed per month, from the slider.',
      why: 'Storage grows every month you keep data, so the bill keeps rising unless old data moves or is deleted.',
    },
    {
      id: 'lifecycle',
      range: { line: 4, startCol: 13, endCol: 26 },
      match: '{{lifecycle}}',
      kind: 'parameter',
      title: 'LIFECYCLE',
      what: 'Where a lifecycle rule moves data older than 3 months.',
      why: 'Most data is read often when new and rarely after. A lifecycle rule moves it to a cheaper class automatically.',
    },
    {
      id: 'scan',
      range: { line: 6, startCol: 8, endCol: 16 },
      match: '{{scan}}',
      kind: 'parameter',
      title: 'SCAN',
      what: 'Whether each query reads the last 7 days (a partitioned table) or the whole table.',
      why: 'The same dashboard costs very different amounts depending on this one layout decision.',
    },
    {
      id: 'storage',
      range: { line: 12 },
      kind: 'math',
      title: 'Storage cost',
      what: 'Hot GB × standard price + cold GB × the cold class price.',
      why: 'After a year, 3 months of data are hot and 9 months are cold: most bytes are old.',
    },
    {
      id: 'queries',
      range: { line: 14 },
      kind: 'math',
      title: 'Query cost',
      what: 'Queries per day × 30 days × GB per query ÷ 1000 (to TB) × price per TB.',
      why: 'It grows with both usage and table size; full scans of a growing table get more expensive every month.',
    },
  ],
};

export const policyRunner: CodeExample = {
  id: 'policy-runner',
  language: 'python',
  run: 'pyodide',
  source: `from fnmatch import fnmatch

POLICY = [  # (effect, principal, action, resource); * matches anything
    ("Allow", "ingest-job", "s3:PutObject", "lake/raw/*"),
    ("Allow", "transform-job", "s3:GetObject", "lake/raw/*"),
    ("Allow", "transform-job", "s3:PutObject", "lake/clean/*"),
    ("Allow", "analyst", "s3:GetObject", "lake/clean/*"),
    ("Deny", "*", "s3:DeleteObject", "lake/raw/*"),
]


def decide(principal, action, resource):
    effects = [effect for effect, p, a, r in POLICY
               if fnmatch(principal, p) and fnmatch(action, a) and fnmatch(resource, r)]
    if "Deny" in effects:
        return "denied (explicit deny)"
    if "Allow" in effects:
        return "allowed"
    return "denied (nothing allows it)"


requests = [
    ("ingest-job", "s3:PutObject", "lake/raw/2026-10-24/orders.json"),
    ("analyst", "s3:GetObject", "lake/clean/orders/part-0.parquet"),
    ("analyst", "s3:GetObject", "lake/raw/2026-10-24/orders.json"),
    ("transform-job", "s3:DeleteObject", "lake/raw/2026-10-24/orders.json"),
]
for principal, action, resource in requests:
    print(f"{principal:<13} {action:<16} {resource:<36} {decide(principal, action, resource)}")`,
  annotations: [],
  expectedOutput: `ingest-job    s3:PutObject     lake/raw/2026-10-24/orders.json      allowed
analyst       s3:GetObject     lake/clean/orders/part-0.parquet     allowed
analyst       s3:GetObject     lake/raw/2026-10-24/orders.json      denied (nothing allows it)
transform-job s3:DeleteObject  lake/raw/2026-10-24/orders.json      denied (explicit deny)`,
};

export const iamPolicy: CodeExample = {
  id: 'iam-policy',
  language: 'json',
  source: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TransformReadsRaw",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::acme-lake/raw/*"
    },
    {
      "Sid": "TransformWritesClean",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::acme-lake/clean/*"
    },
    {
      "Sid": "NobodyDeletesRaw",
      "Effect": "Deny",
      "Action": ["s3:DeleteObject"],
      "Resource": "arn:aws:s3:::acme-lake/raw/*"
    }
  ]
}`,
  annotations: [
    {
      id: 'version',
      range: { line: 2 },
      kind: 'syntax',
      title: '"Version": "2012-10-17"',
      what: 'The version of the policy language, not a date you choose.',
      why: 'Always use this value; older versions lack features such as policy variables.',
    },
    {
      id: 'action',
      range: { line: 7 },
      kind: 'framework',
      title: 'Action',
      what: 'The exact API operations allowed: reading objects, nothing else.',
      why: 'Least privilege: s3:* would also allow deleting and changing permissions, which this job never needs.',
    },
    {
      id: 'resource',
      range: { line: 8 },
      kind: 'framework',
      title: 'Resource',
      what: 'Which objects the statement covers: everything under raw/ in the acme-lake bucket.',
      why: 'Scoping to a prefix means a bug or a leaked key in the transform job cannot touch other data.',
    },
    {
      id: 'deny',
      range: { line: 18 },
      kind: 'syntax',
      title: '"Effect": "Deny"',
      what: 'An explicit deny overrides any allow, from any policy.',
      why: 'Raw data is the copy you replay from. Denying deletes protects it even if someone later grants broad access.',
    },
  ],
};

export const configCode: CodeExample = {
  id: 'config-secrets',
  language: 'python',
  source: `import os

import boto3

BUCKET = os.environ["LAKE_BUCKET"]          # differs per environment: dev, staging, prod
s3 = boto3.client("s3")                     # credentials come from the job's role, not the code


def land(day, body):
    s3.put_object(Bucket=BUCKET, Key=f"raw/orders/day={day}/orders.json", Body=body)`,
  annotations: [
    {
      id: 'env',
      range: { line: 5 },
      kind: 'syntax',
      title: 'os.environ["LAKE_BUCKET"]',
      what: 'Reads the bucket name from the environment the job runs in.',
      why: 'The same code deploys to dev and prod; only configuration changes. A KeyError at start-up beats writing to the wrong bucket.',
    },
    {
      id: 'role',
      range: { line: 6 },
      kind: 'framework',
      title: 'boto3.client("s3")',
      what: 'Finds credentials automatically: from the role attached to the machine, container or job.',
      why: 'No access key in the code or the repository, so nothing to leak and nothing to rotate by hand.',
    },
  ],
};
