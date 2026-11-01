// Code for the AI landscape lesson. The decision rules and the cost formula live in src/lib/ai/approach.ts and
// are unit-tested. Prices are example values, not quotes. The Python runner was run with CPython 3.13 and its
// output copied here; it uses only the standard library, so it runs the same in Pyodide.
import { approachExperiment } from '@/lib/ai/approach';
import type { CodeExample } from '@/lib/types';

export const approach = approachExperiment('approach', {
  task: 'general-language',
  labels: 100,
  privacy: 'cloud-ok',
  requestsPerDay: 1000,
  gpuHourly: 1.5,
});

export const breakEvenRunner: CodeExample = {
  id: 'break-even',
  language: 'python',
  run: 'pyodide',
  source: `INPUT_PRICE, OUTPUT_PRICE = 1.00, 5.00      # dollars per million tokens (example prices)
INPUT_TOKENS, OUTPUT_TOKENS = 1500, 300     # one request
GPU_PER_HOUR = 1.50                          # one GPU server (example price)

per_request = (INPUT_TOKENS * INPUT_PRICE + OUTPUT_TOKENS * OUTPUT_PRICE) / 1_000_000
server_month = GPU_PER_HOUR * 24 * 30
break_even = server_month / (30 * per_request)

print(f"API cost per request: \${per_request:.4f}")
print(f"One GPU server per month: \${server_month:,.0f}")
print(f"Break-even: {break_even:,.0f} requests per day")
for per_day in [1_000, 10_000, 50_000]:
    api_month = per_day * 30 * per_request
    cheaper = "API" if api_month < server_month else "server"
    print(f"{per_day:>6,} requests/day: API \${api_month:>6,.0f} vs server \${server_month:,.0f} -> {cheaper}")`,
  annotations: [
    {
      id: 'prices',
      range: { line: 1 },
      kind: 'parameter',
      title: 'Prices per million tokens',
      what: 'Model APIs charge per token, with output tokens usually several times dearer than input tokens.',
      why: 'These are example values. Look up your provider’s current price list before you trust any total.',
    },
    {
      id: 'per-request',
      range: { line: 5 },
      kind: 'math',
      title: 'per_request',
      what: 'The cost of one request: 1500 · 1.00 / 1e6 + 300 · 5.00 / 1e6 = 0.0015 + 0.0015 = $0.003.',
      why: 'Every API cost estimate starts from tokens in and tokens out per request.',
    },
    {
      id: 'server',
      range: { line: 6 },
      kind: 'math',
      title: 'server_month',
      what: 'One GPU server rented for a whole month: 1.50 · 24 · 30 = $1,080, busy or idle.',
      why: 'Self-hosting is a fixed cost; the API is a cost per use. That difference is the whole trade-off.',
    },
    {
      id: 'break-even',
      range: { line: 7 },
      kind: 'math',
      title: 'break_even',
      what: 'The daily volume where both cost the same: 1080 / (30 · 0.003) = 12,000 requests per day.',
      why: 'Below it the API is cheaper; above it a server can be, if one server can handle the load and you can run it.',
    },
  ],
  expectedOutput: `API cost per request: $0.0030
One GPU server per month: $1,080
Break-even: 12,000 requests per day
 1,000 requests/day: API $    90 vs server $1,080 -> API
10,000 requests/day: API $   900 vs server $1,080 -> API
50,000 requests/day: API $ 4,500 vs server $1,080 -> server`,
};
