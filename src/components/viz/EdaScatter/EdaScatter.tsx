import { COLUMN_LABEL, handRows, round3, type EdaResult, type EdaState } from '@/lib/classical/eda';
import type { Species } from '@/lib/classical/penguins';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { ScatterPlot, type ScatterGroup } from '../ScatterPlot/ScatterPlot';
import { VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './EdaScatter.module.css';

export const SPECIES_GROUPS: ScatterGroup[] = [
  { id: 'Adelie', label: 'Adelie', tone: 'accent', shape: 'circle' },
  { id: 'Chinstrap', label: 'Chinstrap', tone: 'ok', shape: 'square' },
  { id: 'Gentoo', label: 'Gentoo', tone: 'ink', shape: 'triangle' },
];
const TONE: Record<Species | 'all', string> = {
  Adelie: svg.accent!,
  Chinstrap: svg.ok!,
  Gentoo: svg.ink!,
  all: svg.muted!,
};

/**
 * The penguins on two chosen columns, species by marker shape, with a least-squares line overall
 * (dashed) and per species (solid), and Pearson's r for each (use inside an edaExperiment).
 */
export function EdaScatter() {
  const { state, result } = useExperimentContext<EdaState, EdaResult>('EdaScatter');
  const ringed = handRows().map((p) => p.row);
  const all = result.groups[0]!;
  return (
    <div className={s.layout} data-eda-scatter={`${state.x}/${state.y}`}>
      <ScatterPlot
        title="Penguins by species"
        xLabel={state.x}
        yLabel={state.y}
        groups={SPECIES_GROUPS}
        points={result.points.map((p) => ({ x: p.x, y: p.y, group: p.species, id: p.row }))}
        selected={ringed}
        height={340}
        overlay={(x, y) =>
          result.groups.map((g) => (
            <line
              key={g.group}
              className={`${TONE[g.group]} ${g.group === 'all' ? svg.dashed : ''}`}
              strokeWidth={g.group === 'all' ? 2.5 : 2}
              x1={x(g.fit.from)}
              x2={x(g.fit.to)}
              y1={y(g.fit.intercept + g.fit.slope * g.fit.from)}
              y2={y(g.fit.intercept + g.fit.slope * g.fit.to)}
              data-fit={g.group}
            />
          ))
        }
        caption={`${COLUMN_LABEL[state.y]} against ${COLUMN_LABEL[state.x].toLowerCase()} for ${all.n} penguins. Overall r = ${round3(all.r)} (dashed line); ${result.groups
          .slice(1)
          .map((g) => `${g.group} r = ${round3(g.r)}`)
          .join(', ')} (solid lines). Ringed: the 6 Chinstrap penguins of the hand computation.`}
      />
      <VizTable
        caption="Pearson's r overall and per species"
        columns={['group', 'n', 'r', 'slope']}
        rows={result.groups.map((g) => [
          g.group,
          g.n,
          round3(g.r),
          String(Number(g.fit.slope.toPrecision(3))),
        ])}
      />
    </div>
  );
}
