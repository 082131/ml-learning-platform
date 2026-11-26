// Hand-worked and textbook numbers for the RL track's logic.
import { describe, expect, it } from 'vitest';
import { argmaxRandomTie, movingAverage, runBandit, ucbScore } from './bandit';
import { greedyFromQ, runControl, tdStep } from './control';
import { ACTIONS, cellId, classicSpec, cliffSpec, makeGrid, moveTo, outcomes } from './grid';
import { evaluatePolicy, greedyActions, optimalitySweep, qValue, untilConverged, uniformPolicy, valueIteration } from './mdp';
import { gradLogPi, reinforceStep, softmax } from './policyGradient';
import { dqnTarget, ppoClipped, ppoObjective, tdAdvantage } from './ppo';
import { compareMcTd, mcUpdate, tdUpdate, TRUE_VALUES } from './randomWalk';
import { discountedReturn, horizon, indifferenceGamma, returnsPerStep } from './returns';
import { dpoLoss, expectation, groupAdvantages, klDivergence, klOptimalPolicy, pairLoss, preferProb } from './rlhf';
import * as X from './experiments';

const classic = makeGrid(classicSpec());
const at = (r: number, c: number) => cellId(classic, r, c);

describe('grid world', () => {
  it('walls and edges keep you in place', () => {
    expect(moveTo(classic, at(2, 0), 'down')).toBe(at(2, 0));
    expect(moveTo(classic, at(1, 0), 'right')).toBe(at(1, 0)); // the wall at (1,1)
    expect(moveTo(classic, at(2, 0), 'up')).toBe(at(1, 0));
  });

  it('a slip of 0.2 sends 0.1 to each side and merges cells that coincide', () => {
    // Up from (1,2): 0.8 to (0,2), 0.1 left into the wall (stay), 0.1 right into the pit.
    const o = outcomes(classic, at(1, 2), 'up');
    expect(o.map((x) => [x.next, +x.p.toFixed(2), +x.reward.toFixed(2), x.done])).toEqual([
      [at(0, 2), 0.8, -0.04, false],
      [at(1, 2), 0.1, -0.04, false],
      [at(1, 3), 0.1, -1.04, true],
    ]);
    // Up from the start (2,0): left is the edge, so "stay" collects only that 0.1.
    expect(outcomes(classic, at(2, 0), 'up').map((x) => +x.p.toFixed(2))).toEqual([0.8, 0.1, 0.1]);
  });

  it('terminal cells and walls have no actions; the cliff sends you back to the start', () => {
    expect(classic.transitions[at(0, 3)]![0]).toEqual([]);
    const cliff = makeGrid(cliffSpec());
    const [o] = cliff.transitions[cliff.start]![ACTIONS.indexOf('right')]!;
    expect(o).toEqual({ p: 1, next: cliff.start, reward: -100, done: false });
  });
});

describe('returns', () => {
  it('discounts later rewards', () => {
    // 1 + 0.9·0 + 0.81·2 = 2.62
    expect(discountedReturn([1, 0, 2], 0.9)).toBeCloseTo(2.62, 10);
    expect(returnsPerStep([1, 0, 2], 0.9).map((x) => +x.toFixed(4))).toEqual([2.62, 1.8, 2]);
  });

  it('a reward of 1 forever is worth 1/(1−γ)', () => {
    expect(discountedReturn(new Array(2000).fill(1), 0.9)).toBeCloseTo(10, 6);
    expect(horizon(0.9)).toBeCloseTo(10);
    expect(horizon(1)).toBe(Infinity);
  });

  it('1 now equals 10 nine steps later when γ⁹ = 0.1', () => {
    const g = indifferenceGamma(1, 10, 9);
    expect(g).toBeCloseTo(0.7743, 4);
    expect(discountedReturn([0, 0, 0, 0, 0, 0, 0, 0, 0, 10], g)).toBeCloseTo(1, 10);
  });
});

describe('dynamic programming on the classic grid', () => {
  it('reproduces the textbook values (Russell and Norvig, γ = 1, step −0.04, slip 0.2)', () => {
    const { V } = untilConverged(classic, (v) => optimalitySweep(classic, v, 1));
    const rounded = V.map((v) => +v.toFixed(3));
    expect(rounded).toEqual([0.812, 0.868, 0.918, 0, 0.762, 0, 0.66, 0, 0.705, 0.655, 0.611, 0.388]);
    expect(greedyActions(classic, V, 1).join(' ')).toBe('right right right  up  up  up left left left');
  });

  it('one hand-worked backup', () => {
    // Sweep 1 from V = 0: Q((0,2), right) = 0.8·(−0.04 + 1) + 0.1·(−0.04) + 0.1·(−0.04) = 0.76
    expect(qValue(classic, new Array(12).fill(0), at(0, 2), ACTIONS.indexOf('right'), 1)).toBeCloseTo(0.76, 10);
    const { history } = valueIteration(classic, 1, 1);
    expect(history[1]![at(0, 2)]).toBeCloseTo(0.76, 10);
    expect(history[1]![at(2, 0)]).toBeCloseTo(-0.04, 10);
  });

  it('policy evaluation of the random policy converges to negative values', () => {
    const { history, deltas } = evaluatePolicy(classic, uniformPolicy(classic), 1, 400);
    expect(deltas.at(-1)).toBeLessThan(1e-6);
    expect(history.at(-1)![classic.start]).toBeCloseTo(-1.587, 3);
  });

  it('the step reward changes the optimal policy', () => {
    expect(X.viResult({ gamma: 1, slip: 0.2, stepReward: -2, sweeps: 0 }).finalGreedy[at(1, 2)]).toBe('right'); // dive into the pit
    expect(X.viResult({ gamma: 1, slip: 0.2, stepReward: 0.1, sweeps: 0 }).converged).toBe(2000); // never ends
  });
});

describe('bandits', () => {
  it('UCB scores unpulled arms as infinite and adds a bonus that shrinks with pulls', () => {
    expect(ucbScore(0.5, 0, 10, 1)).toBe(Infinity);
    expect(ucbScore(0.5, 4, 100, 1)).toBeCloseTo(0.5 + Math.sqrt(Math.log(100) / 4), 10);
  });

  it('ties are broken by the random number, not by position', () => {
    expect(argmaxRandomTie([1, 3, 3], 0.1)).toBe(1);
    expect(argmaxRandomTie([1, 3, 3], 0.9)).toBe(2);
  });

  it('ε-greedy beats pure greedy on the headline problem', () => {
    const base = { probs: X.BANDIT_PROBS, c: 1, initial: 0, steps: 500, runs: 200, seed: 1 };
    const greedy = runBandit({ ...base, strategy: 'greedy', epsilon: 0 });
    const eps = runBandit({ ...base, strategy: 'epsilon', epsilon: 0.1 });
    expect(eps.meanTotal).toBeGreaterThan(greedy.meanTotal);
    expect(eps.first.counts.reduce((a, b) => a + b, 0)).toBe(500);
  });

  it('moving average', () => expect(movingAverage([2, 4, 6, 8], 2)).toEqual([2, 3, 5, 7]));
});

describe('Monte Carlo and TD(0) on the random walk', () => {
  const ep = { states: [2, 3, 4], rewards: [0, 0, 1] }; // C → D → E → off the right end

  it('MC moves every visited state toward the final return', () => {
    const V = [0.5, 0.5, 0.5, 0.5, 0.5];
    mcUpdate(V, ep, 0.1);
    expect(V.map((v) => +v.toFixed(3))).toEqual([0.5, 0.5, 0.55, 0.55, 0.55]);
  });

  it('TD(0) only moves the state next to the reward on this first episode', () => {
    const V = [0.5, 0.5, 0.5, 0.5, 0.5];
    tdUpdate(V, ep, 0.1);
    // C: 0.5 + 0.1·(0 + 0.5 − 0.5) = 0.5; D likewise; E: 0.5 + 0.1·(1 + 0 − 0.5) = 0.55
    expect(V.map((v) => +v.toFixed(3))).toEqual([0.5, 0.5, 0.5, 0.5, 0.55]);
  });

  it('TD(0) has lower error than MC after 100 episodes at α = 0.1', () => {
    const r = compareMcTd({ alpha: 0.1, episodes: 100, runs: 100, seed: 3 });
    expect(r.tdError[100]!).toBeLessThan(r.mcError[100]!);
    expect(TRUE_VALUES[2]).toBeCloseTo(0.5);
  });
});

describe('Q-learning and SARSA', () => {
  it('the shared update moves a fraction α toward the target', () => expect(tdStep(0.2, 1, 0.5)).toBeCloseTo(0.6));

  it('Q-learning learns a route to the goal and an accurate start value', () => {
    const r = X.qResult({ alpha: 0.1, epsilon: 0.2, episodes: 500, slip: 0.2, seed: 2 });
    expect(r.reaches).toBe('goal');
    expect(Math.max(...r.Q[classic.start]!)).toBeGreaterThan(0.6);
    expect(r.agree).toBeGreaterThanOrEqual(6);
  });

  it('on the cliff, SARSA earns more while exploring and takes the longer safe route', () => {
    const r = X.cliffResult({ epsilon: 0.1, alpha: 0.5, episodes: 300 });
    const mean = (xs: number[]) => xs.slice(-50).reduce((a, b) => a + b, 0) / 50;
    expect(mean(r.sarsa.episodeReturns)).toBeGreaterThan(mean(r.q.episodeReturns));
    expect(r.q.path.length - 1).toBe(13); // the optimal route along the cliff edge
    expect(r.sarsa.path.length - 1).toBeGreaterThan(13);
  });

  it('greedy actions from a hand-made Q table', () => {
    const Q = classic.kinds.map(() => [0, 0, 0, 0]);
    Q[classic.start] = [0.1, 0.5, 0, 0];
    expect(greedyFromQ(classic, Q)[classic.start]).toBe('right');
    expect(greedyFromQ(classic, Q)[at(0, 3)]).toBeUndefined();
  });

  it('runs are reproducible for a seed', () => {
    const cfg = { algo: 'q-learning' as const, alpha: 0.5, gamma: 1, epsilon: 0.1, episodes: 20, maxSteps: 100, runs: 1, seed: 9 };
    expect(runControl(classic, cfg).episodeReturns).toEqual(runControl(classic, cfg).episodeReturns);
  });
});

describe('policy gradients', () => {
  it('softmax and its log-gradient', () => {
    expect(softmax([0, 0, 0])).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(softmax([1000, 0])[0]).toBeCloseTo(1); // no overflow
    expect(gradLogPi([0.5, 0.3, 0.2], 1).map((x) => +x.toFixed(2))).toEqual([-0.5, 0.7, -0.2]);
  });

  it('one REINFORCE step raises the chosen arm when the reward beats the baseline', () => {
    // θ = 0: π = 1/3 each. Reward 2, baseline 1, α = 0.3: chosen +0.3·1·(2/3) = +0.2, others −0.3·1·(1/3) = −0.1.
    expect(reinforceStep([0, 0, 0], 0, 2, 1, 0.3).map((x) => +x.toFixed(3))).toEqual([0.2, -0.1, -0.1]);
    expect(reinforceStep([0, 0, 0], 0, 0.5, 1, 0.3)[0]).toBeLessThan(0);
  });

  it('a baseline rescues learning when every reward is large', () => {
    const r = X.pgCompare({ alpha: 0.1, offset: 10 });
    expect(r.withBaseline.bestProb.at(-1)!).toBeGreaterThan(0.9);
    expect(r.without.bestProb.at(-1)!).toBeLessThan(0.6);
  });
});

describe('deep RL arithmetic', () => {
  it('DQN target and TD advantage', () => {
    expect(dqnTarget(1, [0.2, 0.5], 0.9, false)).toBeCloseTo(1.45);
    expect(dqnTarget(1, [0.2, 0.5], 0.9, true)).toBe(1);
    expect(tdAdvantage(1, 2, 2, 0.9, false)).toBeCloseTo(0.8);
  });

  it('PPO clips the ratio only in the direction that would help too much', () => {
    expect(ppoObjective(1.5, 1, 0.2)).toBeCloseTo(1.2);
    expect(ppoClipped(1.5, 1, 0.2)).toBe(true);
    expect(ppoObjective(0.5, 1, 0.2)).toBeCloseTo(0.5); // a worse ratio is never clipped upward
    expect(ppoObjective(0.5, -1, 0.2)).toBeCloseTo(-0.8);
    expect(ppoObjective(1.5, -1, 0.2)).toBeCloseTo(-1.5); // pessimistic: keeps the full penalty
    expect(ppoClipped(1.5, -1, 0.2)).toBe(false);
  });
});

describe('RLHF toy', () => {
  it('Bradley–Terry and its loss', () => {
    expect(preferProb(1, 1)).toBe(0.5);
    expect(preferProb(2, 0)).toBeCloseTo(0.8808, 4);
    expect(pairLoss(2, 0)).toBeCloseTo(0.1269, 4);
  });

  it('the KL-optimal policy moves from the reference toward high reward as β shrinks', () => {
    const ref = [0.5, 0.5];
    expect(klOptimalPolicy(ref, [0, 1], 1e6)[1]).toBeCloseTo(0.5, 5);
    expect(klOptimalPolicy(ref, [0, 1], 1)[1]).toBeCloseTo(Math.E / (1 + Math.E), 10);
    expect(klOptimalPolicy(ref, [0, 1], 0.01)[1]).toBeCloseTo(1, 10);
    expect(klDivergence([0.5, 0.5], [0.5, 0.5])).toBe(0);
    expect(expectation([0.25, 0.75], [4, 0])).toBe(1);
  });

  it('too small a β exploits the reward model and true quality falls below the reference', () => {
    const small = X.rlhfResult({ beta: 0.1 });
    const good = X.rlhfResult({ beta: 1.5 });
    expect(small.expectedQuality).toBeLessThan(small.refQuality);
    expect(good.expectedQuality).toBeGreaterThan(good.refQuality);
    expect(small.expectedReward).toBeGreaterThan(good.expectedReward);
  });

  it('GRPO advantages and the DPO loss', () => {
    expect(groupAdvantages([1, 0, 1, 0])).toEqual([1, -1, 1, -1]);
    expect(groupAdvantages([1, 1])).toEqual([0, 0]);
    expect(dpoLoss(0, 0, 0, 0, 0.1)).toBeCloseTo(Math.log(2), 10);
  });
});

describe('experiments', () => {
  it('playing by hand follows the moves and stops at the goal', () => {
    const r = X.playGrid({ moves: ['up', 'up', 'right', 'right', 'right', 'down'], stepReward: -0.04 });
    expect(r.ended).toBe('goal');
    expect(r.steps).toHaveLength(5);
    expect(r.total).toBeCloseTo(0.8, 10); // four moves at −0.04 and one at −0.04 + 1
  });

  it('transition counts add up and track the probabilities', () => {
    const r = X.transitionResult({ cell: at(1, 2), action: 'up', slip: 0.2 });
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(X.TRY_COUNT);
    expect(Math.abs(r.counts[0]! / X.TRY_COUNT - 0.8)).toBeLessThan(0.05);
  });

  it('the safe policy is the optimal one; the shortcut is worth less from the start', () => {
    const safe = X.evalResult({ policy: 'safe', gamma: 1, slip: 0.2, sweeps: 40, cell: classic.start });
    const shortcut = X.evalResult({ policy: 'shortcut', gamma: 1, slip: 0.2, sweeps: 40, cell: classic.start });
    expect(safe.V[classic.start]).toBeCloseTo(0.705, 3);
    expect(shortcut.V[classic.start]).toBeCloseTo(0.508, 3);
  });

  it('returns experiment readouts', () => {
    const r = X.returnsResult({ scenario: 'goal', gamma: 0.9 });
    // −0.04·(1 + 0.9 + 0.81 + 0.729) + 0.96·0.6561 = 0.4926…
    expect(r.options[0]!.total).toBeCloseTo(-0.04 * (1 + 0.9 + 0.81 + 0.729) + 0.96 * 0.6561, 10);
  });
});
