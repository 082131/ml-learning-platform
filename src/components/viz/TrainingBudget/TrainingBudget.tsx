import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { GPUS, type GpuEstimate, type GpuState } from '@/lib/practice/gpuTraining';
import { pyFixed } from '@/lib/practice/pyFormat';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './TrainingBudget.module.css';

const LABEL_W = 84;
const ROW_H = 34;
const PAD = { right: 20, top: 8, bottom: 36 };
const FALLBACK_WIDTH = 640;

interface Segment {
  label: string;
  value: number;
  tone: string;
  opacity: number;
}

/**
 * The GPU-training lesson's visual: an estimated memory budget (stacked against the GPU's capacity)
 * and one training step as two lanes, compute and data loading, overlapped or one after the other.
 * Use inside an Experiment made with gpuExperiment.
 */
export function TrainingBudget() {
  const { state, result: e } = useExperimentContext<GpuState, GpuEstimate>('TrainingBudget');
  const capacityGb = GPUS[state.gpu].memoryGb;
  const memory: Segment[] = [
    { label: 'states', value: e.states / 1e9, tone: svg.ink!, opacity: 0.8 },
    { label: 'activations', value: e.activations / 1e9, tone: svg.accent!, opacity: 0.75 },
    { label: 'logits', value: e.logits / 1e9, tone: svg.muted!, opacity: 0.6 },
  ];
  const loadStart = 0;
  const computeStart = state.overlap ? 0 : e.loading;
  return (
    <div className={s.layout}>
      <Lanes
        title="Memory estimate (GB)"
        unit="GB"
        max={Math.max(capacityGb, e.total / 1e9)}
        rows={[{ label: 'needed', segments: memory.map((m) => ({ ...m, start: undefined })) }]}
        marker={{ at: capacityGb, label: `${state.gpu}: ${capacityGb} GB` }}
        legend={memory.map((m) => ({
          label: `${m.label} ${pyFixed(m.value, 2)} GB`,
          tone: m.tone,
          opacity: m.opacity,
        }))}
        tableColumns={['part', 'GB']}
        tableRows={[
          ...memory.map((m) => [m.label, pyFixed(m.value, 2)]),
          ['total', pyFixed(e.total / 1e9, 2)],
          ['GPU capacity', String(capacityGb)],
        ]}
        caption={
          e.fits
            ? `Fits: ${pyFixed(e.total / 1e9, 2)} of ${capacityGb} GB. States are 16 bytes per parameter; activations grow with the batch.`
            : `Does not fit: ${pyFixed(e.total / 1e9, 2)} GB needed, ${capacityGb} GB available. Try a smaller batch, activation checkpointing or mixed precision.`
        }
      />
      <Lanes
        title="One training step (seconds)"
        unit="s"
        max={e.step}
        rows={[
          {
            label: 'GPU',
            segments: [
              { label: 'compute', value: e.compute, start: computeStart, tone: svg.accent!, opacity: 0.75 },
            ],
          },
          {
            label: 'loader',
            segments: [
              { label: 'loading', value: e.loading, start: loadStart, tone: svg.muted!, opacity: 0.6 },
            ],
          },
        ]}
        tableColumns={['lane', 'start (s)', 'duration (s)']}
        tableRows={[
          ['GPU compute', pyFixed(computeStart, 3), pyFixed(e.compute, 3)],
          ['data loading', pyFixed(loadStart, 3), pyFixed(e.loading, 3)],
          ['step', '0.000', pyFixed(e.step, 3)],
        ]}
        caption={
          e.loading > e.compute
            ? `Data loading is the bottleneck: the GPU is busy ${pyFixed((100 * e.compute) / e.step, 0)}% of the step. Add loader workers or preprocess offline.`
            : state.overlap
              ? 'Loading the next batch runs while the GPU computes, so the step takes as long as the slower lane.'
              : 'Without overlap the GPU waits for each batch to load before computing.'
        }
      />
    </div>
  );
}

interface Row {
  label: string;
  segments: (Segment & { start: number | undefined })[];
}

function Lanes({
  title,
  unit,
  max,
  rows,
  marker,
  legend,
  tableColumns,
  tableRows,
  caption,
}: {
  title: string;
  unit: string;
  max: number;
  rows: Row[];
  marker?: { at: number; label: string };
  legend?: { label: string; tone: string; opacity: number }[];
  tableColumns: string[];
  tableRows: string[][];
  caption: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const x = scaleLinear()
    .domain([0, max * 1.05])
    .range([LABEL_W, width - PAD.right])
    .nice();
  const top = PAD.top + (marker ? 16 : 0);
  const height = top + rows.length * ROW_H + PAD.bottom;
  const bottom = height - PAD.bottom;
  return (
    <VizFrame
      title={title}
      caption={caption}
      table={<VizTable caption={title} columns={tableColumns} rows={tableRows} />}
    >
      <div ref={ref} className={s.chart}>
        <svg width={width} height={height} role="img" aria-label={`${title}: ${caption}`}>
          {x.ticks(5).map((t) => (
            <g key={t}>
              <line className={svg.grid} x1={x(t)} x2={x(t)} y1={top} y2={bottom} />
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
          {rows.map((row, i) => {
            const y = top + i * ROW_H;
            let cursor = 0;
            return (
              <g key={row.label} data-lane={row.label}>
                <text className={svg.label} x={0} y={y + ROW_H / 2} dy="0.32em">
                  {row.label}
                </text>
                {row.segments.map((seg) => {
                  const start = seg.start ?? cursor;
                  cursor = start + seg.value;
                  const x0 = x(start);
                  const w = Math.max(0, x(start + seg.value) - x0);
                  return (
                    <g key={seg.label} className={seg.tone} data-segment={seg.label}>
                      <rect
                        x={x0}
                        y={y + 6}
                        width={w}
                        height={ROW_H - 12}
                        fillOpacity={seg.opacity}
                        style={{ stroke: 'none' }}
                      />
                      {w > seg.label.length * 7.5 + 8 && (
                        <text className={s.inBar} x={x0 + 4} y={y + ROW_H / 2} dy="0.32em">
                          {seg.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {marker && (
            <g className={svg.err}>
              <line
                x1={x(marker.at)}
                x2={x(marker.at)}
                y1={PAD.top + 12}
                y2={bottom}
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
              <text
                className={s.marker}
                x={x(marker.at)}
                y={PAD.top + 6}
                textAnchor={x(marker.at) > width - 140 ? 'end' : 'middle'}
                style={{ stroke: 'none' }}
              >
                {marker.label}
              </text>
            </g>
          )}
        </svg>
        {legend && (
          <ul className={s.legend}>
            {legend.map((l) => (
              <li key={l.label}>
                <svg width="12" height="12" aria-hidden="true" className={l.tone}>
                  <rect width="12" height="12" fillOpacity={l.opacity} style={{ stroke: 'none' }} />
                </svg>
                {l.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </VizFrame>
  );
}
