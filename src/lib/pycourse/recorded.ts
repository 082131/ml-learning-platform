import type { ExperimentDef, ReadoutItem } from '../types';

/** What the state view shows for one name or parameter after a recorded run. */
export interface StateCard {
  label: string;
  value: string;
  note?: string;
}

/** One choice of a recorded experiment, run under CPython by a script in ./fixtures. */
/** A histogram computed by np.histogram in the fixture, with labeled vertical markers (mean, median, …). */
export interface RecordedHistogram {
  edges: number[];
  counts: number[];
  xLabel: string;
  markers: { label: string; value: number }[];
  /** Bins whose left edge is at or beyond this value are drawn in the accent tone (a tail). */
  tailFrom?: number;
}

export interface RecordedVariant {
  id: string;
  label: string;
  slots: Record<string, string>;
  stdout: string;
  error: string | null;
  cards?: StateCard[];
  hist?: RecordedHistogram;
}

export interface RecordedFixture {
  python: string;
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
  };
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
