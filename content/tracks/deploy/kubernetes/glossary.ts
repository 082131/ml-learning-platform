import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/kubernetes chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'kubernetes',
    term: 'Kubernetes',
    short:
      'A system that runs containers across a group of machines, keeps the requested number of copies running and routes traffic to them.',
    long: 'You declare the desired state in manifests (YAML); controllers keep changing the cluster until it matches. Often shortened to K8s.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['K8s', 'k8s', 'kubectl'],
  },
  {
    id: 'pod',
    term: 'Pod',
    short:
      'The smallest unit Kubernetes runs: one or more containers that share a network address and are scheduled onto one node together.',
    long: 'Pods are disposable: when one dies, its controller creates a new one with a new name and address.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['pods'],
  },
  {
    id: 'k8s-node',
    term: 'Node (Kubernetes)',
    short:
      'One machine in a Kubernetes cluster, physical or virtual, that runs pods. It advertises how much CPU, memory and GPU it can give to pods (allocatable).',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['worker node', 'node'],
  },
  {
    id: 'k8s-deployment',
    term: 'Deployment (Kubernetes)',
    short:
      'A Kubernetes object that keeps a set number of identical pods (replicas) running and replaces them gradually when the pod template changes.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['Deployment', 'replicas', 'ReplicaSet'],
  },
  {
    id: 'k8s-service',
    term: 'Service (Kubernetes)',
    short:
      'A stable name and virtual address that load-balances traffic across the ready pods matching a label selector.',
    long: 'Pods come and go; clients talk to the Service. Only pods whose readiness probe passes receive traffic.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['Service', 'ClusterIP'],
  },
  {
    id: 'resource-request',
    term: 'Resource request and limit',
    short:
      'A request is what a container is guaranteed and what the scheduler reserves on a node; a limit is the most it may use.',
    long: 'A container over its memory limit is killed (OOMKilled); one over its CPU limit is slowed down. Scheduling only looks at requests, not actual use.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['requests', 'limits', 'OOMKilled'],
  },
  {
    id: 'kube-scheduler',
    term: 'Scheduler (kube-scheduler)',
    short:
      'The Kubernetes component that picks a node for each new pod: it filters out nodes that cannot fit the pod’s requests, then scores the rest.',
    long: 'When no node passes the filter, the pod stays Pending and a FailedScheduling event explains why.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['scheduler', 'Pending', 'FailedScheduling'],
  },
  {
    id: 'extended-resource',
    term: 'Extended resource (nvidia.com/gpu)',
    short:
      'A countable resource that a device plugin advertises on a node, such as nvidia.com/gpu. Pods request whole units of it.',
    long: 'GPUs cannot be shared by default or overcommitted: a pod that requests one GPU gets a whole GPU or stays Pending.',
    introducedIn: 'deploy/kubernetes/k8s-for-models',
    aliases: ['nvidia.com/gpu', 'device plugin', 'GPU request'],
  },
  {
    id: 'horizontal-pod-autoscaler',
    term: 'Horizontal Pod Autoscaler (HPA)',
    short:
      'The Kubernetes controller that changes a Deployment’s replica count to keep a metric, such as average CPU utilization, near a target.',
    long: 'Every 15 s it computes desired = ceil(current × currentMetric / target), ignores changes within a 10% tolerance and waits out a stabilization window before scaling down.',
    introducedIn: 'deploy/kubernetes/autoscaling-rollouts',
    aliases: ['HPA', 'autoscaling'],
  },
  {
    id: 'cold-start',
    term: 'Cold start',
    short:
      'The delay between creating a new server copy and it being ready to serve: pulling the image, starting the process and loading the model.',
    long: 'For large models it can take minutes, so autoscaling reacts later than the traffic changes.',
    introducedIn: 'deploy/kubernetes/autoscaling-rollouts',
    aliases: ['startup time', 'model load time'],
  },
  {
    id: 'stabilization-window',
    term: 'Stabilization window',
    short:
      'The time the HPA looks back over before scaling down: it uses the highest recommendation in the window (300 s by default).',
    long: 'It stops the replica count from flapping when traffic dips briefly.',
    introducedIn: 'deploy/kubernetes/autoscaling-rollouts',
    aliases: ['scaleDown stabilizationWindowSeconds'],
  },
  {
    id: 'rolling-update',
    term: 'Rolling update',
    short:
      'Replacing the pods of a Deployment a few at a time with the new version, controlled by maxSurge (extra pods allowed) and maxUnavailable (pods allowed missing).',
    long: 'With maxUnavailable: 0, a new pod must pass its readiness probe before an old one is removed, so capacity never drops.',
    introducedIn: 'deploy/kubernetes/autoscaling-rollouts',
    aliases: ['maxSurge', 'maxUnavailable', 'rollout'],
  },
] satisfies GlossaryTerm[];
