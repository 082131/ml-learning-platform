/**
 * Number formatting that matches Python's f-strings, so a readout can show exactly what the lesson's
 * Python code prints. Checked against CPython 3.13 output in format.test.ts.
 */

/** Python's `f"{x:.{d}f}"`: round half to even on exact ties (JS toFixed rounds them up). */
export function pyFixed(x: number, digits: number): string {
  const scale = 10 ** digits;
  const scaled = x * scale;
  const floor = Math.floor(scaled);
  const tie = scaled - floor === 0.5 && Number.isFinite(scaled);
  if (!tie) return x.toFixed(digits);
  const even = floor % 2 === 0 ? floor : floor + 1;
  return (even / scale).toFixed(digits);
}

/** Python's `f"{n:,}"` for integers. */
export const pyThousands = (n: number) => Math.round(n).toLocaleString('en-US');

/** Python's `f"{s:<w}"` and `f"{s:>w}"`. */
export const padRight = (s: string, w: number) => s.padEnd(w, ' ');
export const padLeft = (s: string, w: number) => s.padStart(w, ' ');

export const GIB = 2 ** 30;
export const MIB = 2 ** 20;

/** Bytes as GiB with two decimals, or MiB below 1 GiB: "15.96 GiB", "512.00 MiB". */
export const formatBytes = (bytes: number) =>
  bytes >= GIB ? `${pyFixed(bytes / GIB, 2)} GiB` : `${pyFixed(bytes / MIB, 2)} MiB`;
