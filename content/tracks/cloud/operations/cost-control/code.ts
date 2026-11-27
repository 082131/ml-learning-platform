// Code for "Cost control". The bill is src/lib/cloud/bill.ts (unit-tested), with Amazon S3 Standard and internet
// data transfer list prices in US East and illustrative instance prices. bill.py runs under CPython 3.13 and Pyodide
// (checked by python-outputs.test.ts). The boto3 snippets (Cost Explorer, Budgets, S3 lifecycle) need an AWS
// account and are not run here.
import { type BillInput, monthlyBill } from '@/lib/cloud/bill';
import { billExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const bill = billExperiment('cloud-bill');

const B = (s: unknown) => s as BillInput;

/** A monthly budget a little above the current estimate, rounded up to the next $500. */
export const budgetFor = (total: number) => Math.max(500, Math.ceil((total * 1.1) / 500) * 500);

export const billDemo: CodeExample = {
  id: 'cloud-bill-demo',
  language: 'python',
  run: 'pyodide',
  source: `def bill(spot=0.0, auto_stop=False, autoscale=False, commit=False, lifecycle=False):
    training = 300 * 4.00 * (1 - spot) + 300 * 4.00 * spot * (1 - 0.6)   # GPU-hours x $/h, spot at 60% off
    notebooks = 4 * (174 if auto_stop else 730) * 1.20                  # working hours only, or all month
    endpoint = 2 * (0.55 if autoscale else 1) * 730 * 1.00 * (0.7 if commit else 1)
    storage = 40_000 * (0.5 if lifecycle else 1) * 0.023                 # GB-months x S3 Standard
    egress = 2_000 * 0.09                                                # GB out to the internet
    return training + notebooks + endpoint + storage + egress

base = bill()
controls = {"stop idle notebooks": dict(auto_stop=True), "all training on spot": dict(spot=1.0),
            "autoscale endpoint": dict(autoscale=True), "expire old checkpoints": dict(lifecycle=True),
            "commit for the endpoint": dict(commit=True)}
print(f"every control off        \${base:8,.2f}")
for name, kw in sorted(controls.items(), key=lambda kv: bill(**kv[1])):
    print(f"{name:24} saves \${base - bill(**kw):8,.2f}")
everything = {k: v for kw in controls.values() for k, v in kw.items()}
print(f"all together             \${bill(**everything):8,.2f}")`,
  expectedOutput: `every control off        $7,264.00
stop idle notebooks      saves $2,668.80
all training on spot     saves $  720.00
autoscale endpoint       saves $  657.00
expire old checkpoints   saves $  460.00
commit for the endpoint  saves $  438.00
all together             $2,517.30`,
  annotations: [
    {
      id: 'notebooks',
      range: { line: 3 },
      kind: 'math',
      title: 'Idle time is the biggest line',
      what: '730 hours is the whole month; 174 is about 8 working hours on 21.75 working days.',
      why: 'A notebook left running overnight and at weekends is paid for four times as many hours as anyone uses it.',
    },
    {
      id: 'endpoint',
      range: { line: 4 },
      kind: 'math',
      title: 'Autoscaling and commitments multiply',
      what: 'Autoscaling lowers the average instance count; a commitment lowers the price per hour of what remains.',
      why: 'Scale down first, then commit to the smaller steady floor. Committing first locks in the waste.',
    },
    {
      id: 'sorted',
      range: { line: 14 },
      kind: 'variable',
      title: 'Rank the fixes by dollars',
      what: 'Each control is applied alone and the savings are sorted.',
      why: 'The fix people talk about most (spot) is often not the largest one. Look at the bill, not at the habits.',
    },
  ],
};

export const costByTagCode: CodeExample = {
  id: 'cloud-cost-by-tag',
  language: 'python',
  source: `import boto3

ce = boto3.client("ce")                                    # Cost Explorer
report = ce.get_cost_and_usage(
    TimePeriod={"Start": "2026-10-01", "End": "2026-11-01"},
    Granularity="MONTHLY",
    Metrics=["UnblendedCost"],
    GroupBy=[{"Type": "TAG", "Key": "project"}],            # an activated cost allocation tag
)
for group in report["ResultsByTime"][0]["Groups"]:
    name = group["Keys"][0].removeprefix("project$") or "(untagged)"
    print(f"{name:28} \${float(group['Metrics']['UnblendedCost']['Amount']):10,.2f}")`,
  annotations: [
    {
      id: 'tag',
      range: { line: 8 },
      kind: 'parameter',
      title: 'Group the bill by a tag',
      what: 'Every resource tagged project=… adds to its own row. The tag must be activated as a cost allocation tag in the Billing console first.',
      why: 'Without it the bill says “EC2: $4,000”; with it, it says which experiment, team or customer spent it.',
    },
    {
      id: 'untagged',
      range: { line: 11 },
      kind: 'variable',
      title: 'The untagged row',
      what: 'Keys come back as “project$<value>”; resources without the tag have an empty value.',
      why: 'Watch its size: a large untagged row means the tagging rule is not enforced.',
    },
  ],
};

export const budgetCode: CodeExample = {
  id: 'cloud-budget',
  language: 'python',
  source: `import boto3

boto3.client("budgets").create_budget(
    AccountId="111122223333",
    Budget={"BudgetName": "ml-team-monthly", "BudgetType": "COST", "TimeUnit": "MONTHLY",
            "BudgetLimit": {"Amount": "{{limit}}", "Unit": "USD"}},
    NotificationsWithSubscribers=[
        {"Notification": {"NotificationType": "FORECASTED", "ComparisonOperator": "GREATER_THAN",
                          "Threshold": 80, "ThresholdType": "PERCENTAGE"},
         "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ml-team@example.com"}]},
        {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN",
                          "Threshold": 100, "ThresholdType": "PERCENTAGE"},
         "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ml-team@example.com"}]},
    ],
)`,
  slots: {
    limit: (s) => String(budgetFor(monthlyBill(B(s)).total)),
  },
  annotations: [
    {
      id: 'limit',
      range: { line: 6 },
      kind: 'parameter',
      title: 'A limit from the lab',
      what: 'The lab’s monthly total plus 10%, rounded up to $500.',
      why: 'A budget set far above real spend never fires; one at exactly the estimate fires every month and gets ignored.',
    },
    {
      id: 'forecast',
      range: { line: 8 },
      kind: 'parameter',
      title: 'Alert on the forecast',
      what: 'FORECASTED fires when AWS projects the month will exceed 80% of the limit, before the money is spent.',
      why: 'An ACTUAL alert at 100% tells you after the fact. The forecast gives you days to react.',
    },
    {
      id: 'notify',
      range: { line: 13 },
      kind: 'parameter',
      title: 'A budget notifies; it does not stop anything',
      what: 'Subscribers get an email (or an SNS message). Nothing is shut down unless you add a budget action or your own automation.',
      why: 'Treat budgets as smoke alarms, and add hard limits (quotas, guardrails, auto-stop) separately.',
    },
  ],
};

export const lifecycleCode: CodeExample = {
  id: 'cloud-lifecycle',
  language: 'python',
  source: `import boto3

boto3.client("s3").put_bucket_lifecycle_configuration(
    Bucket="acme-ml",
    LifecycleConfiguration={"Rules": [
        {"ID": "expire-checkpoints", "Status": "Enabled", "Filter": {"Prefix": "checkpoints/"},
         "Expiration": {"Days": 30},                                  # keep a month of checkpoints
         "NoncurrentVersionExpiration": {"NoncurrentDays": 7}},       # old versions of overwritten files
        {"ID": "datasets-to-ia", "Status": "Enabled", "Filter": {"Prefix": "datasets/archive/"},
         "Transitions": [{"Days": 30, "StorageClass": "STANDARD_IA"}]},
        {"ID": "abort-uploads", "Status": "Enabled", "Filter": {},
         "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}},
    ]},
)`,
  annotations: [
    {
      id: 'expire',
      range: { line: 7 },
      kind: 'parameter',
      title: 'Checkpoints expire',
      what: 'Objects under checkpoints/ are deleted 30 days after they were written.',
      why: 'Every spot-safe run writes many checkpoints; without a rule they are stored, and billed, forever.',
    },
    {
      id: 'versions',
      range: { line: 8 },
      kind: 'parameter',
      title: 'Versions hide old copies',
      what: 'With versioning on, overwriting last.pt keeps the previous version as a noncurrent object.',
      why: 'A checkpoint overwritten every 30 minutes for a month is 1,440 hidden copies unless noncurrent versions expire.',
    },
    {
      id: 'multipart',
      range: { line: 12 },
      kind: 'parameter',
      title: 'Abort failed uploads',
      what: 'Large files are uploaded in parts. If an upload is never completed, its parts stay stored and billed but are not listed as objects.',
      why: 'Interrupted uploads of big checkpoints are a classic invisible storage leak.',
    },
  ],
};
