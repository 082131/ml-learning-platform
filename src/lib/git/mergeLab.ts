/**
 * The three-way merge lab: edit a base file and two changed versions, and see what Git's merge produces. merge3 is
 * checked against `git merge-file` in merge3.test.ts, including every preset below.
 */
import type { ExperimentDef } from '@/lib/types';
import { merge3, type MergeResult } from './merge3';

export interface MergeLabState {
  preset: string;
  base: string;
  ours: string;
  theirs: string;
}

const L = (...xs: string[]) => xs.map((x) => `${x}\n`).join('');
const BASE = L('model: logistic', 'lr: 0.01', 'epochs: 10', 'batch: 32', 'seed: 42');

export const MERGE_PRESETS: Record<string, { label: string; ours: string; theirs: string; base?: string }> = {
  'same-line': { label: 'Both changed lr', ours: L('model: logistic', 'lr: 0.02', 'epochs: 10', 'batch: 32', 'seed: 42'), theirs: L('model: logistic', 'lr: 0.003', 'epochs: 10', 'batch: 32', 'seed: 42') },
  separate: { label: 'Different lines', ours: L('model: logistic', 'lr: 0.02', 'epochs: 10', 'batch: 32', 'seed: 42'), theirs: L('model: logistic', 'lr: 0.01', 'epochs: 10', 'batch: 32', 'seed: 7') },
  adjacent: { label: 'Neighbouring lines', ours: L('model: logistic', 'lr: 0.02', 'epochs: 10', 'batch: 32', 'seed: 42'), theirs: L('model: logistic', 'lr: 0.01', 'epochs: 20', 'batch: 32', 'seed: 42') },
  identical: { label: 'Same change twice', ours: L('model: logistic', 'lr: 0.02', 'epochs: 10', 'batch: 32', 'seed: 42'), theirs: L('model: logistic', 'lr: 0.02', 'epochs: 10', 'batch: 32', 'seed: 42') },
  'both-append': { label: 'Both added a line at the end', ours: L('model: logistic', 'lr: 0.01', 'epochs: 10', 'batch: 32', 'seed: 42', 'dropout: 0.1'), theirs: L('model: logistic', 'lr: 0.01', 'epochs: 10', 'batch: 32', 'seed: 42', 'weight_decay: 0.01') },
};

export const MERGE_BASE = BASE;

export function mergeLabExperiment(id: string): ExperimentDef<MergeLabState, MergeResult> {
  const first = MERGE_PRESETS['same-line']!;
  return {
    id,
    initial: { preset: 'same-line', base: BASE, ours: first.ours, theirs: first.theirs },
    controls: [
      {
        kind: 'select',
        id: 'preset',
        label: 'Example',
        options: Object.entries(MERGE_PRESETS).map(([value, p]) => ({ value, label: p.label })),
        get: (s) => s.preset,
        set: (_s, v) => ({ preset: v, base: MERGE_PRESETS[v]!.base ?? BASE, ours: MERGE_PRESETS[v]!.ours, theirs: MERGE_PRESETS[v]!.theirs }),
      },
    ],
    compute: (s) => merge3(s.base, s.ours, s.theirs, 'HEAD', 'tune-lr'),
    readout: (_s, r) => [
      { label: 'Result', value: r.conflicts ? `${r.conflicts} conflict${r.conflicts > 1 ? 's' : ''}: git merge stops` : 'clean: git merge commits' },
    ],
    resultSource: 'computed in your browser by a three-way line merge that matches git merge-file on these examples',
  };
}
