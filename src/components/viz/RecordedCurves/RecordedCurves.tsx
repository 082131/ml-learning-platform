import type { RecordedVariant, VariantState } from '@/lib/pycourse/recorded';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart, type Series } from '../LineChart/LineChart';
import s from './RecordedCurves.module.css';

interface RecordedCurvesProps {
  title: string;
  /** Fixed y range, so curves of different variants can be compared by eye. */
  yDomain?: [number, number];
  source?: string;
}

/**
 * Lines recorded by a fixture (for example train and validation loss per epoch) for the selected variant.
 * The first series is solid and the others dashed, so they are told apart without color.
 */
export function RecordedCurves({ title, yDomain, source = 'Recorded in PyTorch 2.14' }: RecordedCurvesProps) {
  const { result } = useExperimentContext<VariantState, RecordedVariant>('RecordedCurves');
  const curves = result.curves;
  if (!curves) return null;
  const series: Series[] = curves.series.map((sr, i) => ({
    id: sr.id,
    label: sr.label,
    points: sr.points.map(([x, y]) => [x ?? Number.NaN, y ?? Number.NaN] as const),
    tone: i === 0 ? 'accent' : 'ink',
    dashed: i > 0,
  }));
  const ends = curves.series
    .map((sr) => {
      const last = sr.points.at(-1);
      const y = last?.[1];
      return `${sr.label} ${y === null || y === undefined ? 'not finite' : formatNumber(y)}`;
    })
    .join(', ');
  return (
    <LineChart
      title={title}
      series={series}
      xLabel={curves.xLabel}
      yLabel={curves.yLabel}
      yDomain={yDomain}
      badge={<span className={s.badge}>{source}</span>}
      caption={`${result.label}. At the last ${curves.xLabel.toLowerCase()}: ${ends}.`}
    />
  );
}
