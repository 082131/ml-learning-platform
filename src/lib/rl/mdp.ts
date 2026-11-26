// Dynamic programming on a grid MDP: policy evaluation, Q from V, greedy policies and value iteration.
// All sweeps are synchronous (every new value is computed from the previous sweep's values), which is what the
// lessons' Python code does, so the two agree number for number.
import { ACTIONS, isActive, type Action, type Grid } from './grid';

/** A policy as probabilities: policy[s][a] = π(a|s). Rows for walls and terminal cells are ignored. */
export type Policy = number[][];

export const uniformPolicy = (g: Grid): Policy => g.kinds.map(() => ACTIONS.map(() => 1 / ACTIONS.length));

/** A deterministic policy from one action per cell (undefined cells get the uniform row). */
export function fixedPolicy(g: Grid, choose: (s: number) => Action | undefined): Policy {
  return g.kinds.map((_, s) => {
    const a = choose(s);
    return a ? ACTIONS.map((b) => (b === a ? 1 : 0)) : ACTIONS.map(() => 1 / ACTIONS.length);
  });
}

/** Q(s,a) = Σ_s' P(s'|s,a) · (r + γ · V(s')), where V of a terminal cell is 0 (nothing more to collect). */
export function qValue(g: Grid, V: readonly number[], s: number, a: number, gamma: number): number {
  let q = 0;
  for (const o of g.transitions[s]![a]!) q += o.p * (o.reward + (o.done ? 0 : gamma * V[o.next]!));
  return q;
}

export const qRow = (g: Grid, V: readonly number[], s: number, gamma: number) =>
  ACTIONS.map((_, a) => qValue(g, V, s, a, gamma));

/** One sweep of the Bellman expectation backup: V(s) ← Σ_a π(a|s) · Q(s,a). */
export function evaluationSweep(g: Grid, policy: Policy, V: readonly number[], gamma: number): number[] {
  return g.kinds.map((_, s) => {
    if (!isActive(g, s)) return 0;
    return ACTIONS.reduce((sum, _a, a) => sum + policy[s]![a]! * qValue(g, V, s, a, gamma), 0);
  });
}

/** One sweep of the Bellman optimality backup: V(s) ← max_a Q(s,a). */
export function optimalitySweep(g: Grid, V: readonly number[], gamma: number): number[] {
  return g.kinds.map((_, s) => (isActive(g, s) ? Math.max(...qRow(g, V, s, gamma)) : 0));
}

const maxChange = (a: readonly number[], b: readonly number[]) => Math.max(0, ...a.map((x, i) => Math.abs(x - b[i]!)));

export interface Sweeps {
  /** history[k] = values after k sweeps; history[0] is all zeros. */
  history: number[][];
  /** Largest change in any cell made by each sweep (deltas[k−1] belongs to sweep k). */
  deltas: number[];
}

function iterate(g: Grid, sweeps: number, step: (V: number[]) => number[]): Sweeps {
  const history = [g.kinds.map(() => 0)];
  const deltas: number[] = [];
  for (let k = 0; k < sweeps; k++) {
    const next = step(history[k]!);
    deltas.push(maxChange(next, history[k]!));
    history.push(next);
  }
  return { history, deltas };
}

export const evaluatePolicy = (g: Grid, policy: Policy, gamma: number, sweeps: number) =>
  iterate(g, sweeps, (V) => evaluationSweep(g, policy, V, gamma));

export const valueIteration = (g: Grid, gamma: number, sweeps: number) =>
  iterate(g, sweeps, (V) => optimalitySweep(g, V, gamma));

/** Sweeps until the largest change is below `theta` (or `limit` sweeps). Returns the values and the count. */
export function untilConverged(
  g: Grid,
  step: (V: number[]) => number[],
  theta = 1e-6,
  limit = 10_000,
): { V: number[]; sweeps: number } {
  let V = g.kinds.map(() => 0);
  for (let k = 1; k <= limit; k++) {
    const next = step(V);
    const d = maxChange(next, V);
    V = next;
    if (d < theta) return { V, sweeps: k };
  }
  return { V, sweeps: limit };
}

/** The greedy action in each active cell (ties go to the first action in ACTIONS order); undefined elsewhere. */
export function greedyActions(g: Grid, V: readonly number[], gamma: number, eps = 1e-9): (Action | undefined)[] {
  return g.kinds.map((_, s) => {
    if (!isActive(g, s)) return undefined;
    const q = qRow(g, V, s, gamma);
    const best = Math.max(...q);
    return ACTIONS[q.findIndex((x) => x >= best - eps)];
  });
}

/** The parts of one backup for one cell and action, for "show your working" captions. */
export interface BackupTerm {
  p: number;
  next: number;
  reward: number;
  nextValue: number;
  done: boolean;
}

export function backupTerms(g: Grid, V: readonly number[], s: number, a: number): BackupTerm[] {
  return g.transitions[s]![a]!.map((o) => ({ p: o.p, next: o.next, reward: o.reward, nextValue: o.done ? 0 : V[o.next]!, done: o.done }));
}
