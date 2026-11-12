import { useMemo, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import type { RecordedVariant, VariantState } from '@/lib/pycourse/recorded';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes, DEFAULT_MARGIN, Grid } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './RecordedHist.module.css';

const HEIGHT = 260;
const MARKER_ROW = 14;
const short = (v: number) => formatNumber(Number(v.toFixed(2)));

interface RecordedHistProps {
  title: string;
  yLabel?: string;
}

/**
 * A histogram whose counts and edges were computed by np.histogram in a recorded fixture, with labeled
 * vertical markers such as the mean and median. Markers are told apart by dash pattern and label, not color.
 */
export function RecordedHist({ title, yLabel = 'Count' }: RecordedHistProps) {
  const { result } = useExperimentContext<VariantState, RecordedVariant>('RecordedHist');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const hist = result.hist;
  const m = { ...DEFAULT_MARGIN, top: DEFAULT_MARGIN.top + MARKER_ROW * (hist?.markers.length ?? 0) };
  const scales = useMemo(() => {
    if (!hist) return null;
    const lo = Math.min(hist.edges[0]!, ...hist.markers.map((k) => k.value));
    const hi = Math.max(hist.edges.at(-1)!, ...hist.markers.map((k) => k.value));
    return {
      x: scaleLinear()
        .domain([lo, hi])
        .range([m.left, width - m.right]),
      y: scaleLinear()
        .domain([0, Math.max(...hist.counts, 1)])
        .range([HEIGHT - m.bottom, m.top])
        .nice(),
    };
  }, [hist, width, m.left, m.right, m.top, m.bottom]);
  if (!hist || !scales) return null;
  const { x, y } = scales;
  const markerText = hist.markers.map((k) => `${k.label} ${short(k.value)}`).join(', ');

  return (
    <VizFrame
      title={title}
      badge={<span className={s.badge}>Recorded in NumPy</span>}
      caption={`${result.label}: ${hist.counts.reduce((a, b) => a + b, 0)} values in ${hist.counts.length} bins from ${short(hist.edges[0]!)} to ${short(hist.edges.at(-1)!)}. ${markerText}.`}
      table={
        <VizTable
          caption={title}
          columns={['Bin', 'From', 'To', 'Count']}
          rows={[
            ...hist.counts.map((c, i) => [
              i,
              formatNumber(hist.edges[i]!),
              formatNumber(hist.edges[i + 1]!),
              c,
            ]),
            ...hist.markers.map((k) => [k.label, formatNumber(k.value), '', '']),
          ]}
        />
      }
    >
      <div ref={ref} className={s.chart} data-variant={result.id}>
        <svg width={width} height={HEIGHT} role="img" aria-label={`${title}. ${markerText}`}>
          <Grid x={x} y={y} />
          <g>
            {hist.counts.map((c, i) => (
              <rect
                key={i}
                className={hist.tailFrom !== undefined && hist.edges[i]! >= hist.tailFrom ? s.tail : s.bar}
                data-count={c}
                x={x(hist.edges[i]!)}
                width={Math.max(0, x(hist.edges[i + 1]!) - x(hist.edges[i]!))}
                y={y(c)}
                height={Math.max(0, y(0) - y(c))}
              />
            ))}
          </g>
          <Axes x={x} y={y} xLabel={hist.xLabel} yLabel={yLabel} format={formatNumber} />
          {hist.markers.map((k, i) => (
            <g key={k.label} data-marker={k.label}>
              <line
                className={s.marker}
                strokeDasharray={i === 0 ? undefined : i === 1 ? '6 3' : '2 3'}
                x1={x(k.value)}
                x2={x(k.value)}
                y1={DEFAULT_MARGIN.top + MARKER_ROW * i + 4}
                y2={HEIGHT - m.bottom}
              />
              <text
                className={svg.label}
                x={x(k.value)}
                y={DEFAULT_MARGIN.top + MARKER_ROW * i}
                textAnchor={x(k.value) > width * 0.7 ? 'end' : 'start'}
                dx={x(k.value) > width * 0.7 ? -4 : 4}
              >
                {k.label} {short(k.value)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </VizFrame>
  );
}
