import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { verdict, type AblationResult, type AblationState } from '@/lib/practice/ablation';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './AblationTable.module.css';

const ROW_H = 30;
const LABEL_W = 96;
const PAD = { right: 24, top: 6, bottom: 34 };
const FALLBACK_WIDTH = 640;

interface Bar {
  label: string;
  value: number;
  spread?: number;
  note?: string;
  emphasis?: boolean;
}

/**
 * The ablation lesson's visual: validation MAE of the baseline and of each leave-one-out model (mean
 * ± one standard deviation over seeds), and the baseline's error by region. Use in an ablationExperiment.
 */
export function AblationTable() {
  const { state, result } = useExperimentContext<AblationState, AblationResult>('AblationTable');
  const base = result.rows[0]!;
  const ablations: Bar[] = result.rows.map((r, i) => ({
    label: r.name,
    value: r.mean,
    spread: r.spread,
    note: i === 0 ? 'baseline' : verdict(base, r),
    emphasis: i === 0,
  }));
  const worst = Math.max(...result.slices.map((x) => x.mae));
  const slices: Bar[] = result.slices.map((x) => ({
    label: x.region,
    value: x.mae,
    note: `${x.count} deliveries`,
    emphasis: x.mae === worst,
  }));
  return (
    <div className={s.layout}>
      <Bars
        title="Ablation: val MAE without each component"
        unit="val MAE, minutes (± 1 std)"
        bars={ablations}
        reference={base.mean}
        caption={`Each row removes one component from the baseline and retrains on ${state.seeds} seeded split${state.seeds > 1 ? 's' : ''}. "within noise" means the change is no bigger than the seed-to-seed standard deviation.`}
      />
      <Bars
        title="Baseline error by region (seed 0)"
        unit="val MAE, minutes"
        bars={slices}
        caption="Error analysis: the same validation errors, grouped by a column the model may or may not use. The highest bar is marked."
      />
    </div>
  );
}

function Bars({
  title,
  unit,
  bars,
  reference,
  caption,
}: {
  title: string;
  unit: string;
  bars: Bar[];
  reference?: number;
  caption: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const max = Math.max(...bars.map((b) => b.value + (b.spread ?? 0)), 1);
  const x = scaleLinear()
    .domain([0, max])
    .range([LABEL_W, width - PAD.right])
    .nice();
  const height = PAD.top + bars.length * ROW_H + PAD.bottom;
  const bottom = height - PAD.bottom;
  return (
    <VizFrame
      title={title}
      caption={caption}
      table={
        <VizTable
          caption={title}
          columns={['row', 'MAE', ...(bars.some((b) => b.spread !== undefined) ? ['± std'] : []), 'note']}
          rows={bars.map((b) => [
            b.label,
            b.value.toFixed(3),
            ...(b.spread !== undefined ? [b.spread.toFixed(3)] : []),
            b.note ?? '',
          ])}
        />
      }
    >
      <div ref={ref} className={s.chart}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}: ${bars.map((b) => `${b.label} ${b.value.toFixed(3)}`).join(', ')}`}
        >
          {x.ticks(5).map((t) => (
            <g key={t}>
              <line className={svg.grid} x1={x(t)} x2={x(t)} y1={PAD.top} y2={bottom} />
              <text className={svg.tick} x={x(t)} y={bottom + 14} textAnchor="middle">
                {formatNumber(t)}
              </text>
            </g>
          ))}
          <text
            className={svg.axisLabel}
            x={(LABEL_W + width - PAD.right) / 2}
            y={bottom + 30}
            textAnchor="middle"
          >
            {unit}
          </text>
          {bars.map((b, i) => {
            const y = PAD.top + i * ROW_H;
            return (
              <g key={b.label} className={b.emphasis ? svg.accent : svg.muted} data-bar={b.label}>
                <text className={svg.label} x={0} y={y + ROW_H / 2} dy="0.32em" style={{ stroke: 'none' }}>
                  {b.label}
                </text>
                <rect
                  x={LABEL_W}
                  y={y + 6}
                  width={Math.max(0, x(b.value) - LABEL_W)}
                  height={ROW_H - 12}
                  style={{ stroke: 'none' }}
                  fillOpacity={0.75}
                />
                {b.spread !== undefined && b.spread > 0 && (
                  <path
                    className={svg.ink}
                    strokeWidth={1.5}
                    d={`M${x(b.value - b.spread)},${y + ROW_H / 2}H${x(b.value + b.spread)}M${x(b.value - b.spread)},${y + 9}v${ROW_H - 18}M${x(b.value + b.spread)},${y + 9}v${ROW_H - 18}`}
                  />
                )}
              </g>
            );
          })}
          {reference !== undefined && (
            <line
              className={svg.ink}
              x1={x(reference)}
              x2={x(reference)}
              y1={PAD.top}
              y2={bottom}
              strokeDasharray="4 3"
            />
          )}
        </svg>
      </div>
    </VizFrame>
  );
}
