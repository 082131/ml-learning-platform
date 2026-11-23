// What happens when a batch job crashes halfway and is run again? Four write strategies, one crash, one rerun.

export type WriteStrategy = 'append' | 'upsert' | 'checkpoint-append' | 'checkpoint-upsert';

export interface RerunInput {
  strategy: WriteStrategy;
  /** Items in today's batch, keyed 1..items. */
  items: number;
  /** The first run crashes after writing this many items (0 = it never starts writing; items = no crash). */
  crashAfter: number;
  /** Checkpoint strategies save "done up to item k" after every `every` items. */
  every: number;
}

export interface RerunResult {
  /** How many rows each key has in the output table after the crash and the rerun (index 0 = key 1). */
  copies: number[];
  rows: number;
  duplicates: number;
  missing: number;
  /** Items processed across both runs: the cost of the rerun. */
  processed: number;
  /** Where the rerun started (1-based key). */
  resumeFrom: number;
}

export function simulateRerun(i: RerunInput): RerunResult {
  const copies = new Array<number>(i.items).fill(0);
  const upsert = i.strategy === 'upsert' || i.strategy === 'checkpoint-upsert';
  const write = (key: number) => {
    copies[key - 1] = upsert ? 1 : copies[key - 1]! + 1;
  };
  // Run 1: writes items 1..crashAfter, saving a checkpoint after every `every` items.
  let checkpoint = 0;
  const checkpointing = i.strategy.startsWith('checkpoint');
  for (let k = 1; k <= i.crashAfter; k++) {
    write(k);
    if (checkpointing && k % i.every === 0) checkpoint = k;
  }
  let processed = i.crashAfter;
  // Run 2 (only needed after a crash): from the checkpoint, or from the start.
  const resumeFrom = i.crashAfter >= i.items ? i.items + 1 : checkpointing ? checkpoint + 1 : 1;
  for (let k = resumeFrom; k <= i.items; k++) {
    write(k);
    processed++;
  }
  return {
    copies,
    rows: copies.reduce((a, b) => a + b, 0),
    duplicates: copies.reduce((a, c) => a + Math.max(0, c - 1), 0),
    missing: copies.filter((c) => c === 0).length,
    processed,
    resumeFrom,
  };
}
