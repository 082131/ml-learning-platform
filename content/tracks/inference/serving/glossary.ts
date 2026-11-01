import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/serving chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'readiness-probe',
    term: 'Liveness and readiness checks',
    short:
      'Two health endpoints: liveness says the process is running, readiness says it can serve traffic now.',
    long: 'An orchestrator restarts a container whose liveness check fails and stops sending requests to one whose readiness check fails. A model server should report ready only after the model is loaded and warmed up.',
    introducedIn: 'inference/serving/apis-containers',
    aliases: ['liveness probe', 'health check', '/healthz', '/readyz'],
  },
  {
    id: 'container-image',
    term: 'Container image',
    short:
      'A packaged file system with the code, libraries and settings a program needs, run in isolation as a container.',
    long: 'Built from a Dockerfile in layers; layers that did not change are reused from cache. The image pins the Python version and every dependency, so what was tested is what runs.',
    introducedIn: 'inference/serving/apis-containers',
    aliases: ['Docker image', 'Dockerfile', 'container'],
  },
  {
    id: 'load-shedding',
    term: 'Load shedding',
    short:
      'Rejecting requests quickly (for example with HTTP 503) when a server is past its capacity, instead of queueing them.',
    long: 'A bounded queue plus fast rejection keeps latency low for the requests that are accepted; an unbounded queue makes every request slow once the server is overloaded.',
    introducedIn: 'inference/serving/apis-containers',
    aliases: ['backpressure', '503', 'admission control'],
  },
] satisfies GlossaryTerm[];
