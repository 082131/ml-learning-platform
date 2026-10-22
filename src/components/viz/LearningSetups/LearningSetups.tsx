import { SPECIES } from '@/lib/classical/penguins';
import { BILLS, BILL_LIMITS, type TypesResult, type TypesState } from '@/lib/foundations/learningTypes';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { Tone } from '../svg/Arrow';
import {
  ScatterPlot,
  type MarkerShape,
  type ScatterGroup,
  type ScatterPoint,
} from '../ScatterPlot/ScatterPlot';
import { VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';

const LOOKS: { tone: Tone; shape: MarkerShape }[] = [
  { tone: 'ink', shape: 'circle' },
  { tone: 'muted', shape: 'square' },
  { tone: 'ok', shape: 'triangle' },
  { tone: 'err', shape: 'diamond' },
];
const NEW: ScatterGroup = {
  id: 'new',
  label: 'New penguin (your sliders)',
  tone: 'accent',
  shape: 'diamond',
};
const CROSS = 6;

/**
 * The same penguin bills seen two ways: with species labels (supervised: predict the species of a
 * new penguin from each species' average) or without (unsupervised: k-means finds groups on its own).
 * Use inside an Experiment made with typesExperiment.
 */
export function LearningSetups() {
  const { state, result } = useExperimentContext<TypesState, TypesResult>('LearningSetups');
  const supervised = state.setup === 'supervised';
  const groups: ScatterGroup[] = supervised
    ? SPECIES.map((sp, i) => ({ id: sp, label: sp, ...LOOKS[i]! }))
    : Array.from({ length: state.k }, (_, j) => ({ id: `c${j}`, label: `Cluster ${j + 1}`, ...LOOKS[j]! }));
  const points: ScatterPoint[] = BILLS.map((p, i) => ({
    id: p.row,
    x: p.x,
    y: p.y,
    group: supervised ? p.species : `c${result.clusters.labels[i]}`,
  }));
  points.push({ id: 'new', x: state.bill.x, y: state.bill.y, group: 'new', hollow: true });
  const centers = supervised
    ? SPECIES.map((sp) => ({ label: `${sp} average`, ...result.centroids[sp] }))
    : result.clusters.centers.map((c, j) => ({ label: `center ${j + 1}`, ...c }));
  const answer = supervised
    ? `Predicted species: ${result.prediction}`
    : `It falls in cluster ${result.cluster + 1}. Without labels, the program can group penguins but cannot name a species.`;

  return (
    <ScatterPlot
      title={supervised ? 'Labeled penguins (supervised)' : `Unlabeled penguins, k-means with k = ${state.k}`}
      points={points}
      groups={[...groups, NEW]}
      selected={['new']}
      xLabel="bill length (mm)"
      yLabel="bill depth (mm)"
      xDomain={[BILL_LIMITS.x.min, BILL_LIMITS.x.max]}
      yDomain={[BILL_LIMITS.y.min, BILL_LIMITS.y.max]}
      overlay={(x, y) =>
        centers.map((c) => (
          <g key={c.label} className={svg.ink} data-center={c.label}>
            <path
              d={`M${x(c.x) - CROSS},${y(c.y)}h${2 * CROSS}M${x(c.x)},${y(c.y) - CROSS}v${2 * CROSS}`}
              strokeWidth={2.5}
            />
            <text
              className={svg.label}
              x={x(c.x) + CROSS + 2}
              y={y(c.y) - CROSS}
              style={{ stroke: 'var(--surface)', strokeWidth: 3, paintOrder: 'stroke' }}
            >
              {c.label}
            </text>
          </g>
        ))
      }
      table={
        <VizTable
          caption="Group summary"
          columns={['Group', 'Penguins', 'Center: bill length (mm)', 'Center: bill depth (mm)']}
          rows={centers.map((c, j) => [
            c.label,
            supervised ? BILLS.filter((p) => p.species === SPECIES[j]).length : result.summary[j]!.size,
            c.x.toFixed(1),
            c.y.toFixed(1),
          ])}
        />
      }
      caption={
        <span data-answer>
          {answer} The crosses mark {supervised ? 'each species’ average bill' : 'the cluster centers'}.
        </span>
      }
    />
  );
}
