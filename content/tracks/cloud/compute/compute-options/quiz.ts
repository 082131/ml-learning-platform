import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'gb-seconds',
    type: 'numeric',
    prompt: 'A function runs 500 ms with 2 GB of memory, 4 million times a month. Using $0.0000166667 per GB-second and $0.20 per million requests, what is the monthly cost in dollars? Round to two decimals.',
    answer: 67.47,
    tolerance: 0.01,
    hint: 'GB-seconds = 4,000,000 × 0.5 × 2. Then add 4 × $0.20.',
    explain: '4,000,000 GB-seconds × $0.0000166667 = $66.67, plus $0.80 for requests: $67.47.',
  },
  {
    id: 'why-cross',
    type: 'choice',
    prompt: 'Why does serverless win at low traffic but lose at high, steady traffic?',
    options: [
      { text: 'Providers raise the per-request price as your traffic grows', correct: false, explain: 'Lambda’s duration price per GB-second does not rise with volume; it has volume discounts if anything.' },
      { text: 'Its cost grows with every request, while busy VMs spread a fixed hourly price over more work', correct: true, explain: 'Serverless is a line through zero; VMs are a staircase. Once VMs are well utilized, each request on them costs less than on a function.' },
      { text: 'VMs get faster under load, so each request takes less time', correct: false, explain: 'Per-request speed is not the reason. The billing shapes are.' },
    ],
  },
  {
    id: 'cold-start',
    type: 'choice',
    prompt: 'A function serving a 1.5 GB model answers in 80 ms most of the time but sometimes takes 9 seconds, mostly after quiet periods. What is happening, and what fixes it?',
    options: [
      { text: 'Cold starts: a new instance must load the model; keep warm capacity or use a container service with minimum instances', correct: true, explain: 'After idle periods the platform has no warm instance and must start one and load the model. Provisioned concurrency or minimum instances keep one ready, at the cost of paying for idle time.' },
      { text: 'Throttling: the function is over its concurrency limit; raise the limit', correct: false, explain: 'Throttling returns errors (429 TooManyRequestsException) under load, not slow answers after quiet periods.' },
      { text: 'Garbage collection in Python; call gc.collect() at the end of each request', correct: false, explain: 'GC pauses are milliseconds, not seconds, and they would not cluster after idle periods.' },
    ],
  },
  {
    id: 'pick',
    type: 'choice',
    prompt: 'Which workload is the worst fit for AWS Lambda?',
    options: [
      { text: 'Resizing images when they are uploaded to a bucket', correct: false, explain: 'Short, spiky, CPU-only and event-driven: a textbook function.' },
      { text: 'Validating a CSV file’s schema when it lands in S3', correct: false, explain: 'Short and event-driven; a good fit.' },
      { text: 'Serving a 7B-parameter LLM with steady traffic', correct: true, explain: 'It needs a GPU (Lambda has none), more memory than the 10 GB limit allows comfortably, and warm weights. GPU VMs, Kubernetes or a managed endpoint fit.' },
      { text: 'Sending a Slack alert when a training job fails', correct: false, explain: 'Tiny and event-driven; a natural fit.' },
    ],
  },
  {
    id: 'min-vms',
    type: 'choice',
    prompt: 'In the lab, setting “VMs always running” from 2 to 1 halves the VM bill at low traffic. Why do most teams keep 2?',
    options: [
      { text: 'Load balancers need at least two targets to start', correct: false, explain: 'A load balancer works with one target. The reason is failure.' },
      { text: 'One VM in one zone is a single point of failure; two in two zones survive one failing', correct: true, explain: 'The first lesson’s arithmetic: two copies in two zones cut expected downtime from days to hours a year.' },
      { text: 'Cloud providers bill a minimum of two instances per service', correct: false, explain: 'There is no such minimum; it is a reliability choice.' },
    ],
  },
];

export const serverlessExercise: Exercise = {
  id: 'cloud-break-even',
  prompt:
    'Write `serverless_cost(requests, ms, gb)` (GB-seconds at $0.0000166667 plus $0.20 per million requests) and `vm_cost(requests, price, capacity_rps, peak=3, minimum=2)` (enough VMs for the peak requests per second, at least `minimum`, each for 730 hours; a month is 730 × 3600 seconds). Then write `break_even(ms, gb, price, capacity_rps)`: the smallest number of requests in the list [10**k for k in range(3, 10)] for which serverless costs at least as much as VMs, or None.',
  starter: `import math

def serverless_cost(requests, ms, gb):
    return 0

def vm_cost(requests, price, capacity_rps, peak=3, minimum=2):
    return 0

def break_even(ms, gb, price, capacity_rps):
    return None`,
  hints: [
    'peak_rps = requests / (730 * 3600) * peak; vms = max(minimum, math.ceil(peak_rps / capacity_rps)).',
    'Loop over the powers of ten in order and return the first r where serverless_cost(r, ...) >= vm_cost(r, ...).',
  ],
  solution: `import math

def serverless_cost(requests, ms, gb):
    return requests * ms / 1000 * gb * 0.0000166667 + requests / 1e6 * 0.20

def vm_cost(requests, price, capacity_rps, peak=3, minimum=2):
    peak_rps = requests / (730 * 3600) * peak
    return max(minimum, math.ceil(peak_rps / capacity_rps)) * 730 * price

def break_even(ms, gb, price, capacity_rps):
    for r in [10**k for k in range(3, 10)]:
        if serverless_cost(r, ms, gb) >= vm_cost(r, price, capacity_rps):
            return r
    return None`,
  explanation:
    'Long requests and big memory move the break-even down (functions get expensive sooner); cheap, high-capacity VMs move it down too.',
  tests: `assert abs(serverless_cost(1_000_000, 200, 1) - 3.53334) < 1e-4
assert vm_cost(1_000_000, 0.10, 50) == 146.0
assert abs(vm_cost(100_000_000, 0.10, 50) - 219.0) < 1e-9
assert break_even(200, 1, 0.10, 50) == 10**8
assert break_even(2000, 2, 0.10, 50) == 10**7
assert break_even(20, 0.5, 5.0, 50) is None`,
};
