import { SPECIES } from '@/lib/classical/penguins';
import { giniArithmetic, penguins } from '@/lib/classical/splitSearchTrace';
import { TOY, TREE_FEATURES, type SplitResult, type SplitState } from '@/lib/classical/treesExperiments';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { ScatterPlot } from '../ScatterPlot/ScatterPlot';
import { SPECIES_GROUPS } from './speciesGroups';
import svg from '../svg/svg.module.css';
import s from './GiniSplit.module.css';

/**
 * The split search on the toy penguins (use inside an Experiment made with splitExperiment): the
 * points with the tried threshold, the weighted Gini of every candidate, and the tried split's arithmetic.
 */
export function GiniSplit() {
  const { state, result } = useExperimentContext<SplitState, SplitResult>('GiniSplit');
  const other = TREE_FEATURES.find((f) => f !== state.feature)!;
  const c = result.current;
  const best = result.scores[result.best]!;
  const n = TOY.length;
  const nl = c.left.reduce((a, b) => a + b, 0);
  const isBest = c.threshold === best.threshold;
  const points = TOY.map((p) => ({ x: p[state.feature]!, y: p[other]!, group: p.species, id: p.row }));

  return (
    <div className={s.layout} data-split-threshold={formatNumber(c.threshold)}>
      <ScatterPlot
        title="The 14 penguins and the tried split"
        points={points}
        groups={SPECIES_GROUPS}
        xLabel={state.feature}
        yLabel={other}
        height={260}
        underlay={(x, y) => (
          <rect
            className={s.leftSide}
            x={x.range()[0]}
            y={y.range()[1]}
            width={Math.max(0, x(c.threshold) - x.range()[0]!)}
            height={y.range()[0]! - y.range()[1]!}
          />
        )}
        overlay={(x, y) => (
          <g className={svg.ink} aria-hidden="true">
            <line
              className={svg.dashed}
              x1={x(c.threshold)}
              x2={x(c.threshold)}
              y1={y.range()[0]}
              y2={y.range()[1]}
              strokeWidth={2}
            />
          </g>
        )}
        caption={`Shaded: ${state.feature} ≤ ${formatNumber(c.threshold)} (${penguins(nl)} go${nl === 1 ? 'es' : ''} left). The rest go right.`}
      />
      <LineChart
        title={`Weighted Gini of every threshold on ${state.feature}`}
        xLabel={state.feature}
        yLabel="weighted Gini"
        height={260}
        series={[
          {
            id: 'gini',
            label: 'weighted Gini',
            points: result.scores.map((sc) => [sc.threshold, sc.weighted] as const),
            dots: true,
          },
        ]}
        overlay={(x, y) => (
          <g aria-hidden="true">
            <g className={svg.ok}>
              <rect
                x={x(best.threshold) - 6}
                y={y(best.weighted) - 6}
                width={12}
                height={12}
                fill="none"
                strokeWidth={2}
              />
            </g>
            <g className={svg.ink}>
              <circle cx={x(c.threshold)} cy={y(c.weighted)} r={9} fill="none" strokeWidth={2} />
            </g>
          </g>
        )}
        caption={`Lowest (square): ${state.feature} ≤ ${formatNumber(best.threshold)} with ${formatNumber(best.weighted)}. Circled: the tried threshold, ${formatNumber(c.weighted)}.`}
      />
      <dl className={s.arithmetic} data-split-arithmetic>
        <div>
          <dt>
            Left: {state.feature} ≤ {formatNumber(c.threshold)}
          </dt>
          <dd>
            {penguins(nl)} {countsText(c.left)}. Gini = {giniArithmetic(c.left)}
          </dd>
        </div>
        <div>
          <dt>
            Right: {state.feature} &gt; {formatNumber(c.threshold)}
          </dt>
          <dd>
            {penguins(n - nl)} {countsText(c.right)}. Gini = {giniArithmetic(c.right)}
          </dd>
        </div>
        <div>
          <dt>Weighted Gini of the split</dt>
          <dd>
            {nl}/{n} · {formatNumber(c.giniLeft)} + {n - nl}/{n} · {formatNumber(c.giniRight)} ={' '}
            <strong>{formatNumber(c.weighted)}</strong>
            {isBest ? ' (the lowest on this feature)' : ` (the lowest is ${formatNumber(best.weighted)})`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const countsText = (counts: readonly number[]) =>
  `(${SPECIES.map((sp, i) => `${counts[i]} ${sp}`).join(', ')})`;
