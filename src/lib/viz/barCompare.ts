/** Which value each bar shows: bars before the split show `before`, the rest show `after`. */
export function splitBars(before: readonly number[], after: readonly number[], split: number) {
  if (before.length !== after.length) throw new Error('before and after need the same number of values');
  return before.map((b, i) =>
    i < split ? { value: b, side: 'before' as const } : { value: after[i]!, side: 'after' as const },
  );
}

/** The split index nearest to a pointer x position over `count` bars spread across `width`. */
export function splitFromX(x: number, width: number, count: number): number {
  if (width <= 0) return 0;
  return Math.min(count, Math.max(0, Math.round((x / width) * count)));
}
