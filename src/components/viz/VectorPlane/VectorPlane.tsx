import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleLinear } from 'd3-scale';
import { add, norm, scale as scaleVec, subtract } from '@/lib/math/vector';
import { clamp, snap } from '@/lib/math/numeric';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Arrow, type Tone } from '../svg/Arrow';
import { Axes, Grid } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './VectorPlane.module.css';

type Vec2 = [number, number];
type Derived = 'sum' | 'difference' | 'scaled';

interface VectorPlaneProps {
  title?: string;
  /** State keys holding [x, y] vectors the learner can drag, for example ["u", "v"]. */
  vectors: string[];
  /** Arrows computed from the first two vectors (sum, difference) or the first one (scaled). */
  show?: Derived[];
  /** State key of the scale factor k for "scaled". */
  scaleKey?: string;
  /** The plane spans −range to range on both axes. */
  range?: number;
}

const SNAP = 0.5;
const MAX_SIZE = 420;
const PAD = 28;
const TONES: Tone[] = ['accent', 'ink'];

/** A coordinate plane with draggable vectors (pointer or arrow keys). Use inside an Experiment. */
export function VectorPlane({
  title = 'Vectors on a plane',
  vectors,
  show = [],
  scaleKey,
  range = 5,
}: VectorPlaneProps) {
  const { state, update } = useExperimentContext<Record<string, unknown>, unknown>('VectorPlane');
  const ref = useRef<HTMLDivElement>(null);
  const size = Math.min(useElementWidth(ref, MAX_SIZE), MAX_SIZE);
  const x = scaleLinear()
    .domain([-range, range])
    .range([PAD, size - PAD]);
  const y = scaleLinear()
    .domain([-range, range])
    .range([size - PAD, PAD]);
  const vec = (key: string) => state[key] as Vec2;
  const [u, v] = [vec(vectors[0]!), vectors[1] ? vec(vectors[1]) : undefined];
  const k = scaleKey ? (state[scaleKey] as number) : 1;
  const origin: [number, number] = [x(0), y(0)];
  const at = (p: readonly number[]): [number, number] => [x(p[0]!), y(p[1]!)];
  const derived: { name: string; value: number[]; dashed: boolean }[] = [];
  if (v && show.includes('sum'))
    derived.push({ name: `${vectors[0]} + ${vectors[1]}`, value: add(u, v), dashed: true });
  if (v && show.includes('difference'))
    derived.push({ name: `${vectors[0]} − ${vectors[1]}`, value: subtract(u, v), dashed: true });
  if (show.includes('scaled'))
    derived.push({ name: `${formatNumber(k)}·${vectors[0]}`, value: scaleVec(u, k), dashed: true });

  const move = (key: string, to: Vec2) =>
    update((st) => ({
      ...st,
      [key]: [clamp(snap(to[0], SNAP), -range, range), clamp(snap(to[1], SNAP), -range, range)],
    }));
  const drag = (key: string) => (e: PointerEvent<SVGGElement>) => {
    if (e.buttons !== 1 && e.type === 'pointermove') return;
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    move(key, [x.invert(e.clientX - box.left), y.invert(e.clientY - box.top)]);
  };
  const keys = (key: string) => (e: KeyboardEvent) => {
    const d = { ArrowLeft: [-SNAP, 0], ArrowRight: [SNAP, 0], ArrowUp: [0, SNAP], ArrowDown: [0, -SNAP] }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    const p = vec(key);
    move(key, [p[0] + d[0]!, p[1] + d[1]!]);
  };

  const all = [...vectors.map((name) => ({ name, value: vec(name) as number[] })), ...derived];
  return (
    <VizFrame
      title={title}
      table={
        <VizTable
          caption={title}
          columns={['Vector', 'x', 'y', 'Length']}
          rows={all.map((a) => [
            a.name,
            formatNumber(a.value[0]!),
            formatNumber(a.value[1]!),
            formatNumber(norm(a.value)),
          ])}
        />
      }
      caption={all.map((a) => `${a.name} = (${a.value.map(formatNumber).join(', ')})`).join(' · ')}
    >
      <div ref={ref} className={s.wrap}>
        <svg
          width={size}
          height={size}
          role="group"
          aria-label={`${title}. Drag a vector's tip, or focus it and use the arrow keys.`}
        >
          <Grid x={x} y={y} ticks={range * 2} />
          <Axes x={x} y={y} ticks={range} centered />
          {derived.map((d) => (
            <Arrow
              key={d.name}
              from={origin}
              to={at(d.value)}
              tone="muted"
              dashed={d.dashed}
              label={d.name}
            />
          ))}
          {vectors.map((name, i) => {
            const p = vec(name);
            return (
              <g key={name}>
                <Arrow from={origin} to={at(p)} tone={TONES[i % TONES.length]} label={name} />
                <g
                  className={s.handle}
                  role="slider"
                  tabIndex={0}
                  aria-label={`Vector ${name}`}
                  aria-valuetext={`(${p.map(formatNumber).join(', ')})`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    drag(name)(e);
                  }}
                  onPointerMove={drag(name)}
                  onKeyDown={keys(name)}
                  data-vector={name}
                >
                  <circle cx={at(p)[0]} cy={at(p)[1]} r={14} className={s.hit} />
                  <circle cx={at(p)[0]} cy={at(p)[1]} r={5} className={s.dot} />
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </VizFrame>
  );
}
