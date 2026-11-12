// Code for the Kubernetes lesson. manifest.yaml was checked with `kubectl apply --dry-run=server` against a K3s
// v1.33.5 API server for both the CPU and the GPU settings. The kubectl outputs below were recorded on that
// single-node K3s cluster (4 CPUs, 15.7 GiB); the scheduler model's printout is checked against CPython 3.13 in
// src/lib/deploy/scheduler.test.ts.
import { ann, annLine } from '@/lib/inference/annotate';
import {
  SCHED_SOURCE,
  manifestSlots,
  schedSlots,
  schedulerExperiment,
  type SchedState,
} from '@/lib/deploy/scheduler';
import type { CodeExample } from '@/lib/types';
import manifestSource from './manifest.yaml?raw';

export const experiment = schedulerExperiment('sched', {
  replicas: 3,
  cpu: 1500,
  memGi: 2,
  gpu: 0,
  taint: 'on',
});

const st = (s: unknown) => s as SchedState;
const M = manifestSource.replace(/\n$/, '');

export const manifest: CodeExample = {
  id: 'k8s-manifest',
  language: 'yaml',
  source: M,
  slots: Object.fromEntries(
    ['replicas', 'cpu', 'mem', 'gpu', 'tolerations'].map((k) => [k, (s: unknown) => manifestSlots(st(s))[k]!]),
  ),
  annotations: [
    ann(M, 'kind', 'kind: Deployment', 'Deployment', {
      kind: 'framework',
      title: 'kind: Deployment',
      what: 'Asks Kubernetes to keep a number of identical pods running. Its controller creates a ReplicaSet, which creates the pods.',
      why: 'You never create model-server pods by hand: if a node dies, the Deployment notices the missing replica and starts a new pod elsewhere.',
    }),
    ann(M, 'replicas', 'replicas: {{replicas}}', 'replicas: {{replicas}}', {
      kind: 'parameter',
      title: 'replicas',
      what: 'How many copies of the pod should exist. Linked to the Replicas slider.',
      why: 'More replicas serve more requests and survive the loss of one. Each one reserves its requests on some node.',
    }),
    ann(M, 'selector', 'matchLabels:', 'matchLabels:', {
      kind: 'syntax',
      title: 'selector and labels',
      what: 'The Deployment owns every pod whose labels match app: digits-api; the template gives new pods that label.',
      why: 'Labels are how Kubernetes objects find each other. The Service at the bottom uses the same label to find pods to send traffic to.',
    }),
    ann(M, 'tolerations', 'tolerations:', 'tolerations: {{tolerations}}', {
      kind: 'parameter',
      title: 'tolerations',
      what: 'Empty for CPU pods. For GPU pods it tolerates the nvidia.com/gpu taint, which keeps everything else off the expensive GPU node.',
      why: 'A taint repels pods; a toleration lets a pod ignore it. Without the taint, ordinary pods would fill the GPU node and leave no CPU or memory for GPU work.',
    }),
    ann(M, 'image', 'image: digits-api:1', 'digits-api:1', {
      kind: 'variable',
      title: 'The container image',
      what: 'The image built in the serving lesson: the FastAPI digits model server.',
      why: 'Kubernetes runs images, not code. Pin a version tag (or digest) so every replica runs exactly the same thing.',
    }),
    annLine(M, 'requests', '            requests:', {
      kind: 'framework',
      title: 'requests: what the scheduler reserves',
      what: 'The CPU, memory and GPUs this container is guaranteed. The scheduler only places the pod on a node with that much unreserved.',
      why: 'Scheduling uses requests, not real usage. Set them from measurements: too low and pods are crammed together and slow, too high and nodes sit idle.',
    }),
    ann(M, 'cpu', 'cpu: {{cpu}}', 'cpu: {{cpu}}', {
      kind: 'parameter',
      title: 'cpu',
      what: '"1500m" is 1500 millicores, 1.5 CPUs. "2" is two whole CPUs.',
      why: 'Kubernetes quantities have a fixed syntax. Writing "1.5 cores" is rejected by the API server (see the mistakes section).',
    }),
    ann(M, 'gpu', '              nvidia.com/gpu: {{gpu}}', 'nvidia.com/gpu: {{gpu}}', {
      kind: 'parameter',
      title: 'nvidia.com/gpu',
      what: 'Whole GPUs, advertised on GPU nodes by NVIDIA’s device plugin. Requests and limits must be equal.',
      why: 'GPUs are not shared between pods by default, so a pod gets a whole GPU or waits.',
    }),
    annLine(M, 'limits', '            limits:', {
      kind: 'framework',
      title: 'limits: the most it may use',
      what: 'The memory limit equals the request here. A container that goes above its memory limit is killed (OOMKilled) and restarted.',
      why: 'For a model server, memory use is predictable (weights plus buffers), so request = limit avoids surprises. CPU has no limit here, so the server may use idle CPU.',
    }),
    ann(M, 'ready', 'readinessProbe:', 'readinessProbe', {
      kind: 'framework',
      title: 'readinessProbe',
      what: 'Kubernetes calls GET /readyz every 5 s. Until it returns 200, the pod gets no traffic from the Service.',
      why: 'A model server is not useful until the weights are loaded and warmed up, which can take minutes for large models.',
    }),
    ann(M, 'live', 'livenessProbe:', 'livenessProbe', {
      kind: 'framework',
      title: 'livenessProbe',
      what: 'Kubernetes calls GET /healthz every 10 s and restarts the container if it keeps failing.',
      why: 'It recovers a server that is stuck. Keep it cheap and separate from readiness, or a slow model load can trigger a restart loop.',
    }),
    ann(M, 'service', 'kind: Service', 'Service', {
      kind: 'framework',
      title: 'kind: Service',
      what: 'A stable name (digits-api) and port 80 inside the cluster, forwarding to port 8000 of every ready pod with the label.',
      why: 'Pods are replaced all the time and get new addresses; clients only need the Service name.',
    }),
  ],
};

export const schedCode: CodeExample = {
  id: 'k8s-scheduler-model',
  language: 'python',
  source: SCHED_SOURCE,
  slots: Object.fromEntries(
    ['taint', 'cpu', 'mem', 'gpu', 'replicas'].map((k) => [k, (s: unknown) => schedSlots(st(s))[k]!]),
  ),
  annotations: [
    ann(SCHED_SOURCE, 'nodes', 'nodes = {', 'nodes', {
      kind: 'variable',
      title: 'Allocatable resources per node',
      what: 'Two CPU nodes and one GPU node. Allocatable is what is left for pods after the system’s own reservations.',
      why: '`kubectl describe node` prints these numbers under Allocatable.',
    }),
    ann(SCHED_SOURCE, 'filter', 'def reasons(name):', 'reasons', {
      kind: 'function',
      title: 'Filter',
      what: 'Lists why a node cannot take the pod: an untolerated taint, or each resource whose reserved total would exceed allocatable.',
      why: 'kube-scheduler filters first. When every node fails, the pod stays Pending and these reasons become the FailedScheduling message.',
    }),
    ann(SCHED_SOURCE, 'score', 'def score(name):', 'score', {
      kind: 'function',
      title: 'Score: LeastAllocated',
      what: 'The mean percentage of CPU and memory left free after placing the pod, with integer division as in the scheduler.',
      why: 'Preferring emptier nodes spreads replicas out. The real scheduler adds other scores; this is the main resource score.',
    }),
    ann(SCHED_SOURCE, 'sorted', 'why = ', 'sorted(', {
      kind: 'syntax',
      title: 'Sorted reason counts',
      what: 'Counts each reason over all nodes and sorts the "count reason" strings, which is how kube-scheduler builds its message.',
      why: 'So "1 node(s) had untolerated taint…" comes before "2 Insufficient cpu" in the output.',
    }),
    ann(SCHED_SOURCE, 'max', 'best = max(', 'max(feasible, key=score)', {
      kind: 'framework',
      title: 'Pick the best feasible node',
      what: 'The node with the highest score; max returns the first one on a tie.',
      why: 'kube-scheduler picks randomly among tied nodes, so real placements can differ from this model on ties.',
    }),
  ],
};

export const getPods: CodeExample = {
  id: 'k8s-get-pods',
  language: 'bash',
  source: `$ kubectl apply -f model-server.yaml          # replicas 3, cpu "1500m", memory "2Gi"
deployment.apps/digits-api created
service/digits-api created

$ kubectl get pods -o wide                     # columns trimmed
NAME                         READY   STATUS              NODE
digits-api-8cf7c9fb9-f24rh   0/1     ContainerCreating   vm
digits-api-8cf7c9fb9-gjrsq   0/1     ContainerCreating   vm
digits-api-8cf7c9fb9-t67ct   0/1     Pending             <none>

$ kubectl describe pod digits-api-8cf7c9fb9-t67ct   # the Events section, long line wrapped
  Warning  FailedScheduling  5s  default-scheduler  0/1 nodes are available: 1 Insufficient cpu.
  preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.

$ kubectl describe node vm                     # Allocated resources
  Resource           Requests      Limits
  cpu                3100m (77%)   0 (0%)
  memory             4166Mi (25%)  4266Mi (26%)`,
  annotations: [],
};

export const gpuEvents: CodeExample = {
  id: 'k8s-gpu-events',
  language: 'bash',
  source: `# A pod asking for nvidia.com/gpu: 1 on a node without a GPU device plugin
  Warning  FailedScheduling  2s  default-scheduler  0/1 nodes are available: 1 Insufficient nvidia.com/gpu.

# The node tainted nvidia.com/gpu=present:NoSchedule and a CPU pod without a toleration (wrapped)
  Warning  FailedScheduling  3s  default-scheduler  0/1 nodes are available: 1 node(s) had untolerated taint
  {nvidia.com/gpu: present}.

# memory: "64Gi" on a node with 15.7 GiB allocatable
  Warning  FailedScheduling  4s  default-scheduler  0/1 nodes are available: 1 Insufficient memory.`,
  annotations: [],
};
