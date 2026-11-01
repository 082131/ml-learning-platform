// Code for the serving lesson. server/ holds a working API: app.py, demo.py, load.py and a Dockerfile. The outputs
// below were recorded on 2026-11-01 with FastAPI 0.162.0, Pydantic 2.13.5, Uvicorn 0.54.0, ONNX Runtime 1.29.0 and
// Docker 29.9.2 on a 4-core cloud VM. The canary model is checked against CPython in canary.test.ts.
import { ann, annLine } from '@/lib/inference/annotate';
import { CANARY_SOURCE, canaryExperiment, canarySlots, type CanaryState } from '@/lib/inference/canary';
import type { CodeExample } from '@/lib/types';
import appSource from './server/app.py?raw';
import dockerSource from './server/Dockerfile?raw';

export const experiment = canaryExperiment('canary', {
  rate: 200,
  share: 5,
  base: 0.5,
  canary: 1,
  rollback: 2,
});

const A = appSource;

export const appCode: CodeExample = {
  id: 'serve-app',
  language: 'python',
  source: A,
  annotations: [
    annLine(A, 'pixel', 'Pixel = Annotated[float, Field(ge=0, le=16)]', {
      kind: 'framework',
      title: 'Validate at the edge',
      what: 'Pydantic checks every pixel is a number from 0 to 16 and every image has exactly 64 of them.',
      why: 'A model happily computes an answer for garbage input. Rejecting it with HTTP 422 and a clear message is better than a confident wrong label.',
    }),
    ann(A, 'maxbatch', 'Field(min_length=1, max_length=MAX_BATCH)', 'max_length=MAX_BATCH', {
      kind: 'parameter',
      title: 'Bound the request size',
      what: 'At most 64 images per request.',
      why: 'One huge request can use all the memory or hold a worker for seconds. Limits keep one client from hurting the others.',
    }),
    annLine(A, 'warm', 'session.run(None, {"pixels": np.zeros((1, 64)', {
      kind: 'framework',
      title: 'Load and warm up before taking traffic',
      what: 'The lifespan function runs once at startup, before the server accepts requests.',
      why: 'The first call pays one-time costs (see the profiling lesson). Doing it here keeps them out of a user’s request.',
    }),
    annLine(A, 'ready', 'if "session" not in state:', {
      kind: 'framework',
      title: 'Readiness',
      what: 'Answers 503 until the model is loaded.',
      why: 'A load balancer or Kubernetes sends traffic only to replicas whose readiness check passes, so a starting replica gets no requests it cannot serve.',
    }),
    annLine(
      A,
      'timeout',
      'probs = await asyncio.wait_for(asyncio.to_thread(run_model, x), timeout=TIMEOUT_S)',
      {
        kind: 'framework',
        title: 'A timeout',
        what: 'Runs the model in a worker thread and gives up waiting after TIMEOUT_S seconds, answering 504.',
        why: 'The client gets a fast, clear failure instead of hanging. Note that the thread keeps running: a timeout frees the client, not the CPU.',
      },
    ),
    annLine(A, 'version', 'model_version=MODEL_VERSION,', {
      kind: 'variable',
      title: 'Say which model answered',
      what: 'Every response carries the model version, set from an environment variable.',
      why: 'During a canary two versions answer side by side. Logs and metrics need the version to compare them.',
    }),
  ],
};

export const demoOutput: CodeExample = {
  id: 'serve-demo-output',
  language: 'bash',
  source: `python3 make_model.py && python3 demo.py
wrote model.onnx and sample.json
GET /readyz                  200  {"status": "ready", "model_version": "digits-1"}
3 images                     200  {"labels": [7, 6, 3], "confidence": [0.989, 0.999, 1.0], "model_version": "digits-1"}
(true labels)                     [7, 6, 3]
63 pixels                    422  {"loc": ["body", "images", 0], "msg": "List should have at least 64 items after validation, not 63"}
pixel value 17               422  {"loc": ["body", "images", 0, 0], "msg": "Input should be less than or equal to 16"}
65 images                    422  {"loc": ["body", "images"], "msg": "List should have at most 64 items after validation, not 65"}
text instead of numbers      422  {"loc": ["body", "images", 0, 0], "msg": "Input should be a valid number, unable to parse string as a number"}
model takes 1 s              504  {"detail": "inference took longer than 0.5 s"}`,
  annotations: [],
};

const D = dockerSource;

export const dockerCode: CodeExample = {
  id: 'serve-dockerfile',
  language: 'bash',
  source: D,
  annotations: [
    annLine(D, 'base', 'FROM python:3.13-slim', {
      kind: 'framework',
      title: 'A pinned, small base image',
      what: 'Debian with Python 3.13 and little else: 178 MB.',
      why: 'The same Python version as development. Pin a digest (python:3.13-slim@sha256:…) to make builds exactly repeatable.',
    }),
    annLine(D, 'deps', 'RUN pip install --no-cache-dir -r requirements.txt', {
      kind: 'framework',
      title: 'Dependencies in their own layer',
      what: 'Installs the pinned versions from requirements.txt: 174 MB, mostly ONNX Runtime (66 MB) and NumPy (70 MB with its libraries).',
      why: 'Docker reuses a layer until its inputs change. Copying requirements.txt before the code means a code change rebuilds in seconds.',
    }),
    annLine(D, 'copy', 'COPY app.py model.onnx ./', {
      kind: 'framework',
      title: 'The model inside the image',
      what: 'The 5 KB model file is baked in, so the image version is the model version.',
      why: 'Large models (gigabytes) are usually downloaded at startup or mounted instead, which keeps images small but makes readiness depend on the download.',
    }),
    annLine(D, 'user', 'USER nobody', {
      kind: 'framework',
      title: 'Not root',
      what: 'The server runs as an unprivileged user.',
      why: 'If the process is compromised, the attacker does not own the container.',
    }),
    annLine(D, 'health', 'HEALTHCHECK', {
      kind: 'framework',
      title: 'Health check',
      what: 'Docker calls /readyz every 10 seconds and marks the container healthy or unhealthy.',
      why: 'Kubernetes ignores HEALTHCHECK and uses its own probes, pointed at the same endpoints.',
    }),
    annLine(D, 'cmd', 'CMD ["uvicorn"', {
      kind: 'framework',
      title: 'One process per container',
      what: 'A single Uvicorn process. To serve more traffic, run more containers.',
      why: 'The orchestrator can then restart, place and count each process. In our measurement, adding --workers 2 also added a 45 ms delay to every request on a kept-alive connection.',
    }),
  ],
};

export const containerOutput: CodeExample = {
  id: 'serve-container-output',
  language: 'bash',
  source: `docker build -t digits-api:1 .
docker images
# digits-api:1        406MB
# python:3.13-slim    178MB
docker history digits-api:1        # the layers we added
# 20.5kB   COPY app.py model.onnx ./
# 174MB    RUN pip install --no-cache-dir -r requirements.txt
docker run -d -p 8000:8000 digits-api:1
# ready after 0.97 s                (polling /readyz from the moment the container started)
curl -X POST localhost:8000/predict -H 'content-type: application/json' -d @sample.json
# {"labels":[7,6,3,7,7],"confidence":[0.989,0.999,1.0,1.0,0.999],"model_version":"digits-1"}
docker inspect digits --format '{{.State.Health.Status}}'
# healthy`,
  annotations: [],
};

export const loadOutput: CodeExample = {
  id: 'serve-load-output',
  language: 'bash',
  source: `python3 load.py          # client and container on the same 4-core VM, one image per request
sequential: p50 2.50 ms  p99 8.50 ms  (352 req/s)
 1 clients:   403 req/s  p50   2.10 ms  p99   6.07 ms
 4 clients:   689 req/s  p50   4.99 ms  p99  15.00 ms
16 clients:   665 req/s  p50  19.53 ms  p99  78.46 ms

# The same test against the first version of the image, which ran uvicorn --workers 2:
sequential: p50 47.28 ms  p99 71.83 ms  (21 req/s)`,
  annotations: [],
};

const C = CANARY_SOURCE;
const st = (s: unknown) => s as CanaryState;

export const canaryCode: CodeExample = {
  id: 'serve-canary',
  language: 'python',
  source: C,
  slots: Object.fromEntries(
    ['rate', 'share', 'base', 'canary', 'rollback'].map((k) => [k, (s: unknown) => canarySlots(st(s))[k]!]),
  ),
  annotations: [
    ann(C, 'n', 'n = math.ceil(', 'math.ceil((z / (p1 - p0)) ** 2)', {
      kind: 'math',
      title: 'Requests needed',
      what: 'The standard sample size for telling a rate p1 from a known rate p0, with 5% false alarms and 80% power.',
      why: 'It depends only on the two error rates, not on the share: telling 1% from 0.5% takes 1,597 canary requests however you split traffic.',
    }),
    annLine(C, 'threshold', 'threshold = n * p0', {
      kind: 'math',
      title: 'The alarm rule',
      what: 'After n canary requests, raise the alarm if errors exceed what the old rate would give, plus 1.645 standard deviations.',
      why: 'Without a rule, people stare at a noisy dashboard and roll back on noise or miss a real regression.',
    }),
    ann(C, 'detect', 'detect_s = n / (rate * share)', 'n / (rate * share)', {
      kind: 'math',
      title: 'The share sets the speed',
      what: 'The canary receives rate × share requests per second.',
      why: 'A 1% canary at 200 requests/s needs 13.3 minutes to collect 1,597 requests; a 50% canary needs 16 seconds.',
    }),
    ann(C, 'extra', 'extra = n * (p1 - p0)', 'rate * share * rollback_s * (p1 - p0)', {
      kind: 'math',
      title: 'The share sets the damage during the rollback',
      what: 'Once the alarm fires, the canary keeps failing at its rate until traffic moves back.',
      why: 'This term grows with the share; the first term does not. A fast, automatic rollback lets you use a larger share safely.',
    }),
  ],
};

export const simOutput: CodeExample = {
  id: 'serve-canary-sim',
  language: 'bash',
  source: `python3 canary_sim.py     # 200,000 simulated canaries per row, NumPy 2.5.3
p0 0.005 p1 0.010: n  1,597  alarm when worse 80.6%  false alarms 6.3%
p0 0.005 p1 0.020: n    244  alarm when worse 72.1%  false alarms 3.6%
p0 0.010 p1 0.015: n  2,830  alarm when worse 77.4%  false alarms 4.6%`,
  annotations: [],
};
