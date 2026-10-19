/**
 * Formats an integer matrix exactly as NumPy's print() shows a 2-D int array: every entry is
 * right-aligned to the widest entry and rows continue on new lines with one leading space.
 * Checked against NumPy 2.5 (see math.test.ts). Only integers are supported, because NumPy's
 * float formatting depends on print options.
 */
export function formatNumpyIntMatrix(m: readonly (readonly number[])[]): string {
  if (m.some((row) => row.some((x) => !Number.isInteger(x))))
    throw new Error('formatNumpyIntMatrix only formats integers');
  const width = Math.max(...m.flat().map((x) => String(x).length));
  const rows = m.map((row) => `[${row.map((x) => String(x).padStart(width)).join(' ')}]`);
  return `[${rows.join('\n ')}]`;
}

/** A matrix as a Python list literal, for example [[1, 2], [3, 4]]. Used to fill code slots. */
export function pythonList(m: readonly (readonly number[])[]): string {
  return `[${m.map((row) => `[${row.join(', ')}]`).join(', ')}]`;
}
