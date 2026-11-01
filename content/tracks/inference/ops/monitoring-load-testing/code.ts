// Code for the monitoring lesson. ramp.py was run against the serving lesson's container (digits-api:1) on the
// same 4-core VM, with HTTPX 0.28.1 and NumPy 2.5.3; its output is recorded below. The alerting model is checked
// against CPython in slo.test.ts.
import { ann, annLine } from '@/lib/inference/annotate';
import { SLO_SOURCE, sloExperiment, sloSlots, type SloState } from '@/lib/inference/slo';
import type { CodeExample } from '@/lib/types';
import rampSource from './ramp.py?raw';

export const experiment = sloExperiment('slo', { error: 5, duration: 30, target: '99.9' });

const R = rampSource;

export const rampCode: CodeExample = {
  id: 'ops-ramp',
  language: 'python',
  source: R,
  annotations: [
    annLine(R, 'due', 'await asyncio.sleep(max(0.0, due - time.perf_counter()))', {
      kind: 'framework',
      title: 'Send on a schedule',
      what: 'Each request waits until its own due time, rate per second, whether or not earlier requests have finished.',
      why: 'That is how independent users behave. A client that waits for each reply sends less when the server slows down and hides the queue.',
    }),
    annLine(R, 'lat', 'ms = (time.perf_counter() - due) * 1e3', {
      kind: 'math',
      title: 'Latency from the due time',
      what: 'Measured from when the request should have been sent, not when it actually left; later than 2 s counts as an error.',
      why: 'If the client itself falls behind, the delay still counts. This avoids coordinated omission (the profiling lesson).',
    }),
    annLine(R, 'timeout', 'TIMEOUT_S = 2.0', {
      kind: 'parameter',
      title: 'A client timeout',
      what: 'Requests later than 2 s, counted from their due time, are errors.',
      why: 'Real clients give up too. Past saturation, latency grows until requests time out.',
    }),
    annLine(R, 'rates', 'for rate in [100, 200, 300, 400, 450, 500, 600]:', {
      kind: 'parameter',
      title: 'A ramp',
      what: 'Ten seconds at each offered rate, increasing.',
      why: 'The saturation point is where served throughput stops following the offered rate and latency turns upward.',
    }),
  ],
};

export const rampOutput: CodeExample = {
  id: 'ops-ramp-output',
  language: 'bash',
  source: `python3 ramp.py           # container and load generator on the same 4-core VM
  100 req/s offered    100 served in time  p50     3.5 ms  p99     5.9 ms  errors  0.0%
  200 req/s offered    200 served in time  p50     3.5 ms  p99     8.1 ms  errors  0.0%
  300 req/s offered    300 served in time  p50     3.5 ms  p99    16.5 ms  errors  0.0%
  400 req/s offered    400 served in time  p50     3.8 ms  p99     9.7 ms  errors  0.0%
  450 req/s offered    450 served in time  p50     4.0 ms  p99    26.8 ms  errors  0.0%
  500 req/s offered    455 served in time  p50     4.1 ms  p99  1227.5 ms  errors  0.0%
  600 req/s offered      7 served in time  p50 22544.6 ms  p99 38415.2 ms  errors 95.2%

# a second run, last two lines
  500 req/s offered    500 served in time  p50     5.3 ms  p99   261.3 ms  errors  0.0%
  600 req/s offered     87 served in time  p50  6604.6 ms  p99 22780.7 ms  errors 59.2%`,
  annotations: [],
};

const P = `from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

REQUESTS = Counter("predict_requests_total", "Requests", ["model_version", "status"])
LATENCY = Histogram("predict_latency_seconds", "Time in /predict", ["model_version"],
                    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5])
IN_FLIGHT = Gauge("predict_in_flight", "Requests being processed")
app.mount("/metrics", make_asgi_app())          # Prometheus scrapes this every 15 s


@app.middleware("http")
async def measure(request, call_next):
    IN_FLIGHT.inc()
    with LATENCY.labels(MODEL_VERSION).time():
        response = await call_next(request)
    IN_FLIGHT.dec()
    REQUESTS.labels(MODEL_VERSION, str(response.status_code)).inc()
    return response

# PromQL, in the dashboard:
#   p99 latency:  histogram_quantile(0.99, sum by (le) (rate(predict_latency_seconds_bucket[5m])))
#   error rate:   sum(rate(predict_requests_total{status=~"5.."}[5m])) / sum(rate(predict_requests_total[5m]))`;

/** Prometheus metrics for the serving lesson's API. Not run while writing the lesson. */
export const metricsCode: CodeExample = {
  id: 'ops-metrics',
  language: 'python',
  source: P,
  annotations: [
    annLine(P, 'counter', 'REQUESTS = Counter(', {
      kind: 'framework',
      title: 'Traffic and errors',
      what: 'A counter per model version and status code.',
      why: 'Rate of the counter is throughput; the share with 5xx status is the error rate the SLO is measured on. The version label lets you compare a canary with the current model.',
    }),
    ann(P, 'buckets', 'buckets=[', 'buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5]', {
      kind: 'parameter',
      title: 'Histogram buckets',
      what: 'Counts of requests faster than each bound.',
      why: 'Percentiles are estimated from these counts, so choose bounds around your SLO threshold. Averages of per-instance percentiles are wrong; aggregated histograms are right.',
    }),
    annLine(P, 'inflight', 'IN_FLIGHT = Gauge(', {
      kind: 'framework',
      title: 'Saturation',
      what: 'How many requests are being processed right now.',
      why: 'It rises before latency does, which makes it a good signal for autoscaling.',
    }),
    annLine(P, 'pq', '#   p99 latency:', {
      kind: 'framework',
      title: 'p99 from a histogram',
      what: 'histogram_quantile interpolates the 99th percentile from bucket counts over the last 5 minutes.',
      why: 'One query for the whole fleet, which is what users experience.',
    }),
  ],
};

const C = SLO_SOURCE;
const st = (s: unknown) => s as SloState;

export const sloCode: CodeExample = {
  id: 'ops-slo',
  language: 'python',
  source: C,
  slots: Object.fromEntries(
    ['target', 'duration', 'error'].map((k) => [k, (s: unknown) => sloSlots(st(s))[k]!]),
  ),
  annotations: [
    ann(C, 'budget', 'budget = 1 -', '1 - {{target}} / 100', {
      kind: 'math',
      title: 'The error budget',
      what: 'The share of requests allowed to fail: 0.1% for a 99.9% SLO.',
      why: 'Reliability above the target has little value to users; the budget is room for releases and experiments.',
    }),
    ann(C, 'burn', '"burn > 14.4', 'rate(t, 60) / budget > 14.4', {
      kind: 'math',
      title: 'Burn rate over a long window',
      what: 'How many times faster than allowed the budget is being used over the last hour.',
      why: 'At 14.4, one hour uses 2% of a 30-day budget: worth waking someone. The window makes a short blip too small to count.',
    }),
    ann(C, 'short', '"burn > 14.4', 'rate(t, 5) / budget > 14.4', {
      kind: 'math',
      title: 'And a short window',
      what: 'The same test over the last 5 minutes.',
      why: 'Once the problem is fixed, the 5-minute rate drops at once, so the alert stops instead of firing for the rest of the hour.',
    }),
    ann(C, 'slow', '"burn > 6', 'rate(t, 360) / budget > 6', {
      kind: 'math',
      title: 'A slower rule',
      what: 'Burn rate 6 over 6 hours: 5% of the budget.',
      why: 'Catches a moderate problem that lasts, which the fast rule never sees and a fixed threshold misses.',
    }),
  ],
};
