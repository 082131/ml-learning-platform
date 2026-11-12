/**
 * The data-snapshots lesson's experiment: a 100,000-row table stored in files, changed 10 times. Three ways to
 * keep every version: full copies, copy-on-write (rewrite each file that holds a changed row) and merge-on-read
 * (write only the changed rows to delta files, merge them when reading). Which rows change is drawn from the
 * lesson's seeded generator; everything else is counting. snapshots.test.ts checks every setting against
 * SNAPSHOT_SOURCE run with CPython.
 */
import { LCG } from '../practice/lcg';
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

export const N_ROWS = 100_000;
export const VERSIONS = 10;
export const PATTERNS = ['random', 'clustered'] as const;
export const SHARES = [0.001, 0.01, 0.1] as const;
export const FILE_SIZES = [1000, 10000] as const;

export interface SnapshotState {
  pattern: (typeof PATTERNS)[number];
  share: (typeof SHARES)[number];
  fileRows: (typeof FILE_SIZES)[number];
}

export interface SnapshotResult {
  /** Files rewritten by copy-on-write in each version. */
  filesPerVersion: number[];
  /** Files touched in the first version, for the visual. */
  firstTouched: Set<number>;
  changedRows: number;
  fullCopy: number;
  copyOnWrite: number;
  mergeOnRead: number;
  /** Rows a full scan of the latest version reads under merge-on-read: the base files plus every delta. */
  morScan: number;
}

const fmt = (n: number) => n.toLocaleString('en-US');

export function snapshots({ pattern, share, fileRows }: SnapshotState): SnapshotResult {
  const rng = new LCG(11);
  const count = Math.round(N_ROWS * share);
  let cow = N_ROWS;
  let mor = N_ROWS;
  const filesPerVersion: number[] = [];
  let firstTouched = new Set<number>();
  let changedRows = 0;
  for (let v = 0; v < VERSIONS; v++) {
    let changed: number[];
    if (pattern === 'random') {
      const set = new Set<number>();
      for (let k = 0; k < count; k++) set.add(Math.floor(rng.random() * N_ROWS));
      changed = [...set];
    } else {
      const start = Math.floor(rng.random() * (N_ROWS - count));
      changed = Array.from({ length: count }, (_, k) => start + k);
    }
    const files = new Set(changed.map((r) => Math.floor(r / fileRows)));
    if (v === 0) {
      firstTouched = files;
      changedRows = changed.length;
    }
    filesPerVersion.push(files.size);
    cow += files.size * fileRows;
    mor += changed.length;
  }
  return {
    filesPerVersion,
    firstTouched,
    changedRows,
    fullCopy: N_ROWS * (VERSIONS + 1),
    copyOnWrite: cow,
    mergeOnRead: mor,
    morScan: mor,
  };
}

/** What SNAPSHOT_SOURCE prints. */
export function snapshotPrintout(r: SnapshotResult, s: SnapshotState): string {
  const ratio = (x: number) => `${pyFixed(x / N_ROWS, 2)}x the table`;
  let files = 0;
  for (const f of r.filesPerVersion) files += f;
  return [
    `${VERSIONS} versions, ${fmt(Math.round(N_ROWS * s.share))} row updates each (${s.pattern}), files of ${fmt(s.fileRows)} rows`,
    `full copy:     ${fmt(r.fullCopy).padStart(9)} rows stored, ${ratio(r.fullCopy)}`,
    `copy-on-write: ${fmt(r.copyOnWrite).padStart(9)} rows stored, ${ratio(r.copyOnWrite)}; ${pyFixed(files / VERSIONS, 1)} files rewritten per version`,
    `merge-on-read: ${fmt(r.mergeOnRead).padStart(9)} rows stored, ${ratio(r.mergeOnRead)}; a full scan reads ${fmt(r.morScan)} rows`,
  ].join('\n');
}

export const SNAPSHOT_SOURCE = `class LCG:  # the same generator as the lesson's TypeScript
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


N_ROWS, VERSIONS = 100_000, 10
PATTERN = "{{pattern}}"  # which rows each version changes: "random" or "clustered" (one block)
SHARE = {{share}}  # row updates per version, as a share of the table
FILE_ROWS = {{fileRows}}  # rows per data file

rng = LCG(11)
count = round(N_ROWS * SHARE)
cow = mor = N_ROWS  # both start from one full copy of version 0
files_rewritten = 0
for version in range(VERSIONS):
    if PATTERN == "random":
        changed = {int(rng.random() * N_ROWS) for _ in range(count)}
    else:
        start = int(rng.random() * (N_ROWS - count))
        changed = set(range(start, start + count))
    files = {row // FILE_ROWS for row in changed}  # data files holding at least one changed row
    files_rewritten += len(files)
    cow += len(files) * FILE_ROWS  # copy-on-write: rewrite every touched file in full
    mor += len(changed)  # merge-on-read: write only the changed rows to a delta file

full = N_ROWS * (VERSIONS + 1)
print(f"{VERSIONS} versions, {count:,} row updates each ({PATTERN}), files of {FILE_ROWS:,} rows")
print(f"full copy:     {full:>9,} rows stored, {full / N_ROWS:.2f}x the table")
print(f"copy-on-write: {cow:>9,} rows stored, {cow / N_ROWS:.2f}x the table; "
      f"{files_rewritten / VERSIONS:.1f} files rewritten per version")
print(f"merge-on-read: {mor:>9,} rows stored, {mor / N_ROWS:.2f}x the table; a full scan reads {mor:,} rows")`;

export const snapshotSlots = (s: SnapshotState) => ({
  pattern: s.pattern,
  share: String(s.share),
  fileRows: String(s.fileRows),
});

export function snapshotExperiment(id: string): ExperimentDef<SnapshotState, SnapshotResult> {
  return {
    id,
    initial: { pattern: 'random', share: 0.01, fileRows: 1000 },
    controls: [
      {
        kind: 'select',
        id: 'pattern',
        label: 'Which rows change',
        options: [
          { value: 'random', label: 'Random rows (e.g. corrected labels)' },
          { value: 'clustered', label: 'One block (e.g. the latest day)' },
        ],
        get: (s) => s.pattern,
        set: (s, v) => ({ ...s, pattern: v as SnapshotState['pattern'] }),
      },
      {
        kind: 'select',
        id: 'share',
        label: 'Rows changed per version',
        options: SHARES.map((v) => ({ value: String(v), label: `${fmt(N_ROWS * v)} (${v * 100}%)` })),
        get: (s) => String(s.share),
        set: (s, v) => ({ ...s, share: Number(v) as SnapshotState['share'] }),
      },
      {
        kind: 'select',
        id: 'fileRows',
        label: 'Rows per data file',
        options: FILE_SIZES.map((v) => ({ value: String(v), label: fmt(v) })),
        get: (s) => String(s.fileRows),
        set: (s, v) => ({ ...s, fileRows: Number(v) as SnapshotState['fileRows'] }),
      },
    ],
    compute: snapshots,
    readout: (s, r) => [{ label: 'Python: what versions.py prints', value: snapshotPrintout(r, s) }],
  };
}
