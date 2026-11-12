import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pending-why',
    type: 'choice',
    prompt:
      'A node has 4 CPUs allocatable. Two running model-server pods each request 1500m but each actually uses only 300m. A third identical pod is created. What happens?',
    options: [
      {
        text: 'It runs on that node, because only 600m of CPU is really in use',
        correct: false,
        explain:
          'The scheduler never looks at real usage. It adds up requests: 1500m + 1500m + 1500m = 4500m is more than 4000m.',
      },
      {
        text: 'It stays Pending with “Insufficient cpu”, unless another node has 1500m unreserved',
        correct: true,
        explain:
          'Requests are reservations. The fix is either a smaller request that matches measured use, or more nodes.',
      },
      {
        text: 'It is scheduled and the kubelet throttles all three pods to share the CPU',
        correct: false,
        explain:
          'Throttling applies to CPU limits on running containers. Placement is decided earlier, by the scheduler, from requests.',
      },
    ],
  },
  {
    id: 'oom',
    type: 'choice',
    prompt:
      'A container’s memory limit is 2Gi. While loading a new, larger model it reaches 2.3 GiB. What does Kubernetes do?',
    options: [
      {
        text: 'Slows the container down until its memory use falls',
        correct: false,
        explain: 'Memory cannot be throttled like CPU. Going over the memory limit ends the process.',
      },
      {
        text: 'Moves the pod to a node with more free memory',
        correct: false,
        explain: 'Kubernetes does not move running pods. A replacement would get the same limit and fail the same way.',
      },
      {
        text: 'Kills the container (OOMKilled) and restarts it, which fails again',
        correct: true,
        explain:
          'The limit has to be raised to the measured peak, including the moment of loading, which can briefly need more than steady serving.',
      },
    ],
  },
  {
    id: 'readiness',
    type: 'choice',
    prompt:
      'A pod’s process starts in 2 s but its 14 GB model takes 90 s to load. The server answers /readyz with 503 until the model is loaded. During those 90 s, the Service…',
    options: [
      {
        text: 'sends that pod no requests, and keeps sending them to the other ready pods',
        correct: true,
        explain: 'Only ready pods are endpoints of the Service. That is the purpose of the readiness probe.',
      },
      {
        text: 'sends that pod its share of requests, which fail with 503',
        correct: false,
        explain: 'That is what happens without a readiness probe, or with one that returns 200 before the model is loaded.',
      },
      {
        text: 'restarts the pod because its health check is failing',
        correct: false,
        explain:
          'A failing readiness probe never restarts anything; a failing liveness probe does. Pointing liveness at the model load is a classic restart loop.',
      },
    ],
  },
  {
    id: 'taint',
    type: 'choice',
    prompt:
      'Why do clusters usually put a taint such as nvidia.com/gpu=present:NoSchedule on GPU nodes?',
    options: [
      {
        text: 'Pods without a toleration cannot use a GPU, even when they request one',
        correct: false,
        explain: 'GPU access comes from the nvidia.com/gpu request and the device plugin. The taint only controls which pods may land on the node.',
      },
      {
        text: 'So that CPU-only pods do not fill the node’s CPU and memory and leave GPU pods unschedulable',
        correct: true,
        explain:
          'In the experiment, turn the taint off and add CPU replicas: they land on gpu-a, and a later GPU pod can fail for lack of CPU or memory.',
      },
      {
        text: 'The device plugin requires it before it advertises nvidia.com/gpu',
        correct: false,
        explain: 'The device plugin advertises GPUs whether or not the node is tainted. The taint is a scheduling policy the cluster admin chooses.',
      },
    ],
  },
  {
    id: 'gpu-count',
    type: 'numeric',
    prompt:
      'A cluster has 3 nodes with 4 GPUs each. Your Deployment’s pods each request nvidia.com/gpu: 3. How many replicas can run at most?',
    answer: 3,
    tolerance: 0,
    hint: 'GPUs are whole units and a pod must fit on one node.',
    explain:
      'Each node fits one pod (3 of 4 GPUs) with 1 GPU left that no pod can use: 3 replicas, 3 GPUs idle. Requesting 2 or 4 GPUs per pod would waste none.',
  },
  {
    id: 'objects',
    type: 'order',
    prompt: 'Order what happens after `kubectl apply` of a new Deployment, until a request reaches the model.',
    items: [
      'The API server stores the Deployment',
      'The Deployment controller creates pods (through a ReplicaSet)',
      'The scheduler assigns each pod to a node',
      'The kubelet on that node pulls the image and starts the container',
      'The readiness probe passes and the pod is added to the Service',
      'A request to the Service is forwarded to the pod',
    ],
    explain:
      'Each step is done by a different component watching the API server. A pod stuck between steps shows where: Pending (scheduler), ContainerCreating or ImagePullBackOff (kubelet), Running but not Ready (probe).',
  },
];

export const quantityExercise: Exercise = {
  id: 'k8s-cpu-quantity',
  prompt:
    'Write `to_millicores(q)` for Kubernetes CPU quantities ("1500m", "2", "0.5") and `fits(free, req)` that checks every resource in a request against what a node has free.',
  starter: `def to_millicores(q):
    # "1500m" -> 1500, "2" -> 2000, "0.5" -> 500
    pass


def fits(free, req):
    # free and req are dicts such as {"cpu": 2500, "memory": 8, "nvidia.com/gpu": 0}
    pass`,
  hints: [
    'If the string ends with "m", the number before it is already in millicores.',
    'Otherwise it is in CPUs: multiply by 1000. Use round() so "0.1" gives 100, not 100.00000000000001.',
    'fits is true only if req[r] <= free.get(r, 0) for every resource r in req.',
  ],
  solution: `def to_millicores(q):
    if q.endswith("m"):
        return int(q[:-1])
    return round(float(q) * 1000)


def fits(free, req):
    return all(req[r] <= free.get(r, 0) for r in req)`,
  explanation:
    'This is the filter step of the scheduler. A resource the node does not have at all (no GPU) counts as 0 free, which is why a GPU request on a CPU node reports “Insufficient nvidia.com/gpu”.',
  tests: `assert to_millicores("1500m") == 1500, '"1500m" is 1500 millicores'
assert to_millicores("2") == 2000, '"2" is two CPUs, 2000 millicores'
assert to_millicores("0.1") == 100, '"0.1" should give exactly 100 (round, do not truncate)'
assert fits({"cpu": 2500, "memory": 14}, {"cpu": 1500, "memory": 2}), 'there is room for 1500m and 2 GiB'
assert not fits({"cpu": 1000, "memory": 14}, {"cpu": 1500, "memory": 2}), '1500m does not fit in 1000m'
assert not fits({"cpu": 8000, "memory": 32}, {"cpu": 1000, "memory": 2, "nvidia.com/gpu": 1}), 'a node without GPUs has 0 free'`,
};
