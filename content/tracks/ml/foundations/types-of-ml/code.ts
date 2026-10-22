// Code for "Supervised, unsupervised and reinforcement learning". The runner's expected output was
// produced by running it with CPython 3.13 and with Pyodide 314.0.7 (Python 3.14.2); both print the same.
// The k-means clustering is checked against the same algorithm written in NumPy (learningTypes.test.ts).
import type { FlowEdge, FlowNode } from '@/lib/viz/flow';
import { typesExperiment } from '@/lib/foundations/learningTypes';
import type { CodeExample } from '@/lib/types';

/** One state: the scatter plot, the readout and both learning setups read it. */
export const experiment = typesExperiment('learning-types', {
  setup: 'supervised',
  bill: { x: 45, y: 14.5 },
  k: 3,
});

/** Supervised learning in plain Python: average bill per species, then the closest average wins. */
export const nearestAverage: CodeExample = {
  id: 'nearest-average',
  language: 'python',
  run: 'pyodide',
  source: `# Six labeled penguins from the dataset: (bill length mm, bill depth mm, species)
labeled = [
    (39.1, 18.7, "Adelie"),
    (39.5, 17.4, "Adelie"),
    (46.5, 17.9, "Chinstrap"),
    (50.0, 19.5, "Chinstrap"),
    (46.1, 13.2, "Gentoo"),
    (50.0, 16.3, "Gentoo"),
]

# Training: the average bill of each species.
averages = {}
for species in ["Adelie", "Chinstrap", "Gentoo"]:
    rows = [(x, y) for x, y, s in labeled if s == species]
    avg_x = sum(x for x, y in rows) / len(rows)
    avg_y = sum(y for x, y in rows) / len(rows)
    averages[species] = (avg_x, avg_y)
    print(species, round(avg_x, 2), round(avg_y, 2))

# Inference: the species whose average is closest to a new penguin.
def predict(x, y):
    def distance(species):
        ax, ay = averages[species]
        return ((x - ax) ** 2 + (y - ay) ** 2) ** 0.5
    return min(averages, key=distance)

print(predict(45.0, 14.5))
print(predict(38.0, 18.0))`,
  annotations: [],
  expectedOutput: `Adelie 39.3 18.05
Chinstrap 48.25 18.7
Gentoo 48.05 14.75
Gentoo
Adelie`,
};

/** The reinforcement learning loop, for FlowDiagram. */
export const rlNodes: FlowNode[] = [
  { id: 'agent', label: 'Agent', detail: 'chooses an action', x: 0, y: 0, w: 160 },
  { id: 'env', label: 'Environment', detail: 'game, robot, market', x: 300, y: 110, w: 180 },
];
export const rlEdges: FlowEdge[] = [
  { from: 'agent', to: 'env', fromSide: 'right', toSide: 'top', label: 'action' },
  { from: 'env', to: 'agent', fromSide: 'left', toSide: 'bottom', label: 'new state + reward' },
];
