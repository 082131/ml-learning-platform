import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from '../inference/format';

/**
 * The Horizontal Pod Autoscaler against a traffic ramp, every 15 s for 40 minutes (a stated model, not a
 * measurement). Each pod serves 50 requests/s at 100% CPU. The HPA rule follows the Kubernetes docs:
 * desired = ceil(ready × utilization / target), no change within a 10% tolerance, scale up by at most
 * max(2×, +4 pods) per step, scale down to the highest recommendation of the stabilization window.
 * New pods serve only after the cold start. HPA_SOURCE is the same model in Python, checked in hpa.test.ts.
 */
export const STEP_S = 15;
export const STEPS = 160; // 40 minutes
export const POD_RPS = 50;
export const BASE_RPS = 60;
export const MAX_REPLICAS = 20;

export interface HpaState {
  peak: number;
  coldStart: number;
  target: number;
  minReplicas: number;
  window: number;
}

export interface HpaResult {
  minutes: number[];
  demand: number[];
  capacity: number[];
  replicas: number[];
  ready: number[];
  overPct: number;
  overMinutes: number;
  peakReplicas: number;
  podMinutes: number;
}

/** Requests per second at time t (seconds): ramp up over minutes 5–10, hold to 25, down by 30. */
export function demandAt(t: number, peak: number): number {
  if (t < 300) return BASE_RPS;
  if (t < 600) return BASE_RPS + ((peak - BASE_RPS) * (t - 300)) / 300;
  if (t < 1500) return peak;
  if (t < 1800) return peak - ((peak - BASE_RPS) * (t - 1500)) / 300;
  return BASE_RPS;
}

export function runHpa(s: HpaState): HpaResult {
  let spec = s.minReplicas;
  let pods: number[] = Array.from({ length: spec }, () => 0); // ready-at times, seconds
  const history: number[] = [];
  const r: HpaResult = {
    minutes: [],
    demand: [],
    capacity: [],
    replicas: [],
    ready: [],
    overPct: 0,
    overMinutes: 0,
    peakReplicas: spec,
    podMinutes: 0,
  };
  let total = 0;
  let over = 0;
  for (let i = 0; i < STEPS; i++) {
    const t = i * STEP_S;
    const demand = demandAt(t, s.peak);
    const ready = pods.filter((p) => p <= t).length;
    const served = Math.min(demand, ready * POD_RPS);
    total += demand * STEP_S;
    over += (demand - served) * STEP_S;
    if (demand > served) r.overMinutes += STEP_S / 60;
    r.minutes.push(t / 60);
    r.demand.push(demand);
    r.capacity.push(ready * POD_RPS);
    r.replicas.push(spec);
    r.ready.push(ready);
    r.podMinutes += (spec * STEP_S) / 60;
    // The HPA's decision for the next step.
    const util = ready > 0 ? Math.min(100, (demand / (ready * POD_RPS)) * 100) : 100;
    let rec = spec;
    if (ready > 0 && Math.abs(util / s.target - 1) > 0.1) rec = Math.ceil((ready * util) / s.target);
    rec = Math.max(s.minReplicas, Math.min(MAX_REPLICAS, rec));
    history.push(rec);
    if (rec > spec) {
      spec = Math.min(rec, Math.max(2 * spec, spec + 4));
    } else {
      const keep = Math.max(1, s.window / STEP_S);
      const down = Math.max(...history.slice(-keep));
      if (down < spec) spec = down;
    }
    while (pods.length < spec) pods.push(t + STEP_S + s.coldStart);
    pods = pods.slice(0, spec);
    r.peakReplicas = Math.max(r.peakReplicas, spec);
  }
  r.overPct = (over / total) * 100;
  return r;
}

export const HPA_SOURCE = `import math

peak, cold_start, target = {{peak}}, {{coldStart}}, {{target}}   # rps, seconds, % CPU
min_replicas, window = {{minReplicas}}, {{window}}                # pods, seconds
POD_RPS, STEP = 50, 15                              # one pod serves 50 rps at 100% CPU; HPA runs every 15 s


def demand(t):                                      # requests per second at second t
    if t < 300: return 60
    if t < 600: return 60 + (peak - 60) * (t - 300) / 300
    if t < 1500: return peak
    if t < 1800: return peak - (peak - 60) * (t - 1500) / 300
    return 60


spec, pods, history = min_replicas, [0] * min_replicas, []   # pods: when each one becomes ready
total = over = over_min = pod_min = 0
peak_spec = spec
for i in range(160):                                # 40 minutes
    t = i * STEP
    ready = sum(p <= t for p in pods)
    served = min(demand(t), ready * POD_RPS)
    total += demand(t) * STEP
    over += (demand(t) - served) * STEP
    over_min += STEP / 60 if demand(t) > served else 0
    pod_min += spec * STEP / 60
    if i % 20 == 0:
        print(f"{t // 60:2d} min  demand {demand(t):5.1f} rps  ready {ready:2d}  replicas {spec:2d}")
    util = min(100, demand(t) / (ready * POD_RPS) * 100) if ready else 100
    rec = spec
    if ready and abs(util / target - 1) > 0.1:      # outside the 10% tolerance
        rec = math.ceil(ready * util / target)
    rec = max(min_replicas, min(20, rec))
    history.append(rec)
    if rec > spec:
        spec = min(rec, max(2 * spec, spec + 4))    # scale up now, at most 2x or +4 pods
    else:
        spec = min(spec, max(history[-max(1, window // STEP):]))   # highest recent recommendation
    pods = (pods + [t + STEP + cold_start] * spec)[:spec]
    peak_spec = max(peak_spec, spec)
print(f"over capacity: {over / total:.1%} of requests, for {over_min:.2f} min")
print(f"peak replicas {peak_spec}, pod-minutes {pod_min:.2f}")`;

export const hpaSlots = (s: HpaState): Record<string, string> => ({
  peak: String(s.peak),
  coldStart: String(s.coldStart),
  target: String(s.target),
  minReplicas: String(s.minReplicas),
  window: String(s.window),
});

const pad = (x: string, w: number) => x.padStart(w, ' ');

export function hpaPrintout(r: HpaResult): string[] {
  const out: string[] = [];
  for (let i = 0; i < STEPS; i += 20)
    out.push(
      `${pad(String(Math.floor((i * STEP_S) / 60)), 2)} min  demand ${pad(pyFixed(r.demand[i]!, 1), 5)} rps  ready ${pad(String(r.ready[i]), 2)}  replicas ${pad(String(r.replicas[i]), 2)}`,
    );
  out.push(`over capacity: ${pyFixed(r.overPct, 1)}% of requests, for ${pyFixed(r.overMinutes, 2)} min`);
  out.push(`peak replicas ${r.peakReplicas}, pod-minutes ${pyFixed(r.podMinutes, 2)}`);
  return out;
}

export function hpaReadout(_s: HpaState, r: HpaResult): ReadoutItem[] {
  return [
    { label: 'What the code prints', value: hpaPrintout(r).join('\n') },
    {
      label: 'Requests beyond capacity',
      value: `${pyFixed(r.overPct, 1)}% (queued, slow or dropped)`,
    },
  ];
}

export function hpaExperiment(id: string, initial: HpaState): ExperimentDef<HpaState, HpaResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'peak',
        label: 'Peak traffic (requests/s)',
        min: 100,
        max: 600,
        step: 50,
        get: (s) => s.peak,
        set: (s, v) => ({ ...s, peak: v }),
      },
      {
        kind: 'slider',
        id: 'coldStart',
        label: 'Cold start: model load time (s)',
        min: 15,
        max: 600,
        step: 15,
        get: (s) => s.coldStart,
        set: (s, v) => ({ ...s, coldStart: v }),
      },
      {
        kind: 'slider',
        id: 'target',
        label: 'Target CPU utilization (%)',
        min: 40,
        max: 90,
        step: 5,
        get: (s) => s.target,
        set: (s, v) => ({ ...s, target: v }),
      },
      {
        kind: 'slider',
        id: 'minReplicas',
        label: 'Minimum replicas',
        min: 1,
        max: 8,
        get: (s) => s.minReplicas,
        set: (s, v) => ({ ...s, minReplicas: v }),
      },
      {
        kind: 'slider',
        id: 'window',
        label: 'Scale-down stabilization window (s)',
        min: 0,
        max: 600,
        step: 60,
        get: (s) => s.window,
        set: (s, v) => ({ ...s, window: v }),
      },
    ],
    compute: runHpa,
    readout: hpaReadout,
  };
}
