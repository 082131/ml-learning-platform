import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'api-month',
    type: 'numeric',
    prompt: 'A feature makes 50,000 requests a day, each with 2,000 input and 500 output tokens. The API charges $0.50 per million input tokens and $1.50 per million output tokens. What is the bill for a 30-day month, in dollars?',
    answer: 2625,
    tolerance: 1,
    hint: 'Per request: (2000 × 0.50 + 500 × 1.50) / 1,000,000 dollars. Then × 50,000 × 30.',
    explain: 'Per request: (1000 + 750) / 1e6 = $0.00175. × 50,000 = $87.50 a day, × 30 = $2,625 a month. Output is a fifth of the tokens but 43% of the cost.',
  },
  {
    id: 'idle-third',
    type: 'choice',
    prompt: 'At 5 million requests a day the self-hosted fleet has 131 GPUs, yet they are only about 33% busy on average. Traffic in the busiest hour is three times the average. Why can’t more traffic push that figure higher?',
    options: [
      { text: 'The fleet is sized for the busiest hour, so on average it carries a third of what it could', correct: true, explain: 'Average ÷ capacity ≤ average ÷ peak = 1/3. Only scaling down in quiet hours (or pooling many workloads, as an API provider does) raises it.' },
      { text: 'GPUs cannot run above about a third of their capacity because of memory bandwidth limits', correct: false, explain: 'The model’s tokens-per-second figure already includes the hardware’s limits. The 33% is about time, not about the chip.' },
      { text: 'Each new GPU added for more traffic starts idle, so utilization always lags', correct: false, explain: 'More traffic fills the GPUs, but the fleet grows with the peak, so the ratio stays near average ÷ peak.' },
    ],
  },
  {
    id: 'faster-serving',
    type: 'choice',
    prompt: 'Your team gets a faster serving engine: 1,500 instead of 400 output tokens per second per GPU. At 10,000 requests a day the self-hosted cost stays at $1,730, yet the break-even volume falls from about 112,000 to about 62,000 requests a day. How do both things hold?',
    options: [
      { text: 'At 10,000 a day you already pay for the one-GPU minimum plus the people; speed only matters once you need more than one GPU', correct: true, explain: 'Low volume sits on a fixed floor (one GPU, all month, plus operations). Faster GPUs delay the moment you need a second one, which is what moves the break-even.' },
      { text: 'The cost did fall, but the readout rounds to the nearest thousand dollars', correct: false, explain: 'The cost is exactly one GPU × 730 h × $1 + $1,000 either way. The figure does not depend on speed until a second GPU is needed.' },
      { text: 'Faster GPUs make the API cheaper too, so the comparison shifts', correct: false, explain: 'The API price per token does not depend on your hardware. Only the self-hosted side changed.' },
    ],
  },
  {
    id: 'people-cost',
    type: 'choice',
    prompt: 'The plan assumed 10 engineer-hours a month to run the self-hosted model. After a quarter it is really 40 (upgrades, on-call, scaling). What happens to the break-even volume with the lab’s other defaults?',
    options: [
      { text: 'It roughly quadruples, from about 112,000 to about 457,000 requests a day', correct: true, explain: 'The people cost is a fixed monthly amount the API side does not have, so the API stays cheaper for much longer. It is often the term that decides.' },
      { text: 'It does not move: engineering time is a one-off, not a monthly cost', correct: false, explain: 'Running a model service is ongoing work: patches, model upgrades, capacity and incidents. The lab counts it every month.' },
      { text: 'It falls, because more engineering time makes the GPUs faster', correct: false, explain: 'In this model the hours buy operation, not speed. More of them only raises the fixed cost.' },
    ],
  },
  {
    id: 'nightly',
    type: 'choice',
    prompt: 'Every night 2 million support tickets must be summarised; results are needed by 8 AM and nobody waits on a single ticket. What is usually the cheapest hosted option?',
    options: [
      { text: 'Batch inference, which takes a file of requests, returns results within hours, and is typically priced well below on-demand', correct: true, explain: 'Bedrock batch inference and Vertex AI batch prediction trade latency for price (often around half). A deadline in hours is exactly that trade.' },
      { text: 'Provisioned throughput, because large volumes always need reserved capacity', correct: false, explain: 'Reserved capacity bills every hour, including the 16 hours a day this job does not run. It suits steady, latency-sensitive traffic.' },
      { text: 'On-demand calls from many parallel workers, to finish as fast as possible', correct: false, explain: 'Finishing at 2 AM instead of 7 AM earns nothing here, and on-demand is the most expensive rate. Rate limits may also stop you.' },
    ],
  },
  {
    id: 'privacy',
    type: 'choice',
    prompt: 'Compliance says prompts contain customer data that must stay in the EU and must not cross the public internet. A colleague concludes you must self-host. What is the better first answer?',
    options: [
      { text: 'Call the provider’s model API in an EU region through a private endpoint, with IAM roles and logging you control', correct: true, explain: 'Bedrock and Vertex AI process requests in the region you call, and PrivateLink or Private Service Connect keep traffic off the internet. Check the provider’s data terms, but self-hosting is not the only route.' },
      { text: 'Encrypt the prompt before sending it, so the provider never sees the data', correct: false, explain: 'The model must read the prompt to answer it. Encryption protects data in transit and at rest, not from the service processing it.' },
      { text: 'Agree: any hosted API sends data outside your control, so it can never be compliant', correct: false, explain: 'Cloud model services are designed for this with regions, private networking and contractual data terms. Self-hosting is an option, not a requirement.' },
    ],
  },
];

export const apiExercise: Exercise = {
  id: 'cloud-api-or-gpus',
  prompt:
    'Write `api_monthly(per_day, tokens_in, tokens_out, price_in, price_out)` (prices in $ per million tokens, 30 days), `gpus_needed(per_day, tokens_out, peak, tps)` (average output tokens per second × peak ÷ tps, rounded up, at least 1), and `self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops)` (GPUs × 730 hours × gpu_hour + ops).',
  starter: `import math

def api_monthly(per_day, tokens_in, tokens_out, price_in, price_out):
    return 0

def gpus_needed(per_day, tokens_out, peak, tps):
    return 0

def self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops):
    return ops`,
  hints: [
    'Average output tokens per second: per_day × tokens_out / 86400.',
    'gpus_needed: max(1, math.ceil(avg × peak / tps)). The API: 30 × per_day × (tokens_in × price_in + tokens_out × price_out) / 1e6.',
  ],
  solution: `import math

def api_monthly(per_day, tokens_in, tokens_out, price_in, price_out):
    return 30 * per_day * (tokens_in * price_in + tokens_out * price_out) / 1e6

def gpus_needed(per_day, tokens_out, peak, tps):
    return max(1, math.ceil(per_day * tokens_out / 86400 * peak / tps))

def self_host_monthly(per_day, tokens_out, peak, tps, gpu_hour, ops):
    return gpus_needed(per_day, tokens_out, peak, tps) * 730 * gpu_hour + ops`,
  explanation:
    'The asymmetry is the whole lesson: the API cost is proportional to traffic, while the self-hosted cost is a floor (one GPU and the people) plus steps sized for the busiest hour.',
  tests: `assert abs(api_monthly(10_000, 1000, 300, 0.5, 1.5) - 285) < 1e-9
assert gpus_needed(10_000, 300, 3, 400) == 1
assert gpus_needed(0, 300, 3, 400) == 1
assert gpus_needed(500_000, 300, 3, 400) == 14
assert abs(self_host_monthly(500_000, 300, 3, 400, 1.0, 1000) - 11_220) < 1e-9
assert self_host_monthly(10_000, 300, 3, 400, 1.0, 1000) > api_monthly(10_000, 1000, 300, 0.5, 1.5)`,
};
