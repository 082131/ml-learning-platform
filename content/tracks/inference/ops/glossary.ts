import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/ops chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'slo',
    term: 'Service-level objective (SLO)',
    short:
      'A target for a measurable property of a service over a period, such as "99.9% of requests succeed in under 300 ms over 30 days".',
    long: 'An SLO is stated from the user’s point of view and measured by a service-level indicator (SLI), for example the share of good requests. It is a target for the team, not a contract; a service-level agreement (SLA) is the contract, usually looser.',
    introducedIn: 'inference/ops/monitoring-load-testing',
    aliases: ['SLI', 'SLA', 'service level objective'],
  },
  {
    id: 'error-budget',
    term: 'Error budget and burn rate',
    short:
      'The failures an SLO allows (0.1% of requests for 99.9%), and how fast they are being used: burn rate 1 uses exactly the budget by the end of the period.',
    long: 'At burn rate 14.4 a 30-day budget lasts 50 hours, and one hour uses 2% of it. Alerting on burn rate over two windows (a long one for significance, a short one to stop alerting once the problem is fixed) pages for incidents that matter and stays quiet for blips.',
    introducedIn: 'inference/ops/monitoring-load-testing',
    aliases: ['burn rate', 'budget burn', 'multi-window alert'],
  },
  {
    id: 'saturation-point',
    term: 'Saturation point',
    short:
      'The request rate at which a service is fully busy: beyond it, throughput stops growing and latency climbs without limit.',
    long: 'Found with an open-loop load test that raises the offered rate step by step. Plan capacity well below it, because latency already rises steeply as utilization approaches 100%.',
    introducedIn: 'inference/ops/monitoring-load-testing',
    aliases: ['knee', 'capacity', 'saturation'],
  },
  {
    id: 'distributed-trace',
    term: 'Distributed trace',
    short:
      'A record of one request as it passes through services, split into timed spans (parse, queue, model, respond).',
    long: 'Traces answer "where did this slow request spend its time?", which aggregate metrics cannot. OpenTelemetry is the common standard for producing them.',
    introducedIn: 'inference/ops/monitoring-load-testing',
    aliases: ['tracing', 'span', 'OpenTelemetry'],
  },
] satisfies GlossaryTerm[];
