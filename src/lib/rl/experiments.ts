// Experiment definitions for the Reinforcement learning track. The logic lives in the modules they import, each
// unit-tested in rl.test.ts. Every stochastic experiment is seeded, so a given setting always shows the same picture.
import { seededRandom } from '../classical/random';
import type { Control, ExperimentDef, ReadoutItem } from '../types';
import { movingAverage, runBandit, type BanditResult, type BanditStrategy } from './bandit';
import { runControl, type ControlResult } from './control';
import {
  ACTIONS,
  cellId,
  cellName,
  classicSpec,
  cliffSpec,
  isActive,
  makeGrid,
  moveTo,
  sampleOutcome,
  type Action,
  type Grid,
  type Outcome,
} from './grid';
import { evaluatePolicy, fixedPolicy, greedyActions, qRow, uniformPolicy, untilConverged, optimalitySweep, valueIteration, type Policy } from './mdp';
import { ppoClipped, ppoCurve, ppoObjective, unclippedCurve } from './ppo';
import { runPolicyGradient, type PgResult } from './policyGradient';
import { discountedReturn, discountedTerms, horizon, indifferenceGamma, returnsPerStep } from './returns';
import { compareMcTd, type WalkResult } from './randomWalk';
import { expectation, klDivergence, klOptimalPolicy, SKY_ANSWERS } from './rlhf';

const opts = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '∞');
const f3 = (x: number) => x.toFixed(3);
const pct = (x: number) => `${Math.round(x * 100)}%`;

// ---------- 1. play the grid by hand ----------

export interface PlayState {
  moves: Action[];
  stepReward: number;
}

export interface PlayStep {
  from: number;
  action: Action;
  to: number;
  reward: number;
}

export interface PlayResult {
  grid: Grid;
  steps: PlayStep[];
  at: number;
  total: number;
  /** 'goal' or 'pit' once the episode is over, otherwise null. */
  ended: 'goal' | 'pit' | null;
}

/** Replays the moves on the classic grid without slipping. Moves after the episode ends are ignored. */
export function playGrid(s: PlayState): PlayResult {
  const grid = makeGrid(classicSpec({ slip: 0, stepReward: s.stepReward }));
  const steps: PlayStep[] = [];
  let at = grid.start;
  let ended: PlayResult['ended'] = null;
  for (const action of s.moves) {
    if (ended) break;
    const o = grid.transitions[at]![ACTIONS.indexOf(action)]![0]!;
    steps.push({ from: at, action, to: o.next, reward: o.reward });
    at = o.next;
    if (grid.kinds[at] === 'goal' || grid.kinds[at] === 'pit') ended = grid.kinds[at] as 'goal' | 'pit';
  }
  const total = steps.reduce((sum, x) => sum + x.reward, 0);
  return { grid, steps, at, total, ended };
}

const STEP_REWARDS = opts([
  ['-0.04', '−0.04 (small cost)'],
  ['0', '0 (free)'],
  ['-0.5', '−0.5 (expensive)'],
]);

export function playExperiment(id: string): ExperimentDef<PlayState, PlayResult> {
  return {
    id,
    initial: { moves: [], stepReward: -0.04 },
    controls: [
      { kind: 'select', id: 'step', label: 'Reward for each move', options: STEP_REWARDS, get: (s) => String(s.stepReward), set: (s, v) => ({ ...s, stepReward: Number(v) }) },
    ],
    compute: playGrid,
    readout: (_s, r) => [
      { label: 'Moves taken', value: String(r.steps.length) },
      { label: 'Total reward so far', value: f2(r.total) },
      { label: 'Episode', value: r.ended === 'goal' ? 'over: reached the goal' : r.ended === 'pit' ? 'over: fell in the pit' : 'still running', status: r.ended === 'pit' ? 'error' : r.ended === 'goal' ? 'ok' : undefined },
    ],
  };
}

// ---------- 2. returns and discounting ----------

export type ReturnScenario = 'goal' | 'now-later' | 'forever';

export interface ReturnState {
  scenario: ReturnScenario;
  gamma: number;
}

export interface ReturnOption {
  label: string;
  rewards: number[];
  terms: number[];
  perStep: number[];
  total: number;
}

export interface ReturnResult {
  options: ReturnOption[];
  /** For "now or later": the γ above which waiting wins. */
  switchGamma: number | null;
  horizon: number;
}

/** The path to the goal in the classic grid: five moves, the last one enters the +1 goal. */
const GOAL_REWARDS = [-0.04, -0.04, -0.04, -0.04, 0.96];
const FOREVER = 60;

function option(label: string, rewards: number[], gamma: number): ReturnOption {
  return { label, rewards, terms: discountedTerms(rewards, gamma), perStep: returnsPerStep(rewards, gamma), total: discountedReturn(rewards, gamma) };
}

export function returnsResult(s: ReturnState): ReturnResult {
  const later = [0, 0, 0, 0, 0, 0, 0, 0, 0, 10];
  const options =
    s.scenario === 'goal'
      ? [option('Five moves to the goal', GOAL_REWARDS, s.gamma)]
      : s.scenario === 'now-later'
        ? [option('Take 1 now', [1], s.gamma), option('Take 10 after ten steps', later, s.gamma)]
        : [option(`+1 every step (first ${FOREVER} shown)`, new Array<number>(FOREVER).fill(1), s.gamma)];
  return { options, switchGamma: s.scenario === 'now-later' ? indifferenceGamma(1, 10, 9) : null, horizon: horizon(s.gamma) };
}

export function returnsExperiment(id: string): ExperimentDef<ReturnState, ReturnResult> {
  return {
    id,
    initial: { scenario: 'goal', gamma: 0.9 },
    controls: [
      { kind: 'select', id: 'scenario', label: 'Reward sequence', options: opts([['goal', 'Walk to the goal'], ['now-later', '1 now, or 10 later'], ['forever', 'A reward that never stops']]), get: (s) => s.scenario, set: (s, v) => ({ ...s, scenario: v as ReturnScenario }) },
      { kind: 'slider', id: 'gamma', label: 'Discount factor γ', min: 0, max: 1, step: 0.01, get: (s) => s.gamma, set: (s, v) => ({ ...s, gamma: v }), format: (v) => v.toFixed(2) },
    ],
    compute: returnsResult,
    readout: (_s, r) => [
      ...r.options.map((o) => ({ label: `Return: ${o.label}`, value: f3(o.total) })),
      ...(r.switchGamma !== null ? [{ label: 'Waiting wins when γ is above', value: f3(r.switchGamma) }] : []),
      { label: 'Effective horizon 1/(1−γ)', value: Number.isFinite(r.horizon) ? `${f2(r.horizon)} steps` : 'no horizon (γ = 1)' },
    ],
  };
}

// ---------- 3. bandits ----------

/** Click probabilities of four ad headlines. Headline D is the best, but B and C are close. */
export const BANDIT_PROBS = [0.3, 0.5, 0.45, 0.6];
export const BANDIT_ARMS = ['A', 'B', 'C', 'D'];

export interface BanditState {
  strategy: BanditStrategy;
  epsilon: number;
  c: number;
  initial: number;
  seed: number;
}

export const BANDIT_STEPS = 500;
export const BANDIT_RUNS = 200;

export function banditExperiment(id: string): ExperimentDef<BanditState, BanditResult> {
  return {
    id,
    initial: { strategy: 'epsilon', epsilon: 0.1, c: 1, initial: 0, seed: 1 },
    controls: [
      { kind: 'select', id: 'strategy', label: 'Strategy', options: opts([['greedy', 'greedy (always the best so far)'], ['epsilon', 'ε-greedy'], ['ucb', 'UCB (optimism about the unknown)']]), get: (s) => s.strategy, set: (s, v) => ({ ...s, strategy: v as BanditStrategy }) },
      { kind: 'slider', id: 'epsilon', label: 'ε (share of random pulls)', min: 0, max: 0.5, step: 0.01, get: (s) => s.epsilon, set: (s, v) => ({ ...s, epsilon: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'c', label: 'UCB strength c', min: 0, max: 3, step: 0.1, get: (s) => s.c, set: (s, v) => ({ ...s, c: v }), format: (v) => v.toFixed(1) },
      { kind: 'select', id: 'initial', label: 'Starting estimate', options: opts([['0', '0 (pessimistic)'], ['1', '1 (optimistic)']]), get: (s) => String(s.initial), set: (s, v) => ({ ...s, initial: Number(v) }) },
      { kind: 'slider', id: 'seed', label: 'Random seed', min: 1, max: 20, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
    ],
    compute: (s) => runBandit({ probs: BANDIT_PROBS, ...s, steps: BANDIT_STEPS, runs: BANDIT_RUNS }),
    readout: (_s, r) => [
      { label: `Average reward per pull (best possible ${BANDIT_PROBS[r.best]})`, value: f3(r.meanTotal / BANDIT_STEPS) },
      { label: `Pulls of the best headline in the last 100 steps`, value: pct(r.optimalShare.slice(-100).reduce((a, b) => a + b, 0) / 100) },
      { label: 'Regret (clicks lost vs always D)', value: r.regret.toFixed(1) },
    ],
  };
}

// ---------- 4. transitions in an MDP ----------

export interface TransitionState {
  cell: number;
  action: Action;
  slip: number;
}

export interface TransitionResult {
  grid: Grid;
  outcomes: Outcome[];
  /** Counts from 1,000 simulated tries of this move (seeded). */
  counts: number[];
}

export const TRY_COUNT = 1000;

export function transitionResult(s: TransitionState): TransitionResult {
  const grid = makeGrid(classicSpec({ slip: s.slip }));
  const outcomes = grid.transitions[s.cell]![ACTIONS.indexOf(s.action)]!;
  const rand = seededRandom(7);
  const counts = outcomes.map(() => 0);
  for (let i = 0; i < TRY_COUNT; i++) counts[outcomes.indexOf(sampleOutcome(outcomes, rand()))]!++;
  return { grid, outcomes, counts };
}

const classic = makeGrid(classicSpec());
const activeCells = classic.kinds.flatMap((_, s) => (isActive(classic, s) ? [s] : []));
const cellOptions = activeCells.map((s) => ({ value: String(s), label: `${cellName(classic, s)}${classic.kinds[s] === 'start' ? ' start' : ''}` }));
const actionOptions = ACTIONS.map((a) => ({ value: a, label: a }));

export function transitionExperiment(id: string): ExperimentDef<TransitionState, TransitionResult> {
  return {
    id,
    initial: { cell: cellId(classic, 1, 2), action: 'up', slip: 0.2 },
    controls: [
      { kind: 'select', id: 'cell', label: 'Cell', options: cellOptions, get: (s) => String(s.cell), set: (s, v) => ({ ...s, cell: Number(v) }) },
      { kind: 'select', id: 'action', label: 'Action', options: actionOptions, get: (s) => s.action, set: (s, v) => ({ ...s, action: v as Action }) },
      { kind: 'slider', id: 'slip', label: 'Slip probability', min: 0, max: 0.6, step: 0.05, get: (s) => s.slip, set: (s, v) => ({ ...s, slip: v }), format: (v) => v.toFixed(2) },
    ],
    compute: transitionResult,
    readout: (s, r) =>
      r.outcomes.map((o, i) => ({ label: `P(land in ${cellName(r.grid, o.next)} | ${s.action})`, value: `${f2(o.p)} (simulated: ${r.counts[i]} of ${TRY_COUNT})` })),
  };
}

// ---------- 5. policy evaluation ----------

export type PolicyName = 'random' | 'safe' | 'shortcut';

/** Two hand-written policies on the classic grid, as one arrow per cell (row by row; '' for walls and terminals). */
const POLICY_ARROWS: Record<Exclude<PolicyName, 'random'>, string[]> = {
  // Up the left column, then along the top: far from the pit.
  safe: ['right', 'right', 'right', '', 'up', '', 'up', '', 'up', 'left', 'left', 'left'],
  // Along the bottom, then up the third column right next to the pit.
  shortcut: ['right', 'right', 'right', '', 'up', '', 'up', '', 'right', 'right', 'up', 'left'],
};

export function namedPolicy(g: Grid, name: PolicyName): Policy {
  if (name === 'random') return uniformPolicy(g);
  return fixedPolicy(g, (s) => (POLICY_ARROWS[name][s] || undefined) as Action | undefined);
}

export interface EvalState {
  policy: PolicyName;
  gamma: number;
  slip: number;
  sweeps: number;
  cell: number;
}

export interface EvalResult {
  grid: Grid;
  V: number[];
  policy: Policy;
  /** Largest change made by the last sweep shown (0 before any sweep). */
  lastDelta: number;
  /** Sweeps needed until no value moves by more than 0.0001. */
  convergedAt: number;
  /** Q(cell, a) under the values from the previous sweep, for the worked backup. */
  cellQ: number[];
  prevV: number[];
}

export const MAX_SWEEPS = 40;

export function evalResult(s: EvalState): EvalResult {
  const grid = makeGrid(classicSpec({ slip: s.slip }));
  const policy = namedPolicy(grid, s.policy);
  const { history, deltas } = evaluatePolicy(grid, policy, s.gamma, s.sweeps);
  const V = history[s.sweeps]!;
  const prevV = history[Math.max(0, s.sweeps - 1)]!;
  const firstSmall = evaluatePolicy(grid, policy, s.gamma, 500).deltas.findIndex((d) => d < 1e-4);
  return { grid, V, policy, lastDelta: deltas.at(-1) ?? 0, convergedAt: firstSmall + 1, cellQ: qRow(grid, prevV, s.cell, s.gamma), prevV };
}

export function evaluationExperiment(id: string): ExperimentDef<EvalState, EvalResult> {
  return {
    id,
    initial: { policy: 'safe', gamma: 1, slip: 0.2, sweeps: 1, cell: classic.start },
    controls: [
      { kind: 'select', id: 'policy', label: 'Policy to evaluate', options: opts([['safe', 'safe route (left column)'], ['shortcut', 'shortcut (next to the pit)'], ['random', 'random (each move 1/4)']]), get: (s) => s.policy, set: (s, v) => ({ ...s, policy: v as PolicyName }) },
      { kind: 'slider', id: 'sweeps', label: 'Sweeps done', min: 0, max: MAX_SWEEPS, step: 1, get: (s) => s.sweeps, set: (s, v) => ({ ...s, sweeps: v }) },
      { kind: 'select', id: 'cell', label: 'Cell to explain', options: cellOptions, get: (s) => String(s.cell), set: (s, v) => ({ ...s, cell: Number(v) }) },
      { kind: 'slider', id: 'gamma', label: 'Discount factor γ', min: 0.5, max: 1, step: 0.01, get: (s) => s.gamma, set: (s, v) => ({ ...s, gamma: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'slip', label: 'Slip probability', min: 0, max: 0.6, step: 0.05, get: (s) => s.slip, set: (s, v) => ({ ...s, slip: v }), format: (v) => v.toFixed(2) },
    ],
    compute: evalResult,
    readout: (s, r) => [
      { label: `V(start) after ${s.sweeps} sweep${s.sweeps === 1 ? '' : 's'}`, value: f3(r.V[r.grid.start]!) },
      { label: 'Largest change in the last sweep', value: f3(r.lastDelta) },
      { label: 'Sweeps until changes are below 0.0001', value: r.convergedAt > 0 ? String(r.convergedAt) : 'more than 500' },
    ],
  };
}

// ---------- 6. value iteration ----------

export interface ViState {
  gamma: number;
  slip: number;
  stepReward: number;
  sweeps: number;
}

export interface ViResult {
  grid: Grid;
  V: number[];
  greedy: (Action | undefined)[];
  converged: number;
  /** The fully converged values, to show how far the current sweep still is. */
  final: number[];
  finalGreedy: (Action | undefined)[];
}

export function viResult(s: ViState): ViResult {
  const grid = makeGrid(classicSpec({ slip: s.slip, stepReward: s.stepReward }));
  const V = valueIteration(grid, s.gamma, s.sweeps).history[s.sweeps]!;
  const done = untilConverged(grid, (v) => optimalitySweep(grid, v, s.gamma), 1e-4, 2000);
  return { grid, V, greedy: greedyActions(grid, V, s.gamma), converged: done.sweeps, final: done.V, finalGreedy: greedyActions(grid, done.V, s.gamma) };
}

export const STEP_REWARD_OPTIONS = opts([
  ['-0.04', '−0.04 (small cost)'],
  ['-0.4', '−0.4 (costly moves)'],
  ['-2', '−2 (every move hurts)'],
  ['0', '0 (free moves)'],
  ['0.1', '+0.1 (paid to keep moving)'],
]);

export function viExperiment(id: string): ExperimentDef<ViState, ViResult> {
  return {
    id,
    initial: { gamma: 1, slip: 0.2, stepReward: -0.04, sweeps: 3 },
    controls: [
      { kind: 'slider', id: 'sweeps', label: 'Sweeps done', min: 0, max: MAX_SWEEPS, step: 1, get: (s) => s.sweeps, set: (s, v) => ({ ...s, sweeps: v }) },
      { kind: 'select', id: 'step', label: 'Reward for each move', options: STEP_REWARD_OPTIONS, get: (s) => String(s.stepReward), set: (s, v) => ({ ...s, stepReward: Number(v) }) },
      { kind: 'slider', id: 'gamma', label: 'Discount factor γ', min: 0.5, max: 1, step: 0.01, get: (s) => s.gamma, set: (s, v) => ({ ...s, gamma: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'slip', label: 'Slip probability', min: 0, max: 0.6, step: 0.05, get: (s) => s.slip, set: (s, v) => ({ ...s, slip: v }), format: (v) => v.toFixed(2) },
    ],
    compute: viResult,
    readout: (_s, r) => {
      const changed = r.greedy.filter((a, i) => a !== r.finalGreedy[i]).length;
      return [
        { label: 'V(start) now / when converged', value: `${f3(r.V[r.grid.start]!)} / ${f3(r.final[r.grid.start]!)}` },
        { label: 'Sweeps to converge (changes < 0.0001)', value: r.converged >= 2000 ? 'did not converge in 2,000 (try γ < 1)' : String(r.converged), status: r.converged >= 2000 ? 'diverged' : undefined },
        { label: 'Arrows that will still change', value: String(changed), status: changed ? undefined : 'ok' },
      ];
    },
  };
}

// ---------- 7. Monte Carlo vs TD ----------

export interface WalkState {
  alpha: number;
  episodes: number;
}

export const WALK_RUNS = 100;

export function walkExperiment(id: string): ExperimentDef<WalkState, WalkResult> {
  return {
    id,
    initial: { alpha: 0.1, episodes: 100 },
    controls: [
      { kind: 'slider', id: 'alpha', label: 'Step size α', min: 0.01, max: 0.5, step: 0.01, get: (s) => s.alpha, set: (s, v) => ({ ...s, alpha: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'episodes', label: 'Episodes', min: 1, max: 200, step: 1, get: (s) => s.episodes, set: (s, v) => ({ ...s, episodes: v }) },
    ],
    compute: (s) => compareMcTd({ ...s, runs: WALK_RUNS, seed: 3 }),
    readout: (s, r) => [
      { label: `Monte Carlo error after ${s.episodes} episodes`, value: f3(r.mcError[s.episodes]!) },
      { label: `TD(0) error after ${s.episodes} episodes`, value: f3(r.tdError[s.episodes]!) },
      { label: 'Lower error now', value: r.tdError[s.episodes]! < r.mcError[s.episodes]! ? 'TD(0)' : 'Monte Carlo' },
    ],
  };
}

// ---------- 8. Q-learning on the grid ----------

export interface QState {
  alpha: number;
  epsilon: number;
  episodes: number;
  slip: number;
  seed: number;
}

export interface QResult extends ControlResult {
  grid: Grid;
  /** The optimal arrows from value iteration, to grade the learned ones. */
  optimal: (Action | undefined)[];
  /** Per cell: the learned arrow is as good as the optimal one (equal arrows, or a tie in value iteration's Q). */
  matches: boolean[];
  agree: number;
  cells: number;
  smoothed: number[];
}

export const Q_RUNS = 20;

export function qResult(s: QState, stepReward = -0.04): QResult {
  const grid = makeGrid(classicSpec({ slip: s.slip, stepReward }));
  const r = runControl(grid, { algo: 'q-learning', alpha: s.alpha, gamma: 1, epsilon: s.epsilon, episodes: s.episodes, maxSteps: 200, runs: Q_RUNS, seed: s.seed });
  const vi = untilConverged(grid, (v) => optimalitySweep(grid, v, 1), 1e-6, 5000);
  const optimal = greedyActions(grid, vi.V, 1);
  const cells = activeCells.length;
  const matches = grid.kinds.map((_, c) => isActive(grid, c) && (r.greedy[c] === optimal[c] || sameValue(grid, vi.V, c, r.greedy[c], optimal[c])));
  const agree = matches.filter(Boolean).length;
  return { ...r, grid, optimal, matches, agree, cells, smoothed: movingAverage(r.episodeReturns, 20) };
}

/** Two actions count as equally good when value iteration gives them the same Q (ties have no single right arrow). */
function sameValue(g: Grid, V: number[], s: number, a?: Action, b?: Action) {
  if (!a || !b) return false;
  const q = qRow(g, V, s, 1);
  return Math.abs(q[ACTIONS.indexOf(a)]! - q[ACTIONS.indexOf(b)]!) < 1e-6;
}

function qControls<S extends QState>(): Control<S>[] {
  return [
    { kind: 'slider', id: 'episodes', label: 'Episodes of practice', min: 1, max: 1000, step: 1, get: (s) => s.episodes, set: (s, v) => ({ ...s, episodes: v }) },
    { kind: 'slider', id: 'alpha', label: 'Learning rate α', min: 0.01, max: 1, step: 0.01, get: (s) => s.alpha, set: (s, v) => ({ ...s, alpha: v }), format: (v) => v.toFixed(2) },
    { kind: 'slider', id: 'epsilon', label: 'Exploration ε', min: 0, max: 1, step: 0.01, get: (s) => s.epsilon, set: (s, v) => ({ ...s, epsilon: v }), format: (v) => v.toFixed(2) },
    { kind: 'slider', id: 'slip', label: 'Slip probability', min: 0, max: 0.6, step: 0.05, get: (s) => s.slip, set: (s, v) => ({ ...s, slip: v }), format: (v) => v.toFixed(2) },
    { kind: 'slider', id: 'seed', label: 'Random seed', min: 1, max: 20, step: 1, get: (s) => s.seed, set: (s, v) => ({ ...s, seed: v }) },
  ];
}

const qReadout = (_s: unknown, r: QResult): ReadoutItem[] => [
  { label: 'Arrows that match the optimal policy', value: `${r.agree} of ${r.cells}`, status: r.agree === r.cells ? 'ok' : undefined },
  { label: 'Greedy route from the start', value: r.reaches === 'goal' ? `reaches the goal in ${r.path.length - 1} moves` : r.reaches === 'pit' ? 'walks into the pit' : 'goes in circles', status: r.reaches === 'goal' ? 'ok' : 'error' },
  { label: 'Max Q at the start (learned estimate of V)', value: f3(Math.max(...r.Q[r.grid.start]!)) },
];

export function qExperiment(id: string): ExperimentDef<QState, QResult> {
  return {
    id,
    initial: { alpha: 0.1, epsilon: 0.2, episodes: 300, slip: 0.2, seed: 1 },
    controls: qControls<QState>(),
    compute: (s) => qResult(s),
    readout: qReadout,
  };
}

// ---------- 9. SARSA vs Q-learning on the cliff ----------

export interface CliffState {
  epsilon: number;
  alpha: number;
  episodes: number;
}

export interface CliffResult {
  grid: Grid;
  q: ControlResult;
  sarsa: ControlResult;
  qSmooth: number[];
  sarsaSmooth: number[];
}

export const CLIFF_RUNS = 10;

export function cliffResult(s: CliffState): CliffResult {
  const grid = makeGrid(cliffSpec());
  const base = { alpha: s.alpha, gamma: 1, epsilon: s.epsilon, episodes: s.episodes, maxSteps: 500, runs: CLIFF_RUNS, seed: 5 };
  const q = runControl(grid, { ...base, algo: 'q-learning' });
  const sarsa = runControl(grid, { ...base, algo: 'sarsa' });
  return { grid, q, sarsa, qSmooth: movingAverage(q.episodeReturns, 10), sarsaSmooth: movingAverage(sarsa.episodeReturns, 10) };
}

const tail = (xs: number[], n: number) => xs.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, xs.length);

export function cliffExperiment(id: string): ExperimentDef<CliffState, CliffResult> {
  return {
    id,
    initial: { epsilon: 0.1, alpha: 0.5, episodes: 300 },
    controls: [
      { kind: 'slider', id: 'epsilon', label: 'Exploration ε', min: 0, max: 0.3, step: 0.01, get: (s) => s.epsilon, set: (s, v) => ({ ...s, epsilon: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'alpha', label: 'Learning rate α', min: 0.05, max: 1, step: 0.05, get: (s) => s.alpha, set: (s, v) => ({ ...s, alpha: v }), format: (v) => v.toFixed(2) },
      { kind: 'slider', id: 'episodes', label: 'Episodes', min: 20, max: 500, step: 10, get: (s) => s.episodes, set: (s, v) => ({ ...s, episodes: v }) },
    ],
    compute: cliffResult,
    readout: (_s, r) => [
      { label: 'Q-learning: reward per episode (last 50, while exploring)', value: tail(r.q.episodeReturns, 50).toFixed(1) },
      { label: 'SARSA: reward per episode (last 50, while exploring)', value: tail(r.sarsa.episodeReturns, 50).toFixed(1) },
      { label: 'Greedy route length: Q-learning / SARSA', value: `${routeLabel(r.q)} / ${routeLabel(r.sarsa)}` },
    ],
  };
}

const routeLabel = (c: ControlResult) => (c.reaches === 'goal' ? `${c.path.length - 1} moves` : 'no route yet');

// ---------- 10. policy gradients ----------

export interface PgState {
  alpha: number;
  offset: number;
}

export interface PgCompare {
  withBaseline: PgResult;
  without: PgResult;
}

export const PG_MEANS = [0.2, 0.5, 1.0];
export const PG_STEPS = 500;
export const PG_RUNS = 50;

export function pgCompare(s: PgState): PgCompare {
  const base = { means: PG_MEANS, offset: s.offset, alpha: s.alpha, steps: PG_STEPS, runs: PG_RUNS, seed: 11 };
  return { withBaseline: runPolicyGradient({ ...base, baseline: true }), without: runPolicyGradient({ ...base, baseline: false }) };
}

export function pgExperiment(id: string): ExperimentDef<PgState, PgCompare> {
  return {
    id,
    initial: { alpha: 0.1, offset: 0 },
    controls: [
      { kind: 'slider', id: 'alpha', label: 'Step size α', min: 0.01, max: 0.5, step: 0.01, get: (s) => s.alpha, set: (s, v) => ({ ...s, alpha: v }), format: (v) => v.toFixed(2) },
      { kind: 'select', id: 'offset', label: 'Added to every reward', options: opts([['0', '0 (rewards near 0)'], ['5', '+5'], ['10', '+10 (all rewards large)'], ['-5', '−5 (all rewards negative)']]), get: (s) => String(s.offset), set: (s, v) => ({ ...s, offset: Number(v) }) },
    ],
    compute: pgCompare,
    readout: (_s, r) => [
      { label: 'P(best arm) after 500 steps, with baseline', value: f3(r.withBaseline.bestProb.at(-1)!) },
      { label: 'P(best arm) after 500 steps, without baseline', value: f3(r.without.bestProb.at(-1)!) },
    ],
  };
}

// ---------- 11. PPO clip ----------

export interface PpoState {
  eps: number;
  advantage: number;
  ratio: number;
}

export interface PpoResult {
  clipped: [number, number][];
  unclipped: [number, number][];
  value: number;
  isClipped: boolean;
}

export function ppoResult(s: PpoState): PpoResult {
  return {
    clipped: ppoCurve(s.advantage, s.eps),
    unclipped: unclippedCurve(s.advantage),
    value: ppoObjective(s.ratio, s.advantage, s.eps),
    isClipped: ppoClipped(s.ratio, s.advantage, s.eps),
  };
}

export function ppoExperiment(id: string): ExperimentDef<PpoState, PpoResult> {
  return {
    id,
    initial: { eps: 0.2, advantage: 1, ratio: 1.3 },
    controls: [
      { kind: 'slider', id: 'ratio', label: 'Probability ratio π_new / π_old', min: 0, max: 2, step: 0.05, get: (s) => s.ratio, set: (s, v) => ({ ...s, ratio: v }), format: (v) => v.toFixed(2) },
      { kind: 'select', id: 'adv', label: 'Advantage A', options: opts([['1', '+1 (better than expected)'], ['-1', '−1 (worse than expected)']]), get: (s) => String(s.advantage), set: (s, v) => ({ ...s, advantage: Number(v) }) },
      { kind: 'slider', id: 'eps', label: 'Clip range ε', min: 0.05, max: 0.5, step: 0.05, get: (s) => s.eps, set: (s, v) => ({ ...s, eps: v }), format: (v) => v.toFixed(2) },
    ],
    compute: ppoResult,
    readout: (s, r) => [
      { label: 'Objective for this sample', value: f3(r.value) },
      { label: 'Unclipped ratio × A', value: f3(s.ratio * s.advantage) },
      { label: 'Gradient from this sample', value: r.isClipped ? 'zero: the clip is active' : 'pushes the ratio further', status: r.isClipped ? 'ok' : undefined },
    ],
  };
}

// ---------- 12. KL-regularised RLHF ----------

export interface RlhfState {
  beta: number;
}

export interface RlhfResult {
  policy: number[];
  expectedReward: number;
  expectedQuality: number;
  refQuality: number;
  kl: number;
  /** Expected true quality for β from 0.05 to 5, for the chart. */
  qualityCurve: [number, number][];
  rewardCurve: [number, number][];
  bestBeta: number;
}

const REF = SKY_ANSWERS.map((a) => a.ref);
const RM = SKY_ANSWERS.map((a) => a.reward);
const QUALITY = SKY_ANSWERS.map((a) => a.quality);
const BETA_GRID = Array.from({ length: 100 }, (_, i) => 0.05 * (i + 1)); // 0.05 to 5, like the slider

export function rlhfResult(s: RlhfState): RlhfResult {
  const policy = klOptimalPolicy(REF, RM, s.beta);
  const qualityCurve = BETA_GRID.map((b) => [b, expectation(klOptimalPolicy(REF, RM, b), QUALITY)] as [number, number]);
  const rewardCurve = BETA_GRID.map((b) => [b, expectation(klOptimalPolicy(REF, RM, b), RM)] as [number, number]);
  const bestBeta = qualityCurve.reduce((best, p) => (p[1] > best[1] ? p : best))[0];
  return {
    policy,
    expectedReward: expectation(policy, RM),
    expectedQuality: expectation(policy, QUALITY),
    refQuality: expectation(REF, QUALITY),
    kl: klDivergence(policy, REF),
    qualityCurve,
    rewardCurve,
    bestBeta,
  };
}

export function rlhfExperiment(id: string): ExperimentDef<RlhfState, RlhfResult> {
  return {
    id,
    initial: { beta: 1 },
    controls: [
      { kind: 'slider', id: 'beta', label: 'KL penalty strength β', min: 0.05, max: 5, step: 0.05, get: (s) => s.beta, set: (s, v) => ({ ...s, beta: v }), format: (v) => v.toFixed(2) },
    ],
    compute: rlhfResult,
    readout: (_s, r) => [
      { label: 'Average reward-model score', value: f3(r.expectedReward) },
      { label: `Average true quality (reference model: ${f3(r.refQuality)})`, value: f3(r.expectedQuality), status: r.expectedQuality < r.refQuality ? 'error' : 'ok' },
      { label: 'KL from the reference model (nats)', value: f3(r.kl) },
      { label: 'Probability of the reward hack', value: pct(r.policy[3]!) },
    ],
  };
}

// ---------- 13. capstone: learned vs planned ----------

export interface CapstoneState extends QState {
  stepReward: number;
}

export function capstoneExperiment(id: string): ExperimentDef<CapstoneState, QResult> {
  return {
    id,
    initial: { alpha: 0.1, epsilon: 0.2, episodes: 500, slip: 0.2, seed: 1, stepReward: -0.04 },
    controls: [
      { kind: 'select', id: 'step', label: 'Reward for each move', options: STEP_REWARD_OPTIONS.filter((o) => o.value !== '0.1'), get: (s) => String(s.stepReward), set: (s, v) => ({ ...s, stepReward: Number(v) }) },
      ...qControls<CapstoneState>(),
    ],
    compute: (s) => qResult(s, s.stepReward),
    readout: qReadout,
  };
}

/** Exposed for the play view: where a move from `s` would land (no slips), so buttons can show a preview. */
export const previewMove = (g: Grid, s: number, a: Action) => moveTo(g, s, a);
