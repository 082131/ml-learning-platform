// Grid worlds as finite Markov decision processes (MDPs).
//
// A layout is a list of equal-length strings, one per row, row 0 at the top:
//   '.' empty cell   '#' wall   'S' start   'G' goal (terminal, +goal reward)
//   'P' pit (terminal, pit reward)   'C' cliff (not terminal: big penalty, then back to the start)
//
// Every move from a non-terminal cell earns `stepReward`; entering a terminal cell also earns that cell's reward.
// With the classic 4×3 layout, a step reward of −0.04, γ = 1 and slip 0.2 this is the textbook grid world of
// Russell and Norvig (AIMA, chapter 17), whose state values the tests reproduce.

export const ACTIONS = ['up', 'right', 'down', 'left'] as const;
export type Action = (typeof ACTIONS)[number];
export const ACTION_ARROW: Record<Action, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const DELTA: Record<Action, [number, number]> = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };

export type CellKind = 'empty' | 'wall' | 'start' | 'goal' | 'pit' | 'cliff';
const KIND: Record<string, CellKind> = { '.': 'empty', '#': 'wall', S: 'start', G: 'goal', P: 'pit', C: 'cliff' };

export interface GridSpec {
  layout: string[];
  /** Reward for every move made from a non-terminal cell (negative = a cost per step). */
  stepReward: number;
  goalReward: number;
  pitReward: number;
  /** Extra reward for stepping onto a cliff cell, which sends the agent back to the start. */
  cliffReward?: number;
  /** Probability that a move goes sideways instead: half of it to each side (never backwards). */
  slip: number;
}

/** One possible outcome of taking an action: where you end up, with what probability and reward. */
export interface Outcome {
  p: number;
  next: number;
  reward: number;
  done: boolean;
}

export interface Grid {
  spec: GridSpec;
  rows: number;
  cols: number;
  kinds: CellKind[];
  start: number;
  /** transitions[s][a] lists the outcomes of action a in state s; empty for walls and terminal cells. */
  transitions: Outcome[][][];
}

export const cellId = (g: Pick<Grid, 'cols'>, r: number, c: number) => r * g.cols + c;
export const rowCol = (g: Pick<Grid, 'cols'>, s: number): [number, number] => [Math.floor(s / g.cols), s % g.cols];
export const isTerminal = (g: Grid, s: number) => g.kinds[s] === 'goal' || g.kinds[s] === 'pit';
/** Cells that are real states an agent can stand in and act from. */
export const isActive = (g: Grid, s: number) => g.kinds[s] !== 'wall' && !isTerminal(g, s);

/** The cell a move in direction `a` lands on: off the grid or into a wall means you stay where you are. */
export function moveTo(g: Pick<Grid, 'rows' | 'cols' | 'kinds'>, s: number, a: Action): number {
  const [r, c] = rowCol(g, s);
  const [dr, dc] = DELTA[a];
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nc < 0 || nr >= g.rows || nc >= g.cols) return s;
  const n = cellId(g, nr, nc);
  return g.kinds[n] === 'wall' ? s : n;
}

/** The two directions at right angles to `a`: where a slip can send you. */
export function sideways(a: Action): [Action, Action] {
  return a === 'up' || a === 'down' ? ['left', 'right'] : ['up', 'down'];
}

/** Outcomes of action `a` from cell `s`, with identical landing cells merged and sorted by cell id. */
export function outcomes(g: Omit<Grid, 'transitions'>, s: number, a: Action): Outcome[] {
  if (g.kinds[s] === 'wall' || g.kinds[s] === 'goal' || g.kinds[s] === 'pit') return [];
  const { slip } = g.spec;
  const dirs: [Action, number][] = [[a, 1 - slip]];
  if (slip > 0) for (const side of sideways(a)) dirs.push([side, slip / 2]);
  const byCell = new Map<number, Outcome>();
  for (const [d, p] of dirs) {
    if (p <= 0) continue;
    let next = moveTo(g, s, d);
    let reward = g.spec.stepReward;
    if (g.kinds[next] === 'goal') reward += g.spec.goalReward;
    if (g.kinds[next] === 'pit') reward += g.spec.pitReward;
    if (g.kinds[next] === 'cliff') {
      reward += g.spec.cliffReward ?? 0;
      next = g.start;
    }
    const done = g.kinds[next] === 'goal' || g.kinds[next] === 'pit';
    const prev = byCell.get(next);
    if (prev) prev.p += p;
    else byCell.set(next, { p, next, reward, done });
  }
  return [...byCell.values()].sort((x, y) => x.next - y.next);
}

export function makeGrid(spec: GridSpec): Grid {
  const rows = spec.layout.length;
  const cols = spec.layout[0]!.length;
  const kinds: CellKind[] = [];
  for (const line of spec.layout) {
    if (line.length !== cols) throw new Error('every layout row must have the same length');
    for (const ch of line) {
      const k = KIND[ch];
      if (!k) throw new Error(`unknown layout character ${ch}`);
      kinds.push(k);
    }
  }
  const start = kinds.indexOf('start');
  if (start < 0) throw new Error('layout needs a start cell S');
  const base = { spec, rows, cols, kinds, start };
  const transitions = kinds.map((_, s) => ACTIONS.map((a) => outcomes(base, s, a)));
  return { ...base, transitions };
}

/** Draws one outcome with a uniform random number u in [0, 1). */
export function sampleOutcome(list: Outcome[], u: number): Outcome {
  let cum = 0;
  for (const o of list) {
    cum += o.p;
    if (u < cum) return o;
  }
  return list[list.length - 1]!;
}

/** Cell name used in captions and tables: (row, column), counted from 0 like the Python code; row 0 is the top. */
export const cellName = (g: Pick<Grid, 'cols'>, s: number) => {
  const [r, c] = rowCol(g, s);
  return `(${r},${c})`;
};

// ---------- the layouts the lessons use ----------

/** The classic 4×3 world: a wall in the middle, a +1 goal top right and a −1 pit under it. */
export const CLASSIC = ['...G', '.#.P', 'S...'];

/** Sutton and Barto's cliff walk (Example 6.6): 4×12, the bottom row between start and goal is a cliff. */
export const CLIFF = ['............', '............', '............', 'SCCCCCCCCCCG'];

export const classicSpec = (over: Partial<GridSpec> = {}): GridSpec => ({
  layout: CLASSIC,
  stepReward: -0.04,
  goalReward: 1,
  pitReward: -1,
  slip: 0.2,
  ...over,
});

export const cliffSpec = (over: Partial<GridSpec> = {}): GridSpec => ({
  layout: CLIFF,
  stepReward: -1,
  goalReward: 0,
  pitReward: 0,
  cliffReward: -99, // −1 for the step plus −99 = −100, as in the book
  slip: 0,
  ...over,
});
