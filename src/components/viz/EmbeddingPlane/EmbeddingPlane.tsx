import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleLinear } from 'd3-scale';
import {
  describeCosine,
  moveToken,
  placeLabels,
  RANGE,
  STEP,
  type EmbeddingResult,
  type EmbeddingState,
} from '@/lib/deep/embeddings';
import { formatNumber } from '@/lib/trace/values';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Arrow } from '../svg/Arrow';
import { Axes, Grid } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './EmbeddingPlane.module.css';

const MAX_SIZE = 420;
const PAD = 28;
const NEAREST = 3;
/** Width of one character of the 12 px mono label font, for label placement. */
const CHAR_W = 7.3;
const LABEL_GAP = 8;
const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, STEP],
  ArrowDown: [0, -STEP],
};

/**
 * The toy embedding table drawn as points on a plane. Selecting a point makes it the query (a);
 * dragging it, or pressing arrow keys while it has focus, changes its row of E. The panel shows
 * cos(a, b) with its arithmetic and the nearest tokens to a. Use inside an embeddingExperiment.
 */
export function EmbeddingPlane() {
  const { state, result, update } = useExperimentContext<EmbeddingState, EmbeddingResult>('EmbeddingPlane');
  const ref = useRef<HTMLDivElement>(null);
  const size = Math.min(useElementWidth(ref, MAX_SIZE), MAX_SIZE);
  const x = scaleLinear()
    .domain([-RANGE, RANGE])
    .range([PAD, size - PAD]);
  const y = scaleLinear()
    .domain([-RANGE, RANGE])
    .range([size - PAD, PAD]);
  const { tokens, E, a, b } = state;
  const near = result.neighbours.slice(0, NEAREST);
  const c = describeCosine(E[a]!, E[b]!);
  const at = (p: readonly number[]): [number, number] => [x(p[0]!), y(p[1]!)];
  const markOf = (i: number) => {
    const rank = near.findIndex((n) => n.id === i);
    return i === a ? ' (a)' : i === b ? ' (b)' : rank >= 0 ? ` #${rank + 1}` : '';
  };
  const names = tokens.map((t, i) => `${t}${markOf(i)}`);
  // Place the query's label first so it wins the best corner.
  const order = [a, ...E.map((_, i) => i).filter((i) => i !== a)];
  const placed = placeLabels(
    order.map((i) => at(E[i]!)),
    order.map((i) => names[i]!.length * CHAR_W),
  );
  const sideOf = (i: number) => placed[order.indexOf(i)]!;

  const drag = (id: number) => (e: PointerEvent<SVGGElement>) => {
    if (e.type === 'pointermove' && e.buttons !== 1) return;
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    update((st) => moveToken(st, id, x.invert(e.clientX - box.left), y.invert(e.clientY - box.top)));
  };
  const keys = (id: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      return update((st) => ({ ...st, a: id }));
    }
    const d = KEYS[e.key];
    if (!d) return;
    e.preventDefault();
    update((st) => moveToken(st, id, st.E[id]![0] + d[0], st.E[id]![1] + d[1]));
  };

  return (
    <VizFrame
      title="Embedding map"
      table={
        <VizTable
          caption="Every token's vector and its cosine similarity to the query"
          columns={['ID', 'Token', 'x', 'y', `cos with ${tokens[a]}`]}
          rows={E.map((v, i) => [
            i,
            tokens[i]!,
            formatNumber(v[0]),
            formatNumber(v[1]),
            i === a ? '1 (itself)' : formatNumber(result.neighbours.find((n) => n.id === i)!.cos),
          ])}
        />
      }
      caption={`Hand-made 2-D vectors, not learned ones. Query a = ${tokens[a]}; nearest by cosine: ${near.map((n) => `${tokens[n.id]} (${formatNumber(n.cos)})`).join(', ')}.`}
    >
      <div className={s.layout}>
        <div ref={ref} className={s.wrap}>
          <svg
            width={size}
            height={size}
            role="group"
            aria-label="Token vectors. Select a token to make it the query; drag it, or focus it and use the arrow keys, to move it."
          >
            <Grid x={x} y={y} ticks={RANGE * 2} />
            <Axes x={x} y={y} ticks={RANGE} centered />
            <Arrow from={at([0, 0])} to={at(E[b]!)} tone="ink" dashed />
            <Arrow from={at([0, 0])} to={at(E[a]!)} tone="accent" />
            {E.map((v, i) => {
              const rank = near.findIndex((n) => n.id === i);
              const name = names[i]!;
              const side = sideOf(i);
              const [px, py] = at(v);
              return (
                <g
                  key={i}
                  className={cx(
                    s.point,
                    i === a && s.query,
                    i === b && i !== a && s.compare,
                    rank >= 0 && s.near,
                  )}
                  role="button"
                  tabIndex={0}
                  aria-pressed={i === a}
                  aria-label={`${name}, ID ${i}, at (${v.map(formatNumber).join(', ')})`}
                  data-token={tokens[i]}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    update((st) => ({ ...st, a: i }));
                  }}
                  onPointerMove={drag(i)}
                  onKeyDown={keys(i)}
                >
                  <circle cx={at(v)[0]} cy={at(v)[1]} r={14} className={s.hit} />
                  <circle cx={at(v)[0]} cy={at(v)[1]} r={5} className={s.dot} />
                  <text
                    className={s.name}
                    x={side.endsWith('e') ? px + LABEL_GAP : px - LABEL_GAP}
                    y={side.startsWith('n') ? py - LABEL_GAP : py + LABEL_GAP + 10}
                    textAnchor={side.endsWith('e') ? 'start' : 'end'}
                    aria-hidden="true"
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className={s.panel}>
          <p className={s.math} aria-live="polite" data-cos={`${a},${b}`}>
            <span className={s.label}>
              cos({tokens[a]}, {tokens[b]})
            </span>
            <span>a · b = {c.dot}</span>
            <span>‖a‖ = {c.normA}</span>
            <span>‖b‖ = {c.normB}</span>
            <span className={s.total}>cos = {c.cos}</span>
          </p>
          <div>
            <p className={s.label}>Nearest to {tokens[a]}</p>
            <ol className={s.list} data-neighbours>
              {near.map((n) => (
                <li key={n.id}>
                  {tokens[n.id]}: {formatNumber(n.cos)}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </VizFrame>
  );
}
