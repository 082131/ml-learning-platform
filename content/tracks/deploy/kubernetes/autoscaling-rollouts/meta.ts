import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/kubernetes/autoscaling-rollouts',
  title: 'Autoscaling and rollouts for model servers',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compute the replica count the Horizontal Pod Autoscaler asks for from its formula',
    'Explain why slow model loading (cold start) makes autoscaling lag behind traffic',
    'Choose a target utilization, minimum replicas and scale-down window for a model server',
    'Configure a rolling update with maxSurge and maxUnavailable that never drops capacity',
  ],
  prerequisites: ['deploy/kubernetes/k8s-for-models'],
  concepts: ['horizontal-pod-autoscaler', 'cold-start', 'stabilization-window', 'rolling-update', 'readiness-probe', 'canary-release'],
  references: [
    {
      title: 'Kubernetes: Horizontal Pod Autoscaling (algorithm details, tolerance, stabilization)',
      url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/',
      version: 'Kubernetes v1.33',
    },
    { title: 'Kubernetes: Deployments, rolling update strategy', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment' },
    { title: 'KEDA: event-driven autoscaling', url: 'https://keda.sh/docs/' },
    { title: 'Kubernetes: Cluster autoscaling', url: 'https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/' },
  ],
} satisfies LessonMeta;
