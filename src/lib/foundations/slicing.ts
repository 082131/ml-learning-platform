import type { Control, ExperimentDef, ReadoutItem } from '../types';
import { repr } from './pyValues';

/** A slice bound as typed: a whole number, or null for "left blank". */
export type Bound = number | null;

/**
 * Python's slice.indices(length): fills in blank bounds and clips out-of-range ones, exactly as
 * CPython's PySlice_AdjustIndices does. Step 0 raises ValueError in Python, so it throws here too.
 */
export function sliceIndices(
  length: number,
  start: Bound,
  stop: Bound,
  step: Bound,
): [number, number, number] {
  const st = step ?? 1;
  if (st === 0) throw new Error('slice step cannot be zero');
  const clip = (v: Bound, fallback: number) => {
    if (v === null) return fallback;
    if (v < 0) {
      const w = v + length;
      return w < 0 ? (st < 0 ? -1 : 0) : w;
    }
    return v >= length ? (st < 0 ? length - 1 : length) : v;
  };
  return [clip(start, st < 0 ? length - 1 : 0), clip(stop, st < 0 ? -1 : length), st];
}

/** The positions a slice picks, in the order it picks them. */
export function sliceSelection(length: number, start: Bound, stop: Bound, step: Bound): number[] {
  const [a, b, s] = sliceIndices(length, start, stop, step);
  const out: number[] = [];
  for (let i = a; s > 0 ? i < b : i > b; i += s) out.push(i);
  return out;
}

/** How the bounds look inside the brackets: letters[1:6:2], letters[::-1], letters[:3]. */
export function sliceText(start: Bound, stop: Bound, step: Bound): string {
  const b = (v: Bound) => (v === null ? '' : String(v));
  return step === null ? `${b(start)}:${b(stop)}` : `${b(start)}:${b(stop)}:${step}`;
}

export const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export interface SliceState {
  start: Bound;
  stop: Bound;
  step: Bound;
}

export interface SliceResult {
  indices: [number, number, number];
  picked: number[];
  items: string[];
}

export const computeSlice = (s: SliceState): SliceResult => {
  const picked = sliceSelection(LETTERS.length, s.start, s.stop, s.step);
  return {
    indices: sliceIndices(LETTERS.length, s.start, s.stop, s.step),
    picked,
    items: picked.map((i) => LETTERS[i]!),
  };
};

export function sliceReadout(s: SliceState, r: SliceResult): ReadoutItem[] {
  const [a, b, st] = r.indices;
  return [
    {
      label: `slice(${[s.start, s.stop, s.step].map((v) => (v === null ? 'None' : v)).join(', ')}).indices(8)`,
      value: `(${a}, ${b}, ${st})`,
    },
    { label: 'Positions picked', value: r.picked.join(', ') || '(none)' },
    { label: `print(letters[${sliceText(s.start, s.stop, s.step)}])`, value: repr(r.items) },
    { label: 'print(len(part))', value: String(r.items.length) },
  ];
}

const BOUNDS = [-10, -8, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10];
const STEPS = [-3, -2, -1, 1, 2, 3];
const option = (v: number | null) => ({
  value: v === null ? 'blank' : String(v),
  label: v === null ? '(blank)' : String(v),
});
const parse = (v: string): Bound => (v === 'blank' ? null : Number(v));
const show = (v: Bound) => (v === null ? 'blank' : String(v));

export function sliceExperiment(id: string, initial: SliceState): ExperimentDef<SliceState, SliceResult> {
  const bound = (key: 'start' | 'stop', label: string): Control<SliceState> => ({
    kind: 'select',
    id: key,
    label,
    options: [option(null), ...BOUNDS.map(option)],
    get: (s: SliceState) => show(s[key]),
    set: (s: SliceState, v: string) => ({ ...s, [key]: parse(v) }),
  });
  return {
    id,
    initial,
    controls: [
      bound('start', 'start'),
      bound('stop', 'stop'),
      {
        kind: 'select',
        id: 'step',
        label: 'step',
        options: [option(null), ...STEPS.map(option)],
        get: (s) => show(s.step),
        set: (s, v) => ({ ...s, step: parse(v) }),
      },
    ],
    compute: computeSlice,
    readout: sliceReadout,
  };
}
