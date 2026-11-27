// The classic 4×3 grid world in Python, shared by the runnable examples of several RL lessons. It follows the same
// rules as src/lib/rl/grid.ts: slip sideways with probability slip/2 each way, bump into walls and edges to stay put,
// a step reward on every move plus +1 for the goal and −1 for the pit.
export const GRID_PY = `ROWS, COLS = 3, 4
WALLS, GOAL, PIT = {(1, 1)}, (0, 3), (1, 3)
MOVES = {"up": (-1, 0), "right": (0, 1), "down": (1, 0), "left": (0, -1)}
SIDEWAYS = {"up": ("left", "right"), "down": ("left", "right"), "left": ("up", "down"), "right": ("up", "down")}
STATES = [(r, c) for r in range(ROWS) for c in range(COLS) if (r, c) not in WALLS | {GOAL, PIT}]

def move(s, d):
    r, c = s[0] + MOVES[d][0], s[1] + MOVES[d][1]
    return s if not (0 <= r < ROWS and 0 <= c < COLS) or (r, c) in WALLS else (r, c)

def outcomes(s, a, slip=0.2, step=-0.04):
    """List of (probability, next_state, reward, done) for action a in state s."""
    out = []
    for d, p in [(a, 1 - slip), (SIDEWAYS[a][0], slip / 2), (SIDEWAYS[a][1], slip / 2)]:
        n = move(s, d)
        out.append((p, n, step + (1 if n == GOAL else -1 if n == PIT else 0), n in (GOAL, PIT)))
    return out
`;
