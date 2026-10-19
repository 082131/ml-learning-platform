/** Small descriptive statistics for comparing runs. */

export function mean(xs: number[]): number {
  if (xs.length === 0) throw new Error('mean of an empty list');
  let total = 0;
  for (const x of xs) total += x;
  return total / xs.length;
}

/** Sample standard deviation (divides by n − 1, like Python's statistics.stdev). 0 for one value. */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let total = 0;
  for (const x of xs) total += (x - m) ** 2;
  return Math.sqrt(total / (xs.length - 1));
}

export function median(xs: number[]): number {
  if (xs.length === 0) throw new Error('median of an empty list');
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
