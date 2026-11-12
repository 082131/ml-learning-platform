// Code for the autoscaling lesson. hpa.yaml and the rolling-update fields were accepted by a K3s v1.33.5 API
// server (`kubectl apply --dry-run=server`). The autoscaling model's printout is checked against CPython 3.13 in
// src/lib/deploy/hpa.test.ts.
import { ann, annLine } from '@/lib/inference/annotate';
import { HPA_SOURCE, hpaExperiment, hpaSlots, type HpaState } from '@/lib/deploy/hpa';
import type { CodeExample } from '@/lib/types';
import hpaSource from './hpa.yaml?raw';

export const experiment = hpaExperiment('hpa', {
  peak: 400,
  coldStart: 120,
  target: 70,
  minReplicas: 2,
  window: 300,
});

const st = (s: unknown) => s as HpaState;
const H = hpaSource.replace(/\n$/, '');

export const hpaManifest: CodeExample = {
  id: 'hpa-manifest',
  language: 'yaml',
  source: H,
  annotations: [
    ann(H, 'version', 'apiVersion: autoscaling/v2', 'autoscaling/v2', {
      kind: 'framework',
      title: 'autoscaling/v2',
      what: 'The current HPA API. It supports several metrics and the behavior section.',
      why: 'Old examples use autoscaling/v1, which only knows CPU and has no behavior settings.',
    }),
    ann(H, 'target', 'scaleTargetRef:', 'scaleTargetRef', {
      kind: 'syntax',
      title: 'What to scale',
      what: 'The digits-api Deployment from the previous lesson. The HPA only changes its replicas field.',
      why: 'Do not also set replicas by hand or in your deploy tool on every release; the two will fight.',
    }),
    ann(H, 'minmax', 'minReplicas: 2', 'minReplicas: 2', {
      kind: 'parameter',
      title: 'minReplicas and maxReplicas',
      what: 'The HPA never goes below 2 or above 10.',
      why: 'Two replicas survive one pod or node failure. The maximum caps cost and protects shared GPUs.',
    }),
    ann(H, 'util', 'averageUtilization: 70', 'averageUtilization: 70', {
      kind: 'parameter',
      title: 'Target: 70% of the CPU request',
      what: 'Utilization is measured against the pod’s CPU request, averaged over ready pods.',
      why: 'The gap between 70% and 100% is headroom: room to absorb traffic while new pods start.',
    }),
    ann(H, 'window', 'stabilizationWindowSeconds: 300', 'stabilizationWindowSeconds: 300', {
      kind: 'parameter',
      title: 'Scale-down stabilization window',
      what: 'Before removing pods, the HPA takes the highest recommendation of the last 300 s (the default).',
      why: 'Model pods are expensive to bring back. Removing them on every short dip means paying the cold start again.',
    }),
  ],
};

export const hpaCode: CodeExample = {
  id: 'hpa-model',
  language: 'python',
  source: HPA_SOURCE,
  slots: Object.fromEntries(
    ['peak', 'coldStart', 'target', 'minReplicas', 'window'].map((k) => [k, (s: unknown) => hpaSlots(st(s))[k]!]),
  ),
  annotations: [
    annLine(HPA_SOURCE, 'util', 'util = min(100,', {
      kind: 'math',
      title: 'Measured utilization, capped at 100%',
      what: 'Demand divided by what the ready pods can serve. A pod cannot use more than all of its CPU.',
      why: 'When pods are saturated the HPA sees only 100%, not the true demand, so it can scale up by at most 100/target per step.',
    }),
    annLine(HPA_SOURCE, 'tol', 'if ready and abs(util / target - 1) > 0.1:', {
      kind: 'framework',
      title: 'The 10% tolerance',
      what: 'If utilization is within 10% of the target, the HPA does nothing.',
      why: 'Avoids constant small changes. The default comes from the controller flag --horizontal-pod-autoscaler-tolerance.',
    }),
    annLine(HPA_SOURCE, 'formula', 'rec = math.ceil(ready * util / target)', {
      kind: 'math',
      title: 'desired = ceil(current × metric / target)',
      what: 'The formula from the Kubernetes documentation. 5 pods at 100% with a 70% target: ceil(5 × 100 / 70) = ceil(7.14) = 8.',
      why: 'If the load stayed the same, that many pods would run near the target.',
    }),
    annLine(HPA_SOURCE, 'up', 'spec = min(rec, max(2 * spec, spec + 4))', {
      kind: 'framework',
      title: 'Default scale-up limit',
      what: 'At most double, or add 4 pods, per 15-second period, whichever is more.',
      why: 'This is the default behavior.scaleUp policy; it limits overshoot on a noisy metric.',
    }),
    annLine(HPA_SOURCE, 'down', 'spec = min(spec, max(history[', {
      kind: 'framework',
      title: 'Stabilized scale-down',
      what: 'The highest recommendation within the window. A single low reading cannot shrink the Deployment.',
      why: 'With window = 0, replicas drop the moment traffic does.',
    }),
    annLine(HPA_SOURCE, 'cold', 'pods = (pods + [t + STEP + cold_start] * spec)[:spec]', {
      kind: 'variable',
      title: 'New pods become ready after the cold start',
      what: 'Each new pod gets a ready time: now plus the cold start. Extra pods are removed from the end when scaling down.',
      why: 'Image pull, process start and model load all happen before the readiness probe passes.',
    }),
  ],
};

export const rollout: CodeExample = {
  id: 'rollout-strategy',
  language: 'yaml',
  source: `spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # at most 3 + 1 = 4 pods during the update
      maxUnavailable: 0    # never fewer than 3 ready pods
  minReadySeconds: 10      # a new pod must stay ready 10 s before it counts`,
  annotations: [],
};
