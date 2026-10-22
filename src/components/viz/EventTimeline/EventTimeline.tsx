import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { EVENTS, eventStatuses, type StreamRun } from '@/lib/data/stream';
import type { StreamState } from '@/lib/data/streamExperiment';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './EventTimeline.module.css';

const HEIGHT = 360;
const EVENT_SPAN = 30;
const R = 5;
const show = (v: number | null) => (v === null ? 'not yet' : String(v));

/**
 * Event time (x) against processing time (y): each event, the watermark, when each window's result
 * was emitted, and when the batch job runs. Use inside an Experiment made with streamExperiment.
 */
export function EventTimeline() {
  const { state, result } = useExperimentContext<StreamState, StreamRun>('EventTimeline');
  const ref = useRef<HTMLDivElement>(null);
  const width = Math.max(useElementWidth(ref, 640), 320);
  const m = DEFAULT_MARGIN;
  const x = scaleLinear()
    .domain([0, EVENT_SPAN])
    .range([m.left, width - m.right]);
  const yMax = Math.max(EVENT_SPAN, state.batchAt) + 2;
  const y = scaleLinear()
    .domain([0, yMax])
    .range([HEIGHT - m.bottom, m.top]);
  const statuses = eventStatuses(result, EVENTS, state.window);
  const wm = result.watermark;
  // The watermark as a step line: it holds its value until the next event arrives.
  const wmPath = wm
    .map(
      ([t, w], i) =>
        `${i ? `L${x(Math.max(wm[i - 1]![1], 0))},${y(t)} ` : `M${x(Math.max(w, 0))},${y(t)} `}L${x(Math.max(w, 0))},${y(t)}`,
    )
    .join(' ');

  return (
    <VizFrame
      title="Event time vs processing time"
      table={
        <VizTable
          caption="Per window: stream and batch results"
          columns={[
            'Window',
            'Events',
            'Stream count',
            'Emitted at',
            'Stream latency',
            'Batch count',
            'Batch latency',
          ]}
          rows={result.windows.map((w) => [
            `[${w.start}, ${w.end})`,
            w.trueCount,
            show(w.streamCount),
            show(w.emittedAt),
            show(w.streamLatency),
            w.batchCount,
            w.batchLatency,
          ])}
        />
      }
      caption={
        <>
          Filled dots were counted, crosses arrived after their window was emitted and were dropped, hollow
          dots sit in windows the stream has not emitted yet. A bar across a window marks when its count was
          emitted. The watermark ends at {result.finalWatermark}.
        </>
      }
    >
      <div ref={ref} className={s.wrap}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Events plotted by event time and arrival time"
        >
          {result.windows.map((w, i) => (
            <g key={w.start} data-window={w.start}>
              <rect
                className={cx(s.band, i % 2 === 1 && s.alt)}
                x={x(w.start)}
                width={x(w.end) - x(w.start)}
                y={m.top}
                height={HEIGHT - m.bottom - m.top}
              />
              {w.emittedAt !== null && (
                <g>
                  <line
                    className={s.emit}
                    x1={x(w.start) + 2}
                    x2={x(w.end) - 2}
                    y1={y(w.emittedAt)}
                    y2={y(w.emittedAt)}
                  />
                  <text
                    className={svg.label}
                    x={(x(w.start) + x(w.end)) / 2}
                    y={y(w.emittedAt) - 6}
                    textAnchor="middle"
                  >
                    {w.streamCount}
                  </text>
                </g>
              )}
            </g>
          ))}
          <line
            className={cx(svg.muted, svg.dashed)}
            x1={x(0)}
            y1={y(0)}
            x2={x(EVENT_SPAN)}
            y2={y(EVENT_SPAN)}
          />
          <text className={svg.tick} x={x(EVENT_SPAN) - 4} y={y(EVENT_SPAN) + 14} textAnchor="end">
            no delay
          </text>
          <path className={cx(s.watermark)} d={wmPath} />
          <line
            className={cx(s.batch, svg.dashed)}
            x1={x(0)}
            x2={x(EVENT_SPAN)}
            y1={y(state.batchAt)}
            y2={y(state.batchAt)}
          />
          <text className={svg.tick} x={x(0) + 4} y={y(state.batchAt) - 6}>
            batch job runs ({state.batchAt})
          </text>
          {EVENTS.map((e, i) => {
            const cx_ = x(e.eventTime);
            const cy = y(e.arrival);
            const st = statuses[i]!;
            return (
              <g key={e.id} className={s[st]} data-event={e.id} data-status={st}>
                {st === 'dropped' ? (
                  <path
                    d={`M${cx_ - R},${cy - R}L${cx_ + R},${cy + R}M${cx_ - R},${cy + R}L${cx_ + R},${cy - R}`}
                  />
                ) : (
                  <circle cx={cx_} cy={cy} r={R} />
                )}
              </g>
            );
          })}
          <Axes x={x} y={y} xLabel="event time (minutes after 12:00)" yLabel="processing time" ticks={6} />
        </svg>
      </div>
      <p className={s.legend}>
        <span className={s.key}>
          <span className={cx(s.swatch, s.wmSwatch)} /> watermark (max event time − {state.lateness})
        </span>
        <span className={s.key}>
          <span className={cx(s.swatch, s.emitSwatch)} /> window emitted
        </span>
        <span className={s.key}>✗ dropped as late: {result.dropped.length}</span>
      </p>
    </VizFrame>
  );
}
