// Code for "Compute options". The comparison is src/lib/cloud/compute.ts (unit-tested) with AWS Lambda's x86 list
// prices in US East ($0.0000166667 per GB-second, $0.20 per million requests, free tier ignored) and a VM price
// you choose. compute.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts).
import type { ComputeInput } from '@/lib/cloud/compute';
import { computeExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const compute = computeExperiment('cloud-compute');

const C = (s: unknown) => s as ComputeInput;

export const computeDemo: CodeExample = {
  id: 'cloud-compute-demo',
  language: 'python',
  run: 'pyodide',
  source: `import math

GB_SECOND, PER_MILLION, HOURS = 0.0000166667, 0.20, 730   # AWS Lambda x86 (US East), hours per month

def serverless(requests, ms, gb):
    return requests * ms / 1000 * gb * GB_SECOND + requests / 1e6 * PER_MILLION

def vms(requests, price_per_hour=0.10, capacity_rps=50, peak=3, minimum=2):
    peak_rps = requests / (HOURS * 3600) * peak
    return max(minimum, math.ceil(peak_rps / capacity_rps)) * HOURS * price_per_hour

for requests in (100_000, 1_000_000, 10_000_000, 100_000_000):
    s, v = serverless(requests, 200, 1), vms(requests)
    print(f"{requests:>11,} req/month  serverless \${s:8.2f}  VMs \${v:7.2f}  -> {'serverless' if s < v else 'VMs'}")`,
  expectedOutput: `    100,000 req/month  serverless $    0.35  VMs $ 146.00  -> serverless
  1,000,000 req/month  serverless $    3.53  VMs $ 146.00  -> serverless
 10,000,000 req/month  serverless $   35.33  VMs $ 146.00  -> serverless
100,000,000 req/month  serverless $  353.33  VMs $ 219.00  -> VMs`,
  annotations: [
    {
      id: 'gb-second',
      range: { line: 6 },
      kind: 'math',
      title: 'Serverless: pay per GB-second',
      what: 'Requests × seconds each × GB of memory = GB-seconds, times the price, plus a small charge per request.',
      why: 'The cost is proportional to use: zero traffic costs zero, and doubling traffic doubles the bill.',
    },
    {
      id: 'vm-hours',
      range: { line: 10 },
      kind: 'math',
      title: 'VMs: pay per hour, in whole machines',
      what: 'Enough VMs for the busiest moment (peak), never fewer than the minimum, each billed for all 730 hours.',
      why: 'The cost is a staircase: flat until the peak needs another machine. Idle hours cost the same as busy ones.',
    },
  ],
};

export const linkedCode: CodeExample = {
  id: 'cloud-compute-linked',
  language: 'python',
  source: `import math

requests, ms, gb = {{requests}}, {{ms}}, {{gb}}
serverless = requests * ms / 1000 * gb * 0.0000166667 + requests / 1e6 * 0.20

vm_price, min_vms = {{vmprice}}, {{minvms}}
peak_rps = requests / (730 * 3600) * 3                  # busiest hour is 3x the average
vms = max(min_vms, math.ceil(peak_rps / 50)) * 730 * vm_price`,
  slots: {
    requests: (s) => C(s).requestsPerMonth.toLocaleString('en-US').replace(/,/g, '_'),
    ms: (s) => String(C(s).durationMs),
    gb: (s) => String(C(s).memoryGb),
    vmprice: (s) => String(C(s).vmPricePerHour),
    minvms: (s) => String(C(s).minVms),
  },
  annotations: [
    {
      id: 'duration',
      range: { line: 3 },
      kind: 'variable',
      title: 'Duration and memory multiply',
      what: 'A function billed for 2 GB and 400 ms costs four times one with 1 GB and 200 ms.',
      why: 'Optimizing the handler’s run time (load the model once, outside the handler) cuts the serverless bill directly.',
    },
    {
      id: 'minimum',
      range: { line: 6 },
      kind: 'variable',
      title: 'The minimum is for availability',
      what: 'Two VMs in two zones, so one can fail without an outage (the first lesson).',
      why: 'This floor is why VMs lose at low traffic: you pay for two machines even when they are almost idle.',
    },
  ],
};
