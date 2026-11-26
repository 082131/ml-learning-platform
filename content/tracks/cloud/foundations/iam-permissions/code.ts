// Code for "Identity and permissions". The lab uses src/lib/cloud/iam.ts, a model of AWS's documented policy
// evaluation logic (unit-tested). The policy JSON below is generated from the same objects the lab evaluates, so the
// two cannot drift apart. decide.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The
// boto3 call needs AWS credentials and is not run here; its parameters follow boto3 1.40's IAM client.
import { BUCKET_POLICY, IDENTITY_POLICIES, iamExperiment, iamResource, ROLES, type IamState } from '@/lib/cloud/experiments';
import { policyJson } from '@/lib/cloud/iam';
import type { CodeExample } from '@/lib/types';

export const iam = iamExperiment('cloud-iam');

export const trainPolicy: CodeExample = {
  id: 'cloud-train-policy',
  language: 'json',
  source: policyJson(IDENTITY_POLICIES[0]!),
  annotations: [
    {
      id: 'version',
      range: { line: 2 },
      kind: 'syntax',
      title: 'Policy language version',
      what: '2012-10-17 is the current version of the policy grammar, not a date you change.',
      why: 'Without it IAM falls back to an old grammar in which policy variables such as aws:username do not work.',
    },
    {
      id: 'action',
      range: { line: 7 },
      kind: 'parameter',
      title: 'Action: one exact API call',
      what: 's3:GetObject reads an object. It does not list the bucket (s3:ListBucket) or write (s3:PutObject).',
      why: 'Naming exact actions is what least privilege means in practice: the job can do its work and nothing else.',
    },
    {
      id: 'resource',
      range: { line: 8 },
      kind: 'parameter',
      title: 'Resource: an ARN pattern',
      what: 'An Amazon Resource Name. The * at the end matches every object under datasets/.',
      why: 'Scoping by prefix lets one bucket hold data, models and scratch files with different rules for each.',
    },
  ],
};

export const bucketPolicy: CodeExample = {
  id: 'cloud-bucket-policy',
  language: 'json',
  source: policyJson(BUCKET_POLICY),
  annotations: [
    {
      id: 'principal',
      range: { line: 7 },
      kind: 'parameter',
      title: 'Principal "*"',
      what: 'A resource policy names who it applies to. Here: everyone, because it is a Deny.',
      why: 'A Deny for everyone is safe; an Allow for "*" would make the objects public.',
    },
    {
      id: 'deny',
      range: { line: 6 },
      kind: 'syntax',
      title: 'An explicit Deny',
      what: 'If this statement matches a request, the request is refused, whatever any other policy allows.',
      why: 'Even an administrator role cannot delete released models by accident; only the exception below can.',
    },
    {
      id: 'condition',
      range: { line: 11 },
      kind: 'parameter',
      title: 'The one exception',
      what: 'ArnNotEquals on aws:PrincipalArn: the Deny applies to every principal except the CI role.',
      why: 'Model deletion goes through the reviewed pipeline instead of someone’s notebook.',
    },
  ],
};

export const decideDemo: CodeExample = {
  id: 'cloud-iam-decide',
  language: 'python',
  run: 'pyodide',
  source: `from fnmatch import fnmatchcase

def matches(st, action, resource):
    return (any(fnmatchcase(action.lower(), a.lower()) for a in st["Action"])
            and any(fnmatchcase(resource, r) for r in st["Resource"]))

def decide(statements, action, resource):
    hits = [st for st in statements if matches(st, action, resource)]
    if any(st["Effect"] == "Deny" for st in hits):
        return "explicit deny"
    if any(st["Effect"] == "Allow" for st in hits):
        return "allow"
    return "implicit deny"

train_job = [
    {"Effect": "Allow", "Action": ["s3:GetObject"], "Resource": ["arn:aws:s3:::acme-ml/datasets/*"]},
    {"Effect": "Allow", "Action": ["s3:PutObject"], "Resource": ["arn:aws:s3:::acme-ml/models/*"]},
    {"Effect": "Deny", "Action": ["s3:Delete*"], "Resource": ["arn:aws:s3:::acme-ml/*"]},
]
requests = [
    ("s3:GetObject", "arn:aws:s3:::acme-ml/datasets/train.parquet"),
    ("s3:PutObject", "arn:aws:s3:::acme-ml/datasets/train.parquet"),
    ("s3:DeleteObject", "arn:aws:s3:::acme-ml/models/v3.pt"),
]
for action, resource in requests:
    print(f"{action:16} {resource.split(':::')[1]:30} -> {decide(train_job, action, resource)}")`,
  expectedOutput: `s3:GetObject     acme-ml/datasets/train.parquet -> allow
s3:PutObject     acme-ml/datasets/train.parquet -> implicit deny
s3:DeleteObject  acme-ml/models/v3.pt           -> explicit deny`,
  annotations: [
    {
      id: 'case',
      range: { line: 4 },
      kind: 'syntax',
      title: 'Actions ignore case, resources do not',
      what: 'IAM treats s3:getobject and s3:GetObject as the same action, but ARNs are case-sensitive.',
      why: 'Matching the real rules keeps the toy evaluator honest.',
    },
    {
      id: 'deny-first',
      range: { line: 9 },
      kind: 'syntax',
      title: 'Deny is checked first',
      what: 'One matching Deny ends the evaluation.',
      why: 'This ordering is the whole reason explicit denies make reliable guardrails.',
    },
    {
      id: 'default',
      range: { line: 13 },
      kind: 'syntax',
      title: 'The default is no',
      what: 'If nothing matched, the answer is still deny.',
      why: 'You never need to deny what you did not allow. Permissions start at zero and are added.',
    },
  ],
};

export const simulateCode: CodeExample = {
  id: 'cloud-iam-simulate',
  language: 'python',
  source: `import boto3

iam = boto3.client("iam")
result = iam.simulate_principal_policy(
    PolicySourceArn="{{role}}",
    ActionNames=["{{action}}"],
    ResourceArns=["{{resource}}"],
)
for r in result["EvaluationResults"]:
    print(r["EvalActionName"], r["EvalDecision"])   # allowed, explicitDeny or implicitDeny`,
  slots: {
    role: (s) => ROLES[(s as IamState).role]!,
    action: (s) => (s as IamState).action,
    resource: (s) => iamResource(s as IamState),
  },
  annotations: [
    {
      id: 'simulate',
      range: { line: 4 },
      kind: 'function',
      title: 'Ask IAM before you deploy',
      what: 'The IAM policy simulator evaluates a role’s identity policies against actions and resources without performing them.',
      why: 'Testing permissions in CI is cheaper than discovering an AccessDenied halfway through a twelve-hour training run.',
    },
    {
      id: 'decision',
      range: { line: 10 },
      kind: 'variable',
      title: 'Three possible answers',
      what: 'The same three outcomes as the lab: allowed, explicitDeny, implicitDeny.',
      why: 'implicitDeny means “add a permission”; explicitDeny means “a guardrail said no on purpose”. They need different fixes.',
    },
  ],
};
