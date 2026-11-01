import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/serving/apis-containers',
  title: 'Model serving, APIs, containers and deployment',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Serve a model behind an HTTP API with input validation, timeouts and health checks',
    'Package the model server and its dependencies in a container image',
    'Configure batching and concurrency in the server to match the measured capacity',
    'Plan a safe rollout of a new model version with a canary and a rollback',
  ],
  prerequisites: ['inference/runtimes/onnx-serving', 'inference/throughput/batching-throughput'],
  concepts: ['readiness-probe', 'container-image', 'load-shedding', 'canary-release'],
  references: [
    {
      title: 'FastAPI: request body validation with Pydantic',
      url: 'https://fastapi.tiangolo.com/tutorial/body/',
      version: 'FastAPI 0.162',
    },
    {
      title: 'FastAPI: lifespan events',
      url: 'https://fastapi.tiangolo.com/advanced/events/',
      version: 'FastAPI 0.162',
    },
    { title: 'Uvicorn deployment', url: 'https://www.uvicorn.org/deployment/', version: 'Uvicorn 0.54' },
    {
      title: 'Dockerfile best practices',
      url: 'https://docs.docker.com/build/building/best-practices/',
      version: 'read 2026-11-01',
    },
    {
      title: 'Kubernetes: liveness, readiness and startup probes',
      url: 'https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/',
      version: 'read 2026-11-01',
    },
    {
      title: 'Google SRE workbook: canarying releases',
      url: 'https://sre.google/workbook/canarying-releases/',
    },
  ],
} satisfies LessonMeta;
