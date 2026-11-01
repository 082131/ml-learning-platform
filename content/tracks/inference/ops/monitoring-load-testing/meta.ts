import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/ops/monitoring-load-testing',
  title: 'Monitoring, load testing and production debugging',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Load test a model server with open-loop arrivals and find its saturation point',
    'Monitor latency percentiles, error rate, throughput and GPU memory over time',
    'Set alerts from service-level objectives rather than averages',
    'Debug a production slowdown from metrics and traces',
  ],
  prerequisites: ['inference/serving/apis-containers', 'inference/perf/profiling'],
  concepts: ['saturation-point', 'slo', 'error-budget', 'distributed-trace'],
  references: [
    {
      title: 'Google SRE workbook: alerting on SLOs (multi-window, multi-burn-rate alerts)',
      url: 'https://sre.google/workbook/alerting-on-slos/',
    },
    {
      title: 'Google SRE book: monitoring distributed systems (the four golden signals)',
      url: 'https://sre.google/sre-book/monitoring-distributed-systems/',
    },
    {
      title: 'Prometheus: histograms and summaries',
      url: 'https://prometheus.io/docs/practices/histograms/',
      version: 'read 2026-11-01',
    },
    {
      title: 'OpenTelemetry documentation',
      url: 'https://opentelemetry.io/docs/',
      version: 'read 2026-11-01',
    },
    { title: 'HTTPX async client', url: 'https://www.python-httpx.org/async/', version: 'HTTPX 0.28' },
  ],
} satisfies LessonMeta;
