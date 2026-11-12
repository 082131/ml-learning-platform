import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/kubernetes/k8s-for-models',
  title: 'Kubernetes for models: pods, deployments, services and GPUs',
  level: 'intermediate',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Explain what a pod, a Deployment, a Service and a node are, and how they relate',
    'Write a Deployment manifest with resource requests, limits and health probes for a model server',
    'Predict where the scheduler places pods and read a FailedScheduling message when it cannot',
    'Request a GPU with nvidia.com/gpu and explain why GPU pods need dedicated nodes',
  ],
  prerequisites: ['inference/serving/apis-containers'],
  concepts: ['kubernetes', 'pod', 'k8s-node', 'k8s-deployment', 'k8s-service', 'resource-request', 'kube-scheduler', 'extended-resource', 'readiness-probe'],
  references: [
    { title: 'Kubernetes: Pods', url: 'https://kubernetes.io/docs/concepts/workloads/pods/', version: 'Kubernetes v1.33' },
    { title: 'Kubernetes: Deployments', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/', version: 'Kubernetes v1.33' },
    { title: 'Kubernetes: Resource management for pods and containers', url: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/', version: 'Kubernetes v1.33' },
    { title: 'Kubernetes: Scheduler and scoring (kube-scheduler)', url: 'https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/' },
    { title: 'Kubernetes: Resource bin packing (NodeResourcesFit strategies)', url: 'https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/' },
    { title: 'Kubernetes: Schedule GPUs', url: 'https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/' },
    { title: 'Kubernetes: Configure liveness, readiness and startup probes', url: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/' },
    { title: 'K3s (lightweight Kubernetes) used to record the outputs', url: 'https://docs.k3s.io/', version: 'v1.33.5+k3s1' },
  ],
} satisfies LessonMeta;
