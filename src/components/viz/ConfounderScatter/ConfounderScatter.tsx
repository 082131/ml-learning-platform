import type { ConfounderResult, ConfounderState } from '@/lib/statistics/confounder';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { ScatterPlot, type ScatterGroup } from '../ScatterPlot/ScatterPlot';

const ALL: ScatterGroup = { id: 'day', label: 'day', tone: 'ink', shape: 'circle' };
const SUMMER: ScatterGroup = { id: 'summer', label: 'summer day', tone: 'accent', shape: 'triangle' };
const WINTER: ScatterGroup = { id: 'winter', label: 'winter day', tone: 'muted', shape: 'circle' };

/**
 * Ice-cream sales against sunburn cases, optionally split by season (the confounder). Use inside an
 * Experiment made with confounderExperiment.
 */
export function ConfounderScatter() {
  const { state, result } = useExperimentContext<ConfounderState, ConfounderResult>('ConfounderScatter');
  const split = state.view === 'season';
  const points = result.days.map((d) => ({
    id: d.id,
    x: d.iceCream,
    y: d.sunburn,
    group: split ? (d.summer ? 'summer' : 'winter') : 'day',
  }));
  const caption = split
    ? `Across all days r = ${formatNumber(result.rAll)}; within summer r = ${formatNumber(result.rSummer)}, within winter r = ${formatNumber(result.rWinter)}.`
    : `Across all days r = ${formatNumber(result.rAll)}.`;
  return (
    <ScatterPlot
      title="Ice cream and sunburn"
      points={points}
      groups={split ? [SUMMER, WINTER] : [ALL]}
      xLabel="ice-cream sales per day"
      yLabel="sunburn cases per day"
      xDomain={[20, 120]}
      yDomain={[0, 22]}
      badge={`r = ${formatNumber(result.rAll)}`}
      caption={caption}
    />
  );
}
