import { useRef } from 'react';
import type { StreamResult, StreamState } from '@/lib/ai/sse';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Status } from './Status';
import s from './AiTrack.module.css';

const LABEL_W = 92;
const ROW = 34;
const sec = (x: number) => `${x.toFixed(1)} s`;

/** What the user sees over time with streaming and without, against the client timeout. */
export function StreamCompare() {
  const { state, result } = useExperimentContext<StreamState, StreamResult>('StreamCompare');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const end = Math.max(result.total, state.timeout) * 1.05;
  const x = (t: number) => LABEL_W + (t / end) * (width - LABEL_W - 8);
  const rows = [
    { id: 'streaming', label: 'Streaming', silent: state.ttft, ...result.streaming },
    { id: 'waiting', label: 'Waiting', silent: result.total, ...result.waiting },
  ];
  return (
    <VizFrame
      title="When the user first sees text"
      badge={<Badge tone="simulated">Timing model</Badge>}
      caption={`Generation takes ${sec(result.total)}. Streaming shows text at ${sec(state.ttft)}; waiting shows nothing until ${sec(result.total)}. The red line is the ${state.timeout} s timeout on silence.`}
      table={
        <VizTable
          caption="Streaming versus waiting"
          columns={['mode', 'silent until', 'first text', 'outcome']}
          rows={rows.map((r) => [r.label, sec(r.silent), r.ok ? sec(r.firstText) : '—', r.note])}
        />
      }
    >
      <div ref={ref}>
        <svg
          className={s.svg}
          viewBox={`0 0 ${width} ${ROW * 2 + 22}`}
          role="img"
          aria-label="Streaming timeline"
        >
          {rows.map((r, i) => {
            const y = i * ROW + 4;
            const cut = r.ok ? result.total : state.timeout;
            return (
              <g key={r.id} data-mode={r.id} data-ok={r.ok}>
                <text className={s.svgText} x={0} y={y + 16}>
                  {r.label}
                </text>
                <rect
                  className={s.boxSoft}
                  x={x(0)}
                  y={y}
                  width={x(Math.min(r.silent, cut)) - x(0)}
                  height={ROW - 12}
                />
                {r.ok && r.id === 'streaming' && (
                  <rect
                    className={s.boxAccent}
                    x={x(r.silent)}
                    y={y}
                    width={x(result.total) - x(r.silent)}
                    height={ROW - 12}
                  />
                )}
                {r.ok && r.id === 'waiting' && (
                  <rect className={s.boxAccent} x={x(result.total) - 3} y={y} width={6} height={ROW - 12} />
                )}
                {!r.ok && (
                  <text className={s.svgText} x={x(state.timeout) + 6} y={y + 16}>
                    timed out
                  </text>
                )}
              </g>
            );
          })}
          <line className={s.rule} x1={x(state.timeout)} x2={x(state.timeout)} y1={0} y2={ROW * 2} />
          <text className={s.svgMuted} x={LABEL_W} y={ROW * 2 + 18}>
            0 s
          </text>
          <text className={s.svgMuted} x={width - 8} y={ROW * 2 + 18} textAnchor="end">
            {sec(end)}
          </text>
        </svg>
      </div>
      <p className={s.muted}>Grey: connection open, nothing shown. Accent: text arriving on screen.</p>
    </VizFrame>
  );
}

/** The SSE bytes as they arrive in network pieces, and the events the parser completes after each piece. */
export function SseWire() {
  const { result } = useExperimentContext<StreamState, StreamResult>('SseWire');
  return (
    <VizFrame
      title="The stream on the wire"
      badge={<Badge tone="ok">Parsed in your browser</Badge>}
      caption={`The same bytes arrive in ${result.chunks.length} piece${result.chunks.length === 1 ? '' : 's'}, cut at random places. The parser keeps incomplete lines until the next piece, so the text is always “${result.text}”.`}
    >
      <ol className={s.list} aria-label="Network pieces" style={{ listStyle: 'none', paddingLeft: 0 }}>
        {result.chunks.map((c, i) => (
          <li key={i} className={s.piece} data-piece={i + 1}>
            <span className={s.pieceHead}>
              piece {i + 1} · {c.length} bytes · completes {result.eventsPerPiece[i]} event
              {result.eventsPerPiece[i] === 1 ? '' : 's'}
            </span>
            {c}
          </li>
        ))}
      </ol>
      <p>
        <Status tone="ok">{`parsed text: ${result.text}`}</Status>
      </p>
    </VizFrame>
  );
}
