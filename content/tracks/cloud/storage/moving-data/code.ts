// Code for "Moving data". The placement experiment is src/lib/cloud/dataload.ts (transferPlan, unit-tested), with AWS
// US East list prices per GB: same region $0, between regions $0.02, internet egress $0.09 (first 10 TB a month),
// and $0.01 each way between zones for VM-to-VM traffic. move.py runs under CPython 3.13 and Pyodide (checked by
// python-outputs.test.ts). The CLI commands need credentials and are not run here.
import type { TransferInput } from '@/lib/cloud/dataload';
import { transferExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const transfer = transferExperiment('cloud-transfer');

export const moveDemo: CodeExample = {
  id: 'cloud-move',
  language: 'python',
  run: 'pyodide',
  source: `PRICE_PER_GB = {"same region": 0.00, "zone to zone, VM to VM": 0.01, "cross-region": 0.02, "internet egress": 0.09}

def transfer_hours(gb, gbps, efficiency=0.8):
    """GB are bytes, links are bits: multiply by 8. Real transfers rarely use the full link."""
    return gb * 8 / (gbps * efficiency) / 3600

dataset_gb, reads = 2_000, 20
for route, price in PRICE_PER_GB.items():
    print(f"{route:22} read 20x: \${dataset_gb * reads * price:8,.0f}   copy once: \${dataset_gb * price:6,.0f}")

for gbps in (1, 10, 25):
    print(f"100 TB over {gbps:>2} Gbit/s: {transfer_hours(100_000, gbps) / 24:5.1f} days")`,
  expectedOutput: `same region            read 20x: $       0   copy once: $     0
zone to zone, VM to VM read 20x: $     400   copy once: $    20
cross-region           read 20x: $     800   copy once: $    40
internet egress        read 20x: $   3,600   copy once: $   180
100 TB over  1 Gbit/s:  11.6 days
100 TB over 10 Gbit/s:   1.2 days
100 TB over 25 Gbit/s:   0.5 days`,
  annotations: [
    {
      id: 'prices',
      range: { line: 1 },
      kind: 'variable',
      title: 'The price depends on the route',
      what: 'Moving data within a region to a service is free; between zones, regions or out to the internet it is charged per GB.',
      why: 'Same bytes, different bill. Where the data lives relative to the compute decides which line you pay.',
    },
    {
      id: 'bits',
      range: { line: 4 },
      kind: 'math',
      title: 'Bytes vs bits',
      what: 'Storage is measured in bytes (GB), links in bits per second (Gbit/s). 1 byte = 8 bits.',
      why: 'Forgetting the 8 makes every transfer estimate eight times too optimistic.',
    },
    {
      id: 'copy-once',
      range: { line: 9 },
      kind: 'math',
      title: 'Read 20 times vs copy once',
      what: 'Reading remote data each epoch pays the transfer every time; copying it next to the GPUs pays once.',
      why: 'This is the single most effective way to cut transfer bills for training.',
    },
  ],
};

const PLACEMENT_FLAG = { 'same-region': 'us-east-1', 'cross-region': 'eu-west-1', internet: 'on-premises' } as const;

export const syncCode: CodeExample = {
  id: 'cloud-sync',
  language: 'bash',
  source: `# Data lives in: {{where}}.  Reads per month: {{reads}}.
# Copy the dataset once to a bucket in the GPUs' region (us-east-1), then train from there.
aws s3 sync s3://acme-ml-eu/datasets/v7/ s3://acme-ml-use1/datasets/v7/ \\
    --source-region eu-west-1 --region us-east-1

# On the training instance: copy shards to local NVMe before the first epoch.
aws s3 sync s3://acme-ml-use1/datasets/v7/ /mnt/nvme/datasets/v7/ --only-show-errors

# Google Cloud equivalent of the bucket-to-bucket copy:
gcloud storage rsync gs://acme-ml-eu/datasets/v7 gs://acme-ml-use1/datasets/v7 --recursive`,
  slots: {
    where: (s) => PLACEMENT_FLAG[(s as TransferInput).placement],
    reads: (s) => String((s as TransferInput).readsPerMonth),
  },
  annotations: [
    {
      id: 'sync',
      range: { line: 3 },
      kind: 'function',
      title: 'sync copies only what changed',
      what: 'aws s3 sync compares keys, sizes and timestamps and copies new or changed objects.',
      why: 'Re-running it after a dataset update moves only the difference, not the whole dataset again.',
    },
    {
      id: 'nvme',
      range: { line: 7 },
      kind: 'parameter',
      title: 'Local NVMe as a cache',
      what: 'Many GPU instances include fast local NVMe disks (instance store), wiped when the instance stops.',
      why: 'Every epoch after the first reads at disk speed, with no request charges or network waits.',
    },
    {
      id: 'gcloud',
      range: { line: 10 },
      kind: 'framework',
      title: 'Same idea on Google Cloud',
      what: 'gcloud storage rsync copies between Cloud Storage buckets (or to local disk).',
      why: 'The pattern, copy once and read locally, does not depend on the provider.',
    },
  ],
};
