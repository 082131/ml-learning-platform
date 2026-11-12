import type { ExperimentDef, ReadoutItem } from '../types';

/** What the state view shows for one name or parameter after a recorded run. */
export interface StateCard {
  label: string;
  value: string;
  note?: string;
}

/** A histogram computed by np.histogram in the fixture, with labeled vertical markers (mean, median, …). */
export interface RecordedHistogram {
  edges: number[];
  counts: number[];
  xLabel: string;
  markers: { label: string; value: number }[];
  /** Bins whose left edge is at or beyond this value are drawn in the accent tone (a tail). */
  tailFrom?: number;
}

/** Lines recorded per step (for example loss per epoch). Each point is [x, y]; a null y is a value that was NaN or infinite. */
export interface RecordedCurves {
  xLabel: string;
  yLabel: string;
  series: { id: string; label: string; points: (number | null)[][] }[];
}

/** One choice of a recorded experiment, run under CPython by a script in ./fixtures. */
export interface RecordedVariant {
  id: string;
  label: string;
  slots: Record<string, string>;
  stdout: string;
  error: string | null;
  cards?: StateCard[];
  hist?: RecordedHistogram;
  curves?: RecordedCurves;
}

export interface RecordedFixture {
  python: string;
  /** The PyTorch version, for fixtures that ran PyTorch. */
  torch?: string;
  template: string;
  variants: RecordedVariant[];
}

export interface VariantState {
  variant: string;
}

/**
 * An experiment whose only input is a choice between variants of one Python program. Each variant's
 * output was recorded by running exactly that program under CPython (src/lib/pycourse/fixtures), so
 * the code, the state view and the readout always show what Python really did.
 */
export function recordedExperiment(
  id: string,
  fixture: RecordedFixture,
  label: string,
  initial = fixture.variants[0]!.id,
): ExperimentDef<VariantState, RecordedVariant> {
  const byId = new Map(fixture.variants.map((v) => [v.id, v]));
  if (!byId.has(initial)) throw new Error(`${id}: no variant "${initial}"`);
  return {
    id,
    initial: { variant: initial },
    controls: [
      {
        kind: 'select',
        id: 'variant',
        label,
        options: fixture.variants.map((v) => ({ value: v.id, label: v.label })),
        get: (s) => s.variant,
        set: (s, value) => ({ ...s, variant: value }),
      },
    ],
    compute: (s) => byId.get(s.variant) ?? fixture.variants[0]!,
    readout: (_s, r) => recordedReadout(r),
    resultSource: recordedSource(fixture),
  };
}

/** "recorded with PyTorch 2.14.1" or "recorded in CPython 3.13": where a fixture's outputs come from. */
export function recordedSource(fixture: RecordedFixture): string {
  if (fixture.torch) return `recorded with PyTorch ${fixture.torch}`;
  return `recorded in CPython ${fixture.python.split('.').slice(0, 2).join('.')}`;
}

/** One readout line per printed line, then the exception if the run raised one. */
export function recordedReadout(r: RecordedVariant): ReadoutItem[] {
  const lines = r.stdout
    .replace(/\n$/, '')
    .split('\n')
    .filter((l) => l !== '');
  const items: ReadoutItem[] = lines.map((line, i) => ({ label: `printed line ${i + 1}`, value: line }));
  if (r.error) items.push({ label: 'raised', value: r.error, status: 'error' });
  if (items.length === 0) items.push({ label: 'printed', value: '(nothing)' });
  return items;
}

/** Slot functions for a CodeExample: each slot shows the selected variant's text. */
export function recordedSlots(fixture: RecordedFixture): Record<string, (state: unknown) => string> {
  const keys = new Set(fixture.variants.flatMap((v) => Object.keys(v.slots)));
  const byId = new Map(fixture.variants.map((v) => [v.id, v]));
  return Object.fromEntries(
    [...keys].map((k) => [
      k,
      (state: unknown) => {
        const v = byId.get((state as VariantState).variant) ?? fixture.variants[0]!;
        return v.slots[k] ?? '';
      },
    ]),
  );
}
