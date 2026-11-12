import type { ExperimentDef, ReadoutItem } from '../types';

/**
 * A simplified kube-scheduler (a stated model): for each pod in turn, filter out nodes whose free
 * allocatable resources cannot hold its requests (and tainted nodes it does not tolerate), then score
 * the rest with NodeResourcesFit's LeastAllocated formula and take the highest score. The real scheduler
 * adds more scores (balanced allocation, spreading replicas) and breaks ties randomly; here ties go to the
 * first node in the list. Failure messages follow the format kube-scheduler v1.33 printed in K3s.
 * SCHED_SOURCE is the same model in Python, checked against CPython in scheduler.test.ts.
 */
export interface NodeSpec {
  name: string;
  cpu: number; // millicores allocatable
  memGi: number;
  gpu: number;
  /** Tainted nvidia.com/gpu=present:NoSchedule, as GPU nodes usually are. */
  gpuTaint: boolean;
}

export const NODES: NodeSpec[] = [
  { name: 'cpu-a', cpu: 4000, memGi: 16, gpu: 0, gpuTaint: false },
  { name: 'cpu-b', cpu: 4000, memGi: 16, gpu: 0, gpuTaint: false },
  { name: 'gpu-a', cpu: 8000, memGi: 32, gpu: 1, gpuTaint: true },
];

export interface SchedState {
  replicas: number;
  /** CPU request per pod, millicores. */
  cpu: number;
  memGi: number;
  gpu: number;
  /** Whether the GPU node keeps its taint. */
  taint: 'on' | 'off';
}

export interface Placement {
  pod: string;
  node: string | null;
  score: number | null;
  /** The FailedScheduling message when node is null. */
  message: string | null;
}

export interface NodeUse {
  name: string;
  cpu: number;
  memGi: number;
  gpu: number;
  pods: string[];
}

export interface SchedResult {
  placements: Placement[];
  nodes: NodeUse[];
  pending: number;
}

export const TAINT_REASON = 'node(s) had untolerated taint {nvidia.com/gpu: present}';

/** LeastAllocated: the mean share of CPU and memory left free after placing the pod, 0..100, integer math. */
export function leastAllocated(node: NodeSpec, used: NodeUse, s: SchedState): number {
  const cpu = Math.floor(((node.cpu - used.cpu - s.cpu) * 100) / node.cpu);
  const mem = Math.floor(((node.memGi - used.memGi - s.memGi) * 100) / node.memGi);
  return Math.floor((cpu + mem) / 2);
}

/** Why `node` cannot take the pod: the taint alone, or every resource that is short. Empty when it fits. */
export function filterReasons(node: NodeSpec, used: NodeUse, s: SchedState): string[] {
  const tolerates = s.gpu > 0;
  if (node.gpuTaint && s.taint === 'on' && !tolerates) return [TAINT_REASON];
  const out: string[] = [];
  if (used.cpu + s.cpu > node.cpu) out.push('Insufficient cpu');
  if (used.memGi + s.memGi > node.memGi) out.push('Insufficient memory');
  if (used.gpu + s.gpu > node.gpu) out.push('Insufficient nvidia.com/gpu');
  return out;
}

/** "0/3 nodes are available: 2 Insufficient cpu, 1 Insufficient nvidia.com/gpu." (counts per reason, sorted). */
export function fitError(reasons: string[][]): string {
  const counts = new Map<string, number>();
  for (const r of reasons.flat()) counts.set(r, (counts.get(r) ?? 0) + 1);
  const parts = [...counts].map(([r, n]) => `${n} ${r}`).sort();
  return `0/${reasons.length} nodes are available: ${parts.join(', ')}.`;
}

export function schedule(s: SchedState, nodes: NodeSpec[] = NODES): SchedResult {
  const use: NodeUse[] = nodes.map((n) => ({ name: n.name, cpu: 0, memGi: 0, gpu: 0, pods: [] }));
  const placements: Placement[] = [];
  for (let i = 0; i < s.replicas; i++) {
    const pod = `pod-${i}`;
    const reasons = nodes.map((n, k) => filterReasons(n, use[k]!, s));
    let best = -1;
    let bestScore = -1;
    nodes.forEach((n, k) => {
      if (reasons[k]!.length) return;
      const score = leastAllocated(n, use[k]!, s);
      if (score > bestScore) [best, bestScore] = [k, score];
    });
    if (best < 0) {
      placements.push({ pod, node: null, score: null, message: fitError(reasons) });
      continue;
    }
    const u = use[best]!;
    u.cpu += s.cpu;
    u.memGi += s.memGi;
    u.gpu += s.gpu;
    u.pods.push(pod);
    placements.push({ pod, node: nodes[best]!.name, score: bestScore, message: null });
  }
  return { placements, nodes: use, pending: placements.filter((p) => !p.node).length };
}

export const SCHED_SOURCE = `nodes = {                      # allocatable: millicores, GiB, GPUs, tainted for GPU pods only?
    "cpu-a": dict(cpu=4000, mem=16, gpu=0, taint=False),
    "cpu-b": dict(cpu=4000, mem=16, gpu=0, taint=False),
    "gpu-a": dict(cpu=8000, mem=32, gpu=1, taint={{taint}}),
}
req = dict(cpu={{cpu}}, mem={{mem}}, gpu={{gpu}})   # the pod template's resource requests
used = {n: dict(cpu=0, mem=0, gpu=0) for n in nodes}


def reasons(name):                                 # filter: why can't this node take the pod?
    node, u = nodes[name], used[name]
    if node["taint"] and req["gpu"] == 0:          # GPU pods carry a toleration
        return ["node(s) had untolerated taint {nvidia.com/gpu: present}"]
    short = {"cpu": "Insufficient cpu", "mem": "Insufficient memory", "gpu": "Insufficient nvidia.com/gpu"}
    return [msg for r, msg in short.items() if u[r] + req[r] > node[r]]


def score(name):                                   # LeastAllocated: % of CPU and memory left free
    node, u = nodes[name], used[name]
    cpu = (node["cpu"] - u["cpu"] - req["cpu"]) * 100 // node["cpu"]
    mem = (node["mem"] - u["mem"] - req["mem"]) * 100 // node["mem"]
    return (cpu + mem) // 2


for i in range({{replicas}}):
    feasible = [n for n in nodes if not reasons(n)]
    if not feasible:
        counts = {}
        for n in nodes:
            for r in reasons(n):
                counts[r] = counts.get(r, 0) + 1
        why = ", ".join(sorted(f"{c} {r}" for r, c in counts.items()))
        print(f"pod-{i}  Pending: 0/{len(nodes)} nodes are available: {why}.")
        continue
    best = max(feasible, key=score)                # first node wins a tie
    print(f"pod-{i}  -> {best}  (score {score(best)})")
    for r in req:
        used[best][r] += req[r]`;

export const schedSlots = (s: SchedState): Record<string, string> => ({
  taint: s.taint === 'on' ? 'True' : 'False',
  cpu: String(s.cpu),
  mem: String(s.memGi),
  gpu: String(s.gpu),
  replicas: String(s.replicas),
});

export const schedPrintout = (r: SchedResult): string[] =>
  r.placements.map((p) =>
    p.node ? `${p.pod}  -> ${p.node}  (score ${p.score})` : `${p.pod}  Pending: ${p.message}`,
  );

/** Kubernetes quantity strings for the manifest. */
export const cpuQuantity = (m: number) => (m % 1000 === 0 ? `"${m / 1000}"` : `"${m}m"`);

export const manifestSlots = (s: SchedState): Record<string, string> => ({
  replicas: String(s.replicas),
  cpu: cpuQuantity(s.cpu),
  mem: `"${s.memGi}Gi"`,
  gpu: String(s.gpu),
  tolerations:
    s.gpu > 0 ? '[{key: nvidia.com/gpu, operator: Exists, effect: NoSchedule}]' : '[]',
});

export function schedReadout(s: SchedState, r: SchedResult): ReadoutItem[] {
  const placed = s.replicas - r.pending;
  return [
    { label: 'What the code prints', value: schedPrintout(r).join('\n') },
    {
      label: 'Running',
      value: `${placed} of ${s.replicas} replicas scheduled${r.pending ? `, ${r.pending} Pending` : ''}`,
    },
  ];
}

export function schedulerExperiment(id: string, initial: SchedState): ExperimentDef<SchedState, SchedResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'replicas',
        label: 'Replicas',
        min: 1,
        max: 8,
        get: (s) => s.replicas,
        set: (s, v) => ({ ...s, replicas: v }),
      },
      {
        kind: 'slider',
        id: 'cpu',
        label: 'CPU request per pod (millicores)',
        min: 250,
        max: 4000,
        step: 250,
        get: (s) => s.cpu,
        set: (s, v) => ({ ...s, cpu: v }),
      },
      {
        kind: 'slider',
        id: 'mem',
        label: 'Memory request per pod (GiB)',
        min: 1,
        max: 24,
        get: (s) => s.memGi,
        set: (s, v) => ({ ...s, memGi: v }),
      },
      {
        kind: 'select',
        id: 'gpu',
        label: 'GPUs per pod (nvidia.com/gpu)',
        options: [
          { value: '0', label: '0' },
          { value: '1', label: '1' },
        ],
        get: (s) => String(s.gpu),
        set: (s, v) => ({ ...s, gpu: Number(v) }),
      },
      {
        kind: 'select',
        id: 'taint',
        label: 'Taint on the GPU node',
        options: [
          { value: 'on', label: 'on (GPU pods only)' },
          { value: 'off', label: 'off' },
        ],
        get: (s) => s.taint,
        set: (s, v) => ({ ...s, taint: v as SchedState['taint'] }),
      },
    ],
    compute: (s) => schedule(s),
    readout: schedReadout,
  };
}
