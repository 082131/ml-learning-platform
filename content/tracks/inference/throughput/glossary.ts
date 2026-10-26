import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/throughput chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'latency-percentile',
    term: 'Latency and percentiles (p50, p95, p99)',
    short:
      'Latency is the time from a request’s arrival to its answer; p95 is the latency 95% of requests are at or below.',
    long: 'Averages hide slow requests. p50 (the median) describes a typical request, p95 and p99 the slow tail that some users always hit. Service-level objectives are usually written as percentiles.',
    introducedIn: 'inference/throughput/batching-throughput',
    aliases: ['latency', 'p50', 'p95', 'p99', 'tail latency', 'median latency'],
  },
  {
    id: 'throughput',
    term: 'Throughput',
    short: 'How many requests (or tokens) a system finishes per second.',
    long: 'Throughput can never exceed the arrival rate or the system’s capacity. Raising it usually means doing more work per pass over the weights, for example by batching, often at some cost in latency.',
    introducedIn: 'inference/throughput/batching-throughput',
    aliases: ['requests per second', 'QPS', 'RPS', 'tokens per second'],
  },
  {
    id: 'dynamic-batching',
    term: 'Dynamic batching',
    short:
      'Grouping requests that arrive close together into one batch, sent when it is full or when the oldest has waited a set time.',
    long: 'It trades a bounded extra wait for higher throughput. Servers such as NVIDIA Triton expose it as a maximum batch size and a maximum queue delay. LLM servers go further with continuous batching, adding and removing sequences between decode steps.',
    introducedIn: 'inference/throughput/batching-throughput',
    aliases: ['request batching', 'continuous batching', 'max wait', 'queue delay'],
  },
  {
    id: 'poisson-process',
    term: 'Poisson arrivals',
    short:
      'Requests arriving independently at random at a constant average rate, so the gaps between them are exponentially distributed.',
    long: 'A common model of traffic from many independent users. It produces bursts: short gaps are much more common than long ones, so queues form even below full load.',
    introducedIn: 'inference/throughput/batching-throughput',
    aliases: ['Poisson process', 'exponential interarrival', 'arrival rate'],
  },
  {
    id: 'littles-law',
    term: 'Little’s law',
    short:
      'In a stable system, the average number of requests inside equals the arrival rate times the average time each spends: L = λW.',
    long: 'At 100 requests per second and 50 ms average latency, 5 requests are in the system on average. It holds for any arrival pattern as long as the system is not overloaded.',
    introducedIn: 'inference/throughput/batching-throughput',
    aliases: ['L = λW', 'concurrency'],
  },
  {
    id: 'roofline-model',
    term: 'Roofline model',
    short:
      'A model of run time as the larger of two limits: bytes moved ÷ memory bandwidth and operations ÷ peak compute.',
    long: 'Work that moves many bytes per operation is memory-bound; work with many operations per byte is compute-bound. Small-batch inference reads every weight for little arithmetic, so it is usually memory-bound, which is why batching helps.',
    introducedIn: 'inference/throughput/batching-throughput',
    aliases: ['memory-bound', 'compute-bound', 'arithmetic intensity'],
  },
] satisfies GlossaryTerm[];
